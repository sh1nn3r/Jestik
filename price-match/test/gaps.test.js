import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReference, findGaps } from '../src/gaps.js';

test('extracts references in common brand formats', () => {
  assert.equal(extractReference('Rolex 126334 Datejust 41 Green Ombre Dial 126334-0034'), '126334');
  assert.equal(extractReference('Patek Philippe 5711/1A-010 Nautilus Blue'), '5711/1A-010');
  assert.equal(extractReference('Audemars Piguet Royal Oak 15500ST.OO.1220ST.01 41mm'), '15500ST.OO.1220ST.01');
  assert.equal(extractReference('Rolex Datejust 41mm 2023 Blue'), null);
  assert.equal(extractReference('Tudor Black Bay 58', 'M79030N-0001'), 'M79030N-0001');
});

test('lists references competitors carry and we do not, grouped across sellers', () => {
  const catalog = [{ reference: '126334', price: 15000 }, { reference: '5711/1A-010', price: 0 }];
  const listings = [
    { source: 'A', vendor: 'Rolex', title: 'Rolex 126334 Datejust Blue', price: 14000, url: 'a1' },        // we carry
    { source: 'A', vendor: 'Patek Philippe', title: 'Patek 5711/1A-010 Nautilus', price: 150000, url: 'a2' }, // we carry (on request)
    { source: 'A', vendor: 'Rolex', title: 'Rolex 126610LN Submariner Date', price: 12500, url: 'a3' },
    { source: 'B', vendor: 'Rolex', title: 'Pre-Owned Rolex 126610LN Submariner', price: 11900, url: 'b1' },
    { source: 'B', vendor: 'Rolex', title: 'Rolex Oyster bracelet strap 126610', price: 400, url: 'b2' }    // too cheap
  ];
  const { groups } = findGaps(catalog, listings);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].reference, '126610LN');
  assert.equal(groups[0].competitors, 2);
  assert.equal(groups[0].lowPrice, 11900);
  assert.equal(groups[0].conditions['pre-owned'], 1);
});
