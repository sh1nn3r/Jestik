# Jestik catalog import

Builds a Shopify product import for jestik.com from the ErgoDirect and
AskErgoWorks catalogs, and documents how to move the Chrono Candy theme onto
jestik.com.

## What is (and isn't) copied

| Copied | Not copied |
|---|---|
| Category tree, product names, brands, SKUs/model numbers, prices, options, spec facts | Product photos (copyrighted). Use manufacturer dealer/media images instead; see `data/image_sourcing.csv` |
| | Source marketing copy. Claude writes new descriptions from the facts (`write_descriptions.py`) |

## Steps

```bash
pip install -r requirements.txt

python scrape_askergoworks.py        # ~1 min, Shopify products.json
python scrape_ergodirect.py          # ~1-2 h at 1 req/s, resumable; skips discontinued products

export ANTHROPIC_API_KEY=...         # https://console.anthropic.com
python write_descriptions.py submit  # Batches API (50% cheaper)
python write_descriptions.py collect # waits for the batch, saves data/descriptions.json

python build_shopify_csv.py          # --markup 0.95 to undercut source prices
```

Outputs in `data/`:

- `shopify_products.csv`: import in **Shopify admin > Products > Import**. All products come in
  as **draft** with no images, so review them before publishing. Products sold by both stores
  are de-duplicated by SKU.
- `collections.csv`: one row per category. In **Products > Collections > Create collection**,
  choose *Automated* with the condition **Product tag is equal to** the value in column 2.
- `image_sourcing.csv`: brand + SKU list to request images from each manufacturer or distributor.

## Moving the Chrono Candy design to jestik.com

Chrono Candy runs **"Chrono Candy – Bezel" (Minimog OS 2.0 v5.5.0)**. Jestik currently runs
**Impulse 7.5.2**. Both are Shopify, so the theme can be copied as-is:

1. **License:** Minimog (ThemeForest) is licensed per store. Buy a second license for jestik.com
   before publishing it there.
2. **Export:** chronocandy.com admin > Online Store > Themes > "Chrono Candy – Bezel" > `...` >
   **Download theme file**. Shopify emails you a .zip.
   (Or with Shopify CLI: `shopify theme pull --store chronocandy.myshopify.com --theme 150116007978`.)
3. **Import:** jestik.com admin > Online Store > Themes > **Add theme > Upload zip file**. It
   arrives unpublished, so the live Impulse theme is untouched.
   (CLI: `shopify theme push --store <jestik>.myshopify.com --unpublished`.)
4. **Things that don't travel with the zip; redo them on Jestik:**
   - Logo, favicon and section images (they live in Chrono Candy's Files). Upload Jestik's own.
   - Navigation menus: rebuild from `collections.csv` (Online Store > Navigation).
   - Apps and app blocks (reviews, filters, wishlists): reinstall on Jestik.
   - Homepage/collection sections that point at Chrono Candy's watch collections: repoint them
     to the new ergonomic collections.
   - Watch-specific text (Rolex/Patek copy, announcement bar, footer, policies).
5. Preview with **Customize**, then **Publish** when ready.
