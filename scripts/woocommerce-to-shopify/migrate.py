#!/usr/bin/env python3
"""Migrate WooCommerce products (cuarentaonzas.com) to a Shopify import CSV.

Reads products + variations via the WooCommerce REST API (wc/v3, Basic auth)
and writes a CSV in Shopify's product-import format.

Config via .env next to this script (see .env.example / README.md):
    WC_CK        WooCommerce consumer key (ck_...)
    WC_CS        WooCommerce consumer secret (cs_...)
    WC_BASE_URL  Store base URL (default https://cuarentaonzas.com)
"""

from __future__ import annotations

import argparse
import base64
import csv
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE_URL = "https://cuarentaonzas.com"
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "seed" / "products-shopify.csv"
PER_PAGE = 100
MAX_RETRIES = 4
VENDOR = "40OZ"

# WC category slug -> Shopify product Type, in precedence order.
# First matching category wins (a product can sit in several WC categories).
TYPE_MAP: list[tuple[str, frozenset[str]]] = [
    ("COLLABS", frozenset({
        "40-onzas-x-986", "40oz-x-subhuman", "40oz-x-the-virginia-valley",
        "mythology", "dickies-x-40-oz", "dr-martens-x-40-onzas",
    })),
    ("NEW CHAPTER", frozenset({"newdrop"})),
    ("GEMS & STONES", frozenset({"gems-stones"})),
    ("NECKLACES", frozenset({"necklace"})),
    ("BRACELETS", frozenset({"bracelet"})),
    ("EARRINGS", frozenset({"earrings"})),
    ("RINGS", frozenset({"rings"})),
    ("CLOTHING", frozenset({"clothing-and-complements"})),
    ("ACCESSORIES", frozenset({"accesories", "belts"})),
]
FALLBACK_TYPE = "ACCESSORIES"

# Structural parent categories that carry no merchandising meaning as tags.
IGNORED_TAG_CATS = frozenset({"fine-jewelry", "uncategorized"})

# Last-resort Type inference from the product title when no WC category maps —
# e.g. the Animals-collection rings that were never given the `rings` category.
FAMILY_HINTS: list[tuple[str, re.Pattern[str]]] = [
    ("NECKLACES", re.compile(r"\b(necklaces?|chains?|pendants?|chokers?)\b", re.I)),
    ("EARRINGS", re.compile(r"\b(earrings?|studs?)\b", re.I)),
    ("BRACELETS", re.compile(r"\b(bracelets?|bangles?|cuffs?|pulseras?)\b", re.I)),
    ("RINGS", re.compile(r"\brings?\b", re.I)),
]

# WC attribute name -> Shopify option name.
OPTION_NAMES = {
    "size": "Size",
    "size argolla": "Ring Size",
    "talla": "Size",
    "lenght": "Length",
    "long": "Length",
    "color": "Color",
    "piedra": "Stone",
    "género": "Gender",
    "genero": "Gender",
}

# Material detection for the theme's silver/gold/bronze tag filter.
MATERIAL_PATTERNS = {
    "silver": re.compile(r"\b(silver|plata|950)\b", re.I),
    "gold": re.compile(r"\b(gold|oro|14k|18k|24k|vermeil|dorado)\b", re.I),
    "bronze": re.compile(r"\b(bronze|bronce)\b", re.I),
}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")
# WP storefront badges baked into product names, e.g.
# '<span class="banner-card-sold">SOLD / COLLECTED</span><br> RING NAME'
BADGE_RE = re.compile(
    r"<span[^>]*banner-card-sold[^>]*>.*?</span>\s*(<br\s*/?>)?", re.I | re.S
)

CSV_COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams",
    "Variant Inventory Tracker", "Variant Inventory Qty",
    "Variant Inventory Policy", "Variant Fulfillment Service",
    "Variant Price", "Variant Compare At Price", "Variant Requires Shipping",
    "Variant Taxable", "Variant Image", "Status",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
]


# ── Config ───────────────────────────────────────────────────────────────────

def load_env_file(path: Path) -> dict[str, str]:
    """Parse a .env file into a dict. Existing env vars take precedence."""
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    merged = dict(values)
    merged.update({k: v for k, v in os.environ.items() if k in values or k.startswith("WC_")})
    return merged


# ── WooCommerce API ──────────────────────────────────────────────────────────

class WooClient:
    """Minimal wc/v3 REST client. Basic auth, falling back to query-param auth
    (some hosts strip the Authorization header)."""

    # The site's WAF rejects the default Python-urllib UA with a 406.
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    def __init__(self, base_url: str, ck: str, cs: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.ck, self.cs = ck, cs
        self.query_auth = False
        token = base64.b64encode(f"{ck}:{cs}".encode()).decode()
        self.auth_header = f"Basic {token}"

    def _url(self, path: str, params: dict[str, str | int] | None) -> str:
        query = ""
        merged = dict(params or {})
        if self.query_auth:
            merged.update(consumer_key=self.ck, consumer_secret=self.cs)
        if merged:
            query = "?" + "&".join(f"{k}={v}" for k, v in merged.items())
        return f"{self.base_url}/wp-json/wc/v3/{path}{query}"

    def get(self, path: str, params: dict[str, str | int] | None = None) -> list[dict]:
        """GET a wc/v3 endpoint, returning the decoded JSON body."""
        for attempt in range(MAX_RETRIES):
            headers = dict(self.HEADERS)
            if not self.query_auth:
                headers["Authorization"] = self.auth_header
            req = urllib.request.Request(self._url(path, params), headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read().decode())
            except urllib.error.HTTPError as exc:
                if exc.code in (401, 403):
                    if not self.query_auth:
                        self.query_auth = True
                        continue
                    sys.exit(
                        f"Auth failed ({exc.code}) — check WC_CK/WC_CS in .env "
                        "(see scripts/woocommerce-to-shopify/README.md)."
                    )
                if exc.code == 404:
                    return []
                if attempt == MAX_RETRIES - 1:
                    raise
                retry_after = exc.headers.get("Retry-After")
                time.sleep(int(retry_after) if retry_after else 2 ** attempt)
            except (urllib.error.URLError, TimeoutError):
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)
        return []

    def get_paginated(
        self,
        path: str,
        limit: int | None = None,
        params: dict[str, str | int] | None = None,
    ) -> list[dict]:
        """Fetch all pages of a wc/v3 collection endpoint."""
        items: list[dict] = []
        page = 1
        while True:
            batch = self.get(
                path, {"per_page": PER_PAGE, "page": page, **(params or {})}
            )
            if not batch:
                break
            items.extend(batch)
            if limit and len(items) >= limit:
                return items[:limit]
            if len(batch) < PER_PAGE:
                break
            page += 1
        return items


# ── Normalization helpers ────────────────────────────────────────────────────

def strip_html(text: str, remove_badges: bool = False) -> str:
    """Remove HTML tags, unescape entities, collapse whitespace.

    With remove_badges=True the whole sold/available badge element is dropped
    (used for product titles, where its text would otherwise leak through).
    """
    if remove_badges:
        text = BADGE_RE.sub("", text or "")
    return WS_RE.sub(" ", html.unescape(TAG_RE.sub("", text or ""))).strip()


def detect_materials(product: dict) -> list[str]:
    """Derive silver/gold/bronze tags from title + short description."""
    haystack = strip_html(product.get("name", "")) + " " + strip_html(
        product.get("short_description", "")
    )
    return [mat for mat, pattern in MATERIAL_PATTERNS.items() if pattern.search(haystack)]


def map_type(product: dict, warnings: list[str]) -> tuple[str, str | None]:
    """Map WC categories to a Shopify Type. Returns (type, winning_slug).

    Falls back to a title-keyword guess (e.g. 'HAWK Ring' -> RINGS) when no
    category maps, then to FALLBACK_TYPE with a warning.
    """
    slugs = {c.get("slug", "") for c in product.get("categories", [])}
    for shopify_type, cat_slugs in TYPE_MAP:
        hit = slugs & cat_slugs
        if hit:
            return shopify_type, sorted(hit)[0]

    title = strip_html(product.get("name", ""), remove_badges=True)
    hits = [t for t, pat in FAMILY_HINTS if pat.search(title)]
    if len(hits) == 1:
        return hits[0], None
    if len(hits) > 1:
        warnings.append(
            f"ambiguous title hints {hits} -> {FALLBACK_TYPE}: {product.get('slug')}"
        )
    elif not slugs:
        warnings.append(f"no categories -> {FALLBACK_TYPE}: {product.get('slug')}")
    else:
        warnings.append(
            f"unmapped categories {sorted(slugs)} -> {FALLBACK_TYPE}: {product.get('slug')}"
        )
    return FALLBACK_TYPE, None


def build_tags(product: dict, winning_slug: str | None) -> str:
    """Material tags + leftover category slugs (auto-collections) + WC tags."""
    tags: list[str] = detect_materials(product)
    for cat in product.get("categories", []):
        slug = cat.get("slug", "")
        if slug and slug != winning_slug and slug not in IGNORED_TAG_CATS:
            tags.append(slug)
    for tag in product.get("tags", []):
        name = strip_html(tag.get("name", ""))
        if name:
            tags.append(name.lower())
    seen: set[str] = set()
    deduped = [t for t in tags if not (t.lower() in seen or seen.add(t.lower()))]
    return ", ".join(deduped)


def option_name(wc_name: str) -> str:
    """Normalize a WC attribute name to a Shopify option name."""
    return OPTION_NAMES.get(wc_name.strip().lower(), wc_name.strip().title() or "Option")


def price_fields(item: dict, parent: dict) -> tuple[str, str]:
    """Return (price, compare_at) from a product/variation dict."""
    price = str(item.get("price") or parent.get("price") or "")
    regular = str(item.get("regular_price") or "")
    sale = str(item.get("sale_price") or "")
    compare_at = regular if sale and regular and float(regular) > float(sale) else ""
    return price, compare_at


def inventory_qty(item: dict) -> str:
    """Real stock quantity when managed, else 1/0 from stock status."""
    qty = item.get("stock_quantity")
    if item.get("manage_stock") and qty is not None:
        return str(int(qty))
    return "1" if item.get("stock_status") == "instock" else "0"


def weight_grams(item: dict) -> str:
    """WooCommerce weight (kg) -> grams for Shopify's Variant Grams column."""
    try:
        weight = float(item.get("weight") or 0)
    except (TypeError, ValueError):
        return ""
    return str(int(weight * 1000)) if weight else ""


# ── Row building ─────────────────────────────────────────────────────────────

def variant_rows(
    product: dict, variations: list[dict], warnings: list[str]
) -> tuple[list[str], list[dict]]:
    """Build (option_names, per-variant column values) for a product.

    Only `variable` products with real variations produce named options —
    simple products and variable ones whose attributes never appear in the
    variation data get the canonical Title / Default Title so Shopify marks
    them `has_only_default_variant` (theme hides the picker).
    """
    def simple_row() -> tuple[list[str], list[dict]]:
        price, compare_at = price_fields(product, product)
        return ["Title"], [{
            "options": ["Default Title", "", ""],
            "sku": str(product.get("sku") or ""),
            "price": price, "compare_at": compare_at,
            "qty": inventory_qty(product), "grams": weight_grams(product),
            "image": "",
        }]

    if product.get("type") != "variable" or not variations:
        return simple_row()

    option_attrs = [a for a in product.get("attributes", []) if a.get("variation")]

    def value_for(var_attrs: list[dict], attr_name: str) -> str:
        match = next(
            (a for a in var_attrs
             if a.get("name", "").lower() == attr_name.lower()),
            None,
        )
        return str(match.get("option", "")).strip() if match else ""

    # Keep only attributes that actually carry a value in some variation —
    # leftover WC attribute config would otherwise render an empty dropdown.
    used = [
        a for a in option_attrs
        if any(value_for(v.get("attributes", []), a.get("name", ""))
               for v in variations)
    ]
    if not used:
        return simple_row()
    if len(used) > 3:
        warnings.append(f">3 options on {product.get('slug')}, extras dropped")
    used = used[:3]
    names = [option_name(a.get("name", "")) for a in used]

    rows = []
    for var in variations:
        price, compare_at = price_fields(var, product)
        image = (var.get("image") or {}).get("src", "")
        values = [value_for(var.get("attributes", []), a.get("name", ""))
                  for a in used]
        rows.append({
            "options": (values + ["", "", ""])[:3],
            "sku": str(var.get("sku") or f"{product.get('sku', '')}-{var.get('id')}"),
            "price": price, "compare_at": compare_at,
            "qty": inventory_qty(var), "grams": weight_grams(var),
            "image": image,
        })
    return names, rows


def product_rows(
    product: dict, variations: list[dict], warnings: list[str]
) -> list[dict[str, str]]:
    """Expand one WC product into Shopify CSV rows (variants + image rows)."""
    shopify_type, winning_slug = map_type(product, warnings)
    status = "draft" if product.get("stock_status") == "outofstock" else "active"
    option_names, variants = variant_rows(product, variations, warnings)
    images = product.get("images", [])
    rows: list[dict[str, str]] = []

    for i, var in enumerate(variants):
        row = {col: "" for col in CSV_COLUMNS}
        row["Handle"] = product.get("slug", "")
        if i == 0:
            row.update({
                "Title": strip_html(product.get("name", ""), remove_badges=True),
                "Body (HTML)": product.get("description", ""),
                "Vendor": VENDOR,
                "Type": shopify_type,
                "Tags": build_tags(product, winning_slug),
                "Published": "TRUE",
                "Status": status,
                "Gift Card": "FALSE",
            })
            for n, name in enumerate(option_names, start=1):
                row[f"Option{n} Name"] = name
        row[f"Option1 Value"], row[f"Option2 Value"], row[f"Option3 Value"] = var["options"]
        row.update({
            "Variant SKU": var["sku"],
            "Variant Grams": var["grams"],
            "Variant Inventory Tracker": "shopify",
            "Variant Inventory Qty": var["qty"],
            "Variant Inventory Policy": "deny",
            "Variant Fulfillment Service": "manual",
            "Variant Price": var["price"],
            "Variant Compare At Price": var["compare_at"],
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Image": var["image"],
        })
        rows.append(row)

    # Variation images that aren't already in the gallery get their own
    # Image Src rows — Shopify requires a variant image to exist in the
    # product's media to attach it.
    variant_srcs = {v["image"] for v in variants if v["image"]}
    gallery_srcs = {img.get("src", "") for img in images}
    extra_srcs = sorted(variant_srcs - gallery_srcs)

    all_srcs = [(img.get("src", ""), strip_html(img.get("alt") or img.get("name") or ""))
                for img in images]
    all_srcs += [(src, "") for src in extra_srcs]

    for pos, (src, alt) in enumerate(all_srcs, start=1):
        row = {col: "" for col in CSV_COLUMNS}
        row["Handle"] = product.get("slug", "")
        row["Image Src"] = src
        row["Image Position"] = str(pos)
        row["Image Alt Text"] = alt
        rows.append(row)

    return rows


# ── Main ─────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--env-file", type=Path, default=script_dir / ".env")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--limit", type=int, default=None,
                        help="Only process the first N products (test runs)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and summarize without writing the CSV")
    parser.add_argument("--include-short-desc", action="store_true",
                        help="Prepend the WC short description to Body (HTML)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    env = load_env_file(args.env_file)
    ck, cs = env.get("WC_CK", ""), env.get("WC_CS", "")
    base_url = env.get("WC_BASE_URL", DEFAULT_BASE_URL)
    if not ck or not cs:
        sys.exit(
            f"Missing WC_CK/WC_CS — create {args.env_file} from .env.example "
            "(see README.md for how to generate the keys)."
        )

    client = WooClient(base_url, ck, cs)
    print(f"Fetching products from {base_url} ...")
    # status=publish — wc/v3 otherwise returns drafts too with admin keys.
    products = client.get_paginated(
        "products", limit=args.limit, params={"status": "publish"}
    )
    print(f"  {len(products)} products")

    warnings: list[str] = []
    all_rows: list[dict[str, str]] = []
    stats = {"variants": 0, "draft": 0, "skipped": 0}

    for i, product in enumerate(products, start=1):
        ptype = product.get("type")
        if ptype in ("grouped", "external"):
            warnings.append(f"skipped {ptype}: {product.get('slug')}")
            stats["skipped"] += 1
            continue
        if args.include_short_desc and product.get("short_description"):
            product["description"] = (
                product["short_description"] + product.get("description", "")
            )
        variations = []
        if ptype == "variable":
            variations = client.get_paginated(f"products/{product['id']}/variations")
        rows = product_rows(product, variations, warnings)
        stats["variants"] += sum(1 for r in rows if r.get("Variant SKU") or r.get("Option1 Value"))
        stats["draft"] += 1 if product.get("stock_status") == "outofstock" else 0
        all_rows.extend(rows)
        if i % 50 == 0:
            print(f"  processed {i}/{len(products)}")

    if args.dry_run:
        from collections import Counter
        types = Counter(r["Type"] for r in all_rows if r.get("Type"))
        print("\nDry run — no CSV written.")
        print("Products by Type:", dict(types))
        print(f"Variants: {stats['variants']} | drafts: {stats['draft']} | skipped: {stats['skipped']}")
        print(f"Rows that would be written: {len(all_rows)}")
    else:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS)
            writer.writeheader()
            writer.writerows(all_rows)
        print(f"\nWrote {len(all_rows)} rows -> {args.out}")
        print(f"Variants: {stats['variants']} | drafts: {stats['draft']} | skipped: {stats['skipped']}")

    if warnings:
        print(f"\n{len(warnings)} warnings:")
        for warning in warnings[:20]:
            print(f"  - {warning}")
        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more")


if __name__ == "__main__":
    main()
