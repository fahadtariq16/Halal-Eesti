import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const places = [
  { id: 'a', name: 'Alpha Kebab', type: 'restaurant', city: 'Tallinn', address: 'Aia 1', meats: ['chicken'], halalStatus: 'venue_claim', notes: '' },
  { id: 'b', name: 'Beta Market', type: 'shop', city: 'Tartu', address: 'Pikk 2', meats: ['goat'], halalStatus: 'third_party_listing', notes: '' }
];

function makeApp() {
  const saved = [];
  const app = createApp({
    loadPlaces: async () => places,
    saveSuggestion: async (s) => { saved.push(s); }
  });
  return { app, saved };
}

test('GET /api/health', async () => {
  const res = await request(makeApp().app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('GET /api/places returns all places with count', async () => {
  const res = await request(makeApp().app).get('/api/places');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.data.length, 2);
});

test('GET /api/places applies query filters', async () => {
  const res = await request(makeApp().app).get('/api/places?meat=goat');
  assert.deepEqual(res.body.data.map(p => p.id), ['b']);
});

test('GET /api/places?page=&limit= returns one page with totals', async () => {
  const res = await request(makeApp().app).get('/api/places?page=2&limit=1');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map(p => p.id), ['b']);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.page, 2);
  assert.equal(res.body.pages, 2);
});

test('GET /api/places without page returns everything (used by the map)', async () => {
  const res = await request(makeApp().app).get('/api/places');
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.page, undefined);
});

test('GET /api/places/:id returns one place', async () => {
  const res = await request(makeApp().app).get('/api/places/a');
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Alpha Kebab');
});

test('GET /api/places/:id returns 404 for unknown id', async () => {
  const res = await request(makeApp().app).get('/api/places/nope');
  assert.equal(res.status, 404);
});

test('GET /api/meta returns filter options', async () => {
  const res = await request(makeApp().app).get('/api/meta');
  assert.deepEqual(res.body.cities, ['Tallinn', 'Tartu']);
});

test('GET /api/places/:id/photo returns photo and attribution', async () => {
  const app = createApp({
    loadPlaces: async () => [{ ...places[0], googlePlaceId: 'G1' }],
    saveSuggestion: async () => {},
    photoService: { getPhoto: async (pid) => (pid === 'G1' ? { url: 'https://img/x', attributions: [{ name: 'Ali', uri: 'u' }] } : null) }
  });
  const res = await request(app).get('/api/places/a/photo');
  assert.equal(res.status, 200);
  assert.equal(res.body.url, 'https://img/x');
  assert.equal(res.body.attributions[0].name, 'Ali');
});

test('GET /api/places/:id/photo is 404 when photos are not configured', async () => {
  const res = await request(makeApp().app).get('/api/places/a/photo');
  assert.equal(res.status, 404);
});

test('GET /api/places/:id/photo is 404 when the place has no Google ID', async () => {
  const app = createApp({ loadPlaces: async () => places, saveSuggestion: async () => {}, photoService: { getPhoto: async () => ({ url: 'x', attributions: [] }) } });
  const res = await request(app).get('/api/places/a/photo');
  assert.equal(res.status, 404);
});

test('GET /api/places/:id/photo is 502 when Google fails', async () => {
  const app = createApp({
    loadPlaces: async () => [{ ...places[0], googlePlaceId: 'G1' }],
    saveSuggestion: async () => {},
    photoService: { getPhoto: async () => { throw new Error('Google 403'); } }
  });
  const res = await request(app).get('/api/places/a/photo');
  assert.equal(res.status, 502);
});

test('POST /api/suggestions saves a valid suggestion', async () => {
  const { app, saved } = makeApp();
  const res = await request(app).post('/api/suggestions').send({ name: 'New Shop', city: 'Narva', meats: ['beef'] });
  assert.equal(res.status, 201);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, 'New Shop');
  assert.ok(saved[0].submittedAt);
});

test('POST /api/suggestions rejects missing name or city', async () => {
  const { app, saved } = makeApp();
  const res = await request(app).post('/api/suggestions').send({ name: '' });
  assert.equal(res.status, 400);
  assert.equal(saved.length, 0);
});

test('POST /api/suggestions rejects unknown meat types', async () => {
  const { app } = makeApp();
  const res = await request(app).post('/api/suggestions').send({ name: 'X', city: 'Tallinn', meats: ['pork'] });
  assert.equal(res.status, 400);
});
