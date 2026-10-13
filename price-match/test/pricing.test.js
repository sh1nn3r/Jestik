import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggest } from '../src/pricing.js';

const rules = { undercut: 0, minMarginPct: 8, maxDropPct: 5, ignoreBelowPct: 60, roundTo: 1 };
const offer = (price, confidence = 'high') => ({ price, confidence, source: 'x' });

test('matches a lower competitor within the floor', () => {
  const r = suggest({ price: 22220, cost: 18000 }, [offer(21500)], rules);
  assert.equal(r.action, 'match');
  assert.equal(r.suggestedPrice, 21500);
});

test('never goes below cost + margin', () => {
  // floor = max(22220 * 0.95, 20000 * 1.08) = 21600
  const r = suggest({ price: 22220, cost: 20000 }, [offer(21000)], rules);
  assert.equal(r.action, 'partial-to-floor');
  assert.equal(r.suggestedPrice, 21600);
});

test('never drops more than maxDropPct in one run', () => {
  const r = suggest({ price: 20000, cost: null }, [offer(15000)], rules);
  assert.equal(r.floor, 19000);
  assert.equal(r.suggestedPrice, 19000);
});

test('ignores implausibly low prices', () => {
  const r = suggest({ price: 22220, cost: null }, [offer(500)], rules);
  assert.equal(r.action, 'no-match');
  assert.equal(r.suspiciousOffers, 1);
});

test('medium-only matches are flagged for review, not priced', () => {
  const r = suggest({ price: 22220, cost: null }, [offer(21000, 'medium')], rules);
  assert.equal(r.action, 'review');
  assert.equal(r.suggestedPrice, null);
  const loose = suggest({ price: 22220, cost: null }, [offer(21500, 'medium')], { ...rules, minConfidence: 'medium' });
  assert.equal(loose.suggestedPrice, 21500);
});

test('prefers high-confidence matches over cheaper medium ones', () => {
  const r = suggest({ price: 22220, cost: null }, [offer(21200, 'medium'), offer(21800)], rules);
  assert.equal(r.lowestOffer.price, 21800);
});

test('reports when we are already the lowest', () => {
  const r = suggest({ price: 22220, cost: null }, [offer(23000)], rules);
  assert.equal(r.action, 'already-lowest');
});
