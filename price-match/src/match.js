/**
 * Decides whether a competitor listing is the same watch as one of ours.
 *
 * A listing only counts as a match when the reference number is present,
 * the dial does not contradict ours, and the condition does not contradict
 * ours. Anything uncertain is kept but marked so it can be reviewed.
 */

export const BRANDS = [
  'Rolex', 'Patek Philippe', 'Audemars Piguet', 'Omega', 'Tudor', 'Cartier',
  'IWC', 'Panerai', 'Breitling', 'Grand Seiko', 'Richard Mille',
  'Vacheron Constantin', 'Jaeger-LeCoultre', 'A. Lange & Söhne', 'Hublot',
  'TAG Heuer', 'Zenith', 'Blancpain', 'Breguet', 'Chopard', 'Bvlgari',
  'Longines', 'Tissot', 'Seiko', 'F.P. Journe', 'H. Moser & Cie'
];

// Words that describe a dial. Grouped so that spelling variants compare equal.
const DIAL_WORDS = {
  black: ['black', 'onyx'],
  white: ['white'],
  blue: ['blue'],
  'ice-blue': ['ice blue', 'ice-blue', 'glacier blue'],
  green: ['green'],
  mint: ['mint'],
  olive: ['olive'],
  grey: ['grey', 'gray', 'slate', 'rhodium', 'anthracite'],
  silver: ['silver'],
  champagne: ['champagne', 'golden'],
  pink: ['pink', 'rose'],
  salmon: ['salmon'],
  red: ['red', 'burgundy'],
  brown: ['brown', 'chocolate'],
  purple: ['purple', 'aubergine', 'lavender'],
  yellow: ['yellow'],
  turquoise: ['turquoise', 'tiffany'],
  beige: ['beige', 'cream', 'ivory'],
  sundust: ['sundust'],
  meteorite: ['meteorite'],
  mop: ['mother-of-pearl', 'mother of pearl', 'mop'],
  wimbledon: ['wimbledon'],
  orange: ['orange']
};

// Case metals are stripped before reading dial colors, so "white gold" or
// "rose gold" is never mistaken for a white or pink dial.
const METAL_PHRASES = /\b(white|yellow|rose|everose|red|pink|sedna|moonshine|king)\s+gold\b|\brose\s*-?\s*gold\b/gi;

const UNWORN = /\b(unworn|brand[\s-]?new|new in box|\bnib\b|factory sealed|stickers?|unused)\b/i;
const PRE_OWNED = /\b(pre[\s-]?owned|used|second[\s-]?hand|worn|vintage|excellent condition|good condition|fair condition|preowned|refurbished)\b/i;

export function normalizeRef(ref) {
  return String(ref || '').toUpperCase().replace(/[\s.\-/]/g, '');
}

/**
 * Builds a regex that finds `ref` inside free text while tolerating the
 * separators sellers add (spaces, dots, dashes, slashes) and refusing to match
 * a longer reference: 126610 must not match 126610LV.
 */
export function refPattern(ref) {
  const chars = normalizeRef(ref).split('').map(c => c.replace(/[^A-Z0-9]/g, ''));
  const body = chars.join('[\\s.\\-/]?');
  return new RegExp(`(?<![A-Z0-9])${body}(?![A-Z0-9])`, 'i');
}

export function containsRef(text, ref) {
  if (!ref || normalizeRef(ref).length < 4) return false;
  return refPattern(ref).test(String(text || ''));
}

export function detectBrand(text) {
  const t = String(text || '').toLowerCase();
  return BRANDS.find(b => t.includes(b.toLowerCase())) || null;
}

/**
 * Pulls the reference and dial code from our SKU format ("278384RBR dkgio").
 * Falls back to the last " - " segment of the title.
 */
export function parseOwnReference(sku, title) {
  const parts = String(sku || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length && /\d{3,}/.test(parts[0])) {
    return { reference: parts[0], dialCode: parts[1] || null };
  }
  const tail = String(title || '').split(' - ').pop().trim().split(/\s+/);
  if (tail.length && /\d{3,}/.test(tail[0])) {
    return { reference: tail[0], dialCode: tail[1] || null };
  }
  return { reference: null, dialCode: null };
}

/**
 * Returns the set of dial color groups mentioned near the word "dial".
 * Returns null when the text does not describe a dial at all.
 */
export function dialColors(text) {
  const cleaned = String(text || '').replace(METAL_PHRASES, ' ').toLowerCase();
  const phrases = [];
  // Up to five words before "dial", e.g. "white mother-of-pearl diamond dial"
  const re = /((?:[\w-]+\s+){1,5})dial\b/g;
  let m;
  while ((m = re.exec(cleaned))) phrases.push(m[1]);
  if (!phrases.length) return null;

  const found = new Set();
  for (const phrase of phrases) {
    for (const [group, words] of Object.entries(DIAL_WORDS)) {
      if (words.some(w => new RegExp(`\\b${w}\\b`).test(phrase))) found.add(group);
    }
  }
  // "ice blue" also contains "blue"; keep only the more specific one.
  if (found.has('ice-blue')) found.delete('blue');
  return found.size ? found : null;
}

export function detectCondition(text) {
  const t = String(text || '');
  if (UNWORN.test(t)) return 'unworn';
  if (PRE_OWNED.test(t)) return 'pre-owned';
  return null;
}

/**
 * Compares one competitor listing against one of our products.
 *
 * @param {object} ours    { reference, title, condition }
 * @param {object} listing { title, description, condition }
 * @returns {{ match: boolean, confidence: 'high'|'medium', reasons: string[] }}
 */
export function compare(ours, listing) {
  const text = [listing.title, listing.description].filter(Boolean).join(' \n ');
  const reasons = [];

  if (!containsRef(text, ours.reference)) {
    return { match: false, confidence: null, reasons: ['reference not found'] };
  }

  const ourDial = dialColors(ours.title);
  const theirDial = dialColors(listing.title) || dialColors(listing.description);
  let dialKnown = false;
  if (ourDial && theirDial) {
    const overlap = [...theirDial].some(c => ourDial.has(c));
    if (!overlap) {
      return {
        match: false,
        confidence: null,
        reasons: [`dial differs (ours: ${[...ourDial].join('/')}, theirs: ${[...theirDial].join('/')})`]
      };
    }
    dialKnown = true;
  } else {
    reasons.push('dial not confirmed');
  }

  const ourCondition = ours.condition || null;
  const theirCondition = listing.condition || detectCondition(text);
  let conditionKnown = false;
  if (ourCondition && theirCondition) {
    if (ourCondition !== theirCondition) {
      return {
        match: false,
        confidence: null,
        reasons: [`condition differs (ours: ${ourCondition}, theirs: ${theirCondition})`]
      };
    }
    conditionKnown = true;
  } else {
    reasons.push('condition not confirmed');
  }

  return {
    match: true,
    confidence: dialKnown && conditionKnown ? 'high' : 'medium',
    reasons
  };
}
