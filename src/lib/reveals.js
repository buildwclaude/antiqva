import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env.js';

/** Wrap each character in its own span, keeping the heading readable to AT. */
function splitChars(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', text);
  const holder = document.createElement('span');
  holder.setAttribute('aria-hidden', 'true');

  const words = text.split(' ');
  words.forEach((word, wi) => {
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      w.appendChild(c);
    }
    holder.appendChild(w);
    if (wi < words.length - 1) holder.appendChild(document.createTextNode(' '));
  });

  el.textContent = '';
  el.appendChild(holder);
  return holder.querySelectorAll('.char');
}

export function initReveals() {
  const reduced = env.reduced;

  /* section headings — staggered character reveal */
  gsap.utils.toArray('[data-chars]').forEach((title) => {
    const chars = splitChars(title);
    if (reduced) return;
    gsap.fromTo(chars,
      { yPercent: 108, opacity: 0 },
      {
        yPercent: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        stagger: { each: 0.016, from: 'start' },
        scrollTrigger: { trigger: title, start: 'top 84%', once: true },
      });
  });

  /* everything else — a quiet lift */
  if (!reduced) {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.fromTo(batch,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
    });

    gsap.fromTo('.plate',
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: '.plate-grid', start: 'top 85%', once: true },
      });
  }

  /* the figure lags the page, so she parallaxes against the type */
  const statue = document.querySelector('[data-statue]');
  if (statue && !reduced) {
    gsap.to(statue, {
      y: () => window.innerHeight * 0.42,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
  }
}
