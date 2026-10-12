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
  const r = compare(ours, { title: 'Unworn Rolex Datejust 31 278384RBR Slate Index Dial' });
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
