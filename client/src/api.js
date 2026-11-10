const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.errors?.join(', ') || body.error || `Request failed (${res.status})`);
  return body;
}

export function getPlaces(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  return request(`/api/places?${params}`);
}

export const getMeta = () => request('/api/meta');

// One request per place per page load; a failed or missing photo resolves to null.
const photoCache = new Map();
export function getPhoto(id) {
  if (!photoCache.has(id)) {
    photoCache.set(id, request(`/api/places/${encodeURIComponent(id)}/photo`).catch(() => null));
  }
  return photoCache.get(id);
}

export const sendSuggestion = (data) =>
  request('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

export const getMenu = (id) => request(`/api/places/${encodeURIComponent(id)}/menu`);

export const getReviews = (id, page = 1) =>
  request(`/api/places/${encodeURIComponent(id)}/reviews?page=${page}&limit=5`);

export const sendReview = (id, data) =>
  request(`/api/places/${encodeURIComponent(id)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
