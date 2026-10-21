# Jestik competitor scan: US ergonomic office products

Checked on 2026-10-21. Research only: nothing was submitted, purchased or registered.

How this was done: brand and SKU web searches showed which retailers keep coming up. For each one I then checked:
- `/products.json` and `/search/suggest.json` (Shopify stores)
- the WooCommerce Store API (WooCommerce stores)
- `robots.txt` and the sitemap
- schema.org JSON-LD and price meta tags on product pages

Where a site blocked bots, prices come from search-result snippets and are marked "(snippet)".

Machine-readable data is in two files:
- `competitors.json`: an array of 32 competitors.
- `competitors_meta.json`: Jestik's reference prices plus the excluded and defunct sites.

## Notes on the spot-check items

- **Ergotron LX 45-241-026 is discontinued.** Markertek says "no longer available" and Jestik does not carry it. I compared the replacement, the **LX Pro 45-682-026**, instead.
- **Humanscale M2.1 is now sold as the "M2 Pro".** Its SKU family is M21xxxx.

## Price comparison (USD)

| Item | Jestik | ErgoDirect | Human Solution | Ergo Experts | Other specialists | IT/B2B | Big-box | Brand direct / MSRP |
|---|---|---|---|---|---|---|---|---|
| Ergotron LX Pro 45-682-026 | **199.00** | 199.00 | – | – | Markertek: 283 (LX Pro 45-695, different SKU) | SHI MSRP 265 | Staples 199.00 (-292 black) | MSRP about 265 |
| Humanscale M2 Pro, clamp (M21BTBC/BTSC) | **305.00** (generic listing 434) | 434.00 (generic) | 314.00 (M2.1) | **259.00** | Relax The Back 314; CA Modern Home 434 | SHI 328 / CDW 347.99 (M/Flex kit, snippet) | – | about 314 |
| Kinesis Advantage360 Pro KB360-PRO-GBR | **459.00** | 499.00 | – | – | – | CDW 486.99; Newegg 479 (snippet) | – | Kinesis 499.00 |
| Evoluent VM4R | **89.95** | 92.25 | – | – | – | CDW 99.99, SHI 99.00 (snippet) | Walmart 89.95–110.66 (snippet) | MSRP 89.95 |
| Workrite Banana-Board tray system | **431.40** | 431.40 | from 575 | – | – | – | – | Workrite shop 559.00 |
| Workrite Banana-Board tray (2128/2133-22) | **220.20** | 220.20 | – | – | – | – | – | – |
| Office Master PT79 | **720.20** | – | 721.00 | 720.20 | Parlor City 720.20 | – | – | list 1,108 |
| Office Master OM5-AT | **288.60** | – | – | – | Parlor City 291.85 | – | – | list 449 |

**What the table shows:**
- **Jestik is at or below every competitor seen, with one exception.** Ergo Experts sells the Humanscale M2 Pro for $46 less ($259 vs $305).
- **Jestik is the cheapest seller found for the Kinesis Advantage360 Pro.** It is $40 under MSRP, and ErgoDirect charges $499.
- **ErgoDirect matches Jestik to the cent on several SKUs.** These include the Banana-Board ($220.20 and $431.40) and the LX Pro ($199). It looks like both buy from the same distributor or follow the same MAP.
- **Office Master and Ergotron are firmly MAP-priced across the channel.**
- **IT resellers and big-box stores are generally higher.** CDW is about 6–11% above Jestik, and Staples is far higher on WorkFit (TX $1,147 vs CDW $824).

## Ranked competitors

### (a) Ergonomic specialists

| # | Retailer | Brand overlap | Pricing vs Jestik | Free shipping | Platform | Machine-readable? |
|---|---|---|---|---|---|---|
| 1 | **ErgoDirect** (ergodirect.com) | Nearly identical: Ergotron, Chief, Workrite, Innovative, Humanscale, Office Master, Ergotech, Kinesis, Cotytech, ESI, Kensington, 3M, Evoluent, Capsa, SpaceCo | Same; higher on Kinesis and VM4R | not verified | Custom PHP, Cloudflare | **Yes**: sitemap of about 6.1k URLs with lastmod, plus JSON-LD Offer on each page |
| 2 | **The Human Solution / UPLIFT** | Humanscale, Innovative, 3M, Workrite, Kinesis, ESI, Evoluent, Office Master, ISE | Higher (MSRP) | not verified | BigCommerce | Partial: product sitemap of about 989 URLs, plus an itemprop price on each page |
| 3 | **Ergo Experts** | Office Master, ESI, Workrite, Innovative, Humanscale | **Cheaper on Humanscale**, MAP on Office Master | not verified | Shopify | **Yes**: products.json (about 354 products) |
| 4 | **Parlor City Furniture** | OM Seating (209 products), Humanscale | MAP | not verified | Shopify | **Yes**: products.json (about 6.8k products) |
| 5 | **Touchboards** | Ergotron, ESI | Historically near MAP | not verified | ? | **No**: TLS certificate expired when checked; the site may be lapsing |
| 6 | **Relax The Back** | Humanscale | MSRP or promotional | Over $500 | Shopify | **Yes**: products.json (about 258 products) |
| 7 | **CA Modern Home** | Humanscale (authorized) | MSRP | Over $99 (old banners) | Shopify | **Yes** |
| 8 | **BTOD.com** | Humanscale | Around MSRP | Yes (contiguous US) | Magento | Partial |
| 9 | **OfficeChairsUSA** | Humanscale, Office Master | – | – | BigCommerce | Partial (sitemap) |
| 10 | **MyWorkSupply (mywork.one)** | Workrite, Humanscale | Login-only | – | ? | No |
| 11 | **iMovR** | Own brand (sit-stand, trays) | n/a | Yes | Shopify | Yes |
| 12 | **Ergonomic Office Solutions** | Ergotron | – | – | ? | Unclear |
| 13 | **EngineerSupply** | ESI | Below list | – | .aspx | Partial |

**Checked and excluded:**
- **Fully / ErgoDepot:** redirects to the Herman Miller store.
- **ErgoEmporium and Ergonomic Essentials:** parked domains.
- **Ergo Desktop:** the sitemap now lists spam pages.
- **Healthy Back:** a Shopify store with 0 products.
- **ergonomic-store.com:** unreachable.
- **SmartFurniture:** no brand overlap confirmed.
- **Madison Seating:** mostly refurbished Herman Miller and Steelcase.

### (b) IT / B2B resellers

| # | Retailer | Brand overlap | Pricing vs Jestik | Machine-readable? |
|---|---|---|---|---|
| 14 | **CDW** | Ergotron, Humanscale, Kinesis, Evoluent, Chief, Kensington, 3M | Higher (VM4R 99.99; KB360 486.99) | Partial: pages fetchable with a `data-price` attribute; no feed |
| 15 | **SHI** | Humanscale, Ergotron, Kinesis, Evoluent | Mixed | No (403) |
| 16 | **Markertek** | Ergotron, Chief | Near MAP. Free shipping over $49. | Partial (pages fetchable) |
| 17 | **Newegg / NeweggBusiness** | Ergotron, Kinesis, Workrite | Sometimes cheaper via sellers (WorkFit-TX $569 via Adorama) | No (403) |
| 18 | **CompSource** | Humanscale, Ergotron, Chief | Below list on some items | No (Cloudflare); sitemap index is reachable |
| 19 | **B&H** | Ergotron, Chief (not verified) | – | No (403) |
| 20 | **Connection** | Humanscale | Quote-based | No |
| 21 | **Insight** | (not verified) | – | No |
| 22 | **Zones** | (not verified) | – | No |
| 23 | **Zoro** | Cotytech | Free shipping | No |
| 24 | **SoundPro** | Chief (K1C120B $315.20 vs MSRP $394) | Below MSRP | Yes (Shopify) |
| 25 | **Transource** | Ergotron | – | Partial (wp-sitemap) |

### (c) Big-box and marketplaces

| # | Retailer | Brand overlap | Pricing vs Jestik | Machine-readable? |
|---|---|---|---|---|
| 26 | **Amazon** | Most brands (not verified, blocked) | Probably at MAP or lower through third-party sellers | No (503). Needs Keepa, PA-API or Helium 10. |
| 27 | **Staples / Quill / Staples Advantage** | Ergotron, Humanscale, Workrite, HAT (Quill), 3M, Kensington | MAP on LX Pro ($199). Much higher on WorkFit and Humanscale trays. | No (403) |
| 28 | **Walmart** | Evoluent, Ergotron carts | Third-party sellers, mixed | No (bot challenge) |
| 29 | **Office Depot** | (not verified) | – | No (JS-rendered) |
| 30 | **Best Buy** | Kinesis | – | No |

### (d) Brand-direct stores (they also compete for the same buyers)

| # | Store | Price seen | Machine-readable? |
|---|---|---|---|
| 31 | **Kinesis** | MSRP $499 | **Yes**: open WooCommerce Store API (`/wp-json/wc/store/v1/products?search=`) |
| 32 | **Workrite shop** | MSRP $559 | **Yes**: Shopify products.json |

Not checked: Ergotron.com (403), Humanscale.com and Evoluent.com (WordPress).

## Machine-readable catalogs for automated price monitoring

**Easy (structured JSON, no bot block):**
- Ergo Experts, Parlor City, Relax The Back, CA Modern Home, iMovR, Workrite shop and SoundPro: Shopify `products.json` and `search/suggest.json`.
- Kinesis: WooCommerce Store API.
- Jestik itself (Shopify) can be used as the join key.

**Medium (sitemap plus per-page structured price):**
- **ErgoDirect** has the best coverage: a sitemap with lastmod, plus JSON-LD offers that include availability. This is the highest-value target.
- The Human Solution, OfficeChairsUSA (BigCommerce price meta tag), CDW (`data-price`), Markertek and EngineerSupply.

**Hard (blocked or needs a commercial data source):**
- Amazon, Staples, Walmart, B&H, Newegg, SHI, Connection, Insight, Zones, CompSource, Zoro and TEquipment (Incapsula).
- Use Google Shopping or Keepa or a paid feed for these.
