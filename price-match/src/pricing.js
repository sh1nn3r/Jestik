/**
 * Turns competitor prices into a suggested price for one of our products.
 *
 * Rules, in order:
 *  - Only matched listings are considered. High-confidence matches are
 *    preferred; medium ones are used only when there is nothing better.
 *  - Prices far below ours (ignoreBelowPct) are treated as suspicious: wrong
 *    item, a strap, a deposit, or a scam listing. They are reported, not used.
 *  - The suggested price never goes below the floor:
 *      max(cost * (1 + minMarginPct), currentPrice * (1 - maxDropPct))
 *    The cost part only applies when we know the cost.
 */

export const DEFAULT_PRICING = {
  undercut: 0,
  minMarginPct: 8,
  maxDropPct: 5,
  ignoreBelowPct: 60,
  roundTo: 1
};

export function floorPrice(product, rules) {
  const byDrop = product.price * (1 - rules.maxDropPct / 100);
  const byCost = product.cost != null ? product.cost * (1 + rules.minMarginPct / 100) : 0;
  return Math.max(byDrop, byCost);
}

function roundDown(value, step) {
  return Math.floor(value / step) * step;
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

/**
 * @param {object} product { price, cost }
 * @param {Array}  offers  [{ price, confidence, source, url, title }]
 * @param {object} rules   see DEFAULT_PRICING
 */
export function suggest(product, offers, rules = DEFAULT_PRICING) {
  rules = { ...DEFAULT_PRICING, ...rules };
  const suspiciousBelow = product.price * (rules.ignoreBelowPct / 100);

  const usable = offers.filter(o => Number.isFinite(o.price) && o.price > 0);
  const suspicious = usable.filter(o => o.price < suspiciousBelow);
  const credible = usable.filter(o => o.price >= suspiciousBelow);

  const high = credible.filter(o => o.confidence === 'high');
  const pool = high.length ? high : credible;
  const lowest = pool.reduce((min, o) => (!min || o.price < min.price ? o : min), null);

  const floor = roundUp(floorPrice(product, rules), rules.roundTo);
  const base = {
    currentPrice: product.price,
    floor,
    lowestOffer: lowest,
    offersConsidered: pool.length,
    suspiciousOffers: suspicious.length,
    usedMediumConfidence: !high.length && !!lowest
  };

  if (!lowest) {
    return { ...base, action: 'no-match', suggestedPrice: null };
  }

  if (lowest.price >= product.price) {
    return { ...base, action: 'already-lowest', suggestedPrice: null };
  }

  const target = roundDown(lowest.price - rules.undercut, rules.roundTo);
  if (target >= floor) {
    return { ...base, action: 'match', suggestedPrice: target };
  }

  // Can't fully match. Going to the floor still narrows the gap, so suggest it
  // if it is actually lower than today's price.
  if (floor < product.price) {
    return { ...base, action: 'partial-to-floor', suggestedPrice: floor };
  }
  return { ...base, action: 'below-floor', suggestedPrice: null };
}
