/**
 * Finds watches competitors list that we don't carry at all (no listing of
 * ours has that reference number), grouped by reference across competitors.
 *
 * Only sources that expose their whole catalog (Shopify stores) can be used;
 * search-based sources like Google Shopping only answer for our references.
 */
import { BRANDS, containsRef, detectBrand, detectCondition } from './match.js';

const MIN_PRICE = 1000; // below this it's a strap, a part, or a deposit

// Reference-like tokens: at least 4 characters with 3+ digits, allowing the
// separators brands use (5711/1A-010, 15500ST.OO.1220ST.01, IW371605, M79230N).
const REF_TOKEN = /\b(?=[A-Z0-9./-]*\d{3})[A-Z]{0,4}\d[A-Z0-9]*(?:[./-][A-Z0-9]+)*\b/gi;
const YEAR = /^(19[5-9]\d|20[0-4]\d)$/;
const NOT_REF = /^(\d{1,3}(mm|k)?|\d+mm|\d{3}(?:ml|ft|m))$/i;

function digitRuns(text) {
  return String(text || '').match(/\d{3,}/g) || [];
}

/** Best guess at the reference number in a competitor's title (or SKU). */
export function extractReference(title, sku) {
  for (const text of [title, sku]) {
    const tokens = (String(text || '').match(REF_TOKEN) || [])
      .filter(t => !YEAR.test(t) && !NOT_REF.test(t))
      .filter(t => (t.match(/\d/g) || []).length >= 4);
    if (tokens.length) {
      // Prefer the longest token; drop a Rolex-style "-0001" suffix.
      const best = tokens.sort((a, b) => b.length - a.length)[0];
      return /^\d{5,6}[A-Z]*-\d{4}$/i.test(best) ? best.replace(/-\d{4}$/, '') : best;
    }
  }
  return null;
}

/** Index our references by their digit runs so each listing is only checked against a few. */
function indexOurRefs(catalog) {
  const index = new Map();
  for (const p of catalog) {
    if (!p.reference) continue;
    for (const run of digitRuns(p.reference)) {
      if (!index.has(run)) index.set(run, new Set());
      index.get(run).add(p.reference);
    }
  }
  return index;
}

function weCarry(listing, index) {
  const text = `${listing.title} ${listing.sku || ''}`;
  for (const run of digitRuns(text)) {
    for (const ref of index.get(run) || []) {
      if (containsRef(text, ref)) return true;
    }
  }
  return false;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
}

/**
 * @param {Array} catalog  our items (from catalog.js)
 * @param {Array} listings competitor listings (from full-catalog sources)
 * @returns {{ groups: Array, skippedNoRef: number }}
 */
export function findGaps(catalog, listings) {
  const index = indexOurRefs(catalog);
  const groups = new Map();
  let skippedNoRef = 0;

  for (const l of listings) {
    if (!(l.price >= MIN_PRICE)) continue;
    const brand = detectBrand(l.vendor) || detectBrand(l.title);
    if (!brand || !BRANDS.includes(brand)) continue;
    if (weCarry(l, index)) continue;
    const reference = extractReference(l.title, l.sku);
    if (!reference) { skippedNoRef++; continue; }

    const key = `${brand}|${reference.toUpperCase().replace(/[\s.\-/]/g, '')}`;
    if (!groups.has(key)) groups.set(key, { brand, reference, listings: [] });
    groups.get(key).listings.push({ ...l, condition: l.condition || detectCondition(`${l.title} ${l.description}`) });
  }

  const rows = [...groups.values()].map(g => {
    const prices = g.listings.map(l => l.price);
    const cheapest = g.listings.reduce((a, b) => (b.price < a.price ? b : a));
    const sellers = new Set(g.listings.map(l => l.source));
    const conditions = {};
    for (const l of g.listings) conditions[l.condition || 'unknown'] = (conditions[l.condition || 'unknown'] || 0) + 1;
    return {
      brand: g.brand,
      reference: g.reference,
      exampleTitle: cheapest.title,
      competitors: sellers.size,
      sellers: [...sellers].join(' / '),
      listings: g.listings.length,
      conditions,
      lowPrice: Math.min(...prices),
      medianPrice: median(prices),
      highPrice: Math.max(...prices),
      cheapestUrl: cheapest.url
    };
  });

  // Most-stocked first: carried by more competitors, then more listings.
  rows.sort((a, b) => b.competitors - a.competitors || b.listings - a.listings || b.medianPrice - a.medianPrice);
  return { groups: rows, skippedNoRef };
}
