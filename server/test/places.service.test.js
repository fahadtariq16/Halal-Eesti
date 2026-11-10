import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPlaces, buildMeta, paginate } from '../src/places.service.js';

const sample = [
  { id: 'a', name: 'Alpha Kebab', type: 'restaurant', city: 'Tallinn', address: 'Aia 1', meats: ['chicken', 'beef'], halalStatus: 'venue_claim', notes: '' },
  { id: 'b', name: 'Beta Market', type: 'shop', city: 'Tallinn', address: 'Pikk 2', meats: ['goat'], halalStatus: 'third_party_listing', notes: 'fresh goat' },
  { id: 'c', name: 'Gamma Grill', type: 'restaurant', city: 'Tartu', address: null, meats: [], halalStatus: 'unverified', notes: '' }
];

test('returns everything with no filters', () => {
  assert.equal(filterPlaces(sample, {}).length, 3);
});

test('filters by city, case-insensitive', () => {
  assert.deepEqual(filterPlaces(sample, { city: 'tartu' }).map(p => p.id), ['c']);
});

test('filters by meat', () => {
  assert.deepEqual(filterPlaces(sample, { meat: 'goat' }).map(p => p.id), ['b']);
});

test('meat filter accepts comma list and matches any', () => {
  assert.deepEqual(filterPlaces(sample, { meat: 'goat,beef' }).map(p => p.id), ['a', 'b']);
});

test('filters by type', () => {
  assert.deepEqual(filterPlaces(sample, { type: 'shop' }).map(p => p.id), ['b']);
});

test('filters by halal status', () => {
  assert.deepEqual(filterPlaces(sample, { status: 'unverified' }).map(p => p.id), ['c']);
});

test('text search covers name, address and notes', () => {
  assert.deepEqual(filterPlaces(sample, { q: 'pikk' }).map(p => p.id), ['b']);
  assert.deepEqual(filterPlaces(sample, { q: 'GOAT' }).map(p => p.id), ['b']);
});

test('combines filters with AND', () => {
  assert.deepEqual(filterPlaces(sample, { city: 'Tallinn', type: 'restaurant' }).map(p => p.id), ['a']);
});

test('group=sellers returns butchers, shops and online sellers only', () => {
  const data = [...sample, { id: 'd', name: 'Delta Online', type: 'online', city: 'Tallinn', meats: [], halalStatus: 'venue_claim' }];
  assert.deepEqual(filterPlaces(data, { group: 'sellers' }).map(p => p.id), ['b', 'd']);
});

test('group=restaurants returns restaurants only', () => {
  assert.deepEqual(filterPlaces(sample, { group: 'restaurants' }).map(p => p.id), ['a', 'c']);
});

test('buildMeta counts sellers and restaurants', () => {
  const meta = buildMeta(sample);
  assert.equal(meta.groups.sellers, 1);
  assert.equal(meta.groups.restaurants, 2);
});

test('paginate returns the requested page and totals', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  const r = paginate(items, { page: 2, limit: 10 });
  assert.deepEqual(r.data, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.equal(r.total, 23);
  assert.equal(r.pages, 3);
  assert.equal(r.page, 2);
});

test('paginate clamps page numbers that are too high or invalid', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  assert.equal(paginate(items, { page: 99, limit: 10 }).page, 3);
  assert.equal(paginate(items, { page: 'abc', limit: 10 }).page, 1);
  assert.equal(paginate(items, { page: -4, limit: 10 }).page, 1);
});

test('paginate caps limit at 50 and defaults to 10', () => {
  const items = Array.from({ length: 200 }, (_, i) => i);
  assert.equal(paginate(items, { page: 1, limit: 1000 }).data.length, 50);
  assert.equal(paginate(items, { page: 1 }).data.length, 10);
});

test('paginate on an empty list returns page 1 of 1', () => {
  const r = paginate([], { page: 3, limit: 10 });
  assert.deepEqual(r, { data: [], total: 0, page: 1, pages: 1, limit: 10 });
});

test('buildMeta lists unique sorted cities, meats, types and statuses', () => {
  const meta = buildMeta(sample);
  assert.deepEqual(meta.cities, ['Tallinn', 'Tartu']);
  assert.deepEqual(meta.meats, ['beef', 'chicken', 'goat']);
  assert.deepEqual(meta.types, ['restaurant', 'shop']);
  assert.equal(meta.total, 3);
});
