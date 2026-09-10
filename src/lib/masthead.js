import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The masthead is cream-on-sky by default. Over a paper sheet it switches to
 * ink, and it steps out of the way while you are reading downward.
 */
export function initMasthead() {
  const bar = document.querySelector('.masthead');
  if (!bar) return;

  const offset = bar.offsetHeight * 0.6;

  document.querySelectorAll('.sheet__inner').forEach((sheet) => {
    ScrollTrigger.create({
      trigger: sheet,
      start: `top top+=${offset}`,
      end: `bottom top+=${offset}`,
      onToggle: (self) => bar.classList.toggle('is-ink', self.isActive),
    });
  });

  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate: (self) => {
      const hide = self.direction === 1 && self.scroll() > window.innerHeight * 0.6;
      bar.classList.toggle('is-hidden', hide);
    },
  });
}
