import { gsap } from 'gsap';
import { works } from './works.js';
import { env } from './env.js';
import { stopScroll, startScroll } from './scroll.js';

/**
 * Expands a plate into the detail panel: the thumbnail lifts out of the grid
 * and settles into the panel (a hand-rolled FLIP, so no extra plugin).
 */
export function initDetail({ plates, gallery }) {
  const root = document.getElementById('detail');
  const scrim = root.querySelector('.detail__scrim');
  const panel = root.querySelector('.detail__panel');
  const figure = root.querySelector('.detail__figure');
  const img = root.querySelector('#detail-img');
  const body = root.querySelector('.detail__body');
  const closeBtn = root.querySelector('.detail__close');
  const inertTargets = [document.querySelector('.masthead'), document.querySelector('main'), document.querySelector('.colophon')];

  let open = -1;
  let busy = false;
  let lastFocus = null;
  let tl = null;

  plates.forEach((plate, i) => {
    plate.querySelector('.plate__open').addEventListener('click', () => openPlate(i));
  });

  root.querySelectorAll('[data-detail-close]').forEach((el) => {
    el.addEventListener('click', () => closePlate());
  });

  document.addEventListener('keydown', (e) => {
    if (open < 0) return;
    if (e.key === 'Escape') { e.preventDefault(); closePlate(); }
    if (e.key === 'Tab') trapFocus(e);
  });

  function trapFocus(e) {
    const focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function fill(i) {
    const w = works[i];
    const source = plates[i].querySelector('img');
    img.src = source.currentSrc || source.src;   // already decoded and cached
    img.alt = source.alt;
    root.querySelector('#detail-num').textContent = w.num;
    root.querySelector('#detail-title').textContent = w.title;
    root.querySelector('#detail-meta').textContent = `${w.artist} · ${w.date}`;
    root.querySelector('#detail-note').textContent = w.note;
    root.querySelector('#detail-facts').innerHTML = [
      ['Artist', w.artist], ['Date', w.date], ['Medium', w.medium], ['Sheet', w.size],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  function openPlate(i) {
    if (busy || open >= 0) return;
    busy = true;
    open = i;
    lastFocus = document.activeElement;

    fill(i);
    root.hidden = false;
    document.documentElement.classList.add('is-locked');
    stopScroll();
    inertTargets.forEach((el) => el?.setAttribute('inert', ''));

    const card = plates[i].querySelector('.plate__frame');
    const from = card.getBoundingClientRect();

    gsap.set(panel, { opacity: 1 });
    gsap.set(figure, { clearProps: 'transform' });
    const to = figure.getBoundingClientRect();

    plates[i].classList.add('is-lifting');
    gallery?.setPlateOpacity(i, 0, 0.01);

    tl?.kill();
    if (env.reduced) {
      gsap.set(scrim, { opacity: 1 });
      gsap.set(body.children, { opacity: 1, y: 0 });
      closeBtn.focus();
      busy = false;
      return;
    }

    tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => { busy = false; closeBtn.focus({ preventScroll: true }); },
    });

    tl.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      .fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.05)
      .fromTo(figure, {
        x: from.left - to.left,
        y: from.top - to.top,
        scaleX: from.width / to.width,
        scaleY: from.height / to.height,
      }, {
        x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.9,
      }, 0)
      .fromTo(body.children,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.35);
  }

  function closePlate() {
    if (open < 0 || busy) return;
    const i = open;
    busy = true;

    const card = plates[i].querySelector('.plate__frame');
    const from = card.getBoundingClientRect();
    const to = figure.getBoundingClientRect();

    const finish = () => {
      root.hidden = true;
      open = -1;
      busy = false;
      plates[i].classList.remove('is-lifting');
      gallery?.setPlateOpacity(i, 1, 0.5);
      document.documentElement.classList.remove('is-locked');
      startScroll();
      inertTargets.forEach((el) => el?.removeAttribute('inert'));
      (lastFocus || plates[i].querySelector('.plate__open'))?.focus({ preventScroll: true });
      gsap.set([scrim, panel], { clearProps: 'opacity' });
      gsap.set(figure, { clearProps: 'transform' });
    };

    tl?.kill();
    if (env.reduced) { finish(); return; }

    tl = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finish });
    tl.to(body.children, { opacity: 0, y: 12, duration: 0.3, ease: 'power2.in' }, 0)
      .to(figure, {
        x: from.left - to.left,
        y: from.top - to.top,
        scaleX: from.width / to.width,
        scaleY: from.height / to.height,
        duration: 0.75,
      }, 0.05)
      .to(panel, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.45)
      .to(scrim, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.4);
  }

  return { close: closePlate };
}
