import { gsap } from 'gsap';
import { env } from './env.js';

/** A cream dot with a gold ring that swells over anything interactive. */
export function initCursor() {
  if (env.coarse || env.reduced) return null;

  const root = document.querySelector('.cursor');
  const ring = root.querySelector('.cursor__ring');
  const dot = root.querySelector('.cursor__dot');
  const label = root.querySelector('.cursor__label');
  root.classList.add('is-on');

  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power2' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power2' });

  let hovering = false;
  let shown = false;
  gsap.set(root, { opacity: 0 });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) { shown = true; gsap.to(root, { opacity: 1, duration: 0.3 }); }
    ringX(e.clientX); ringY(e.clientY);
    dotX(e.clientX); dotY(e.clientY);
  }, { passive: true });

  window.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.82, duration: 0.2 }));
  window.addEventListener('pointerup', () => gsap.to(ring, { scale: hovering ? 2.5 : 1, duration: 0.3 }));
  document.addEventListener('pointerleave', () => gsap.to(root, { opacity: 0, duration: 0.3 }));
  document.addEventListener('pointerenter', () => gsap.to(root, { opacity: 1, duration: 0.3 }));

  const selector = 'a, button, input, [data-cursor-label]';

  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest?.(selector);
    if (!target || hovering) return;
    hovering = true;
    const text = target.dataset.cursorLabel || '';
    label.textContent = text;
    gsap.to(ring, { scale: text ? 2.5 : 1.9, duration: 0.45, ease: 'power3.out' });
    gsap.to(label, { opacity: text ? 1 : 0, duration: 0.3 });
    gsap.to(dot, { scale: 0, duration: 0.3 });
  });

  document.addEventListener('pointerout', (e) => {
    const target = e.target.closest?.(selector);
    if (!target || e.relatedTarget?.closest?.(selector)) return;
    hovering = false;
    gsap.to(ring, { scale: 1, duration: 0.5, ease: 'power3.out' });
    gsap.to(label, { opacity: 0, duration: 0.2 });
    gsap.to(dot, { scale: 1, duration: 0.3 });
  });

  return root;
}
