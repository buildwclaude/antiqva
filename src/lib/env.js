/* Environment probes shared by every module. */

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarseQuery = window.matchMedia('(hover: none), (pointer: coarse)');
const smallQuery = window.matchMedia('(max-width: 860px)');

export const env = {
  get reduced() { return reducedQuery.matches; },
  get coarse() { return coarseQuery.matches; },
  get small() { return smallQuery.matches; },
  /** WebGL only earns its keep on pointer-driven, roomy viewports. */
  get richGallery() { return !smallQuery.matches && !reducedQuery.matches && hasWebGL(); },
  dpr(max = 2) { return Math.min(window.devicePixelRatio || 1, max); },
};

let webglCache = null;
export function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement('canvas');
    webglCache = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** Fires whenever the motion preference flips, so running loops can stand down. */
export function onMotionChange(fn) {
  const handler = () => fn(reducedQuery.matches);
  reducedQuery.addEventListener('change', handler);
  return () => reducedQuery.removeEventListener('change', handler);
}

/** Debounced resize, shared so we only pay for one listener. */
const resizeFns = new Set();
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => resizeFns.forEach((f) => f()), 140);
}, { passive: true });
export function onResize(fn) {
  resizeFns.add(fn);
  return () => resizeFns.delete(fn);
}
