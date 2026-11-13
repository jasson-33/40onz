# WooCommerce → Shopify product migration

`migrate.py` exports every product from the WordPress/WooCommerce store
(cuarentaonzas.com) into a Shopify-compatible products CSV.

No dependencies — Python 3 stdlib only (Python 3.12 is already in the nix shell).

## 1. Generate the API keys

1. Log into WordPress admin: <https://cuarentaonzas.com/wp-admin>
2. Go to **WooCommerce → Settings → Advanced → REST API**
3. Click **Add key**
4. Fill in:
   - **Description**: `Shopify migration`
   - **User**: your admin account
   - **Permissions**: **Read** (the script only reads — never writes)
5. Click **Generate API key**
6. Copy the **Consumer key** (`ck_…`) and **Consumer secret** (`cs_…`) —
   the secret is only shown once.

## 2. Configure

```bash
cd scripts/woocommerce-to-shopify
cp .env.example .env
# edit .env — paste the ck_/cs_ values
```

`.env` is already covered by the repo's `.gitignore`.

## 3. Run

```bash
python migrate.py --limit 10 --dry-run   # smoke test: fetch + summarize, no file
python migrate.py                        # full run → ../../seed/products-shopify.csv
```

Flags: `--limit N` · `--dry-run` · `--env-file PATH` · `--out PATH` · `--include-short-desc`

## 4. Import into Shopify

Shopify admin → **Products → Import** → upload `seed/products-shopify.csv`.
On re-runs check **"Overwrite existing products that have the same handle"**.

## What the script does

| WooCommerce | Shopify CSV |
|---|---|
| `slug` | `Handle` |
| `name` (sold-badge HTML stripped) | `Title` |
| `description` | `Body (HTML)` |
| — | `Vendor` = `40OZ` |
| product categories | `Type` (see mapping) + `Tags` |
| product/variation attributes | `Option1..3 Name/Value` |
| variation `sku`/`price`/`sale_price` | `Variant SKU` / `Variant Price` / `Variant Compare At Price` |
| `stock_quantity` (or 1/0 by stock status) | `Variant Inventory Qty` |
| `stock_status= outofstock` | `Status: draft` (in-stock → `active`) |
| `images[]` / variation image | `Image Src` + `Image Position` / `Variant Image` |

### Type mapping (first match wins)

`COLLABS` (all `*x-*` collab categories) → `NEW CHAPTER` (`newdrop`) →
`GEMS & STONES` → `NECKLACES` / `BRACELETS` / `EARRINGS` / `RINGS` →
`CLOTHING` → `ACCESSORIES` (fallback for unmapped).

Every other WC category becomes a **tag** (its slug — e.g. `reset`,
`one-of-a-kind`) so tag-based automated collections populate.
Material keywords in title/description add `silver` / `gold` / `bronze`
tags for the theme's material filter.

Only **published** WooCommerce products are migrated (WC drafts are
skipped — wc/v3 returns them by default with admin keys).
Products with no mapped category get a title-keyword fallback
(`… Ring` → `RINGS`, `… Necklace` → `NECKLACES`, …) before `ACCESSORIES`;
anything still unmapped prints a warning to review.

Prices stay in COP — Shopify imports them in the store's currency.
