# Approved price change plans

`2026-10-13-safe-cuts.csv`: 85 watches where a competitor sells the exact
same watch less than 5% cheaper. Approved by the owner on 2026-10-13.

How to apply a plan (on chronocandy.com, Shopify store jestik-collection):
1. For each row, look up the variant by `sku`. If its current price is not
   `old_price`, skip the row and report it.
2. Set the variant price to `new_price`. Change nothing else.
3. Keep `old_price` as the record for undoing the change.

`2026-10-13-new-models-shortlist.csv`: 285 Rolex, Patek Philippe and
Audemars Piguet references that two or more competitors list and
chronocandy.com does not, with competitor low/median/high prices. Not yet
approved. Before any are added: the owner confirms which they can source,
supplies their own photos and descriptions (never copied from competitors),
and they are created as drafts for review.

`2026-10-13-safe-cuts-shopify-import.csv`: the same 85 changes in Shopify's
product import format, priced $50 below the competitor (owner's choice),
rounded down to whole dollars. Live prices were rechecked against chronocandy.com
before it was made. Import with "Overwrite products with matching handles".
Only Handle, Title, option columns (filled with current values), SKU and
price are included, so nothing else on the listings changes.
`2026-10-13-safe-cuts-UNDO-shopify-import.csv` restores the old prices.

`2026-10-13-on-request-pricing-*.csv`: prices for 103 "price on request"
watches that have a confirmed match (treated as unworn, since these are
"available to order"). Owner's rule: be second-cheapest. Every one has only
one competitor seller, so the price is $50 above that seller. Not yet
approved. The UNDO file sets them back to $0 (price on request).

`2026-10-13-fix-prices-*.csv`: 102 price-on-request watches priced by the second-cheapest rule ($50 above the only competitor seller), plus the Gondolo 7042/100G-001 set to $0 (price on request) instead of $1,100,000. Owner approved: "if not sure, make it price on request".

`2026-10-13-raise-prices-*.csv`: 115 watches priced at least 5% below every competitor; proposed price is $50 under the cheapest competitor. Not yet approved.

Applied 2026-10-13 via the Shopify connector: all 115 raise-prices changes succeeded. Restore with `2026-10-13-raise-prices-UNDO.csv` (Products → Import, overwrite).

`2026-10-13-match548-*`: owner approved matching all 548 watches where WatchGuys or WatchGuyNYC sells the exact same watch cheaper; new price is $50 under the cheaper of the two. Applied via the Shopify connector. UNDO restores prior prices.
