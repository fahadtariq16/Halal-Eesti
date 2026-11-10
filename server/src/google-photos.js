// Fetches a place's first photo live from Google Places API (New).
// We never store Google photos ourselves (their terms forbid it); we only keep the place ID,
// look the photo up when someone views the page, and pass the photographer credit to the UI.
//
// Cost control: results are cached in memory for a few hours so the same card viewed
// many times only costs one Place Details + one Photo request per TTL window.

const BASE = 'https://places.googleapis.com/v1';

export function createPhotoService({
  apiKey,
  fetch = globalThis.fetch,
  maxWidth = 800,
  ttlMs = 6 * 60 * 60 * 1000,
  now = Date.now
}) {
  if (!apiKey) throw new Error('createPhotoService needs an apiKey');
  const cache = new Map(); // placeId -> { at, promise }

  async function call(url, headers = {}) {
    const res = await fetch(url, { headers: { 'X-Goog-Api-Key': apiKey, ...headers } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Google Places ${res.status}: ${body.error?.message ?? 'request failed'}`);
    }
    return res.json();
  }

  async function load(placeId) {
    const details = await call(`${BASE}/places/${encodeURIComponent(placeId)}`, { 'X-Goog-FieldMask': 'photos' });
    const photo = details.photos?.[0];
    if (!photo) return null;

    const media = await call(`${BASE}/${photo.name}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`);
    return {
      url: media.photoUri,
      attributions: (photo.authorAttributions ?? []).map((a) => ({ name: a.displayName, uri: a.uri }))
    };
  }

  return {
    getPhoto(placeId) {
      const hit = cache.get(placeId);
      if (hit && now() - hit.at < ttlMs) return hit.promise;
      // Cache the promise so parallel requests for the same place share one API call.
      const promise = load(placeId).catch((err) => { cache.delete(placeId); throw err; });
      cache.set(placeId, { at: now(), promise });
      return promise;
    }
  };
}
