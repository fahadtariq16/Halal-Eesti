import { readFileSync } from 'node:fs';

// Loads server/.env into process.env. Works on any Node version (no dotenv needed).
// Variables already set in the shell win over the file.
export function loadEnv(fileUrl) {
  let text;
  try { text = readFileSync(fileUrl, 'utf8'); } catch { return false; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}
