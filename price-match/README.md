# Price Match

A weekly report that compares our watch prices with competitors' and suggests
new prices. **It only reads.** It never changes prices in Shopify. Someone
reviews the report and decides what to change.

## What it checks

| Source | Config `type` | Cost |
|---|---|---|
| Competitor stores running on Shopify (most watch dealers) | `shopify-store` | Free |
| Google Shopping via [DataForSEO](https://dataforseo.com) | `dataforseo` | ~$0.002 per watch per check (~$55/mo weekly for ~6,300 watches) |
| Google Shopping via [SerpApi](https://serpapi.com) | `serpapi` | Plan-based (~$275/mo weekly for ~6,300 watches) |

Use one Google Shopping provider, not both. Bing is left out: Microsoft
retired its search APIs, and for watches Bing mostly finds the same sellers.

## How a competitor listing counts as "the same watch"

1. The **reference number** must appear in it (`278384RBR` matches
   `278384RBR-0005` but not `278384`).
2. The **dial** must not contradict ours: color (slate is not rhodium,
   mother-of-pearl is not white), hour markers (Roman, Arabic, index,
   diamond) and pattern (motif, star, floral). Case metal and bezel words are
   ignored when reading the dial.
3. The **bracelet** must not contradict ours (Oyster, Jubilee, President).
4. The **condition** must not contradict ours. Unworn is never compared to
   pre-owned.
5. **Modified** watches ("custom", "aftermarket", "iced out") are never used.

When a listing leaves out the dial, condition, or diamond markers, it is
marked *medium* confidence and listed for review instead of priced.

## Pricing rules (`pricing` in `config.json`)

| Setting | Default | Meaning |
|---|---|---|
| `undercut` | `0` | Dollars below the competitor. `0` = match exactly. |
| `minMarginPct` | `8` | Never suggest less than cost + this %. Only applies when the cost is filled in on the Shopify product. |
| `maxDropPct` | `5` | Never suggest dropping more than this % in one week. |
| `ignoreBelowPct` | `60` | Prices under this % of ours are treated as suspicious (wrong item, deposit, scam) and not used. |
| `roundTo` | `1` | Round suggested prices to this many dollars. |
| `minConfidence` | `high` | Only confirmed matches (dial, markers and condition all agree) produce a suggested price. Others are listed as `review`. |

## The report

Each run writes `reports/price-match-<date>.csv` (open in Excel or Google
Sheets) and a `.json` with every matched and excluded listing. The `action`
column says what to do:

- `match`: a competitor is lower. Suggested price matches them.
- `partial-to-floor`: a competitor is lower than we can go. Suggested price is our floor.
- `below-floor`: a competitor is lower, and we're already at the floor.
- `review`: a competitor looks cheaper, but their listing doesn't confirm the dial or condition. Check by eye.
- `already-lowest`: nobody is cheaper.
- `no-match`: no competitor lists this watch.
- `skipped`: we couldn't read a reference number from the SKU.

## Setup

1. **Our catalog:** with no setup, the tool reads chronocandy.com's public
   catalog. Watches priced at $0 (price on request) are skipped. For the
   cost-based price floor, optionally give it Shopify access: in Shopify admin,
   go to *Settings → Apps → Develop apps*, create an app with the
   `read_products` and `read_inventory` scopes, and add its token as
   `SHOPIFY_ADMIN_TOKEN` (plus `SHOPIFY_STORE`). Without a token, the only floor
   is `maxDropPct`.
2. **Competitors:** add each one to `sources` in `config.json`:
   ```json
   { "id": "the-competitor", "type": "shopify-store", "name": "The Competitor", "domain": "thecompetitor.com" }
   ```
   To check whether a site is on Shopify, open `https://<their-site>/products.json`.
   If you see product data, it works.
3. **Google Shopping (optional):** create a DataForSEO account and set
   `"enabled": true` on the `google-shopping` source.
4. **Weekly schedule:** in GitHub, go to *Settings → Secrets and variables → Actions*
   and add the secrets you use: `SHOPIFY_STORE` / `SHOPIFY_ADMIN_TOKEN` (optional)
   and `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` (if Google Shopping is on).
   Until a competitor is enabled in `config.json`, the weekly run does nothing.
   The report runs every Monday. Download it from the run's page under
   *Actions → Weekly price match report*. Use *Run workflow* to run it on demand.

## Running it yourself

```bash
cd price-match
node src/cli.js --limit 20                # try a few watches first (reads chronocandy.com)
node src/cli.js --storefront              # force the public catalog even if a token is set
node src/cli.js --sku "278384RBR dkgio"   # one watch
node src/cli.js --catalog products.json   # use an exported catalog instead of the API
npm test
```

Requires Node.js 20 or newer. No packages to install.
