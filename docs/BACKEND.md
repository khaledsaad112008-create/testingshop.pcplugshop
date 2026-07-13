# Backend Session Context (future)

Read this only if/when the site moves off the current static-only architecture.

## Current state
No backend exists. The "database" is `data/products.json`, a static file in the
repo, fetched client-side. Admin changes are a local browser draft that must be
manually exported and committed to go live (see docs/PRODUCTS.md). There is no
real-time sync between the admin's edits and other visitors, and no per-user
accounts beyond the single shared admin password.

## Why it's still static
A real backend was scoped once (this session) and deliberately deferred:
- **Firebase** was set up (Firestore + planned Storage + Auth), but Cloud
  Storage now requires the Blaze (pay-as-you-go) plan even for free-tier usage
  — needs a card on file. The user preferred not to commit to that, so the
  migration was abandoned in favor of the local JSON-file approach.
- Alternatives not yet tried: Supabase (Postgres + Storage + instant REST API,
  free tier without a forced paid upgrade) is probably the best next candidate
  if this gets revisited — closest to a drop-in replacement for the current
  fetch-based `loadProducts()` pattern.

## If this gets revisited, what changes
- `js/products.js`'s `getProducts()`/`addProduct()`/`updateProduct()`/
  `deleteProduct()` are currently synchronous, backed by `localStorage`. A
  real backend needs these to become async (or keep a synchronous in-memory
  cache kept live via a realtime subscription/listener, to avoid rewriting
  every caller in `cart.js`/`admin.js`/`excel.js`).
- The admin password check (SHA-256 hash in `js/admin.js`) is client-side only
  — inherently not secure against a determined attacker, since the whole
  check ships to the browser. A real backend should replace this with actual
  server-side auth (Supabase Auth / Firebase Auth), which would also let
  Firestore/Postgres security rules enforce "only authenticated writes"
  instead of relying on Cloudflare Access as the real gate (see root
  CLAUDE.md — Cloudflare Access in front of `/admin/*` is currently doing the
  heavy lifting for real access control, not the app-level password).
- Image uploads currently go through `FileReader` → base64 data URL embedded
  directly in the product record (works, but bloats `data/products.json` and
  has practical size limits). A real backend should use actual object storage
  (Supabase Storage / S3-compatible / Cloudflare R2) and store just a URL.
- The Export/Reload manual-publish workflow in docs/PRODUCTS.md goes away
  entirely — admin writes would hit the database directly and be visible to
  all visitors immediately.
