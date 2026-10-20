# Category Pages Setup Instructions

This document explains how to set up the category pages in Shopify admin for the nested URL structure (`/pages/necklaces`, `/pages/bracelets`, etc.).

## Overview
The theme now uses custom page templates with Liquid type filtering to support nested URLs for SEO. Each category page is a Shopify page with a specific handle that determines which products to show.

## Product Categories (Updated)
Products have been updated to match the reference structure:
- NEW CHAPTER
- GEMS & STONES
- NECKLACES
- BRACELETS
- EARRINGS
- RINGS
- CLOTHING
- ACCESSORIES
- COLLABS

## Pages to Create

Create a page for each category (9 total):

1. **NEW CHAPTER**
   - Title: NEW CHAPTER
   - Handle: `new-chapter`
   - Template: `page.category`

2. **GEMS & STONES**
   - Title: GEMS & STONES
   - Handle: `gems-stones`
   - Template: `page.category`

3. **NECKLACES**
   - Title: NECKLACES
   - Handle: `necklaces`
   - Template: `page.category`

4. **BRACELETS**
   - Title: BRACELETS
   - Handle: `bracelets`
   - Template: `page.category`

5. **EARRINGS**
   - Title: EARRINGS
   - Handle: `earrings`
   - Template: `page.category`

6. **RINGS**
   - Title: RINGS
   - Handle: `rings`
   - Template: `page.category`

7. **CLOTHING**
   - Title: CLOTHING
   - Handle: `clothing`
   - Template: `page.category`

8. **ACCESSORIES**
   - Title: ACCESSORIES
   - Handle: `accessories`
   - Template: `page.category`

9. **COLLABS**
   - Title: COLLABS
   - Handle: `collabs`
   - Template: `page.category`

## Step-by-Step Instructions

1. Go to Shopify Admin → Online Store → Pages
2. Click "Add page"
3. Fill in the fields:
   - **Title**: e.g., "NECKLACES"
   - **Handle**: e.g., `necklaces` (lowercase, no spaces)
   - **Content**: Leave empty (the template handles everything)
   - **Template**: Select "page.category" from the dropdown
4. Click "Save"
5. Repeat for all 9 pages listed above

## Critical Notes

- **Handles must match exactly**: The Liquid filtering logic uses the page handle to determine which products to show. Handles must be lowercase with no spaces (e.g., `necklaces`, not `Necklaces`).
- **Template selection**: Always select "page.category" for these category pages.
- **Content**: Leave the page content empty — the template renders the product grid automatically.

## Product Data

The CSV has been updated with the new category structure. Products are now categorized as:
- NECKLACES (formerly Necklace)
- BRACELETS (formerly Bracelet)
- EARRINGS (formerly Earring)
- RINGS (formerly Ring)
- ACCESSORIES (formerly Belt, Brooch, Cufflink, Wallet Chain, Accessory)

Import the updated CSV with "Overwrite existing products" checked.

## Mega-Menu Setup

The mega-menu is now a simple dropdown (single column). Set it up in Shopify Admin:

1. Go to Shopify Admin → Online Store → Navigation
2. Create or edit your main menu
3. Add top-level items: JEWELRY, BRAND, ARCHIVE
4. Under JEWELRY, add nested items:
   - NEW CHAPTER
   - GEMS & STONES
   - NECKLACES
   - BRACELETS
   - EARRINGS
   - RINGS
   - CLOTHING
   - ACCESSORIES
   - COLLABS
5. Link each nested item to its corresponding page (e.g., NEW CHAPTER → `/pages/new-chapter`)

## Features

- **Material filters**: All / Silver / Gold / Bronze tabs on each category page
- **Load More button**: Shows 12 products initially, loads 12 more on each click
- **Product count**: Displays total products in the category
- **Hover zoom**: Product cards have image swap on hover (already implemented)
- **4-column grid**: Responsive grid matching the reference

## Testing

After setup:
1. Navigate to `/pages/bracelets` — should show only bracelets
2. Click "Load More" — should load 12 more products
3. Click "Silver" filter — should show only silver products
4. Test the mega-menu dropdown — should show single-column list
5. Navigate to `/pages/unknown-handle` — should show all products (fallback)
