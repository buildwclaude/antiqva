# ANTIQVA — Issue XIV

A single-page prospectus for an invented European art review, built as a
neoclassical printed object: cerulean sky, marble cream paper, madder and gold.

Vanilla JS + Vite · Three.js (sky + gallery shaders) · GSAP/ScrollTrigger · Lenis.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview
```

## The hero asset

The supplied paintings (`neoasset.png`, `neoassetplant.png`) had a solid
blue sky, not an alpha channel, so the cutout was made here: the sky was keyed on
blue-minus-red (the two populations are cleanly bimodal — figure below ~10, sky
above ~155), rim pixels were un-mixed against a locally sampled sky colour rather
than simply feathered, and the result was cropped to the alpha bounding box.

Everything in `public/` is generated from those sources:

| File | What it is |
| --- | --- |
| `statue-cutout.png` / `.webp` | 577 × 918 keyed cutout (WebP is 70 KB against 920 KB) |
| `statue-cutout-sm.webp` | 340 px wide, served to phones via `<picture>` |
| `plates/plate-1…6.jpg` / `.webp` | six 640 × 800 details, the gallery plates |
| `branch.png` / `.webp` / `-sm.webp` | the bound branch keyed out of `neoassetplant.png`, for the contents |

Rebuild them all with `node tools/make-assets.mjs neoasset.png neoassetplant.png`.

## How it is put together

```
index.html          semantic document; all copy lives here
src/main.js         bootstrap — one GSAP ticker drives every frame of WebGL
src/lib/env.js      motion / pointer / viewport probes, shared resize
src/lib/scroll.js   Lenis, driven by the GSAP ticker, feeding ScrollTrigger
src/lib/sky.js      full-page sky: 3-stop gradient + fbm noise + dusk shift
src/lib/gallery.js  one textured plane per plate, synced to the DOM rects
src/lib/detail.js   hand-rolled FLIP from thumbnail to detail panel
src/lib/intro.js    load sequence: sky → figure → headline, line by line
src/lib/reveals.js  per-character heading reveals, parallax on the figure
src/lib/masthead.js cream over sky, ink over paper, out of the way going down
src/lib/cursor.js   dot + ring, swells over anything interactive
src/lib/rail.js     the progress rail — also the sky's clock
src/lib/works.js    plate catalogue copy
```

**The sky** is one fixed canvas behind the whole page. `uProgress` comes from the
same ScrollTrigger that drives the progress rail, so the gradient walks from
`#044BAE`/`#0C5EC8`/`#1E77DD` at the masthead to a madder-and-gold dusk at the
colophon, the horizon warming a little ahead of the zenith.

**The gallery** keeps the plates in the DOM as real lazy-loaded `<img>`s and
adopts each one as a Three.js texture when it nears the viewport — no second
request. Planes are positioned from `getBoundingClientRect()` each frame, so
Lenis, resizes and reflows need no special handling. Hover runs a travelling
`sin(d·k − t)` ripple with an `exp(−d)` envelope out from the cursor, plus a 34%
desaturation and a warm paper tint.

## Behaviour by device

- **Mobile / coarse pointer / no WebGL** — the hero canvas stays; the gallery
  falls back to the DOM images with CSS transforms, the custom cursor is off, the
  halftone layer and the figure's drop-shadow are dropped, and the sky renders at
  a pixel ratio of 1 (a smooth gradient with dithering does not need more).
- **`prefers-reduced-motion: reduce`** — Lenis is never constructed, the intro and
  every scroll animation resolve to their end state, the sky renders only when the
  scroll position changes it, and the cursor and ripple are disabled. Flipping the
  preference mid-session tears down smooth scrolling and settles the timelines.

## Performance notes

Budget-minded rather than benchmarked — no mid-range phone was available here:
one shared `gsap.ticker` for both renderers; the gallery renderer is idle unless
the section is on screen and a plate is visible; off-screen planes are culled;
the sky is a single quad with a 4-octave fbm at pixel ratio ≤ 1.5; and the two
full-screen blended overlays (the costly kind on mobile GPUs) are reduced to one
unblended layer under 860 px.

## A note on the content

The review, the painter Auguste Rivière-Belloc, *The Column of Victory*, the
contributors and the catalogue notes are all invented for this demonstration.
