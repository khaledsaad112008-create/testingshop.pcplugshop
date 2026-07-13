# Product / Catalog Session Context

Read this before adding, editing, importing, or fixing product data.

## The database
`data/products.json` is the single source of truth — a plain array of:
```json
{ "id": "p1", "name": "...", "price": 379.99, "category": "CPUs",
  "stock": 24, "description": "...", "image": "/images/products/x.jpg" }
```
- IDs are `p1`, `p2`, ... sequential, must stay unique.
- **Price is QAR**, no currency symbol in the number itself — `formatPrice()`
  appends " QAR" at render time.
- `category` must exactly match one of the canonical `CATEGORIES` list in
  `js/products.js` (currently 16: CPUs, GPUs, Motherboards, RAM, Storage,
  Power Supplies, Cases, Cooling, Monitors, Keyboards, Mice, Headsets,
  Full PCs, Laptops, Networking, Gift Cards). Admin's category dropdown and
  the storefront filter both read from this same constant.
- `image`: prefer a real local file under `images/products/` referenced as
  `/images/products/name.jpg` (leading slash — works from any page depth,
  including `/admin/`). Avoid hotlinking external CDNs (fragile, can break or
  rate-limit). If downloading from a source site (Instagram, a classifieds
  listing, etc.), verify the file actually saved correctly (`file <path>`
  should say JPEG/PNG, not an HTML error page) before committing.

## How admin edits actually work (important — a real gotcha)
This is a **static site with no backend**. The admin dashboard's Add/Edit/Delete
only writes to that browser's `localStorage` — it is a **local draft**, not the
real file, until explicitly published:

1. Admin edits in the dashboard → saved to `localStorage['pc_plug_products_v3']`,
   which also sets a dirty flag (`pc_plug_products_dirty`).
2. While dirty, that browser will NOT auto-refresh from the published
   `data/products.json` (protects the unsaved draft from being clobbered).
3. To publish: click **"⬇ Export Database"** → get the downloaded file → it
   needs to actually replace `data/products.json` in the repo and get
   committed + pushed to `main`. There is no automatic sync.
4. **"↻ Reload from Database"** discards the local draft entirely and re-syncs
   from the published file — use only when you want to throw away unsaved
   admin edits.

**A real incident this caused**: a user edited/committed a new catalog on a
different git branch, then tested via admin and assumed "Reload from Database"
would pull it in — but that button only reads from `main`'s published file via
the live HTTP fetch, and the edit was never on `main` at all. Always check
`git branch --show-current` and `git status` on `data/products.json` if a
user says an edit "isn't showing up" — 9 times out of 10 it's either the dirty
flag protecting a stale local draft, or the edit never actually got committed
to `main`.

## Out-of-stock handling
When `stock <= 0`, product cards and the detail page automatically render an
"💬 Inquire on WhatsApp" link instead of Add to Cart (see `stockActionHtml()`
and `buildInquiryUrl()` in `js/products.js`). No manual flag needed — driven
entirely by the `stock` field.

## Bulk imports
When importing a batch of real listings (marketplace, Instagram, etc.):
- Check for near-duplicates first — if listings are the same product reposted,
  ask whether to merge or keep separate (a real prior case: 3 identical PC
  listings, kept separate because each had one genuinely distinct spec detail).
- Download images locally rather than hotlink (see above).
- Validate before committing: unique IDs, valid categories, all required
  fields present, referenced image files actually exist on disk.
