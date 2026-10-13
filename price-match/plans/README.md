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
