import { gsap } from 'gsap';
import { env } from './env.js';

/**
 * Load sequence: the sky comes up, the figure rises onto her column,
 * then the headline arrives one line at a time.
 */
export function heroIntro() {
  const statue = document.querySelector('[data-statue]');
  const lines = gsap.utils.toArray('.hero__title .line__inner');

  if (env.reduced) {
    gsap.set('#sky', { opacity: 1 });
    gsap.set(statue, { opacity: 1, yPercent: 0 });
    gsap.set(lines, { yPercent: 0, y: 0 });
    gsap.set('[data-intro]', { opacity: 1, y: 0 });
    return gsap.timeline();
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to('#sky', { opacity: 1, duration: 1.2, ease: 'power2.out' })
    .fromTo(statue,
      { opacity: 0, yPercent: 7 },
      { opacity: 1, yPercent: 0, duration: 1.6, ease: 'power3.out' }, '-=0.65')
    // y:0 is explicit — the CSS pre-paint state is a % translate, which GSAP
    // otherwise reads back into the px channel and leaves behind.
    .fromTo(lines,
      { yPercent: 112, y: 0 },
      { yPercent: 0, y: 0, duration: 1.25, stagger: 0.11, ease: 'power4.out' }, '-=1.15')
    .fromTo('[data-intro="eyebrow"]',
      { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9 }, '-=1.35')
    .fromTo('[data-intro="lede"]',
      { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1 }, '-=0.85')
    .fromTo('[data-intro="actions"]',
      { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1 }, '-=0.85')
    .fromTo('.masthead > *',
      { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09 }, '-=1.2')
    .fromTo('[data-intro="scroll"]',
      { opacity: 0 }, { opacity: 0.6, duration: 0.9 }, '-=0.7')
    .fromTo('.rail', { opacity: 0 }, { opacity: 1, duration: 0.8 }, '-=0.8');

  return tl;
}
