/**
 * Core run: for each catalog item, gather listings from every source, keep
 * the ones that are the same watch, and produce a price suggestion.
 */
import { compare } from './match.js';
import { suggest } from './pricing.js';

function isOwnListing(listing, ownDomains) {
  const haystack = `${listing.url || ''} ${listing.domain || ''} ${listing.source || ''}`.toLowerCase();
  return ownDomains.some(d => haystack.includes(d.toLowerCase()));
}

export async function runPriceMatch({ catalog, sources, pricing, ownDomains = [], log = () => {} }) {
  for (const source of sources) {
    if (!source.prepare) continue;
    try {
      await source.prepare(catalog);
    } catch (err) {
      log(`${source.id}: setup failed, skipping it this run: ${err.message}`);
    }
  }

  const results = [];
  let i = 0;
  for (const product of catalog) {
    i++;
    if (!product.reference) {
      results.push({ product, action: 'skipped', note: 'no reference number', offers: [], rejected: [] });
      continue;
    }
    if (!(product.price > 0)) {
      results.push({ product, action: 'skipped', note: 'no price (price on request)', offers: [], rejected: [] });
      continue;
    }

    const offers = [];
    const rejected = [];
    const errors = [];
    for (const source of sources) {
      let listings;
      try {
        listings = await source.search(product);
      } catch (err) {
        errors.push(`${source.id}: ${err.message}`);
        continue;
      }
      for (const listing of listings) {
        if (isOwnListing(listing, ownDomains)) continue;
        const verdict = compare(product, listing);
        if (verdict.match) {
          offers.push({ ...listing, confidence: verdict.confidence, notes: verdict.reasons });
        } else if (verdict.reasons[0] !== 'reference not found') {
          // Same reference but a different dial or condition: worth showing so
          // a person can see why it was excluded.
          rejected.push({ ...listing, notes: verdict.reasons });
        }
      }
    }

    const suggestion = suggest(product, offers, pricing);
    results.push({ product, ...suggestion, offers, rejected, errors });
    if (i % 25 === 0) log(`checked ${i}/${catalog.length}`);
  }
  return results;
}
