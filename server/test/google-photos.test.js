import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoService } from '../src/google-photos.js';

// Fake fetch that answers like the Places API (New).
function fakeFetch({ photos = [{ name: 'places/P1/photos/AAA', authorAttributions: [{ displayName: 'Ali', uri: 'https://maps.google.com/u/ali' }] }], photoUri = 'https://lh3.googleusercontent.com/x' } = {}) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.includes('/media')) return { ok: true, json: async () => ({ photoUri }) };
    return { ok: true, json: async () => ({ photos }) };
  };
  fn.calls = calls;
  return fn;
}

test('returns first photo url and author attributions', async () => {
  const fetch = fakeFetch();
  const svc = createPhotoService({ apiKey: 'KEY', fetch });
  const photo = await svc.getPhoto('P1');
  assert.equal(photo.url, 'https://lh3.googleusercontent.com/x');
  assert.deepEqual(photo.attributions, [{ name: 'Ali', uri: 'https://maps.google.com/u/ali' }]);
});

test('asks only for the photos field and sends the key in a header', async () => {
  const fetch = fakeFetch();
  await createPhotoService({ apiKey: 'KEY', fetch }).getPhoto('P1');
  const details = fetch.calls[0];
  assert.match(details.url, /places\.googleapis\.com\/v1\/places\/P1$/);
  assert.equal(details.opts.headers['X-Goog-FieldMask'], 'photos');
  assert.equal(details.opts.headers['X-Goog-Api-Key'], 'KEY');
});

test('requests a sized image without following the redirect', async () => {
  const fetch = fakeFetch();
  await createPhotoService({ apiKey: 'KEY', fetch, maxWidth: 640 }).getPhoto('P1');
  const media = fetch.calls[1].url;
  assert.match(media, /places\/P1\/photos\/AAA\/media\?/);
  assert.match(media, /maxWidthPx=640/);
  assert.match(media, /skipHttpRedirect=true/);
});

test('returns null when the place has no photos', async () => {
  const svc = createPhotoService({ apiKey: 'KEY', fetch: fakeFetch({ photos: [] }) });
  assert.equal(await svc.getPhoto('P1'), null);
});

test('caches results so repeat views do not cost extra API calls', async () => {
  const fetch = fakeFetch();
  const svc = createPhotoService({ apiKey: 'KEY', fetch });
  await svc.getPhoto('P1');
  await svc.getPhoto('P1');
  assert.equal(fetch.calls.length, 2); // 1 details + 1 media, not 4
});

test('expired cache entries are fetched again', async () => {
  let now = 0;
  const fetch = fakeFetch();
  const svc = createPhotoService({ apiKey: 'KEY', fetch, ttlMs: 1000, now: () => now });
  await svc.getPhoto('P1');
  now = 2000;
  await svc.getPhoto('P1');
  assert.equal(fetch.calls.length, 4);
});

test('throws a clear error when Google rejects the request', async () => {
  const fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'API key not valid' } }) });
  const svc = createPhotoService({ apiKey: 'BAD', fetch });
  await assert.rejects(svc.getPhoto('P1'), /403.*API key not valid/);
});
