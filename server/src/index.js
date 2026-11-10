import { createApp } from './app.js';
import { loadPlaces, loadMenus, saveSuggestion } from './store.js';
import { createPhotoService } from './google-photos.js';
import { loadEnv } from './env.js';

const envFound = loadEnv(new URL('../.env', import.meta.url));

const PORT = process.env.PORT || 4000;
const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();

const app = createApp({
  loadPlaces,
  loadMenus,
  saveSuggestion,
  photoService: key ? createPhotoService({ apiKey: key }) : null,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  if (key) console.log('Google photos: ON');
  else if (!envFound) console.log('Google photos: OFF — no server/.env file. Copy .env.example to .env and add GOOGLE_MAPS_API_KEY.');
  else console.log('Google photos: OFF — server/.env exists but GOOGLE_MAPS_API_KEY is empty.');
});
