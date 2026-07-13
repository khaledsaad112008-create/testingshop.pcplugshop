# PC PLUG — Project Brain

Static e-commerce site for a Qatar-based PC hardware shop (CPUs, GPUs, full builds,
peripherals). No framework, no build tools, no backend — plain HTML/CSS/JS.

## Live site
- **URL**: https://vivapcplug.dpdns.org
- **Repo**: khaledsaad112008-create/testingshop.pcplugshop, branch `main` only
- **Hosting**: GitHub Pages (origin) behind Cloudflare (DNS proxy + Cloudflare Access
  gating `/admin/*` with email OTP)
- **Admin**: `/admin/login.html` — password is a SHA-256 hash in `js/admin.js`
  (never plaintext). Two independent locks: Cloudflare Access first, then this
  password.

## Deployment rules (read before pushing anything)
1. **Only `main` deploys.** A branch left unmerged never goes live no matter what —
   this has already caused one confusing "nothing updated" incident. Always confirm
   `git branch --show-current` is `main` before pushing, or merge into `main`.
2. **Cache-bust every JS/CSS change.** Cloudflare edge-caches `.js`/`.css` for 4h vs
   10min for HTML. Every `<script src>`/`<link>` tag uses a `?v=N` query param —
   bump it whenever that file's content changes, or visitors see stale code for
   hours. `data/products.json` is fetched with `cache: "no-store"` and needs no
   version bump.
3. **Verify against origin, not the public URL, right after pushing.** Use
   `curl --resolve vivapcplug.dpdns.org:443:185.199.108.153 <url>` to bypass
   Cloudflare and confirm GitHub's build actually finished before checking the
   public URL — hitting the public URL too early caches whatever stale content
   was there at that moment for another 4h.
4. Only commit/push when asked, same as any repo — but once asked, this project's
   workflow is "I push straight to main," not PR-based.

## Structure
- `index.html`, `product.html`, `cart.html` — customer-facing pages
- `admin/` — login, dashboard (CRUD), reports (Excel export)
- `js/products.js` — catalog data loading/CRUD, category list, rendering helpers
- `js/cart.js` — cart + WhatsApp checkout
- `js/admin.js` — admin auth + dashboard logic
- `js/excel.js`, `js/theme.js` — Excel export, light/dark toggle
- `css/style.css` (customer theme), `css/admin.css` (imports style.css + admin extras)
- `data/products.json` — the product database (see docs/PRODUCTS.md)
- `images/products/` — locally-hosted product photos

## Key facts
- **Currency is QAR**, not USD — `formatPrice()` in `js/products.js`.
- **WhatsApp number** lives in `WHATSAPP_NUMBER` in `js/cart.js`.
- Out-of-stock products show an "Inquire on WhatsApp" button instead of Add to Cart.

## Deeper context (read only what you need)
- **docs/DESIGN.md** — theme system, colors, animations, CSS conventions
- **docs/PRODUCTS.md** — catalog data model, admin draft/export workflow, categories
- **docs/BACKEND.md** — current static-only limits, what a future real backend needs

For a quick one-off question, this file is usually enough — no need to read further.
