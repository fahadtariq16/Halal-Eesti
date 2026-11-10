import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { validateReview, summarize, createRateLimiter } from '../src/reviews.js';
import { createMemoryReviewStore, createMongoReviewStore } from '../src/reviews.store.js';

const places = [
  { id: 'a', name: 'Alpha', type: 'restaurant', city: 'Tallinn', meats: [], halalStatus: 'venue_claim' },
  { id: 'b', name: 'Beta', type: 'butcher', city: 'Tallinn', meats: [], halalStatus: 'venue_claim' }
];
const good = { name: 'Fahad', rating: 5, text: 'Fresh lamb, cut to order. Very friendly.', halal: 'yes' };

function makeApp(opts = {}) {
  const reviewStore = opts.reviewStore ?? createMemoryReviewStore();
  const app = createApp({
    loadPlaces: async () => places,
    saveSuggestion: async () => {},
    reviewStore,
    adminToken: 'secret',
    reviewLimit: opts.reviewLimit ?? { limit: 100, windowMs: 60_000 }
  });
  return { app, reviewStore };
}

// ---------- validation ----------
test('validateReview accepts a normal review and trims it', () => {
  const { errors, value } = validateReview({ ...good, name: '  Fahad  ' });
  assert.deepEqual(errors, []);
  assert.equal(value.name, 'Fahad');
  assert.equal(value.rating, 5);
  assert.equal(value.halal, 'yes');
});

test('validateReview rejects bad rating, short text and short name', () => {
  const { errors } = validateReview({ name: 'A', rating: 6, text: 'ok' });
  assert.ok(errors.some((e) => /name/i.test(e)));
  assert.ok(errors.some((e) => /rating/i.test(e)));
  assert.ok(errors.some((e) => /review/i.test(e)));
});

test('validateReview rejects links to stop spam', () => {
  const { errors } = validateReview({ ...good, text: 'Great kebab, see www.cheap-pills.com today' });
  assert.ok(errors.some((e) => /link/i.test(e)));
});

test('validateReview defaults the halal answer to "unsure" and rejects unknown answers', () => {
  assert.equal(validateReview({ ...good, halal: undefined }).value.halal, 'unsure');
  assert.ok(validateReview({ ...good, halal: 'maybe' }).errors.length > 0);
});

test('summarize gives count, average to one decimal and halal answers', () => {
  const s = summarize([
    { rating: 5, halal: 'yes' }, { rating: 4, halal: 'yes' }, { rating: 4, halal: 'unsure' }
  ]);
  assert.deepEqual(s, { count: 3, average: 4.3, halal: { yes: 2, no: 0, unsure: 1 } });
  assert.deepEqual(summarize([]), { count: 0, average: null, halal: { yes: 0, no: 0, unsure: 0 } });
});

test('rate limiter allows N hits per window per key, then blocks, then resets', () => {
  let now = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(rl.hit('ip1'), true);
  assert.equal(rl.hit('ip1'), true);
  assert.equal(rl.hit('ip1'), false);
  assert.equal(rl.hit('ip2'), true);
  now = 1500;
  assert.equal(rl.hit('ip1'), true);
});

// ---------- stores ----------
test('memory store adds, lists and removes', async () => {
  const s = createMemoryReviewStore();
  await s.add({ id: 'r1', placeId: 'a', rating: 5 });
  assert.equal((await s.all()).length, 1);
  assert.equal(await s.remove('r1'), true);
  assert.equal(await s.remove('r1'), false);
});

test('mongo store maps to the collection API', async () => {
  const docs = [];
  const fakeCollection = {
    insertOne: async (d) => { docs.push(d); },
    find: () => ({ toArray: async () => docs.map((d) => ({ ...d })) }),
    deleteOne: async ({ _id }) => {
      const i = docs.findIndex((d) => d._id === _id);
      if (i >= 0) docs.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    }
  };
  const s = createMongoReviewStore(fakeCollection);
  await s.add({ id: 'r1', placeId: 'a', rating: 4 });
  const all = await s.all();
  assert.equal(all[0].id, 'r1');
  assert.equal('_id' in all[0], false);
  assert.equal(await s.remove('r1'), true);
});

// ---------- API ----------
test('POST /api/places/:id/reviews saves a review', async () => {
  const { app, reviewStore } = makeApp();
  const res = await request(app).post('/api/places/a/reviews').send(good);
  assert.equal(res.status, 201);
  assert.equal(res.body.review.name, 'Fahad');
  assert.ok(res.body.review.id);
  assert.ok(res.body.review.createdAt);
  assert.equal((await reviewStore.all()).length, 1);
});

test('POST rejects invalid reviews with 400 and messages', async () => {
  const res = await request(makeApp().app).post('/api/places/a/reviews').send({ name: '', rating: 0, text: '' });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.length >= 3);
});

test('POST to an unknown place is 404', async () => {
  const res = await request(makeApp().app).post('/api/places/zzz/reviews').send(good);
  assert.equal(res.status, 404);
});

test('POST with the hidden honeypot field filled pretends success but saves nothing', async () => {
  const { app, reviewStore } = makeApp();
  const res = await request(app).post('/api/places/a/reviews').send({ ...good, website: 'http://spam' });
  assert.equal(res.status, 201);
  assert.equal((await reviewStore.all()).length, 0);
});

test('POST is limited per visitor (429 after the limit)', async () => {
  const { app } = makeApp({ reviewLimit: { limit: 2, windowMs: 60_000 } });
  await request(app).post('/api/places/a/reviews').send(good);
  await request(app).post('/api/places/a/reviews').send(good);
  const res = await request(app).post('/api/places/a/reviews').send(good);
  assert.equal(res.status, 429);
});

test('GET /api/places/:id/reviews returns newest first with a summary', async () => {
  const { app } = makeApp();
  await request(app).post('/api/places/a/reviews').send({ ...good, rating: 3, text: 'First review here, okay food.' });
  await new Promise((r) => setTimeout(r, 5));
  await request(app).post('/api/places/a/reviews').send({ ...good, rating: 5, text: 'Second review, much better.' });
  await request(app).post('/api/places/b/reviews').send(good);
  const res = await request(app).get('/api/places/a/reviews');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.average, 4);
  assert.match(res.body.data[0].text, /Second/);
});

test('GET reviews is paginated', async () => {
  const { app } = makeApp();
  for (let i = 0; i < 7; i++) await request(app).post('/api/places/a/reviews').send({ ...good, text: `Review number ${i} is fine.` });
  const res = await request(app).get('/api/places/a/reviews?page=2&limit=5');
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.pages, 2);
});

test('place lists include rating and reviewCount', async () => {
  const { app } = makeApp();
  await request(app).post('/api/places/a/reviews').send({ ...good, rating: 4 });
  const res = await request(app).get('/api/places');
  const a = res.body.data.find((p) => p.id === 'a');
  const b = res.body.data.find((p) => p.id === 'b');
  assert.equal(a.reviewCount, 1);
  assert.equal(a.rating, 4);
  assert.equal(b.reviewCount, 0);
  assert.equal(b.rating, null);
});

test('DELETE /api/reviews/:id needs the admin token', async () => {
  const { app } = makeApp();
  const created = await request(app).post('/api/places/a/reviews').send(good);
  const id = created.body.review.id;
  assert.equal((await request(app).delete(`/api/reviews/${id}`)).status, 401);
  assert.equal((await request(app).delete(`/api/reviews/${id}`).set('Authorization', 'Bearer wrong')).status, 401);
  assert.equal((await request(app).delete(`/api/reviews/${id}`).set('Authorization', 'Bearer secret')).status, 204);
  assert.equal((await request(app).delete(`/api/reviews/${id}`).set('Authorization', 'Bearer secret')).status, 404);
});

test('reviews are disabled (404) when no review store is configured', async () => {
  const app = createApp({ loadPlaces: async () => places, saveSuggestion: async () => {} });
  assert.equal((await request(app).get('/api/places/a/reviews')).status, 404);
});
