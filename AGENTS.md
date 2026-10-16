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
| Vite | TBD (to install) | Bundler via `vite-plugin-shopify` |
| Tailwind CSS | v4 | CSS framework via `@tailwindcss/vite` |
| Shopify CLI | TBD (to install) | `@shopify/cli` + `@shopify/theme` npm packages |

Fonts: **Cormorant Garamond** (fallback for Roslindale) + **Inter** (fallback for Acumin/Myriad Pro) — both from Google Fonts.

## Architecture
```
Vite (vite-plugin-shopify)
  └── frontend/entrypoints/theme.css  → Tailwind v4 tokens + utilities
  └── frontend/entrypoints/theme.js   → vanilla JS modules
        → compiled → assets/ (Shopify serves these)

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
├── layout/                — theme.liquid (master layout)
├── sections/              — Shopify sections (announcement-bar, header, hero, etc.)
├── snippets/              — reusable Liquid partials (vite-tag, product-card, etc.)
├── templates/             — page templates (index, collection, product, page, cart)
├── config/                — settings_schema.json
├── locales/               — en.default.json
├── design/                — rasterized PDF page PNGs + emanuelebicocchi.it screenshots
└── assets/                — Vite build output (auto-generated, do not edit)
```

## Conventions
- **Package manager**: always use `bun` — never `npm` or `yarn` directly
- **CSS**: Tailwind v4 `@import "tailwindcss"` + `@theme {}` block for design tokens
- **JS**: vanilla ES modules only — no framework; lightweight and tree-shakeable
- **Liquid**: one section per file; every section has a `{% schema %}` block with `name`, `settings`, and `presets`
- **vite-tag snippet**: used in `theme.liquid` to inject Vite-managed assets — never hardcode asset URLs
- **Colors (from mockups)**:
  - `--color-black: #0a0a0a`
  - `--color-white: #fafafa`
  - `--color-gold: #c9a96e` (placeholder — refine after rasterizing PDF)
  - `--color-mid: #6b6b6b`

## Commands
```bash
# Enter dev shell (auto via direnv, or manually):
nix develop

# Install dependencies (after package.json exists):
bun install

# Start Vite dev server:
bun run dev

# Build for production:
bun run build

# Start Shopify theme dev (opens browser OAuth on first run):
bun run theme:dev   # → yxxehz-a9.myshopify.com / dev.cuarentaonzas.com

# Push theme to store:
bun run theme:push

# Shopify theme linting:
bun run theme:check
```

> **Note**: `bun run dev` and `bun run theme:dev` are meant to run together — Vite serves assets, Shopify CLI proxies the store preview.

## Gotchas & Known Issues
- **nix flake path tracking**: `flake.nix` must be `git add`-ed before `nix flake lock` will see it — Nix only reads git-tracked files.
- **direnv hook**: `direnv allow` must be run once per clone. If the shell doesn't activate, check that direnv is hooked into your shell (`eval "$(direnv hook zsh)"` in `.zshrc`).
- **Node version**: machine has Node 26 (Homebrew) globally, but the nix shell pins Node 22 for Shopify CLI compatibility. Always work inside the nix shell.
- **Shopify CLI auth**: first run of `shopify theme dev` opens a browser OAuth flow — you must approve it manually.
- **Shopify store URLs**: internal = `yxxehz-a9.myshopify.com`, custom domain = `dev.cuarentaonzas.com`. Both wired into `package.json` scripts.
- **PDF rasterization**: the "ECOMM 40OZ" design PDF is not yet in the repo. When obtained, rasterize each page with `qlmanage -t -s 2560 -o design/` and commit to `design/`.
- **Mobile breakpoints**: PDF mockups only show 1920px desktop. Mobile layouts mirror emanuelebicocchi.it responsive patterns (mobile nav drawer, single-column grid).

## Recent Context
- `fc8a0cd` — Added nix flake + direnv environment (`flake.nix`, `.envrc`, `flake.lock`). Pinned nixpkgs-unstable @ 2026-10-16. Provides bun 1.4.2 + node 22.23.3.
- `21431b6` — Initial commit (README only).
- **Next steps**: scaffold `package.json` with bun, install Vite + Tailwind v4 + Shopify CLI, create Liquid theme structure.

## Open TODOs
- [ ] `bun init` + install dev deps (`vite`, `vite-plugin-shopify`, `@tailwindcss/vite`, `tailwindcss`, `@shopify/cli`, `@shopify/theme`)
- [ ] Create `vite.config.js`
- [ ] Create `frontend/entrypoints/theme.css` (Tailwind v4 entrypoint + `@theme` tokens)
- [ ] Create `frontend/entrypoints/theme.js` (vanilla JS: mega-menu, cart drawer, carousel, announcement bar, image swap)
- [ ] Create full Liquid tree: `layout/theme.liquid`, 8 sections, 4 snippets, 5 templates
- [ ] Obtain and rasterize "ECOMM 40OZ" PDF into `design/`
- [ ] Take reference screenshots of emanuelebicocchi.it
- [ ] Provide Shopify dev store `.myshopify.com` URL to wire up CLI scripts
- [ ] Run `shopify theme check` — target 0 errors
