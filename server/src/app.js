import express from 'express';
import cors from 'cors';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { filterPlaces, buildMeta, validateSuggestion, paginate } from './places.service.js';
import { validateReview, summarize, createRateLimiter } from './reviews.js';

/**
 * Build the Express app. Storage is injected so tests can use in-memory data
 * and you can later swap the JSON file for PostgreSQL/MongoDB without touching routes.
 */
const withMenuFlag = (places, menus) => places.map((p) => ({ ...p, hasMenu: Boolean(p.menu && menus[p.menu]) }));

// Adds rating (average, or null) and reviewCount to each place.
function withRatings(places, reviews) {
  const byPlace = new Map();
  for (const r of reviews) {
    if (!byPlace.has(r.placeId)) byPlace.set(r.placeId, []);
    byPlace.get(r.placeId).push(r);
  }
  return places.map((p) => {
    const s = summarize(byPlace.get(p.id) ?? []);
    return { ...p, rating: s.average, reviewCount: s.count };
  });
}

const sameToken = (given, expected) => {
  const a = Buffer.from(String(given)), b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
};

export function createApp({
  loadPlaces,
  loadMenus = async () => ({}),
  saveSuggestion,
  photoService = null,
  reviewStore = null,                                     // null = reviews switched off
  adminToken = null,                                      // needed to delete reviews
  reviewLimit = { limit: 5, windowMs: 60 * 60 * 1000 },   // max reviews per visitor per hour
  corsOrigin = '*'
}) {
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '20kb' }));
  // Behind Netlify/Render the visitor's IP is in X-Forwarded-For; used only for the rate limit, never stored.
  app.set('trust proxy', true);
  const reviewLimiter = createRateLimiter(reviewLimit);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', photos: Boolean(photoService) }));

  app.get('/api/places', async (req, res, next) => {
    try {
      const reviews = reviewStore ? await reviewStore.all() : [];
      const all = withRatings(withMenuFlag(filterPlaces(await loadPlaces(), req.query), await loadMenus()), reviews);
      // No ?page → return everything (the map needs all matches). With ?page → one page.
      if (req.query.page === undefined) return res.json({ count: all.length, data: all });
      const { data, total, page, pages, limit } = paginate(all, req.query);
      res.json({ count: total, page, pages, limit, data });
    } catch (err) { next(err); }
  });

  // Live Google photo for a place. 404 means "no photo, show the generated cover".
  app.get('/api/places/:id/photo', async (req, res, next) => {
    try {
      if (!photoService) return res.status(404).json({ error: 'Photos are not configured' });
      const place = (await loadPlaces()).find((p) => p.id === req.params.id);
      if (!place?.googlePlaceId) return res.status(404).json({ error: 'No photo for this place' });
      let photo;
      try { photo = await photoService.getPhoto(place.googlePlaceId); }
      catch (err) { console.warn(err.message); return res.status(502).json({ error: 'Photo provider failed' }); }
      if (!photo) return res.status(404).json({ error: 'No photo for this place' });
      res.set('Cache-Control', 'private, max-age=3600');
      res.json(photo);
    } catch (err) { next(err); }
  });

  app.get('/api/places/:id/menu', async (req, res, next) => {
    try {
      const place = (await loadPlaces()).find((p) => p.id === req.params.id);
      const menu = place?.menu ? (await loadMenus())[place.menu] : null;
      if (!menu) return res.status(404).json({ error: 'No menu for this place' });
      res.json({ placeId: place.id, ...menu });
    } catch (err) { next(err); }
  });

  // ---------- Reviews ----------
  app.get('/api/places/:id/reviews', async (req, res, next) => {
    try {
      if (!reviewStore) return res.status(404).json({ error: 'Reviews are not enabled' });
      const reviews = (await reviewStore.all())
        .filter((r) => r.placeId === req.params.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const { count, average, halal } = summarize(reviews);
      const { data, page, pages, limit } = paginate(reviews, { page: req.query.page, limit: req.query.limit ?? 5 });
      res.json({ count, average, halal, page, pages, limit, data });
    } catch (err) { next(err); }
  });

  app.post('/api/places/:id/reviews', async (req, res, next) => {
    try {
      if (!reviewStore) return res.status(404).json({ error: 'Reviews are not enabled' });
      const place = (await loadPlaces()).find((p) => p.id === req.params.id);
      if (!place) return res.status(404).json({ error: 'Place not found' });

      // Honeypot: a hidden "website" field real people never fill in. Bots do; we pretend it worked.
      if (req.body?.website) return res.status(201).json({ message: 'Thanks for your review!' });

      if (!reviewLimiter.hit(req.ip)) {
        return res.status(429).json({ errors: ['Too many reviews from you in a short time. Please try again later.'] });
      }
      const { errors, value } = validateReview(req.body);
      if (errors.length) return res.status(400).json({ errors });

      const review = { id: randomUUID(), placeId: place.id, ...value, createdAt: new Date().toISOString() };
      await reviewStore.add(review);
      res.status(201).json({ message: 'Thanks for your review!', review });
    } catch (err) { next(err); }
  });

  // Remove a review (spam, abuse). Needs: Authorization: Bearer <ADMIN_TOKEN>
  app.delete('/api/reviews/:reviewId', async (req, res, next) => {
    try {
      const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!adminToken || !token || !sameToken(token, adminToken)) return res.status(401).json({ error: 'Not allowed' });
      if (!reviewStore) return res.status(404).json({ error: 'Reviews are not enabled' });
      const removed = await reviewStore.remove(req.params.reviewId);
      if (!removed) return res.status(404).json({ error: 'Review not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  app.get('/api/places/:id', async (req, res, next) => {
    try {
      const place = (await loadPlaces()).find((p) => p.id === req.params.id);
      if (!place) return res.status(404).json({ error: 'Place not found' });
      res.json(place);
    } catch (err) { next(err); }
  });

  app.get('/api/meta', async (_req, res, next) => {
    try { res.json(buildMeta(await loadPlaces())); } catch (err) { next(err); }
  });

  app.post('/api/suggestions', async (req, res, next) => {
    try {
      const { errors, value } = validateSuggestion(req.body);
      if (errors.length) return res.status(400).json({ errors });
      await saveSuggestion({ ...value, submittedAt: new Date().toISOString() });
      res.status(201).json({ message: 'Thanks! We will verify and add it.' });
    } catch (err) { next(err); }
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
