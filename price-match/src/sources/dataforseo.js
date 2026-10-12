/**
 * Google Shopping results via DataForSEO's Merchant API (dataforseo.com).
 *
 * Cheaper than SerpApi but asynchronous: searches are posted as tasks, then
 * collected once Google results are ready (usually minutes on the normal
 * queue). prepare() posts every search for the run up front, so by the time
 * the run asks for the first product most results are already waiting.
 */
import { detectCondition } from '../match.js';

const API = 'https://api.dataforseo.com/v3/merchant/google/products';
const BATCH = 100;           // API limit per task_post call
const POLL_MS = 30_000;
const TIMEOUT_MS = 60 * 60_000;

// DataForSEO status codes: 20000 ok, 40601 handed to crawler, 40602 queued.
const PENDING = new Set([40601, 40602]);

export function keywordFor(product) {
  return [product.brand, product.reference].filter(Boolean).join(' ');
}

export function toListings(body) {
  const items = body?.tasks?.[0]?.result?.flatMap(r => r.items || []) || [];
  return items
    .filter(i => i.type === 'google_shopping_serp')
    .map(i => {
      // price_multiplier marks installment pricing: price is per month.
      const price = Number(i.price) * (Number(i.price_multiplier) || 1);
      const text = [i.title, i.description, i.snippet, ...(i.tags || [])].filter(Boolean).join(' ');
      return {
        source: `${i.seller || i.domain || 'unknown'} (via Google Shopping)`,
        title: i.title || '',
        description: [i.description, i.snippet, ...(i.tags || [])].filter(Boolean).join(' '),
        condition: detectCondition(text),
        price: i.currency && i.currency !== 'USD' ? NaN : price,
        url: i.shopping_url || null,
        domain: i.domain || null
      };
    });
}

export function createDataForSeoSource(cfg, { login, password, fetchImpl = fetch, log = () => {}, pollMs = POLL_MS, timeoutMs = TIMEOUT_MS } = {}) {
  if (!login || !password) throw new Error(`${cfg.id}: set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD`);
  const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };
  const taskIds = new Map(); // keyword -> task id
  let deadline = 0;

  async function call(url, init = {}) {
    const res = await fetchImpl(url, { ...init, headers });
    if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
    return res.json();
  }

  return {
    id: cfg.id,
    name: 'Google Shopping (DataForSEO)',

    async prepare(catalog) {
      const keywords = [...new Set(catalog.filter(p => p.reference).map(keywordFor))];
      for (let i = 0; i < keywords.length; i += BATCH) {
        const tasks = keywords.slice(i, i + BATCH).map(keyword => ({
          keyword,
          location_code: cfg.locationCode || 2840, // United States
          language_code: 'en',
          tag: keyword
        }));
        const body = await call(`${API}/task_post`, { method: 'POST', body: JSON.stringify(tasks) });
        for (const t of body.tasks || []) {
          if (t.status_code === 20100) taskIds.set(t.data.tag, t.id);
          else log(`DataForSEO rejected "${t.data?.tag}": ${t.status_message}`);
        }
      }
      deadline = Date.now() + timeoutMs;
      log(`DataForSEO: posted ${taskIds.size} searches`);
    },

    async search(product) {
      const id = taskIds.get(keywordFor(product));
      if (!id) return [];
      for (;;) {
        const body = await call(`${API}/task_get/advanced/${id}`);
        const status = body?.tasks?.[0]?.status_code;
        if (status === 20000) return toListings(body);
        if (!PENDING.has(status)) throw new Error(`DataForSEO task ${id}: ${body?.tasks?.[0]?.status_message}`);
        if (Date.now() > deadline) throw new Error(`DataForSEO task ${id} not ready after ${timeoutMs / 60000} min`);
        await new Promise(r => setTimeout(r, pollMs));
      }
    }
  };
}
