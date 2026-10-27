# MitsuCap — shared foundation for page builders

Plain static site (no build step), deployed to Netlify from the repo root.
Every page is `folder/index.html` (pretty URLs). The homepage (`/index.html`) is finished.

## 1. Rules for page agents

- **Do NOT edit shared files:** `styles.css`, `assets/css/site.css`, `script.js`,
  `assets/icons/mega-menu.svg`, anything in `_partials/`, the homepage `index.html`.
  If you need a shared change (new component, bug, missing class), **report it** instead.
- Your page owns only:
  - `<page-folder>/index.html` (e.g. `benefits-of-leasing/index.html`, `services/put-lease/index.html`)
  - `assets/css/pages/<slug>.css`
  - `assets/images/<slug>/…` (and, only if really needed, `assets/js/pages/<slug>.js`)
- `<slug>` = the last URL segment: `/services/put-lease/` → `put-lease`, `/about-us/` → `about-us`.
- Use **root-absolute paths** everywhere: `/styles.css`, `/assets/...`, `/contact/`.
  Never `../` and never relative `assets/...` (pages live in sub-folders).
- Do not add frameworks, build tools, CDNs or a second animation system.

## 2. Page skeleton (copy in this order)

```
_partials/head.html            <!DOCTYPE> … <head> … <body><div class="page">
  <div class="page-top">       (from _partials/hero.html)
    _partials/header.html      header + mega menu, pasted where hero.html says
    .page-hero …               hero
  </div>
  <main>
    …page sections…            (your own, plus shared ones below)
    _partials/experience-help.html   (optional)
    _partials/presentation.html      (optional)
    _partials/testimonial.html       (optional)
    _partials/cta.html               (almost every page)
  </main>
<!-- @include footer --><!-- /@include footer -->   (filled from _partials/footer.html by the build script)
_partials/scripts.html         scripts + </div></body></html>
```

`_partials/demo/index.html` shows every shared component stacked — open
`http://localhost:5173/_partials/demo/` (preview server "site") to see them.

### `<head>` CSS order (must be exactly this)

```html
<link rel="stylesheet" href="/styles.css">                 <!-- 1 tokens, fonts, buttons, homepage, footer -->
<link rel="stylesheet" href="/assets/css/site.css">        <!-- 2 header/mega menu + shared sections -->
<link rel="stylesheet" href="/assets/css/pages/<slug>.css"> <!-- 3 your page -->
```

plus the inline `<script>` from `head.html` (adds `.js` and `.anim` to `<html>`).

### Script order (end of `<body>`, from `scripts.html`)

```html
<script src="/assets/js/vendor/lenis.min.js"></script>
<script src="/assets/js/vendor/gsap.min.js"></script>
<script src="/assets/js/vendor/ScrollTrigger.min.js"></script>
<script src="/assets/js/vendor/SplitText.min.js"></script>
<script src="/script.js"></script>
<!-- optional, last: <script src="/assets/js/pages/<slug>.js"></script> -->
```

## 3. Partials and their classes

| File | Component | Main classes / modifiers |
|---|---|---|
| `head.html` | doc start + head | replace TITLE, DESCRIPTION, SLUG |
| `header.html` | header + mega menu (desktop dropdowns, tablet/mobile full-screen accordion) | `.site-header`, `.site-nav`, `.site-nav__item` (+`.is-current`), `.site-nav__head`, `.site-nav__link`, `.site-nav__trigger(--icon)`, `.mega`, `.mega__panel(--multi)`, `.mega__group(--2col/--3col)`, `.mega__heading`, `.mega__col`, `.mega__link` (+`aria-current="page"`), `.mega__tile`, `.mega__icon` |
| `hero.html` | `.page-top` glow wrapper + inner hero | `.page-top`, `.page-top__bg`, `.page-glow`, `.page-hero` (+`--text-only`, `--title-500`, `--tint-10/15/20`), `__text`, `__title`, `__intro`, `__actions`, `__media` |
| `experience-help.html` | dark + white card pair | `.help-cards` (+`--padded`), `.help-card` (+`--dark`), `__icon`, `__body`, `__title`, `__text` |
| `presentation.html` | Company Presentation | `.presentation` (+`--grey`), `__card`, `__media`, `__body`, `__title` |
| `testimonial.html` | quote card | `.testimonial` (+`--white`), `__card`, `__quote`, `__mark`, `__text`, `__author`, `__avatar`, `__name`, `__role` |
| `cta.html` | CTA band | homepage `.cta` + `.cta--inner` |
| `coming-soon.html` | Coming Soon card | `.coming-soon-section`, `.coming-soon`, `__head`, `__icon`, `__text`, `__title`, `__intro`, `__actions`; `.eyebrow` |
| `footer.html` | footer component (Figma "Footer" 2695:1042, Desktop/Tablet/Mobile) — **do not paste**: add the empty `@include footer` markers and run `node _partials/tools/build-partials.js` | `.footer …` (styles.css) |
| `scripts.html` | scripts + doc end | — |
| `elements.html` | buttons, Explore link, pills, eyebrow, section + section heading | see below |

**Mark the current page in the header**: on that page only, add `aria-current="page"` to the
matching `.mega__link` (on About Us, Solutions, Industries Served and Contact: the top `.site-nav__link`) and
`is-current` to its parent `.site-nav__item` (red top item on desktop).
That is the only allowed edit to the header markup.

**Small elements** (`elements.html`):
- Buttons: `.btn` + `.btn--red` (+`.btn--shadow-red`), `.btn--dark` (+`.btn--semibold` as in
  the inner-page Figma), `.btn--outline`, `.btn--outline-light` (with `--outline`, on dark),
  `.btn--white`, `.btn--block` (full width), `.btn-row` (12px gap wrapper). All 54px tall
  (16/20 padding, 18px SemiBold); mobile 14/20 + 16px (from styles.css).
- "Explore →" link: `a.explore` with the arrow spans (copy from `elements.html`), `.explore--light` on dark.
- Pills: `.pill-list` > `.pill` (+`--grey`, `--red`, `--dark`). Eyebrow: `.eyebrow` (red, uppercase).
- Sections: `.section` (grey #F4F4F4, 100/80/56px vertical, 60/32/16px sides),
  `.section--white`, `.section--dark`, `.section--flush-top`, `.section--flush-bottom`.
- Headings: `.section-title` (56/40/32 SemiBold, styles.css) inside `.section-head`
  (+`--center`, `--split`) with optional `.section-head__intro` (20/18/16 Medium, charcoal-400).

### Tokens (CSS variables)

From `styles.css`: `--red-200 #F7979A`, `--red-500 #ED1C24`, `--red-600`, `--primary-black #111`,
`--charcoal-900 #141519`, `--charcoal-700 #22232B`, `--charcoal-500 #30313C`, `--charcoal-400 #595A63`,
`--charcoal-50`, `--silver #D1D3D4`, `--warm-white-200 #F4F4F4` (= Figma "Bg"), `--warm-white-500 #E6E6E6`,
`--white`, `--shadow-red`, `--shadow-dark`, `--ease-out`, `--gutter` (desktop: min 111px, grows to keep content max `--content-max` 1218px centred; 32/16px).
From `site.css`: `--red-50`, `--red-100`, `--charcoal-800 #1A1B21`, `--charcoal-300 #74757C`,
`--charcoal-100 #BFBFC3`, **`--site-gutter` (= `--gutter` on desktop / 32 / 16px — use this for inner-page side margins)**,
`--section-pad` (100 / 80 / 56px), `--radius-card` 16px, `--shadow-panel`, `--shadow-card`.

Type scale (Figma text styles, desktop / tablet / mobile), font Gilroy 400/500/600/700:
Display 72/56/40 Bold · H1 64/40/32 · H2 56/40/32 · H3 40/32/20 · H4 32/24/18 · H5 24 ·
Body L 20/18/16 · Body M 18/18/16 · Body S 16/16/14 · Button 18/18/16 SemiBold · Nav 18 Medium.
Headings line-height 1.2, body 1.4.

Breakpoints: desktop ≥1200px · tablet `@media (max-width: 1199px)` · mobile `@media (max-width: 767px)`.
Figma frames: desktop 1440, tablet 768, mobile 390. Layouts are fluid between them.

## 4. Your page CSS

Create `assets/css/pages/<slug>.css`. Prefix every class with a page/section block name
(e.g. `.why-lease`, `.why-lease__item`) so nothing collides with shared classes. Never restyle
shared classes globally; if a shared component needs a variation, scope it
(`.benefits .help-cards { … }`) or report it. Put tablet and mobile rules in the same file under
the two media queries above.

## 5. Reveal animations (script.js — reuse, never re-implement)

Everything is driven by HTML attributes:

- `data-reveal-group` — a trigger. Its reveals play once when its top reaches the bottom of the
  screen. `data-reveal-group="load"` plays on page load (use for the hero only).
- `data-reveal="chars"` — heading letters fade in from the centre out (headings only, short text).
- `data-reveal="from-below" | "from-above" | "from-left" | "from-right"` — fade + slide.
  `data-reveal-at="0.5"` = start time (s) inside the group timeline,
  `data-reveal-distance="40"` = slide distance (px, default 50).
- `data-reveal="stagger"` on a list/grid — its direct children fade up one after another
  (own trigger, doesn't need a group). `data-reveal-distance` optional.
- `data-count="20"` counts a number up (homepage stat cards only).

Every `data-reveal` element (except `stagger`) must be inside a `data-reveal-group` (or be the group
itself). Elements are hidden by `html.anim` until GSAP is ready (4s failsafe), and everything is
shown immediately with `prefers-reduced-motion`. Typical section:

```html
<section class="section">
  <div class="section-head section-head--center" data-reveal-group>
    <h2 class="section-title" data-reveal="chars">Title</h2>
    <p class="section-head__intro" data-reveal="from-below" data-reveal-at="0.5" data-reveal-distance="30">Intro</p>
  </div>
  <ul class="my-cards" data-reveal="stagger">…</ul>
</section>
```

**Never use `text-transform: capitalize` (or uppercase) on a `data-reveal="chars"` heading**: SplitText wraps
every letter, so each letter gets capitalised. Type headings in the case Figma displays (e.g. "Benefits Of Leasing").

Don't put `data-reveal` on elements that you also animate with CSS transforms (GSAP owns
`transform`/`opacity` of reveal targets).

## 6. Images

1. Find the image fill in Figma (`get_design_context` returns asset URLs; they expire after 7 days)
   and download the PNG/JPG with `curl -L` into a temporary folder (your scratchpad, not the repo).
2. Convert to **WebP** — no image tools are installed, so use the bundled converter:
   - start it with the preview tool: `preview_start` name **"webp"** (port 5180; reuse it if
     it is already running — another agent may have started it), or `node _partials/tools/webp-server.js`;
   - open in the preview browser:
     `http://127.0.0.1:5180/?src=<ABSOLUTE source path>&out=assets/images/<slug>/<name>.webp&w=<max width>`
     (repeat `src`/`out`/`w` for several files; `q=0.82` default quality). The page title becomes
     `done N/N` and lists each file with its size.
   - Size: about **2× the displayed Figma size** (e.g. a 555×460 photo → `w=1110`), never upscaled.
3. Save under `/assets/images/<page-slug>/` with short kebab-case names (`hero.webp`, `team-1.webp`).
   Shared images live in `/assets/images/shared/` (don't add there — report instead).
4. In HTML: `width`/`height` attributes = the file's pixel size, meaningful `alt` (empty `alt=""` for
   decoration), `loading="lazy"` below the fold, `decoding="async"`; hero image `fetchpriority="high"`.
5. Icons: download the SVG from Figma into `/assets/icons/<slug>/` (keep it as delivered). Reuse
   existing icons in `/assets/icons/` when they match exactly.

## 7. Header / mega menu behaviour (for reference)

- Desktop (≥1200px): hovering a top item (or click / Enter / Space) opens its dropdown;
  ↓ opens and focuses the first link; Esc closes and returns focus; click outside or Tab away
  closes. Panels wider than the room on the right are shifted back inside the page margins.
- Tablet/mobile: ☰ opens the full-screen menu (`.site-nav.is-open`, `role="dialog"`), locks page
  scroll (`html.menu-open`, Lenis stopped), traps focus, Esc / ✕ / any link closes it. Top items
  are accordion sections (one open at a time, red when open).
- Industry links point to `/industries-served/#<slug>`: `power-utility`, `aviation-airport`,
  `rail-intermodal`, `material-handling-warehousing`, `industrial-manufacturing`,
  `construction-rental-houses`, `oil-gas-chemical`, `specialty-vehicles-equipment`, `medical`,
  `marine`, `computer-electronics`, `vendor-private-label`, `bank-credit-union`
  (the Industries Served page should give its sections these `id`s).

## 8. Changelog (shared foundation)

Drop any page-level workarounds for these — they are fixed in `assets/css/site.css` / the partials.

1. **Hero title capitalisation**: removed `text-transform: capitalize` from `.page-hero__title` (SplitText made every
   letter a capital). Type titles in title case.
2. **Hero title tablet/mobile**: now Figma Tablet/Display and Mobile/Display = SemiBold 56 / 40, line-height 1.11
   (desktop stays Bold 72 / 1.2).
3. **Hero photo ratio**: 555/460 desktop, 704/583 tablet, 358/297 mobile (was 704/440 and 358/260).
4. **Hero photo tint**: opt-in `.page-hero--tint-10 | --tint-15 | --tint-20` (black overlay). Figma uses it only on some
   pages: 10% Our Team, News, Blog · 15% About Us, MitsuCap’s Philosophy · 20% Affiliations · none elsewhere
   (services, contact, quote, schedule, forms, benefits, industries, brochures, associations).
5. **Hero title colour**: default `#22232B` (charcoal-700); `.page-hero--title-500` = `#30313C` for Associations,
   MitsuCap’s Philosophy, Our Team, Affiliations (as in their Figma frames).
6. **Experience + help cards**: stay side by side on tablet (2 × 344px, 2px rim, 24/24/32 padding, 24px titles) and
   only stack on mobile (12px gap, 20px padding, 48px icons).
7. **Header height**: inner-page header padding is now 56/24 desktop (144px bar), 20px tablet (≈94px), 16px mobile
   (71px bar) — mobile was 87px.
8. **Section colours that alternate per page**: `.testimonial--white` (default grey) and `.presentation--grey`
   (default white section + grey card; `--grey` = grey section + white card). Check your own Figma frame.
9. **Presentation tablet/mobile**: stacked and centred (Figma 2580:289 / 2580:1032). **Testimonial tablet/mobile**:
   Figma paddings/sizes. **Coming Soon tablet/mobile**: Figma 2603:23 / 2603:1408 (buttons stay side by side).
10. **CTA** `.cta--inner` title is SemiBold on tablet/mobile (Bold on desktop), as in Figma.
11. **WebP converter**: use `_partials/tools/webp-server.js` (preview_start name "webp", port 5180) — see section 6.
    It has no dependencies (the browser encodes WebP). Do not rely on `sharp` in a scratchpad.
12. **Content width**: desktop side margin is `--gutter` = max(111px, centring value), so every section's content is
    at most 1218px wide and centred while backgrounds stay full width. Sliders (homepage logo marquee, Core Values
    track) still bleed to the screen edge. `script.js` sets `--scrollbar` so the centring ignores the scrollbar.
13. **Mega menu v2** (Figma 2647:23 update): About Us, Solutions, Industries and Contact Us are links to their landing pages
    (`.site-nav__link`) with a chevron-only `.site-nav__trigger--icon` that opens the dropdown (desktop: hover still
    opens it; tablet/mobile: the label navigates, the chevron expands). Single-group panels have no heading; only
    Resources / Information keep their grey headers. The About Us and Contact Us panels no longer list themselves.
14. **Coming Soon pages are the live ones**: the mega menu's Blog / News / Brochures links and every
    "View Presentation" button point to `/blog/coming-soon/`, `/news/coming-soon/` and `/brochures/coming-soon/`.
    The full `/blog/`, `/news/` and `/brochures/` pages (dummy content) stay in the repo, unlinked, until there is
    real content; then switch the links back.
15. **Footer is a single shared component**: edit only `_partials/footer.html`, then run
    `node _partials/tools/build-partials.js` to stamp it into every page (between the `@include footer`
    markers; the current page's link gets `aria-current`). `--check` lists pages that are out of date.
    Layout follows the Figma Footer component: desktop brand (400) + four equal columns (Solutions, Company,
    Legal, Follow); tablet stacked with four columns; mobile two columns per row and a stacked bottom bar.
16. **404 page** (`/404.html`, repo root): Netlify serves it for any missing URL, so every href/src on it must be
    root-absolute. `build-partials.js` stamps the footer into it like the other pages.
17. **Unlinked pages** (kept off the menu/footer on purpose until there is real content): `/blog/`, `/news/`,
    `/brochures/` and the article template `/blog/5-signs-its-time-to-lease-instead-of-buy/` (reusable for News
    articles — see the comment at the top of its `<main>`). The menu links to the Coming Soon versions.
