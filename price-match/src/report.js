/** Writes run results as a CSV for review in a spreadsheet, plus full JSON. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const COLUMNS = [
  ['action', r => r.action],
  ['sku', r => r.product.sku],
  ['title', r => r.product.title],
  ['condition', r => r.product.condition],
  ['our_price', r => r.product.price],
  ['cost', r => r.product.cost],
  ['floor', r => r.floor],
  ['suggested_price', r => r.suggestedPrice],
  ['change', r => (r.suggestedPrice != null ? r.suggestedPrice - r.product.price : '')],
  ['lowest_competitor', r => r.lowestOffer?.source],
  ['lowest_price', r => r.lowestOffer?.price],
  ['match_confidence', r => r.lowestOffer?.confidence],
  ['match_notes', r => r.lowestOffer?.notes?.join('; ')],
  ['lowest_url', r => r.lowestOffer?.url],
  ['matched_offers', r => r.offers?.length ?? 0],
  ['suspicious_offers', r => r.suspiciousOffers ?? 0],
  ['excluded_same_ref', r => r.rejected?.length ?? 0],
  ['errors', r => [r.note, ...(r.errors || [])].filter(Boolean).join('; ')],
  ['our_url', r => r.product.url]
];

// Rows a person should look at first.
const ORDER = ['match', 'partial-to-floor', 'below-floor', 'review', 'already-lowest', 'no-match', 'skipped'];

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(results) {
  const sorted = [...results].sort((a, b) => ORDER.indexOf(a.action) - ORDER.indexOf(b.action));
  const lines = [COLUMNS.map(([h]) => h).join(',')];
  for (const r of sorted) lines.push(COLUMNS.map(([, get]) => csvCell(get(r))).join(','));
  return lines.join('\n') + '\n';
}

export function summarize(results) {
  const counts = Object.fromEntries(ORDER.map(a => [a, 0]));
  for (const r of results) counts[r.action] = (counts[r.action] || 0) + 1;
  return counts;
}

export async function writeReport(results, dir) {
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csvPath = join(dir, `price-match-${stamp}.csv`);
  const jsonPath = join(dir, `price-match-${stamp}.json`);
  await writeFile(csvPath, toCsv(results));
  await writeFile(jsonPath, JSON.stringify(results, null, 2));
  return { csvPath, jsonPath };
}

const GAP_COLUMNS = [
  ['brand', g => g.brand],
  ['reference', g => g.reference],
  ['example_title', g => g.exampleTitle],
  ['competitors_carrying', g => g.competitors],
  ['sellers', g => g.sellers],
  ['listings', g => g.listings],
  ['unworn', g => g.conditions.unworn || 0],
  ['pre_owned', g => g.conditions['pre-owned'] || 0],
  ['condition_unknown', g => g.conditions.unknown || 0],
  ['low_price', g => g.lowPrice],
  ['median_price', g => g.medianPrice],
  ['high_price', g => g.highPrice],
  ['cheapest_url', g => g.cheapestUrl]
];

export async function writeGapReport(groups, dir) {
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = join(dir, `not-carried-${stamp}.csv`);
  const lines = [GAP_COLUMNS.map(([h]) => h).join(',')];
  for (const g of groups) lines.push(GAP_COLUMNS.map(([, get]) => csvCell(get(g))).join(','));
  await writeFile(path, lines.join('\n') + '\n');
  return path;
}
