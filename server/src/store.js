import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const placesFile = path.join(dataDir, 'places.json');
const suggestionsFile = path.join(dataDir, 'suggestions.json');

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return fallback; throw err; }
}

export const loadPlaces = () => readJson(placesFile, []);
export const loadMenus = () => readJson(path.join(dataDir, 'menus.json'), {});

// Simple file store. Fine for a prototype; move to a database before real traffic.
let queue = Promise.resolve();
export function saveSuggestion(suggestion) {
  queue = queue.then(async () => {
    const list = await readJson(suggestionsFile, []);
    list.push(suggestion);
    await writeFile(suggestionsFile, JSON.stringify(list, null, 2));
  });
  return queue;
}
