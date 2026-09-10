import {
  Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial,
  WebGLRenderer, Vector2,
} from 'three';
import { env, onResize } from './env.js';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* Colours are authored in sRGB and written straight out — no encoding round-trip,
   so what is in the palette is what lands on the screen. */
const frag = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uProgress;   // 0 at the masthead, 1 at the colophon
  uniform float uDusk;       // how much of that progress warms the sky

  const vec3 DAY_BOT  = vec3(0.1176, 0.4667, 0.8667); // #1E77DD
  const vec3 DAY_MID  = vec3(0.0471, 0.3686, 0.7843); // #0C5EC8
  const vec3 DAY_TOP  = vec3(0.0157, 0.2941, 0.6824); // #044BAE

  const vec3 DUSK_BOT = vec3(0.6600, 0.3608, 0.1686); // warm gold horizon
  const vec3 DUSK_MID = vec3(0.4000, 0.1490, 0.2196); // madder haze
  const vec3 DUSK_TOP = vec3(0.0353, 0.0745, 0.2118); // deep evening

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  vec3 band(vec3 bot, vec3 mid, vec3 top, float y) {
    vec3 c = mix(bot, mid, smoothstep(0.0, 0.56, y));
    return mix(c, top, smoothstep(0.46, 1.0, y));
  }

  void main() {
    float y = vUv.y;                              // 0 at the foot of the page
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 q = vec2(vUv.x * aspect, vUv.y);

    // slow domain warp so the gradient breathes instead of sitting flat
    float warp = fbm(q * 1.4 + vec2(uTime * 0.012, uTime * 0.007));
    float yn = clamp(y + (warp - 0.5) * 0.08, 0.0, 1.0);

    vec3 day  = band(DAY_BOT,  DAY_MID,  DAY_TOP,  yn);
    vec3 dusk = band(DUSK_BOT, DUSK_MID, DUSK_TOP, yn);

    // the horizon warms before the zenith does
    float w = smoothstep(0.0, 1.0, clamp(uProgress * 1.22 - y * 0.22, 0.0, 1.0)) * uDusk;
    vec3 col = mix(day, dusk, w);

    // low sun off to the right, matching the light on the figure
    vec2 sun = vec2(0.80 * aspect, -0.02);
    float d = distance(q, sun);
    col += vec3(0.98, 0.66, 0.32) * exp(-d * 2.6) * (0.06 + 0.30 * w);

    // fine grain and a broad drift of cloud
    float n = fbm(q * 3.1 - vec2(uTime * 0.018, uTime * 0.004));
    col += (n - 0.5) * 0.055 * (0.55 + 0.45 * y);
    col *= 0.985 + 0.03 * fbm(q * 8.0 + uTime * 0.01);

    // vignette, then dither to keep the gradient off the banding edge
    col *= 1.0 - 0.19 * pow(length((vUv - 0.5) * vec2(1.05, 1.0)), 2.3);
    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 180.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: false,
  });

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uProgress: { value: 0 },
    uDusk: { value: 0 },        // 1 restores the afternoon-to-dusk walk
  };

  const material = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));

  let dirty = true;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // A smooth gradient survives a modest pixel ratio; phones render at 1:1.
    renderer.setPixelRatio(env.small ? 1 : env.dpr(1.5));
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    dirty = true;
  }
  resize();
  const offResize = onResize(resize);

  return {
    /** @param {number} t seconds */
    render(t) {
      if (!env.reduced) uniforms.uTime.value = t;
      else if (!dirty) return;             // held still: only redraw on demand
      renderer.render(scene, camera);
      dirty = false;
    },
    setDusk(amount) {
      uniforms.uDusk.value = amount;
      dirty = true;
    },
    setProgress(p) {
      if (Math.abs(uniforms.uProgress.value - p) < 0.0005) return;
      uniforms.uProgress.value = p;
      dirty = true;
    },
    markDirty() { dirty = true; },
    dispose() {
      offResize();
      material.dispose();
      renderer.dispose();
    },
  };
}
