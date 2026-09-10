import '../src/styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { env, hasWebGL, onMotionChange, onResize } from './lib/env.js';
import { initScroll, destroyScroll } from './lib/scroll.js';
import { createSky } from './lib/sky.js';
import { createGallery } from './lib/gallery.js';
import { initReveals } from './lib/reveals.js';
import { heroIntro } from './lib/intro.js';
import { initDetail } from './lib/detail.js';
import { initCursor } from './lib/cursor.js';
import { initRail } from './lib/rail.js';
import { initMasthead } from './lib/masthead.js';

gsap.registerPlugin(ScrollTrigger);

const plates = gsap.utils.toArray('.plate');
let sky = null;
let gallery = null;

boot();

function boot() {
  initScroll();

  /* ── the sky, behind the whole page ── */
  const canvas = document.getElementById('sky');
  if (hasWebGL()) {
    try {
      sky = createSky(canvas);
    } catch (err) {
      console.warn('[antiqva] sky shader unavailable, falling back to CSS gradient', err);
      document.documentElement.classList.add('no-webgl');
    }
  } else {
    document.documentElement.classList.add('no-webgl');
  }

  /* ── the gallery: WebGL on the desktop, CSS transitions everywhere else ── */
  if (env.richGallery) {
    try {
      gallery = createGallery(plates);
      ScrollTrigger.create({
        trigger: '#plates',
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => gallery.setLive(self.isActive),
      });
    } catch (err) {
      console.warn('[antiqva] gallery shader unavailable, using CSS transitions', err);
      gallery = null;
    }
  }
  if (!gallery) plates.forEach((p) => p.classList.add('plate--css'));

  /* ── one ticker for every frame of WebGL work ── */
  if (sky || gallery) {
    gsap.ticker.add((time) => {
      sky?.render(time);
      gallery?.update(time);
    });
  }

  initReveals();
  initMasthead();
  initRail((p) => sky?.setProgress(p));
  initDetail({ plates, gallery });
  initCursor();
  initSubscribe();

  onResize(() => ScrollTrigger.refresh());

  /* Honour a mid-session change of heart about motion. */
  onMotionChange((reduced) => {
    if (!reduced) return;
    destroyScroll();
    gsap.globalTimeline.progress(1);
    sky?.markDirty();
  });

  startIntro();
}

/** Hold the curtain until the figure has actually decoded. */
function startIntro() {
  const img = document.querySelector('[data-statue] img');
  const go = () => requestAnimationFrame(() => {
    heroIntro();
    ScrollTrigger.refresh();
  });

  if (!img || img.complete) { go(); return; }
  let done = false;
  const once = () => { if (!done) { done = true; go(); } };
  img.decode?.().then(once).catch(once);
  img.addEventListener('load', once, { once: true });
  setTimeout(once, 2200);                       // never let a slow image hold the page
}

function initSubscribe() {
  const form = document.querySelector('.subscribe');
  if (!form) return;
  const msg = form.querySelector('.subscribe__msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    msg.textContent = ok
      ? 'Thank you — Issue XV will be sent flat, in November.'
      : 'A valid address, please, and the plates will follow.';
    if (ok) { input.value = ''; input.blur(); }
  });
}
