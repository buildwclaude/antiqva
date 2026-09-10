import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The thin rail down the left edge. Its progress also drives the sky's
 * afternoon-to-dusk shift, so both read from one source of truth.
 */
export function initRail(onProgress) {
  const fill = document.querySelector('.rail__fill');
  const ticks = gsap.utils.toArray('.rail__tick');

  const apply = (p) => {
    gsap.set(fill, { scaleY: p });
    ticks.forEach((t) => {
      const at = parseFloat(t.style.getPropertyValue('--at')) || 0;
      t.classList.toggle('is-past', p >= at - 0.001);
    });
    onProgress?.(p);
  };

  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => apply(self.progress),
  });

  apply(0);
}
