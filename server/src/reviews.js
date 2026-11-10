// Reviews: validation, summaries and a simple per-visitor rate limit.

export const HALAL_ANSWERS = ['yes', 'no', 'unsure'];
const LINK = /(https?:\/\/|www\.|\.(com|ee|net|org|ru|io)\b)/i;
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

export function validateReview(body = {}) {
  const errors = [];
  const name = clean(body.name);
  const text = String(body.text ?? '').trim();
  const rating = Number(body.rating);
  const halal = body.halal == null || body.halal === '' ? 'unsure' : String(body.halal);

  if (name.length < 2 || name.length > 40) errors.push('Name must be 2–40 characters.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('Rating must be 1 to 5 stars.');
  if (text.length < 10) errors.push('Review must be at least 10 characters.');
  if (text.length > 1000) errors.push('Review must be at most 1000 characters.');
  if (LINK.test(text) || LINK.test(name)) errors.push('Please remove links from your review.');
  if (!HALAL_ANSWERS.includes(halal)) errors.push('Halal answer must be yes, no or unsure.');

  return { errors, value: { name, rating, text, halal } };
}

export function summarize(reviews) {
  const halal = { yes: 0, no: 0, unsure: 0 };
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    if (r.halal in halal) halal[r.halal] += 1;
  }
  const count = reviews.length;
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : null, halal };
}

/** Fixed-window limiter kept in memory. Good enough for one server; resets on restart. */
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const hits = new Map(); // key -> { start, count }
  return {
    hit(key) {
      const t = now();
      const h = hits.get(key);
      if (!h || t - h.start >= windowMs) {
        hits.set(key, { start: t, count: 1 });
        return true;
      }
      if (h.count >= limit) return false;
      h.count += 1;
      return true;
    }
  };
}
