import {
  Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial,
  WebGLRenderer, Texture, Vector2, LinearFilter, ClampToEdgeWrapping,
} from 'three';
import { gsap } from 'gsap';
import { onResize } from './env.js';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uMouse;      // 0..1 within the plane
  uniform vec2  uPlane;      // css px
  uniform vec2  uImage;      // texture px
  uniform float uTime;
  uniform float uHover;      // 0..1, eased by GSAP
  uniform float uReveal;     // fades the plane in once the texture lands
  uniform float uOpacity;    // dropped while a plate is expanded

  void main() {
    // cover-fit the texture inside the plane
    float planeA = uPlane.x / uPlane.y;
    float imageA = uImage.x / uImage.y;
    vec2 scale = planeA > imageA
      ? vec2(1.0, imageA / planeA)
      : vec2(planeA / imageA, 1.0);
    vec2 uv = (vUv - 0.5) * scale + 0.5;

    // ripple travelling outward from the cursor
    vec2 d = uv - uMouse;
    vec2 aspect = vec2(planeA, 1.0);
    float dist = length(d * aspect);
    float wave = sin(dist * 26.0 - uTime * 4.2) * exp(-dist * 5.5);
    float amp = 0.026 * uHover;
    uv += normalize(d + vec2(1e-5)) * wave * amp;

    // a matching lift in the highlights, so the ripple reads as relief
    vec3 col = texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb;
    col *= 1.0 + wave * 0.20 * uHover;

    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey), 0.34 * uHover);          // gentle desaturation
    col = mix(col, col * vec3(1.03, 0.995, 0.94), uHover); // toward warm paper

    gl_FragColor = vec4(col, uReveal * uOpacity);
  }
`;

export function createGallery(plates) {
  const canvas = document.createElement('canvas');
  canvas.id = 'gallery';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -100, 100);
  const geometry = new PlaneGeometry(1, 1);

  const items = plates.map((el, i) => {
    const frame = el.querySelector('.plate__frame');
    const img = el.querySelector('img');
    const uniforms = {
      uTex: { value: null },
      uMouse: { value: new Vector2(0.5, 0.5) },
      uPlane: { value: new Vector2(1, 1) },
      uImage: { value: new Vector2(4, 5) },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uReveal: { value: 0 },
      uOpacity: { value: 1 },
    };
    const material = new ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, uniforms,
      transparent: true, depthTest: false, depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.renderOrder = i;
    scene.add(mesh);
    return { el, frame, img, mesh, uniforms, material, loaded: false, rippling: false };
  });

  /* ── textures: reuse the DOM image the browser has already lazy-loaded ── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const item = items.find((it) => it.el === entry.target);
      io.unobserve(entry.target);
      if (item) adopt(item);
    });
  }, { rootMargin: '400px 0px' });
  items.forEach((it) => io.observe(it.el));

  function adopt(item) {
    const { img } = item;
    const attach = () => {
      const tex = new Texture(img);
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
      tex.needsUpdate = true;
      item.uniforms.uTex.value = tex;
      item.uniforms.uImage.value.set(img.naturalWidth || 640, img.naturalHeight || 800);
      item.loaded = true;
      item.el.classList.add('is-webgl');
      gsap.to(item.uniforms.uReveal, { value: 1, duration: 0.7, ease: 'power2.out' });
    };
    if (img.complete && img.naturalWidth) attach();
    else {
      img.loading = 'eager';
      img.addEventListener('load', attach, { once: true });
      img.addEventListener('error', () => { item.el.classList.remove('is-webgl'); }, { once: true });
    }
  }

  /* ── pointer ───────────────────────────────────────────── */
  items.forEach((item) => {
    const hit = item.el.querySelector('.plate__open') || item.el;
    const setHover = (v) => {
      item.rippling = v > 0;
      gsap.to(item.uniforms.uHover, { value: v, duration: v ? 0.55 : 0.75, ease: v ? 'power2.out' : 'power2.inOut' });
    };
    hit.addEventListener('pointerenter', (e) => { move(e); setHover(1); });
    hit.addEventListener('pointerleave', () => setHover(0));
    hit.addEventListener('focus', () => setHover(1));
    hit.addEventListener('blur', () => setHover(0));
    hit.addEventListener('pointermove', move);

    function move(e) {
      const r = item.frame.getBoundingClientRect();
      if (!r.width) return;
      gsap.to(item.uniforms.uMouse.value, {
        x: (e.clientX - r.left) / r.width,
        y: 1 - (e.clientY - r.top) / r.height,
        duration: 0.45, ease: 'power2.out', overwrite: true,
      });
    }
  });

  /* ── sizing ────────────────────────────────────────────── */
  let vw = 0, vh = 0;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.left = -vw / 2; camera.right = vw / 2;
    camera.top = vh / 2; camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
  }
  resize();
  const offResize = onResize(resize);

  let live = false;
  let anyVisible = false;

  return {
    canvas,
    /** Section enters/leaves the viewport — stop drawing when it's away. */
    setLive(v) {
      live = v;
      canvas.classList.toggle('is-live', v);
    },
    update(t) {
      if (!live) return;
      anyVisible = false;
      for (const item of items) {
        if (!item.loaded) { item.mesh.visible = false; continue; }
        const r = item.frame.getBoundingClientRect();
        const off = r.bottom < -80 || r.top > vh + 80 || r.width === 0;
        item.mesh.visible = !off;
        if (off) continue;
        anyVisible = true;
        // whole pixels, so the plane sits exactly inside its printed frame
        const w = Math.round(r.width), h = Math.round(r.height);
        item.mesh.position.set(Math.round(r.left) + w / 2 - vw / 2, vh / 2 - (Math.round(r.top) + h / 2), 0);
        item.mesh.scale.set(w, h, 1);
        item.uniforms.uPlane.value.set(w, h);
        if (item.rippling || item.uniforms.uHover.value > 0.001) item.uniforms.uTime.value = t;
      }
      if (anyVisible) renderer.render(scene, camera);
    },
    /** Hide one plane while its plate is expanded into the detail panel. */
    setPlateOpacity(index, value, duration = 0.3) {
      const item = items[index];
      if (item) gsap.to(item.uniforms.uOpacity, { value, duration, ease: 'power2.out' });
    },
    dispose() {
      offResize();
      io.disconnect();
      items.forEach((it) => { it.uniforms.uTex.value?.dispose(); it.material.dispose(); });
      geometry.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
