import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { validateMenus } from '../src/menus.js';

const places = [
  { id: 'a', name: 'Alpha', type: 'restaurant', city: 'Tallinn', meats: [], halalStatus: 'venue_claim', menu: 'alpha' },
  { id: 'b', name: 'Beta', type: 'shop', city: 'Tallinn', meats: [], halalStatus: 'venue_claim', menu: null }
];
const menus = {
  alpha: {
    source: { label: 'Wolt', url: 'https://wolt.com/x' },
    priceType: 'delivery',
    lastChecked: '2026-11-10',
    links: [{ label: 'Order on Wolt', url: 'https://wolt.com/x' }],
    sections: [{ name: 'Popular', items: [{ name: 'Kebab box', price: 9.9 }] }]
  }
};

const app = () => createApp({ loadPlaces: async () => places, loadMenus: async () => menus, saveSuggestion: async () => {} });

test('GET /api/places/:id/menu returns the menu with the place id', async () => {
  const res = await request(app()).get('/api/places/a/menu');
  assert.equal(res.status, 200);
  assert.equal(res.body.placeId, 'a');
  assert.equal(res.body.sections[0].items[0].name, 'Kebab box');
});

test('GET /api/places/:id/menu is 404 when the place has no menu', async () => {
  const res = await request(app()).get('/api/places/b/menu');
  assert.equal(res.status, 404);
});

test('GET /api/places/:id/menu is 404 for unknown places', async () => {
  const res = await request(app()).get('/api/places/zzz/menu');
  assert.equal(res.status, 404);
});

test('places in lists say whether they have a menu', async () => {
  const res = await request(app()).get('/api/places');
  const byId = Object.fromEntries(res.body.data.map((p) => [p.id, p.hasMenu]));
  assert.deepEqual(byId, { a: true, b: false });
});

test('validateMenus accepts a correct menu file', () => {
  assert.deepEqual(validateMenus(menus, places), []);
});

test('validateMenus reports bad prices, missing names and unknown menu keys', () => {
  const bad = {
    alpha: { ...menus.alpha, sections: [{ name: 'S', items: [{ name: '', price: -1 }] }] }
  };
  const errs = validateMenus(bad, [...places, { id: 'c', menu: 'ghost' }]);
  assert.ok(errs.some((e) => /name/.test(e)));
  assert.ok(errs.some((e) => /price/.test(e)));
  assert.ok(errs.some((e) => /ghost/.test(e)));
});

test('the real data/menus.json is valid and every menu link is used', async () => {
  const { loadPlaces, loadMenus } = await import('../src/store.js');
  const [realPlaces, realMenus] = await Promise.all([loadPlaces(), loadMenus()]);
  assert.deepEqual(validateMenus(realMenus, realPlaces), []);
  const used = new Set(realPlaces.map((p) => p.menu).filter(Boolean));
  assert.deepEqual(Object.keys(realMenus).filter((k) => !used.has(k)), []);
});
