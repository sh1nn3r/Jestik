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
  grey: ['grey', 'gray', 'anthracite'],
  slate: ['slate'],
  rhodium: ['rhodium'],
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
const PRE_OWNED = /\b(pre[\s-]?owned|used|second[\s-]?hand|worn|vintage|excellent condition|good condition|fair condition|preowned|refurbished)\b|\bcondition[:\s]+(excellent|very good|good|fair|mint)\b/i;

const MARKERS = { roman: /\broman\b/, arabic: /\barabic\b/, index: /\b(index|indices|baton|stick)\b/, diamond: /\b(diamonds?|baguettes?)\b/ };

// Distinctive dials: if one side has it and the other side's dial is known
// but lacks it, they are different watches (e.g. MOP vs plain white).
const SPECIAL_DIALS = ['mop', 'meteorite', 'sundust', 'wimbledon', 'ice-blue', 'slate', 'rhodium'];

// Dial patterns. When either side names one, both must name the same ones.
const PATTERNS = {
  star: /\bstar\b/, floral: /\b(floral|flower)\b/, quadrant: /\bquadrant\b/, diagonal: /\bdiagonal\b/,
  palm: /\bpalm\b/, 'fluted-motif': /\bfluted motif\b/, jubilee: /\bjubilee\b/, ombre: /\bombr[eé]\b/,
  six: /\b(six|vi)\b/, baguette: /\bbaguettes?\b/, stripe: /\bstripe\b/, paved: /\bpav[eé]d?\b/
};

// Modified watches are not comparable to factory ones.
const AFTERMARKET = /\b(custom|aftermarket|after-market|refinished|redial|iced[\s-]?out)\b/i;
// "Oyster Perpetual" is a model name, not a bracelet.
const BRACELETS = { oyster: /\boyster\b(?!\s*perpetual)/, jubilee: /\bjubilee\b/, president: /\bpresident\b/, rubber: /\b(oysterflex|rubber)\b/, strap: /\b(leather|strap|alligator)\b/ };
const BEZEL_PHRASE = /\b(?:[\w-]+\s+){1,2}bezel\b/gi;

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

const patternCache = new Map();

export function containsRef(text, ref) {
  if (!ref || normalizeRef(ref).length < 4) return false;
  let re = patternCache.get(ref);
  if (!re) patternCache.set(ref, (re = refPattern(ref)));
  return re.test(String(text || ''));
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

function dialPhrases(text) {
  const cleaned = String(text || '').replace(METAL_PHRASES, ' ').replace(BEZEL_PHRASE, ' | ').toLowerCase();
  const phrases = [];
  // Up to five words before "dial", e.g. "white mother-of-pearl diamond dial".
  // Words must start with a letter or digit, so " - " separators end a phrase.
  const re = /((?:\w[\w-]*\s+){1,5})dial\b/g;
  let m;
  while ((m = re.exec(cleaned))) phrases.push(m[1]);
  return phrases;
}

function groupsIn(phrases, table) {
  const found = new Set();
  for (const phrase of phrases) {
    for (const [group, test] of Object.entries(table)) {
      if (test instanceof RegExp ? test.test(phrase) : test.some(w => new RegExp(`\\b${w}\\b`).test(phrase))) found.add(group);
    }
  }
  return found.size ? found : null;
}

/**
 * Returns the set of dial color groups mentioned near the word "dial".
 * With `titleFallback`, a title that never says "dial" (e.g. "Rolex Datejust
 * 126334 White Roman Oyster") is read as a whole, minus metals and bezels.
 * Returns null when nothing is found.
 */
export function dialColors(text, { titleFallback = false } = {}) {
  let phrases = dialPhrases(text);
  if (!phrases.length && titleFallback) {
    phrases = [String(text || '').replace(METAL_PHRASES, ' ').replace(BEZEL_PHRASE, ' ').replace(/\bblack bay\b/gi, ' ').toLowerCase()];
  }
  const found = groupsIn(phrases, DIAL_WORDS);
  // "ice blue" also contains "blue"; keep only the more specific one.
  if (found?.has('ice-blue')) found.delete('blue');
  return found;
}

/** Hour markers (roman / arabic / index), read the same way as dial colors. */
export function dialMarkers(text, { titleFallback = false } = {}) {
  let phrases = dialPhrases(text);
  if (!phrases.length && titleFallback) phrases = [String(text || '').toLowerCase()];
  return groupsIn(phrases, MARKERS);
}

export function dialPatterns(text, { titleFallback = false } = {}) {
  let phrases = dialPhrases(text);
  if (!phrases.length && titleFallback) phrases = [String(text || '').toLowerCase()];
  return groupsIn(phrases, PATTERNS) || new Set();
}

export function braceletType(text) {
  return groupsIn([String(text || '').toLowerCase()], BRACELETS);
}

export function detectCondition(text) {
  const t = String(text || '');
  const unworn = UNWORN.test(t);
  const preOwned = PRE_OWNED.test(t.replace(/\bnever[\s-]+worn\b/gi, ' ').replace(/\bunworn\b/gi, ' '));
  // A listing that says both ("Unworn / Pre-Owned") is not clear either way.
  if (unworn && preOwned) return null;
  if (unworn) return 'unworn';
  if (preOwned) return 'pre-owned';
  return null;
}

function setsDiffer(a, b) {
  return a && b && ![...a].some(x => b.has(x));
}

function dialsDiffer(a, b) {
  if (!a || !b) return false;
  if (setsDiffer(a, b)) return true;
  return SPECIAL_DIALS.some(d => a.has(d) !== b.has(d));
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

  if (AFTERMARKET.test(listing.title || '')) {
    return { match: false, confidence: null, reasons: ['aftermarket / modified'] };
  }

  const ourDial = dialColors(ours.title);
  const theirDial = dialColors(listing.title, { titleFallback: true }) || dialColors(listing.description);
  if (dialsDiffer(ourDial, theirDial)) {
    return {
      match: false,
      confidence: null,
      reasons: [`dial differs (ours: ${[...ourDial].join('/')}, theirs: ${[...theirDial].join('/')})`]
    };
  }
  const dialKnown = !!(ourDial && theirDial);
  if (dialKnown) {
    const a = dialPatterns(ours.title);
    const b = dialPatterns(listing.title, { titleFallback: true });
    if ((a.size || b.size) && (a.size !== b.size || [...a].some(x => !b.has(x)))) {
      return {
        match: false,
        confidence: null,
        reasons: [`dial pattern differs (ours: ${[...a].join('/') || 'plain'}, theirs: ${[...b].join('/') || 'plain'})`]
      };
    }
  }
  if (!dialKnown) reasons.push('dial not confirmed');

  const ourMarkers = dialMarkers(ours.title);
  const theirMarkers = dialMarkers(listing.title, { titleFallback: true });
  if (setsDiffer(ourMarkers, theirMarkers) || (ourMarkers && theirMarkers && ourMarkers.has('diamond') !== theirMarkers.has('diamond'))) {
    return {
      match: false,
      confidence: null,
      reasons: [`hour markers differ (ours: ${[...ourMarkers].join('/')}, theirs: ${[...theirMarkers].join('/')})`]
    };
  }

  // A diamond-set dial costs much more than the plain one; if the listing
  // doesn't say, the match can't be trusted fully.
  const diamondUnconfirmed = ourMarkers?.has('diamond') && !theirMarkers?.has('diamond');
  if (diamondUnconfirmed) reasons.push('diamond dial not confirmed');

  const ourBracelet = braceletType(ours.title);
  const theirBracelet = braceletType(listing.title);
  if (setsDiffer(ourBracelet, theirBracelet)) {
    return {
      match: false,
      confidence: null,
      reasons: [`bracelet differs (ours: ${[...ourBracelet].join('/')}, theirs: ${[...theirBracelet].join('/')})`]
    };
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
    confidence: dialKnown && conditionKnown && !diamondUnconfirmed ? 'high' : 'medium',
    reasons
  };
}
