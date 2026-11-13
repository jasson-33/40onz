# Project Memory

## Overview
40onz is a custom Shopify theme for a luxury streetwear/jewelry brand. The theme is built with Vite + `vite-plugin-shopify` (Barrel), Tailwind CSS v4, and vanilla JS. Design references are the "ECOMM 40OZ" PDF mockups (7 pages, 1920px desktop artboards) and emanuelebicocchi.it. The repo lives at `~/Documents/dev/40onz`.

## Tech Stack
| Tool | Version | Notes |
|---|---|---|
| Bun | 1.4.2 | Primary package manager + runtime (via nix) |
| Node.js | v22.23.3 | Required by Shopify CLI (via nix) |
| Nix | 2.34.4 | Dev environment pinning via flake |
| direnv | 2.38.1 | Auto-loads nix shell on `cd` |
| Vite | 8.3.4 | Bundler via `vite-plugin-shopify` (installed) |
| Tailwind CSS | 4.3.3 | CSS framework via `@tailwindcss/vite` (installed) |
| Shopify CLI | 4.9.4 | `@shopify/cli` + `@shopify/theme` (installed) |
| Python | 3.12.15 | `python312` in nix shell — for PDF rasterization |
| PyMuPDF | — | `python312Packages.pymupdf` — PDF → PNG rasterizer |
| Pillow | — | `python312Packages.pillow` — image compression/conversion |

Fonts: real files now live in `public/` → copied to `assets/` on build:
- **Acumin Variable Concept** (`public/acumin-variable.otf`) → `--font-acumin` → `font-acumin`
- **Roslindale Variable** (`public/roslindale-variable.ttf`) → `--font-roslindale` → `font-roslindale`
- **aktiv-grotesk** → `--font-aktiv` → `font-aktiv` — via Adobe Fonts kit `https://use.typekit.net/ugo5zjj.css` (weights 200–700 + italics; "Hair" maps to weight 200 → `font-extralight`; separate `aktiv-grotesk-thin` family also at 200). Kit currently has ONLY Aktiv — Acumin stays self-hosted unless added to the kit.
- **IBM Plex Mono** (`public/ibm-plex-mono.otf`) → `--font-plex-mono` → `font-plex-mono` — self-hosted, weight 400 only; used for the typewriter-style text on One of a Kind
- Fallbacks: Cormorant Garamond (serif/display), Inter (sans/body) — Google Fonts
- `@font-face` declarations for both self-hosted variable fonts live in a `<style>` block in `layout/theme.liquid` (asset_url → files must exist in `public/`).

## Architecture
```
Vite (vite-plugin-shopify)
  └── frontend/entrypoints/theme.css  → Tailwind v4 tokens + utilities
  └── frontend/entrypoints/theme.js   → vanilla JS modules
        → compiled → assets/ (Shopify serves these)
  └── public/                          → copied verbatim to assets/ on build
        (fonts, collage images — referenced via `asset_url`)

Liquid template tree:
  layout/theme.liquid          (HTML shell, font imports, vite-tag renders)
  sections/*.liquid            (page sections with schema for Theme Editor)
  snippets/*.liquid            (reusable partials)
  templates/*.json             (page → section wiring)
```

## Directory Structure
```
40onz/
├── flake.nix              — nix dev shell (bun + node 22 + git)
├── flake.lock             — pinned nixpkgs-unstable (2026-10-16)
├── .envrc                 — `use flake` — direnv auto-activates nix shell
├── frontend/
│   └── entrypoints/       — Vite entrypoints (theme.css, theme.js)
├── public/                — static theme assets (fonts, images) → assets/ on build
├── layout/                — theme.liquid (master layout)
├── sections/              — Shopify sections (header, hero, our-story, manifesto, atelier, etc.)
├── snippets/              — reusable Liquid partials (vite-tag, product-card, etc.)
├── templates/             — page templates (index, collection, product, page.our-story, page.manifesto, page.atelier, cart)
├── config/                — settings_schema.json
├── locales/               — en.default.json
├── design/                — 7 rasterized PDF pages (page-1.jpg through page-7.jpg, 3840px)
└── assets/                — Vite build output (auto-generated, WIPED on build)
```

## Conventions
- **Package manager**: always use `bun` — never `npm` or `yarn` directly
- **CSS**: Tailwind v4 `@import "tailwindcss"` + `@theme {}` block for design tokens
- **JS**: vanilla ES modules only — no framework; lightweight and tree-shakeable
- **Liquid**: one section per file; every section has a `{% schema %}` block with `name`, `settings`, and `presets`
- **vite-tag snippet**: used in `theme.liquid` to inject Vite-managed assets — never hardcode asset URLs
- **Tailwind values**: prefer the closest NAMED utility over arbitrary values (e.g. `text-xl` not `text-[21px]`, `font-extralight` not `font-[194]`). For exact hex colors, add a `@theme` token (e.g. `--color-ink`) and use the named utility (`text-ink`) — don't hardcode `text-[#1d1d1b]`.
- **Static assets**: images/fonts go in `public/` (survives builds) and are referenced via `asset_url`. Image blocks accept `asset` (filename) setting alongside `image_picker`/`image_url`. Design exports live in `~/Documents/40onz/1x/` — filenames have spaces, rename kebab-case into `public/`.
- **Media blocks**: media slots follow the chain `video` (Shopify-hosted) > `video_url` (YouTube/Vimeo) > `image`/`asset`/`image_url` > placeholder. Ambient embeds are muted autoplay loops with no controls + `pointer-events-none`. In non-16:9 frames, size the iframe `absolute top-0 left-1/2 h-full aspect-video -translate-x-1/2` (object-cover doesn't work on iframes) to fill height and crop sides.
- **Full-bleed image bands**: let natural aspect drive height — `w-full h-auto` inside `overflow-hidden flex items-center` with `max-height: Npx` on the wrapper. Fixed height + `object-cover` leaves the container bg showing when ratios mismatch.
- **Numbered block slots**: loop `{% for i in (1..3) %}` and read settings dynamically via `block.settings['video_' | append: i]` (see atelier `video_row`).
- **Design spec mapping** (Adobe → Tailwind): tracking N = N/1000em (e.g. 75 ≈ `tracking-wider` 0.05em); weight 194 ≈ `font-extralight` (200); font 21px ≈ `text-xl` (20px); leading 25.2px ≈ `leading-6` (24px)
- **Colors (from mockups)**:
  - `--color-black: #0a0a0a`
  - `--color-ink: #1d1d1b` (paragraph/body text on light pages)
  - `--color-ash: #616160` (secondary headings on light pages)
  - `--color-white: #fafafa`
  - `--color-gold: #c9a96e` (placeholder — refine after rasterizing PDF)
  - `--color-mid: #6b6b6b`

## Commands
```bash
# Enter dev shell (auto via direnv, or manually):
nix develop

# Run commands with nix/direnv (if direnv auto-load doesn't work):
cd /Users/jeysonrojas/Documents/dev/40onz && PATH="/nix/var/nix/profiles/default/bin:$PATH" direnv exec . <command>

# Shopify CLI binary is NOT on PATH — it's a node_modules bin:
./node_modules/.bin/shopify theme list --store yxxehz-a9.myshopify.com

# Install dependencies:
bun install

# Start Vite dev server:
bun run dev

# Build for production:
bun run build

# Start Shopify theme dev (opens browser OAuth on first run):
bun run theme:dev   # → yxxehz-a9.myshopify.com / dev.cuarentaonzas.com

# Push theme to store:
bun run theme:push

# Push specific files to live theme (non-interactive):
./node_modules/.bin/shopify theme push --store yxxehz-a9.myshopify.com \
  --theme 193457455467 --allow-live --only <file> [--only <file> ...]

# Shopify theme linting:
bun run theme:check

# Migrate WooCommerce products → Shopify CSV (needs WC_CK/WC_CS in
# scripts/woocommerce-to-shopify/.env — see that folder's README for key setup):
python scripts/woocommerce-to-shopify/migrate.py [--limit N --dry-run]
# output → seed/products-shopify.csv
```

> **Note**: `bun run dev` and `bun run theme:dev` are meant to run together — Vite serves assets, Shopify CLI proxies the store preview.

## Workflow Rules
- **NEVER commit** without explicit user approval — always wait for the user to say "commit" before running `git commit`. No auto-commits after edits.
- When the user shares screenshots, always visually compare before making changes.
- **Local testing**: The theme is tested locally at `http://127.0.0.1:9292` using `bun run theme:dev`. Do NOT push to Shopify unless explicitly requested. Changes are visible locally after rebuild.

## Gotchas & Known Issues
- **nix flake path tracking**: `flake.nix` must be `git add`-ed before `nix flake lock` will see it — Nix only reads git-tracked files.
- **direnv hook**: `direnv allow` must be run once per clone. If the shell doesn't activate, check that direnv is hooked into your shell (`eval "$(direnv hook zsh)"` in `.zshrc`).
- **Node version**: machine has Node 26 (Homebrew) globally, but the nix shell pins Node 22 for Shopify CLI compatibility. Always work inside the nix shell.
- **Shopify CLI auth**: first run of `shopify theme dev` opens a browser OAuth flow — you must approve it manually.
- **Shopify store URLs**: internal = `yxxehz-a9.myshopify.com`, custom domain = `dev.cuarentaonzas.com`. Both wired into `package.json` scripts.
- **Store themes**: live = "40onz" #193457455467; unpublished = Horizon #192166789483, Fabric #192201097579. Dev theme IDs expire — "could not be found" means a new one will be created on next `theme dev`.
- **assets/ is wiped by `vite build`** (`emptyOutDir`) — never place files there directly. Use `public/` (`publicDir` enabled in vite.config.js) → copied to `assets/` on build.
- **vite-tag hardcodes hashed bundles**: `snippets/vite-tag.liquid` is regenerated per build with hashed CSS/JS filenames — always push it together with the new `assets/theme-*.css|.js` when syncing to the store.
- **JSON template ↔ section ordering**: a template referencing a section type fails upload ("does not reference an existing section file") if the section isn't on the remote yet. Admin code editor validates per-file — create the section first. `theme dev` initial sync can hit the same race — restart it.
- **Schema-range upload race**: template values are validated against the REMOTE schema. After changing a range (e.g. vh 20–80 → px 200–1000), a template save before the section syncs fails ("Setting 'height' can't be greater than 80"). Fix: re-save/re-upload the template once the section has landed; on manual push, `--only sections/<file>` first, then the template. Values must also land exactly on the `step` — e.g. `809` fails "must be a step in the range" when step is 10 → use `810`.
- **JSON template comment header**: Shopify injects an auto-generated comment block into JSON templates server-side — harmless, don't fight it.
- **PDF rasterization**: the "ECOMM 40OZ" design PDF is not yet in the repo. When obtained, rasterize each page with `qlmanage -t -s 2560 -o design/` and commit to `design/`.
- **Mobile breakpoints**: PDF mockups only show 1920px desktop. Mobile layouts mirror emanuelebicocchi.it responsive patterns (mobile nav drawer, single-column grid).
- **Hero video**: `hero.liquid` supports `video_url` (YouTube/Vimeo) taking priority over `image_picker`. Requires `accept: ["youtube", "vimeo"]` in schema — Shopify rejects `video_url` without `accept`. Poster/fallback uses `section.settings.image`.
- **Header layout**: uses `grid-cols-[1fr_auto_1fr]` — never use `justify-between` + `ml-auto` together (flex conflict causes icon/nav crowding). Right column always `justify-end` for flush-right icons.
- **Cart badge**: renders `0` when empty — always wrap `{% if cart.item_count > 0 %}` or it shows "0" on the icon.
- **Theme-editor saves overwrite schema defaults**: saving a section in the theme editor writes ALL its settings into the remote template JSON — including explicit `""` blanks that override schema `default`s. Editing a template JSON locally and letting `theme dev` sync can wipe theme-editor uploads (e.g. `bg_image`). Pull first: `./node_modules/.bin/shopify theme pull --store yxxehz-a9.myshopify.com --theme 40onz --only templates/<file>.json`, then edit.
- **New JSON template needs assignment**: a `page.<suffix>.json` template does nothing until the page's "Theme template" is set in admin (Online Store → Pages → page → Theme template). Until then the page renders `main-page`.
- **YouTube can refuse embedding**: some videos return "unavailable" in an embed (owner-disabled embedding). For brand videos prefer the Shopify-hosted `video` section setting (`section.settings.video.sources` → manual `<video>` tag) — no player chrome, no embed restrictions.
- **Stale CSS without `bun run dev`**: `theme:dev` alone serves the last built `assets/theme-*.css` — new Tailwind classes in Liquid won't exist until `bun run build` (or keep `bun run dev` running alongside).
- **Publishing to live**: NEVER full `theme push` — remote `templates/*.json` + `config/settings_data.json` hold theme-editor data (uploaded images, settings) that local copies lack. Push `--only` the changed files; order matters — section files first, then any template that references them. `--only` uploads only matching files (verified: remote files outside the selection are untouched).
- **`theme dev` upload race fix**: "Failed to Upload Theme Files" / 500s = a template synced before its section. Don't restart — `touch sections/<file>.liquid`, wait, then `touch templates/<file>.json` to force ordered re-upload.

## Recent Context
- Built **Our Story** page (`sections/our-story.liquid` + `templates/page.our-story.json`): 2-col layout — left = image blocks (polaroid frame w/ tilt, or frameless for composite collages), right = text blocks. Live at `dev.cuarentaonzas.com/pages/our-story` with `our-story-collage.jpg` (837×2597) via `asset_url`. Typography per spec: title `font-acumin text-3xl uppercase font-extralight leading-9 text-ash`; paragraphs `font-acumin text-xl leading-6 tracking-wider font-extralight text-ink`.
- Built **Manifesto** page (`sections/manifesto.liquid` + `templates/page.manifesto.json`): 100vh video banner (Shopify video > video_url > image), 'paragraph' blocks left col, numbered 'principle' blocks right col w/ center hairline, MANI/FIES/TO heading, MMXXV + colophon footer. Typography to spec: headings `font-roslindale`; paragraphs `font-acumin` 21.9px/35.9px/0.25em/w194.29 (194.29 = Acumin's default instance weight); numbers `font-roslindale` 15px/w300; subtext + colophon `font-aktiv` Hair(200). bg texture `fondo.png` set via theme editor → stored in remote template JSON.
- Built **Atelier** page (`sections/atelier.liquid` + `templates/page.atelier.json`): 100vh banner (same video/`pZ8HAi-bcRE` fallback chain as manifesto), then block-driven editorial body — `heading`, `paragraph`, `split` (media left in 3/4 frame + body/2-col text right), `image` (full-bleed natural-height band), `video_row` (3-up ambient autoplay embeds, 4/5 cells). Assets: `public/atelier-section-1.png` (788×1044) + `public/atelier-big-section.png` (1927×811). Typography per spec: heading `font-acumin text-2xl uppercase tracking-wider leading-8 font-light text-ash` (26px/32px/tr75/w300/#616160); body `font-acumin [font-weight:194.29] text-ink text-xl leading-6 tracking-wider` (21px/25.2px/tr75/w194.29).
- Built **Editorials** page (`sections/editorials.liquid` + `templates/page.editorials.json`): data model = **Blog articles** (chosen over metaobjects/blocks) — an `editorials` blog, one article per lookbook item; subtitle = `article.metafields.custom.subtitle` (defined in admin: Settings → Custom data → Articles), fallback = first tag rendered as "SS26 · Collection". Grid: centered heading + 2/3/5-col `aspect-[4/5]` tiles linking to `article.url`; heading = `blog.title` on blog templates, else the `heading` setting. Same section also powers `templates/blog.json` (falls back to `blog` global when section's `blog` setting is blank), so `/blogs/editorials` renders the grid natively — works for any blog (`/blogs/collabs`, `/blogs/drops`…).
- **Article lookbook templates** (assign per-article via Theme template dropdown in admin):
  - `article.json` → `sections/main-article.liquid` — editorials collage. Media priority: `custom.gallery_mixed` (mixed_reference list → metaobject entries w/ `video`/`url`/`image` fields; `snippets/article-media.liquid` unwraps them, video > url > image per cell) > `custom.media` (list of URLs) + `custom.gallery` (list of files) concatenated. Left col = media[0] + info panel (`snippets/article-info-panel.liquid`: logo + left-aligned content + credits), right col = 1-2-1 (wide 55vh, halves 62vh, wide 55vh); sr-only h1 only. `custom.logo` (image), `custom.credits` (multi-line) feed the panel.
  - `article.collabs.json` → `sections/article-collabs.liquid` — 3-col header (logo/content/credits), media cluster (gallery_mixed items 1-3: stacked pair + tall right in `md:w-2/3 md:ml-auto` aligned to header col 2), "BLOG / YEAR" label (`custom.subtitle` fallback auto), `custom.additional_content` (**rich text** → `| metafield_tag`) in grid col 2, bottom strip from `custom.gallery_bottom` (mixed_reference).
  - `article.drops.json` → `sections/article-drops.liquid` — left meta col (title `text-2xl`, date = subtitle or `published_at`, content, credits uppercase) + right mosaic (row1: items 1-2 stacked + item 3 tall `65vh`; row2: item 4 wide `45vh`; row3+: thirds `45vh`) + "READ MORE" related-articles grid (same blog, excludes current).
  - `article-media.liquid` also has a `natural` param (flow height, no crop). All videos = ambient muted/loop.
- Built **One of a Kind** page (`sections/one-of-a-kind.liquid` + `templates/page.one-of-a-kind.json`): scrapbook collage — journal image left (`md:w-[71%]`, static only; a polaroid video slot was built then removed), right column (`md:w-[43%] md:-ml-[14%]` = mockup's 71/43/14-overlap proportions) stacks `media` / `names` (gray band text) / `media_row` (3-up `aspect-[9/16]`) blocks, body paragraph `md:absolute bottom-0` under journal, footer = 3 link slots in `grid-cols-3`. New `snippets/ambient-media.liquid` = generalized media chain (video > video_url > image > asset > image_url) with `natural` flag — reuse for future slots. Placeholder crops in `public/one-of-a-kind-*.png|.jpg` come from the composite mockup — replace with real exports when available. Typography per spec: heading `font-acumin text-3xl uppercase font-light tracking-[0.35em] leading-9 text-ash` (30.59px/36.71px/w300); intro + body `font-plex-mono text-xl leading-6 tracking-wider text-ink` (IBM Plex Mono 21px/25.2px/tr75/w400).
- **Grid overlap gotcha**: auto-placed `col-span` items can't overlap occupied tracks (item gets clamped to col 12) — overlapping grid areas need explicit `col-start` on BOTH items, or use flex + negative `ml` instead (this page uses flex).
- Built **Bespoke** page (`sections/bespoke.liquid` + `templates/page.bespoke.json`): mockup lives in the BOTTOM half of `design/page-7.png` (top half = One of a Kind). Banner pulls under the fixed header via `margin-top: calc(-1 * var(--header-h,140px))` (mockup shows nav overlaid — first section to do this; spacer still renders above it). Blocks: `heading`, `paragraph`, `media_band` (full-bleed video>video_url>image chain, `height: min(Npx,60vw)` default 810), `media_row` (full-bleed 3-up `aspect-[3/4]`, ~68px gaps → `lg:gap-16`), `appointment` (heading + body + `cta` link left, media right bleeding to viewport edge via `lg:-mr-[calc(2.5rem+max(0px,(100vw-1800px)/2))]` — needs `overflow-x-clip` on the section). `ambient-media` gained a `sizes` param + 2000w srcset candidate (backward compatible). Typography per spec: headings `font-acumin text-[26.67px] uppercase tracking-wider leading-8 font-light text-ash` (26.67px/32px/tr75/w300/#616160); body `font-acumin [font-weight:194.29] text-ink text-[21px] leading-[25.2px] tracking-wider` (21px/25.2px/tr75/w194.29/#1d1d1b — SAME spec as atelier body; user-corrected, it is NOT serif).
- Published pending work to live theme #193457455467 via targeted `--only` push: new build bundle (`theme-C8vJT51l.css`/`theme-DzYe-WoL.js`) + `vite-tag.liquid`, bespoke section+template, ambient-media, our-story img-dims fix, footer bespoke link, and prior-session changes to `layout/theme.liquid`, `main-category`, `main-collection`, `main-product`, `product-card`. Template JSONs (other than new `page.bespoke.json`) intentionally NOT pushed.
- **`?view=` preview trick**: an unassigned `page.<suffix>` template can be previewed on any existing page via `/pages/<handle>?view=<suffix>` — no admin assignment needed to iterate locally.
- **Schema `range` limit**: max 101 steps ((max-min)/step ≤ 101) — `step: 0.5` over a 100-wide range fails upload with "Invalid schema"; use `step: 1` for %-position sliders.
- **CRITICAL fix**: `theme.css` had unlayered `img, video { height: auto }` — in Tailwind v4 unlayered CSS beats `@layer utilities`, so it silently overrode `h-full`/`height` utilities on every image (rendered at intrinsic height, leaving gaps). Now wrapped in `@layer base` — keep resets layered or utilities silently lose. Requires admin setup: create blog `editorials` + articles w/ featured image + season tag; assign `page.editorials` template to a Page for `/pages/editorials`.
- Enabled `publicDir: 'public'` in `vite.config.js` so fonts/images in `public/` copy to `assets/` on build.
- `f1020e3` — "Adding more changes" (header/hero/theme.js work batch).
- `4dbdc9e` — fix: header layout — remove justify-between conflict with ml-auto on right icons.

- Built **Collections** page (`sections/collections.liquid` + `templates/page.collections.json`, mockup = `design/page-4.png`): stacked per-collection units — each `collection` block = ambient-media campaign banner (first block pulls under fixed header via `margin-top: calc(-1 * var(--header-h,140px))`, corner labels `font-aktiv font-extralight` — left `campaign_label` defaults "<title> Campaign", right `season_label` e.g. "ARCHIVE / FW25") + white 4-col product grid + `collection_label` link under grid (defaults "<title> Collection"). `product-card` gained `hide_info` param (image-only cards; `show_product_info` checkbox per block). Products come from real Shopify collections — model = **automated collections by tag** (tag = collection handle, e.g. `reset` → "Reset"; distinct from material tags silver/gold/bronze; jewelry categories use product TYPE via `url_for_type`, so no conflict). Page lives at `/pages/collections` (NOT `/collections` — reserved Shopify collection index); needs a Page w/ `page.collections` template assigned in admin (preview via `?view=collections`).
- **Infinite scroll**: grids lazy-load via `initCollectionsInfinite` (theme.js) — IntersectionObserver on `[data-unit-sentinel]` fetches `/collections/<handle>?view=grid&page=N` from the `collection.grid` alternate template (`sections/collection-grid.liquid` — bare `{% paginate %}` card list + `data-grid-next` stop marker). Needed because `paginate` shares one `?page=` param — can't paginate N units on `/pages/collections` itself. Retry button on fetch error. `products_per_page` (collections section) must equal `per_page` (collection-grid section) or pages overlap/skip — both default 12.

- Built **OOAK Archive** (`sections/ooak-archive.liquid`, appended to `templates/page.one-of-a-kind.json` — it's the bottom half of the page-7 mockup, under the scrapbook collage): status tab row (`data-ooak-tab` sold/available buttons + bespoke link → `/pages/bespoke`, same `grid-cols-3`/`font-aktiv` styling as the OOAK footer nav) + numbered 3-col `aspect-[3/4]` object-contain grid (`font-plex-mono` numbers/status/title/price/`—`) + legend footer. Status = **`product.available`** (sold-out → "Sold / Collected") — sold pieces must stay PUBLISHED. Products via automated `one-of-a-kind` collection (tag = handle). Filter = `initOoakArchive` in theme.js — client-side hide + RENUMBER visible `[data-ooak-num]`, click active tab to reset. The collage's generic footer nav (`link_1-3_*` settings) was REMOVED from `one-of-a-kind.liquid` — it duplicated the archive tab row in the mockup; the archive's tab row is now the single nav/filter row.

- Pushed Collections + OOAK Archive work to live theme #193457455467 via targeted `--only` push (sections/snippets/assets first, templates second): `collections.liquid`, `collection-grid.liquid`, `ooak-archive.liquid`, `one-of-a-kind.liquid` (footer nav removed), `product-card.liquid` (`hide_info`), `vite-tag.liquid` + `theme-DXF7BCNs.css`/`theme-6tBcDpk3.js`, templates `page.collections.json` + `collection.grid.json`. `page.one-of-a-kind.json` pulled but NOT pushed — remote already holds editor data (ooak-archive configured w/ `one-of-a-kind` collection + `shopify://pages/bespoke` link). Remaining admin steps: create `page.collections`-template Page + automated collections (tag = handle), nav link → `/pages/collections`.

## Open TODOs
- [x] `bun init` + install dev deps (`vite`, `vite-plugin-shopify`, `@tailwindcss/vite`, `tailwindcss`, `@shopify/cli`, `@shopify/theme`)
- [x] Create `vite.config.js`
- [x] Create `frontend/entrypoints/theme.css` (Tailwind v4 entrypoint + `@theme` tokens)
- [x] Create `frontend/entrypoints/theme.js` (vanilla JS: mega-menu, cart drawer, carousel, announcement bar, image swap)
- [x] Create full Liquid tree: `layout/theme.liquid`, 8 sections, 4 snippets, 5 templates
- [x] Provide Shopify dev store `.myshopify.com` URL — wired into `package.json` scripts
- [x] Run `shopify theme check` — 0 errors, 3 warnings (Google Fonts remote asset warnings, acceptable)
- [x] Obtain and rasterize "ECOMM 40OZ" PDF into `design/` — 7 JPEG pages at 3840px width, ready for visual comparison
- [x] Our Story page — section + template live, typography tuned to spec
- [x] Manifesto page — section + template built
- [x] Atelier page — section + template built (block-driven editorial, ambient videos)
- [x] Editorials — index grid (`page.editorials`/`blog.json`) + lookbook article template (`gallery_mixed` metaobjects, 1-2-1 collage)
- [x] Collabs article template (`article.collabs`) — 3-col header, cluster, additional_content, gallery_bottom strip
- [x] Drops article template (`article.drops`) — meta col, 2+1/1/3 mosaic, related posts
- [x] One of a Kind page — section + template built (flex collage, Plex Mono typography); still needs a Page created in admin w/ `page.one-of-a-kind` template for `/pages/one-of-a-kind` to resolve
- [x] Fix global `img,video{height:auto}` overriding Tailwind `h-full` → moved into `@layer base`
- [x] Bespoke page — section + template **pushed live** (typography to spec: 26.67px ash headings, Acumin 21px/25.2px/w194.29 body); footer "Bespoke · Care · Restoration" now links `/pages/bespoke`. Remaining admin step: create Page (handle `bespoke`) w/ `page.bespoke` template, else preview via `?view=bespoke`; banner media still unset (needs theme-editor image/video or `asset`)
- [ ] Take reference screenshots of emanuelebicocchi.it — needed for section visual matching
- [ ] Fix `assets/.vite/` subfolder upload — `.shopifyignore` glob updated; verify next push syncs correctly
- [ ] Refine hero/header spacing and typography against PDF mockups once `design/` has PNGs
- [x] `@font-face` for Acumin Variable + Roslindale Variable — declared in `theme.liquid`, files in `public/` (survive builds)
- [x] aktiv-grotesk — served via Adobe Fonts kit `ugo5zjj.css` (linked in `theme.liquid`)
