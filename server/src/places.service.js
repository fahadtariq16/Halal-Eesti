const norm = (v) => (v ?? '').toString().trim().toLowerCase();

// "sellers" = places where you buy raw meat; "restaurants" = places that serve cooked food.
export const SELLER_TYPES = ['butcher', 'shop', 'online'];
const groupOf = (p) => (SELLER_TYPES.includes(p.type) ? 'sellers' : 'restaurants');

/**
 * Filter places by query params. All filters combine with AND.
 * - city, type, status: exact match (case-insensitive)
 * - meat: comma list, place matches if it has ANY of them
 * - q: free text over name, address, notes
 */
export function filterPlaces(places, { city, type, status, meat, q, group } = {}) {
  const meats = norm(meat).split(',').map((m) => m.trim()).filter(Boolean);
  const text = norm(q);

  return places.filter((p) => {
    if (group && groupOf(p) !== norm(group)) return false;
    if (city && norm(p.city) !== norm(city)) return false;
    if (type && norm(p.type) !== norm(type)) return false;
    if (status && norm(p.halalStatus) !== norm(status)) return false;
    if (meats.length && !meats.some((m) => (p.meats || []).includes(m))) return false;
    if (text) {
      const haystack = [p.name, p.address, p.notes, p.city].map(norm).join(' ');
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

/**
 * Slice a list into pages. Bad or out-of-range page numbers are clamped, never an error,
 * so a stale link like ?page=9 after filtering still shows something useful.
 */
export function paginate(items, { page, limit } = {}) {
  const size = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const pages = Math.max(Math.ceil(items.length / size), 1);
  const current = Math.min(Math.max(parseInt(page, 10) || 1, 1), pages);
  const start = (current - 1) * size;
  return { data: items.slice(start, start + size), total: items.length, page: current, pages, limit: size };
}

const uniqSorted =(arr) => [...new Set(arr.filter(Boolean))].sort();

export function buildMeta(places) {
  return {
    total: places.length,
    groups: {
      sellers: places.filter((p) => groupOf(p) === 'sellers').length,
      restaurants: places.filter((p) => groupOf(p) === 'restaurants').length
    },
    cities: uniqSorted(places.map((p) => p.city)),
    meats: uniqSorted(places.flatMap((p) => p.meats || [])),
    types: uniqSorted(places.map((p) => p.type)),
    statuses: uniqSorted(places.map((p) => p.halalStatus))
  };
}

export const ALLOWED_MEATS = ['chicken', 'beef', 'goat', 'lamb'];

export function validateSuggestion(body = {}) {
  const errors = [];
  if (!norm(body.name)) errors.push('name is required');
  if (!norm(body.city)) errors.push('city is required');
  const meats = Array.isArray(body.meats) ? body.meats.map(norm) : [];
  const bad = meats.filter((m) => !ALLOWED_MEATS.includes(m));
  if (bad.length) errors.push(`unknown meats: ${bad.join(', ')}`);
  if (norm(body.name).length > 120) errors.push('name too long');
  return {
    errors,
    value: {
      name: String(body.name ?? '').trim(),
      city: String(body.city ?? '').trim(),
      address: String(body.address ?? '').trim().slice(0, 200),
      meats,
      evidence: String(body.evidence ?? '').trim().slice(0, 500)
    }
  };
}
