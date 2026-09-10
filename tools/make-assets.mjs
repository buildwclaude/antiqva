/**
 * Builds every image in public/ from the source paintings.
 *
 *   node tools/make-assets.mjs [figure.png] [branch.png]
 *
 * Both sources have a solid blue sky rather than an alpha channel, so the sky is
 * keyed on blue-minus-red — the two populations are cleanly bimodal — and the rim
 * pixels are un-mixed against a locally sampled sky colour instead of merely
 * feathered. ffmpeg does the decoding and encoding; the keying is arithmetic here.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIGURE = process.argv[2] || 'neoasset.png';
const BRANCH = process.argv[3] || 'neoassetplant.png';
const OUT = 'public';

const TMP = join(tmpdir(), `antiqva-assets-${process.pid}`);
mkdirSync(TMP, { recursive: true });
mkdirSync(`${OUT}/plates`, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 28 });
const size = (f) => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height',
  '-of', 'csv=p=0:s=x', f]).toString().trim().split('x').map(Number);

const LO = 60, HI = 155;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Key the sky out of one source; returns { rgba, W, H, bbox }. */
function keyOut(file) {
  const [W, H] = size(file);
  const raw = join(TMP, 'src.raw');
  ff(['-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const src = readFileSync(raw);

  const alpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = 1 - smoothstep(LO, HI, src[i * 3 + 2] - src[i * 3]);

  const R = 24;
  const skyAt = (x, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.max(0, y - R); yy <= Math.min(H - 1, y + R); yy += 3) {
      for (let xx = Math.max(0, x - R); xx <= Math.min(W - 1, x + R); xx += 3) {
        const i = yy * W + xx;
        if (alpha[i] > 0.02) continue;
        r += src[i * 3]; g += src[i * 3 + 1]; b += src[i * 3 + 2]; n++;
      }
    }
    return n ? [r / n, g / n, b / n] : null;
  };

  const rgba = Buffer.alloc(W * H * 4);
  let rim = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4, a = alpha[i];
      let r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
      if (a > 0.02 && a < 0.995) {
        rim++;
        const s = skyAt(x, y);
        if (s) {                       // C = a·F + (1-a)·S  →  F = (C - (1-a)·S) / a
          r = Math.min(255, Math.max(0, (r - (1 - a) * s[0]) / a));
          g = Math.min(255, Math.max(0, (g - (1 - a) * s[1]) / a));
          b = Math.min(255, Math.max(0, (b - (1 - a) * s[2]) / a));
        }
        const cap = Math.max(r, g) * 1.02;   // residual blue despill
        if (b > cap) b = cap;
      }
      rgba[o] = r | 0; rgba[o + 1] = g | 0; rgba[o + 2] = b | 0; rgba[o + 3] = Math.round(a * 255);
    }
  }

  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (rgba[(y * W + x) * 4 + 3] > 10) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const M = 4;
  x0 = Math.max(0, x0 - M); y0 = Math.max(0, y0 - M);
  x1 = Math.min(W - 1, x1 + M); y1 = Math.min(H - 1, y1 + M);
  console.log(`${file} — ${W}×${H}, rim ${rim}, bbox ${x0},${y0} → ${x1},${y1}`);
  return { rgba, W, H, bbox: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
}

/** Write a rectangle of a keyed buffer out as a raw file ffmpeg can read. */
function crop({ rgba, W }, [x0, y0, w, h], name) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    rgba.copy(buf, y * w * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + w) * 4);
  }
  const path = join(TMP, `${name}.rgba`);
  writeFileSync(path, buf);
  return ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', path];
}

/* ── the figure ────────────────────────────────────────── */
const figure = keyOut(FIGURE);
const cut = crop(figure, figure.bbox, 'cutout');
ff([...cut, '-frames:v', '1', `${OUT}/statue-cutout.png`]);
ff([...cut, '-c:v', 'libwebp', '-q:v', '82', '-compression_level', '6', `${OUT}/statue-cutout.webp`]);
ff([...cut, '-vf', 'scale=340:-1:flags=lanczos', '-c:v', 'libwebp', '-q:v', '80', `${OUT}/statue-cutout-sm.webp`]);

/* ── the branch that sits in the contents ──────────────── */
const branch = keyOut(BRANCH);
const cutB = crop(branch, branch.bbox, 'branch');
ff([...cutB, '-vf', 'scale=900:-1:flags=lanczos', '-frames:v', '1', `${OUT}/branch.png`]);
ff([...cutB, '-vf', 'scale=900:-1:flags=lanczos', '-c:v', 'libwebp', '-q:v', '86', `${OUT}/branch.webp`]);
ff([...cutB, '-vf', 'scale=440:-1:flags=lanczos', '-c:v', 'libwebp', '-q:v', '82', `${OUT}/branch-sm.webp`]);

/* ── the six plates (from the untouched painting) ──────── */
const PLATES = [
  [360, 450, 355, 20], [340, 425, 545, 0], [340, 425, 560, 180],
  [320, 400, 270, 230], [400, 500, 270, 440], [340, 425, 430, 480],
];
PLATES.forEach(([w, h, x, y], i) => {
  const vf = `crop=${w}:${h}:${x}:${y},scale=640:800:flags=lanczos`;
  ff(['-i', FIGURE, '-vf', vf, '-q:v', '3', `${OUT}/plates/plate-${i + 1}.jpg`]);
  ff(['-i', FIGURE, '-vf', vf, '-c:v', 'libwebp', '-q:v', '78', `${OUT}/plates/plate-${i + 1}.webp`]);
});

rmSync(TMP, { recursive: true, force: true });
console.log('public/ rebuilt');
