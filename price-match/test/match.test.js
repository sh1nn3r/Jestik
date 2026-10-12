import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, containsRef, dialColors, detectCondition, parseOwnReference } from '../src/match.js';

const ours = {
  reference: '278384RBR',
  title: 'Rolex Steel and White Gold Datejust 31 Watch - Diamond Bezel - Dark Grey Index Dial - Oyster Bracelet - 278384RBR dkgio',
  condition: 'unworn'
};

test('parses reference and dial code from our SKU', () => {
  assert.deepEqual(parseOwnReference('278384RBR dkgio', ''), { reference: '278384RBR', dialCode: 'dkgio' });
  assert.deepEqual(parseOwnReference('', 'Rolex Sub - Black Dial - 126610LN'), { reference: '126610LN', dialCode: null });
});

test('reference matching tolerates separators but not longer references', () => {
  assert.ok(containsRef('Rolex Datejust 278384RBR-0005', '278384RBR'));
  assert.ok(containsRef('Omega 310.30.42.50.01.001', '31030425001001'));
  assert.ok(!containsRef('Rolex 126610LV Starbucks', '126610'));
  assert.ok(!containsRef('Rolex 1126610', '126610'));
});

test('case metal is not read as dial color', () => {
  assert.deepEqual([...dialColors('White Gold Datejust - Dark Grey Index Dial')], ['grey']);
  assert.equal(dialColors('Rolex 278384RBR white gold'), null);
});

test('condition detection', () => {
  assert.equal(detectCondition('Brand New Unworn 2024'), 'unworn');
  assert.equal(detectCondition('Pre-Owned Rolex'), 'pre-owned');
  assert.equal(detectCondition('Rolex Datejust'), null);
});

test('same reference, dial and condition is a high-confidence match', () => {
  const r = compare(ours, { title: 'Unworn Rolex Datejust 31 278384RBR Dark Gray Index Dial' });
  assert.equal(r.match, true);
  assert.equal(r.confidence, 'high');
});

test('missing dial info is a medium-confidence match', () => {
  const r = compare(ours, { title: 'Rolex 278384RBR unworn' });
  assert.equal(r.match, true);
  assert.equal(r.confidence, 'medium');
});

test('different dial is rejected', () => {
  const r = compare(ours, { title: 'Rolex 278384RBR Pink Diamond Dial unworn' });
  assert.equal(r.match, false);
  assert.match(r.reasons[0], /dial differs/);
});

test('pre-owned listing never matches our unworn watch', () => {
  const r = compare(ours, { title: 'Pre-Owned Rolex 278384RBR Grey Dial' });
  assert.equal(r.match, false);
  assert.match(r.reasons[0], /condition differs/);
});

test('titles without the word "dial" still have their dial read', () => {
  const r = compare({ ...ours, reference: '126334', title: 'Rolex Datejust 41 - Fluted Bezel - White Index Dial - Oyster Bracelet - 126334 wio' },
    { title: 'Rolex Datejust 126334 Blue Index Oyster', condition: 'unworn' });
  assert.equal(r.match, false);
  assert.match(r.reasons[0], /dial differs/);
});

test('different hour markers are rejected', () => {
  const r = compare({ ...ours, reference: '126334', title: 'Rolex Datejust 41 - Fluted Bezel - White Index Dial - Oyster Bracelet - 126334 wio' },
    { title: 'Rolex Datejust 126334 White Roman Oyster', condition: 'unworn' });
  assert.equal(r.match, false);
  assert.match(r.reasons[0], /hour markers differ/);
});

test('different bracelets are rejected, but "Oyster Perpetual" is not a bracelet', () => {
  const ourDD = { ...ours, reference: '279135RBR', title: 'Rolex Lady-Datejust 28 - Diamond Bezel - Chocolate Roman Dial - President Bracelet - 279135RBR chorp' };
  const r = compare(ourDD, { title: 'Rolex 279135RBR Chocolate Roman Dial Jubilee Watch', condition: 'unworn' });
  assert.match(r.reasons[0], /bracelet differs/);
  const ok = compare(ourDD, { title: 'Rolex Oyster Perpetual 279135RBR Chocolate Roman Dial', condition: 'unworn' });
  assert.equal(ok.match, true);
});

test('"Unworn / Pre-Owned" is unclear, and "Condition: Excellent" is pre-owned', () => {
  assert.equal(detectCondition('Condition Unworn /  Pre-Owned'), null);
  assert.equal(detectCondition('Condition: \n  Excellent'), 'pre-owned');
  assert.equal(detectCondition('Condition Never Worn / Unworn'), 'unworn');
});

test('slate vs rhodium, MOP vs plain white, diamond vs roman markers, and custom watches are all rejected', () => {
  const base = { ...ours, condition: 'unworn' };
  const slate = { ...base, reference: '126334', title: 'Rolex Datejust 41 - Fluted Bezel - Slate Green Roman Dial - Oyster Bracelet - 126334 slgro' };
  assert.equal(compare(slate, { title: 'Rolex Datejust 126334 Rhodium Oyster', condition: 'unworn' }).match, false);
  const mop = { ...base, reference: '126203', title: 'Rolex Datejust 36 - Domed Bezel - White Mother-Of-Pearl Roman Dial - Jubilee Bracelet - 126203 mdj' };
  assert.equal(compare(mop, { title: 'Rolex 126203 Datejust 36 White Roman Dial Jubilee', condition: 'unworn' }).match, false);
  const roman = { ...base, reference: '279161', title: 'Rolex Lady-Datejust 28 - Domed Bezel - Chocolate Roman Dial - Jubilee Bracelet - 279161 choro' };
  assert.equal(compare(roman, { title: 'Rolex 279161 Datejust 28 Chocolate Diamond Dial Ladies Watch', condition: 'unworn' }).match, false);
  assert.match(compare(mop, { title: 'Custom Diamond Bezel Rolex 126203 White Mother of Pearl Roman Dial', condition: 'unworn' }).reasons[0], /aftermarket/);
});

test('dial patterns must agree (motif, star, floral, six)', () => {
  const base = { ...ours, condition: 'unworn', reference: '228396TBR' };
  const diag = { ...base, title: 'Rolex Day-Date 40 - Diamond Bezel - Ice Blue Diagonal Motif Index Dial - President Bracelet - 228396TBR ibdmip' };
  assert.equal(compare(diag, { title: 'Rolex 228396TBR Day-Date 40 Ice Blue Quadrant Motif Dial', condition: 'unworn' }).match, false);
  assert.equal(compare(diag, { title: 'Rolex 228396TBR Day-Date 40 Ice Blue Diagonal Motif Index Dial President', condition: 'unworn' }).match, true);
  const star = { ...base, reference: '279163', title: 'Rolex Lady-Datejust - Domed Bezel - Champagne Diamond Star Dial - Jubilee Bracelet - 279163 ch9dix8dj' };
  assert.equal(compare(star, { title: 'Rolex 279163 Datejust 28 Champagne Dial Two Tone', condition: 'unworn' }).match, false);
});

test('a plain-dial listing is only a medium match for our diamond dial', () => {
  const r = compare({ ...ours, reference: '116508', title: 'Rolex Daytona - Black Diamond Dial - 116508 bkd' },
    { title: 'Rolex 116508 Cosmograph Daytona Black Dial Gold', condition: 'unworn' });
  assert.equal(r.match, true);
  assert.equal(r.confidence, 'medium');
});
