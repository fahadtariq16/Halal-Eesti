// Menus live in data/menus.json, keyed by a menu id. A place points to its menu with
// "menu": "<id>", so branches of a chain (KFC, Kebaboom…) share one menu.
//
// Menu shape:
// {
//   "source":      { "label": "Wolt", "url": "https://..." },   // where prices were read
//   "priceType":   "delivery" | "in_store",                      // delivery-app prices are often higher
//   "lastChecked": "2026-11-10",
//   "links":       [{ "label": "Full menu & order on Wolt", "url": "https://..." }],
//   "notes":       "optional text shown above the menu",
//   "sections":    [{ "name": "Popular", "items": [
//                     { "name": "...", "description": "...", "price": 9.9, "unit": "kg", "image": "/menu/x.jpg" }
//                  ]}]
// }

export function validateMenus(menus, places) {
  const errors = [];
  for (const [key, m] of Object.entries(menus)) {
    if (!m.lastChecked) errors.push(`${key}: lastChecked is missing`);
    if (!['delivery', 'in_store'].includes(m.priceType)) errors.push(`${key}: priceType must be delivery or in_store`);
    for (const s of m.sections ?? []) {
      if (!s.name) errors.push(`${key}: a section has no name`);
      for (const it of s.items ?? []) {
        if (!it.name) errors.push(`${key}/${s.name}: an item has no name`);
        if (it.price != null && !(typeof it.price === 'number' && it.price >= 0)) {
          errors.push(`${key}/${s.name}/${it.name || '?'}: price must be a number ≥ 0`);
        }
      }
    }
  }
  for (const p of places) {
    if (p.menu && !menus[p.menu]) errors.push(`${p.id}: points to menu "${p.menu}" which does not exist`);
  }
  return errors;
}
