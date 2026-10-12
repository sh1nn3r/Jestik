/**
 * Competitor source for stores running on Shopify.
 *
 * Shopify storefronts publish their catalog at /products.json. We download it
 * once per run (paged, with a pause between pages) and match locally, so a
 * full run costs a few dozen requests no matter how big our catalog is.
 */
import { detectCondition } from '../match.js';

const PAGE_SIZE = 250;
const MAX_PAGES = 200;

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toListings(product, { domain, name }) {
  const tags = Array.isArray(product.tags) ? product.tags.join(' ') : String(product.tags || '');
  const description = stripHtml(product.body_html);
  const condition = detectCondition(`${product.title} ${tags} ${product.product_type || ''}`)
    || detectCondition(description);
  return (product.variants || [])
    .filter(v => v.available !== false)
    .map(v => ({
      source: name || domain,
      title: v.title && v.title !== 'Default Title' ? `${product.title} ${v.title}` : product.title,
      description: `${v.sku || ''} ${tags} ${description}`.slice(0, 2000),
      condition,
      price: Number(v.price),
      url: `https://${domain}/products/${product.handle}${v.id ? `?variant=${v.id}` : ''}`
    }));
}

export function createShopifyStoreSource(cfg, { fetchImpl = fetch, delayMs = 1500, log = () => {} } = {}) {
  let listingsPromise = null;

  async function loadAll() {
    const listings = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://${cfg.domain}/products.json?limit=${PAGE_SIZE}&page=${page}`;
      const res = await fetchImpl(url, { headers: { 'User-Agent': 'price-match/0.1 (+competitive pricing check)' } });
      if (!res.ok) {
        if (page === 1) throw new Error(`${cfg.domain}: ${res.status} (not a Shopify store, or catalog is not public)`);
        break;
      }
      const { products = [] } = await res.json();
      for (const p of products) listings.push(...toListings(p, cfg));
      if (products.length < PAGE_SIZE) break;
      await new Promise(r => setTimeout(r, delayMs));
    }
    log(`${cfg.domain}: loaded ${listings.length} in-stock listings`);
    return listings;
  }

  return {
    id: cfg.id,
    name: cfg.name || cfg.domain,
    async search() {
      listingsPromise ??= loadAll();
      return listingsPromise;
    }
  };
}
