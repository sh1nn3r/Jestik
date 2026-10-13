import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCatalogItems } from '../src/catalog.js';
import { runPriceMatch } from '../src/run.js';
import { toCsv } from '../src/report.js';
import { createShopifyStoreSource } from '../src/sources/shopify-store.js';
import { toListings as dfsListings } from '../src/sources/dataforseo.js';

const ourProduct = {
  id: 'gid://shopify/Product/1',
  title: 'Rolex Steel and White Gold Datejust 31 Watch - Diamond Bezel - Dark Grey Index Dial - Oyster Bracelet - 278384RBR dkgio',
  handle: 'rolex-278384rbr-dkgio',
  vendor: 'Jestik Collection',
  tags: ['rolex', 'unworn', 'watch'],
  variants: { nodes: [{ id: 'v1', sku: '278384RBR dkgio', price: '22220.00', inventoryItem: { unitCost: { amount: '19000' } } }] }
};

function fakeFetch(pages) {
  return async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => ({ products: pages[page - 1] || [] }) };
  };
}

test('end to end against a Shopify competitor', async () => {
  const catalog = toCatalogItems(ourProduct, 'chronocandy.com');
  assert.equal(catalog[0].brand, 'Rolex');
  assert.equal(catalog[0].condition, 'unworn');
  assert.equal(catalog[0].cost, 19000);

  const competitor = createShopifyStoreSource(
    { id: 'comp', name: 'Competitor', domain: 'comp.example' },
    {
      delayMs: 0,
      fetchImpl: fakeFetch([[
        { title: 'Rolex Datejust 31 278384RBR Grey Index Dial', handle: 'dj', tags: ['Unworn'], body_html: '',
          variants: [{ id: 9, price: '21900.00', available: true }] },
        { title: 'Rolex Datejust 31 278384RBR Pink Diamond Dial', handle: 'dj-pink', tags: ['Unworn'], body_html: '',
          variants: [{ id: 10, price: '20500.00', available: true }] },
        { title: 'Rolex Datejust 31 278384RBR Grey Dial', handle: 'dj-sold', tags: ['Unworn'], body_html: '',
          variants: [{ id: 11, price: '20000.00', available: false }] }
      ]])
    }
  );

  const [r] = await runPriceMatch({ catalog, sources: [competitor], pricing: {}, ownDomains: ['chronocandy.com'] });
  assert.equal(r.action, 'match');
  assert.equal(r.suggestedPrice, 21900);
  assert.equal(r.rejected.length, 1); // the pink dial
  assert.match(toCsv([r]), /^action,sku/);
});

test('DataForSEO installment prices are converted to full price', () => {
  const listings = dfsListings({ tasks: [{ result: [{ items: [
    { type: 'google_shopping_serp', title: 'Rolex 278384RBR', price: 2000, price_multiplier: 12, currency: 'USD', seller: 'Shop' },
    { type: 'google_shopping_paid', title: 'ad', price: 1 }
  ] }] }] });
  assert.equal(listings.length, 1);
  assert.equal(listings[0].price, 24000);
});

test('price-on-request watches ($0) are skipped, not compared', async () => {
  const catalog = toCatalogItems({ ...ourProduct, variants: [{ id: 'v', sku: '278384RBR dkgio', price: '0.00' }] }, null);
  const never = { id: 'n', search: async () => { throw new Error('should not be called'); } };
  const [r] = await runPriceMatch({ catalog, sources: [never], pricing: {} });
  assert.equal(r.action, 'skipped');
  assert.match(r.note, /price on request/);
});

test('our own store is ignored when Google names it as a seller', async () => {
  const catalog = toCatalogItems(ourProduct, 'chronocandy.com');
  const google = { id: 'g', search: async () => [{ source: 'Chrono Candy (via google_shopping)', title: 'Rolex 278384RBR dkgio Grey Index Dial unworn', price: 15000 }] };
  const [r] = await runPriceMatch({ catalog, sources: [google], pricing: {}, ownDomains: ['chronocandy.com'] });
  assert.equal(r.offers.length, 0);
});
