import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

/**
 * Lenis drives the wheel; GSAP's ticker drives Lenis; ScrollTrigger listens.
 * With reduced motion we skip Lenis entirely and let the browser scroll natively.
 */
export function initScroll() {
  if (!env.reduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6,
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  // In-page anchors go through Lenis so the easing matches the rest of the page.
  document.querySelectorAll('[data-anchor]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      scrollTo(target);
    });
  });

  return { lenis };
}

function tick(time) {
  lenis?.raf(time * 1000);
}

export function scrollTo(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.4, ...opts });
  else target.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export function stopScroll() { lenis?.stop(); }
export function startScroll() { lenis?.start(); }

/** Used when the motion preference flips to "reduce" mid-session. */
export function destroyScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}
