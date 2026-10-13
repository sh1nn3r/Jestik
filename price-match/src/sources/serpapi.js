/**
 * Google Shopping / Bing Shopping results via SerpApi (serpapi.com).
 *
 * Neither Google nor Microsoft offers a public API for other sellers' prices
 * (Bing's Search APIs were retired in 2025), so a SERP data provider is the
 * practical route. Each product checked costs one search credit per engine.
 */
import { detectCondition } from '../match.js';

export function toListings(body, { engine }) {
  const results = [...(body.shopping_results || []), ...(body.inline_shopping_results || [])];
  return results.map(r => ({
    source: `${r.source || r.seller || 'unknown'} (via ${engine})`,
    title: r.title || '',
    description: [r.snippet, r.second_hand_condition, ...(r.extensions || [])].filter(Boolean).join(' '),
    condition: detectCondition(`${r.title} ${r.second_hand_condition || ''} ${(r.extensions || []).join(' ')}`),
    price: Number(r.extracted_price ?? String(r.price || '').replace(/[^0-9.]/g, '')),
    url: r.product_link || r.link || null,
    domain: (() => { try { return new URL(r.link || r.product_link).hostname; } catch { return null; } })()
  }));
}

export function createSerpApiSource(cfg, { apiKey, fetchImpl = fetch, delayMs = 500 } = {}) {
  if (!apiKey) throw new Error(`${cfg.id}: set SERPAPI_KEY to use ${cfg.engine}`);
  return {
    id: cfg.id,
    name: cfg.engine,
    async search(product) {
      const q = [product.brand, product.reference].filter(Boolean).join(' ');
      const params = new URLSearchParams({ engine: cfg.engine, q, api_key: apiKey, gl: 'us', hl: 'en' });
      const res = await fetchImpl(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) throw new Error(`${cfg.engine}: ${res.status} ${await res.text()}`);
      const body = await res.json();
      if (body.error && !/hasn't returned any results/i.test(body.error)) throw new Error(`${cfg.engine}: ${body.error}`);
      await new Promise(r => setTimeout(r, delayMs));
      return toListings(body, cfg);
    }
  };
}
