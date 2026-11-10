# Halal Estonia

Halal butchers, shops and restaurants across Estonia — chicken, beef, lamb and goat.

- `server/` — Node.js + Express REST API (data in `server/data/places.json`)
- `client/` — React (Vite) + Leaflet map

## Run locally

Requires Node.js 18+.

```bash
# terminal 1
cd server && npm install && npm run dev      # http://localhost:4000

# terminal 2
cd client && npm install && npm run dev      # http://localhost:5173
```

Vite proxies `/api` to port 4000 in dev. For production, set `VITE_API_URL` in the client
and `CORS_ORIGIN` on the server.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{status:"ok"}` |
| GET | `/api/places` | filters: `group` (`sellers` or `restaurants`), `city`, `meat` (comma list), `type`, `status`, `q`. Add `page` (and optional `limit`, default 10, max 50) to get one page: response adds `page`, `pages`, `limit`; `count` is the total. Without `page` you get every match (the map uses this). |
| GET | `/api/places/:id` | 404 if unknown |
| GET | `/api/meta` | totals, `groups.sellers`, `groups.restaurants`, cities, meats, types, statuses |
| POST | `/api/suggestions` | `{name, city, address?, meats?, evidence?}` → saved to `data/suggestions.json` |

`group=sellers` = types `butcher`, `shop`, `online`. `group=restaurants` = type `restaurant`.

## Tests

```bash
cd server && npm test     # node:test + supertest, 45 tests
```

## Data model

```json
{
  "id": "anadolu-gourmet",
  "name": "Anadolu Gourmet",
  "type": "butcher | shop | online | restaurant",
  "city": "Tallinn", "address": "Kiikri 6, Tallinn", "lat": 59.44, "lng": 24.78,
  "meats": ["beef", "lamb"],
  "halalStatus": "venue_claim | third_party_listing | customer_reports",
  "delivery": false,
  "notes": "...",
  "googlePlaceId": "ChIJ...",
  "image": null,
  "sources": ["https://..."],
  "lastChecked": "2026-11-07"
}
```

`halalStatus` records **where the claim comes from**, strongest first:

- `venue_claim` — the business advertises halal (website, menu, delivery app, or its name)
- `third_party_listing` — a halal directory or guide lists it
- `customer_reports` — only customer reviews mention halal

Estonia has no national halal certifier. Never label a place "certified" unless you have seen the certificate.

## Place photos from Google (optional)

Cards show each place's first Google Maps photo, fetched **live** from the Google Places API (New)
when the card scrolls into view. Nothing from Google is saved to disk, only the `googlePlaceId`,
which Google allows you to store. Each photo shows the photographer's name and "Google Maps",
which Google's terms require. Without a key, cards fall back to the generated covers.

Setup:

1. In Google Cloud Console, create a project, turn on billing, and enable **Places API (New)**.
2. Create an API key and restrict it to *Places API (New)*.
3. `cp server/.env.example server/.env` and paste the key into `GOOGLE_MAPS_API_KEY`.
4. Restart the server. It prints `Google photos: on`.

Cost: each new photo costs one Place Details call plus one Place Photo call. The server caches
results for 6 hours in memory, so repeat views are free until then. Check current prices and the
monthly free usage on Google's pricing page, and set a budget alert before you launch.

Endpoint: `GET /api/places/:id/photo` returns `{ url, attributions: [{ name, uri }] }`, or 404 if there is no photo.

## Google Maps data: read before you sell this

Several listings were found through Google Maps. This project stores only Google place IDs,
names and addresses. Do not copy Google reviews, ratings, photos or opening hours into
`places.json`. If you want ratings or hours on the site, fetch them live the same way as photos.
Run `cd server && npm run geocode` to replace coordinates with OpenStreetMap ones.

## Adding photos

Your own photo always wins over the Google one.

1. Put the file in `client/public/places/`, e.g. `anadolu-gourmet.jpg` (landscape, ~1200×900, under 300 KB).
2. Set `"image": "/places/anadolu-gourmet.jpg"` on that place in `places.json`.

Only use photos you took or that the owner allowed you to use.

## Adding a logo

For a logo (round or square), use `logo` instead of `image` so it's shown whole in the middle of the card, not cropped:

1. Save it in `client/public/places/`, e.g. `anadolu-gourmet-logo.png` (square, at least 200×200).
2. In `server/data/places.json`, set `"logo": "/places/anadolu-gourmet-logo.png"`.

Priority on a card: your photo (`image`) → logo (`logo`) → Google photo → patterned cover.

## Menus

Menus live in `server/data/menus.json`, keyed by a menu id. A place uses one with `"menu": "<id>"` in
`places.json`, so all branches of a chain share one menu (e.g. every KFC branch uses `"menu": "kfc"`).

```json
"gulluzadem": {
  "source": { "label": "Wolt", "url": "https://wolt.com/..." },
  "priceType": "delivery",            // or "in_store"
  "lastChecked": "2026-11-10",
  "links": [{ "label": "Full menu & order on Wolt", "url": "https://wolt.com/..." }],
  "notes": "Optional text shown above the menu",
  "sections": [
    { "name": "Kebab", "items": [
      { "name": "Pita döner kebab", "price": 10.5, "description": "Chicken, beef or mixed",
        "image": "/menu/gulluzadem-pita.jpg" }
    ]}
  ]
}
```

- `price` is a number in euros. Add `"unit": "kg"` for butchers to show "€12.90 / kg".
- **Dish photos:** put them in `client/public/menu/` and set `"image"` on the item. Only use photos you
  took or the owner sent you, not copies from Wolt or Google.
- A menu can have `"sections": []` and just links; the popup then shows the notes and the order buttons.
- `npm test` checks menus.json for missing names, bad prices and broken `menu` ids.
- API: `GET /api/places/:id/menu`. Place lists include `hasMenu: true/false`.
- Prices copied from delivery apps are often higher than in the restaurant and change often: re-check
  `lastChecked` regularly, or ask owners for their in-store price list.

## Reviews

Visitors can rate any place (1–5 stars), write a short review and say whether the place confirmed the meat is halal. Ratings show on cards and in a **Reviews** tab in each place's popup.

API:
- `GET  /api/places/:id/reviews?page=1&limit=5` — newest first, with average and halal answer counts
- `POST /api/places/:id/reviews` — body `{ name, rating, text, halal: "yes"|"no"|"unsure" }`
- `DELETE /api/reviews/:reviewId` — admin only, needs `Authorization: Bearer <ADMIN_TOKEN>`

Rules the server enforces: name 2–40 characters, text 10–1000 characters, no links, max 5 reviews per hour from one IP (the IP is not stored). A hidden "website" field catches simple bots.

### Where reviews are saved
- **Locally:** `server/data/reviews.json` (git-ignored).
- **Online (Render):** the free plan wipes files on every restart, so you **must** use a database. Create a free MongoDB Atlas cluster, then on Render → Environment add:
  - `MONGODB_URI` = your Atlas connection string
  - `ADMIN_TOKEN` = a long random secret (e.g. run `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`)
  - In Atlas → Network Access, allow `0.0.0.0/0` (Render has no fixed IP on the free plan).

### Deleting a bad review
Find its `id` in the reviews response, then:
```
curl -X DELETE https://halal-eesti.onrender.com/api/reviews/REVIEW_ID -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Before you sell this
Reviews go live immediately. You are responsible for removing illegal or defamatory content once you are told about it, and reviews contain personal data (names) under GDPR. Add a short privacy notice and a "report a review" contact email before launch.

## Known data gaps (Nov 2026)

- **No goat seller found.** Ask butchers directly — many will order goat on request.
- **Narva:** no place with halal evidence found.
- Shop Lasnamäe (Pae 70) has no coordinates; Halal.ee is online-only.
- Tatari Chaihana was removed (Google shows it closed).
- Türgi BBQ's address now shows 'Osman Grill 2' on Google, so it may have been renamed.
- Three Lasnamäe shops (Pae 70, Pae 76, Vikerlase 23) come from one directory with no other details.
