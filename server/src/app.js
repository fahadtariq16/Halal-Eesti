import express from 'express';
import cors from 'cors';
import { filterPlaces, buildMeta, validateSuggestion, paginate } from './places.service.js';

/**
 * Build the Express app. Storage is injected so tests can use in-memory data
 * and you can later swap the JSON file for PostgreSQL/MongoDB without touching routes.
 */
const withMenuFlag = (places, menus) => places.map((p) => ({ ...p, hasMenu: Boolean(p.menu && menus[p.menu]) }));

export function createApp({ loadPlaces, loadMenus = async () => ({}), saveSuggestion, photoService = null, corsOrigin = '*' }) {
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', photos: Boolean(photoService) }));

  app.get('/api/places', async (req, res, next) => {
    try {
      const all = withMenuFlag(filterPlaces(await loadPlaces(), req.query), await loadMenus());
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
