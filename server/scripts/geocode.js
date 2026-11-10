// Re-geocode every place that has an address, using OpenStreetMap Nominatim.
// Coordinates in places.json were set by hand and are approximate — run this to fix them.
// Usage: npm run geocode   (respects Nominatim's 1 request/second rule)
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../data/places.json', import.meta.url);
const places = JSON.parse(await readFile(file, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const p of places) {
  if (!p.address) continue;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ee&q=${encodeURIComponent(p.address)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'halal-estonia-geocoder/1.0' } });
  const [hit] = await res.json();
  if (hit) {
    p.lat = Number(Number(hit.lat).toFixed(5));
    p.lng = Number(Number(hit.lon).toFixed(5));
    console.log(`✔ ${p.name}: ${p.lat}, ${p.lng}`);
  } else {
    console.log(`✘ ${p.name}: not found (${p.address})`);
  }
  await sleep(1100);
}

await writeFile(file, JSON.stringify(places, null, 2) + '\n');
console.log('Saved.');
