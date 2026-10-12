# Jestik build plan

## Phase 1: Products (in progress)
- [x] Scrape ErgoDirect (2,782 live products) and AskErgoWorks (505), with source approval for content and images
- [x] Original, SEO-written description for every product; SEO title and meta description
- [x] 30 main category collections + 8 brand collections (rule-based) created and published
- [x] Finish ErgoDirect image grab (all 2,784 products have images)
- [ ] Owner imports `catalog-import/data/shopify_products_NEW.csv` (2,950 new products, DRAFT) in Shopify admin → Products → Import
- [ ] After import: add new products to the existing hand-picked collections (Chairs, Keyboards, Mouse, Monitor Arms, Desks, Keyboard Trays, Accessories)
- [ ] Review prices/margins, then bulk-publish

## Phase 1b: Refresh the existing 775 products and audit the whole site
- [ ] Pull every existing product (bulk query) and flag missing or thin descriptions, missing SEO, bad images, wrong vendor/type, broken variants
- [ ] Rewrite descriptions and SEO for the existing products in the same style
- [ ] Clean up vendors (CHIEF vs Chief, Hat Design Works) and product types; fix tags so products land in the new collections
- [ ] Audit every page and the old Shogun landing pages; remove dead pages, redirect old URLs, fix broken links
- [ ] Policies, About, Contact, FAQ, Shipping: refresh the copy

## Phase 2: Launch the new theme
- [x] Mega menu (5 category columns + promo card) and Brands dropdown
- [x] "Jestik – Bezel × Asset Desk" theme (unpublished): Lovable banner + search card, Bezel-style grids, quote pop-up, sharp product photos
- [ ] Owner review in Customize, then Publish (Online Store → Themes)

## Phase 3: ErgoDirect-style features, ranked by impact vs effort
| # | Feature | Effort | Why |
|---|---------|--------|-----|
| 1 | Buying guide + FAQ (with FAQPage schema) on every main collection page | S | Collection pages rank for "how to choose X" searches |
| 2 | Product page tabs: Specifications table, PDF downloads (manuals and certifications), FAQ | M | Business buyers expect them; adds rankable content |
| 3 | Workspace Planner: enter your height, get sitting/standing desk, keyboard and monitor heights, plus product picks | M | Runs in the browser, attracts links, leads to sales |
| 4 | Finders (chair, monitor arm, standing desk, converter, cart): "tell us your setup" forms that email you and tag the customer | S–M | Leads from people close to buying; can later show instant results |
| 5 | Measurement guides (seat height, elbow height, seat width/depth) linked from chair pages | S | Fewer returns, lasting search traffic |
| 6 | Monitor-arm accessory add-ons (clamps, VESA adapters, extensions) on product pages | M | Bigger orders |
| 7 | Ask a Question on product pages, plus a public Q&A page | M | Shoppers' questions become long-tail content |
| 8 | Collection filters: number of monitors, weight capacity, mount type, seat-height range (Search & Discovery + metafields) | S–M | Easier to shop large collections |
| 9 | Ergonomic self-check pop-up (7 yes/no questions, then tips and product picks) | M | Lead capture |
| 10 | Corporate / volume program page (private pricing, quotes) | S | B2B orders |

**Differentiators ErgoDirect doesn't have:** financing (Shop Pay Installments), newsletter signup, in-stock / ships-by messaging, product compare.

## Phase 4: Blog / content
- Restyle the blog in the new design (theme sections are ready)
- Refresh existing posts (update content, then the date) and publish 2–4 sizing/fit guides a month with embedded products
- ErgoDirect's blog has mostly stopped (about one post a year since 2022), so consistent posting is an easy win

## Phase 3 build order (from competitor feature audit, 2026-10-11)
Full catalogue: `docs/competitor-features.json` (67 features). Built so far: Workspace Fit Calculator (`/pages/workspace-calculator`), Monitor Arm Finder (`/pages/monitor-arm-finder`).

1. Faceted filters on every collection (specs metafields: screens, mount, motion, weight capacity, screen size, chair style/features, layout, connection, switches, mouse style, hand, lift, tray component, color).
2. Chair Finder that shows matched chairs instantly (theirs only emails a lead).
3. 7-question workstation self-check with score, fixes and product links.
4. "Where it hurts" symptom guide (neck, shoulders, back, wrists, legs).
5. Seat height / cylinder checker and chair measuring guides.
6. Standing desk vs converter chooser.
7. Product-page add-ons and "complete the setup" bundles.
8. Volume pricing + Teams program page (approved catalog, Net-30 application, account manager).
9. Product Q&A feeding a FAQ hub; downloads tab (spec sheets, drawings).
10. Reviews with star breakdown; cart free-shipping/rewards bar; Shop Pay Installments; live chat.
11. Clear returns policy and per-product lead-time messaging (their weakest area).
