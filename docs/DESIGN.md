# Design & Theming Session Context

Read this before touching CSS, layout, animations, or visual/UX changes.

## Theme system
- CSS custom properties defined in `css/style.css` `:root` (light — the default)
  and overridden in `:root[data-theme="dark"]`.
- Core brand colors are constant across both themes (derived from the logo):
  `--color-primary: #6c3ce9`, `--color-primary-hover: #5a2fd1`, `--color-accent: #9b6bff`.
  Everything else (backgrounds, text, borders, glow) differs per theme — check both
  blocks before adding a new variable.
- Toggle logic in `js/theme.js`, persisted to `localStorage['pc_plug_theme']`.
  Every page has an inline anti-flash `<script>` in `<head>` (before the
  stylesheet) that reads this key and sets `data-theme` before first paint —
  keep this on any new page.
- `css/admin.css` starts with `@import url("style.css")` then adds admin-only
  rules (login card, tables, stat cards, panels). Don't duplicate variables.

## Layout conventions
- Navbar: sticky, glass background via `--color-bg-glass` (NOT a hardcoded
  rgba — that was a real bug once, transparent/invisible in light mode).
- Logo: 72px in the navbar (`.brand img`), also duplicated larger (150px) in the
  homepage hero (`.hero-logo`) to the left of the heading text.
- Category access is a header dropdown (`.nav-dropdown` / `#categoryMenu`), not
  inline buttons in the page body — that was deliberately removed from the
  homepage per a past request ("give it soul" but keep the body focused on
  products, not category tiles).

## Animations ("soul")
- Hero: fade-in + floating logo (`heroFadeIn`, `heroFloat` keyframes).
- Product cards: staggered fade-in via inline `style="--card-i:N"` set in
  `productCardHtml()` (`js/products.js`), consumed by `.product-card`'s
  `animation-delay: calc(min(var(--card-i,0),12) * 40ms)`.
- Cart badge: `.bump` class + `cartBump` keyframe, triggered in
  `updateCartBadge()` (`js/cart.js`) only when the count actually changes.
- Category dropdown: opacity/transform transition, not instant `display` toggle.
- **Always respect `prefers-reduced-motion`** — the global override at the end
  of `css/style.css` handles this; don't add animations that bypass it.

## Testing
- Use the local dev server: `preview_start` with name `shop-server` (defined in
  `.claude/launch.json`, runs `npx serve`). **Do not** open via `file://` —
  `fetch('data/products.json')` needs an actual HTTP origin.
- Known local-only quirk: `serve` strips query strings on navigation (clean
  URLs) — `?id=p1` or `?category=X` links won't work when testing via the
  `navigate` tool; use `window.location.href = '...'` via JS instead, or
  `history.replaceState` + re-invoke the page's init function directly.
- After confirming locally, remember the cache-busting step in the root
  CLAUDE.md before pushing.
