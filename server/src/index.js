import { createApp } from './app.js';
import { loadPlaces, loadMenus, saveSuggestion } from './store.js';
import { createPhotoService } from './google-photos.js';
import { createFileReviewStore, connectMongoReviewStore } from './reviews.store.js';
import { loadEnv } from './env.js';

const envFound = loadEnv(new URL('../.env', import.meta.url));

const PORT = process.env.PORT || 4000;
const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
const mongoUri = (process.env.MONGODB_URI || '').trim();
const adminToken = (process.env.ADMIN_TOKEN || '').trim() || null;

// Reviews: MongoDB when MONGODB_URI is set (use this online), otherwise a local JSON file.
let reviewStore;
let reviewStorage;
if (mongoUri) {
  reviewStore = await connectMongoReviewStore(mongoUri);
  reviewStorage = 'MongoDB';
} else {
  reviewStore = createFileReviewStore(new URL('../data/reviews.json', import.meta.url));
  reviewStorage = 'data/reviews.json (local only — set MONGODB_URI online, or reviews are lost when the host restarts)';
}

const app = createApp({
  loadPlaces,
  loadMenus,
  saveSuggestion,
  photoService: key ? createPhotoService({ apiKey: key }) : null,
  reviewStore,
  adminToken,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  if (key) console.log('Google photos: ON');
  else if (!envFound) console.log('Google photos: OFF — no server/.env file. Copy .env.example to .env and add GOOGLE_MAPS_API_KEY.');
  else console.log('Google photos: OFF — server/.env exists but GOOGLE_MAPS_API_KEY is empty.');
  console.log(`Reviews saved to: ${reviewStorage}`);
  if (!adminToken) console.log('Review deletion: OFF — set ADMIN_TOKEN to remove spam reviews.');
});
