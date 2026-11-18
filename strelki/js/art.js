// Графика игры.
// Основное — растровые спрайты из атласа (вырезаны из референсов скриптом tools/art/build.py).
// Мелочи (искры, снежинки, иконки, рука-подсказка) — векторные SVG, растеризуются под экран.
import { ATLAS } from './atlas-data.js';

export const PAL = {
  red: { base: '#ec3442', light: '#ff9aa0', mid: '#c81e30', dark: '#7d0d1d' },
  green: { base: '#2fb84c', light: '#9af5a6', mid: '#1c923a', dark: '#0b5521' },
  blue: { base: '#2f8af0', light: '#a3d3ff', mid: '#1e66cc', dark: '#0e3a82' },
  gold: { base: '#fbc21a', light: '#fff0a0', mid: '#e09d00', dark: '#8f5d00' },
  purple: { base: '#9b4ae6', light: '#dcb0ff', mid: '#7a2fc8', dark: '#461382' },
  orange: { base: '#ff8222', light: '#ffcd95', mid: '#e5650c', dark: '#9c3f00' },
  pink: { base: '#ff52a8', light: '#ffbadd', mid: '#e3328a', dark: '#99125a' },
  cyan: { base: '#17c8d2', light: '#a6f8f8', mid: '#0ea5b0', dark: '#055f69' },
};
export const COLOR_KEYS = Object.keys(PAL);

const svg = (vb, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${body}</svg>`;

// ---------- Гнездо на полке ----------
function nestSVG(px) {
  return svg('0 0 100 50', px, px / 2, `
  <defs><radialGradient id="n" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#6e9fcc"/><stop offset=".6" stop-color="#a8cdec"/><stop offset="1" stop-color="#e9f5ff"/></radialGradient></defs>
  <ellipse cx="50" cy="25" rx="44" ry="17" fill="url(#n)"/>
  <ellipse cx="50" cy="25" rx="44" ry="17" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".8"/>`);
}

// ---------- Мелкие спрайты ----------
function sparkleSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff9d6" stop-opacity=".9"/><stop offset=".35" stop-color="#ffe27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#g)"/>
  <path d="M50 4 Q54 46 96 50 Q54 54 50 96 Q46 54 4 50 Q46 46 50 4 Z" fill="#fff"/>
  <path d="M50 26 Q52 48 74 50 Q52 52 50 74 Q48 52 26 50 Q48 48 50 26 Z" fill="#fff6c0"/>`);
}

function snowflakeSVG(px, variant) {
  let arms = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60;
    const br = variant === 0
      ? `<path d="M50 50 V12 M50 30 L40 20 M50 30 L60 20 M50 20 L44 14 M50 20 L56 14"/>`
      : variant === 1
        ? `<path d="M50 50 V10 M50 34 L38 26 M50 34 L62 26"/><circle cx="50" cy="12" r="3"/>`
        : `<path d="M50 50 V14 M50 24 L42 16 M50 24 L58 16 M50 38 L40 30 M50 38 L60 30"/>`;
    arms += `<g transform="rotate(${a} 50 50)">${br}</g>`;
  }
  return svg('0 0 100 100', px, px, `
  <g stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="#fff">${arms}</g>
  <circle cx="50" cy="50" r="6" fill="#fff"/>`);
}

function snowDotSVG(px) {
  return svg('0 0 40 40', px, px, `
  <defs><radialGradient id="d" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <circle cx="20" cy="20" r="20" fill="url(#d)"/>`);
}

function hollySVG(px) {
  const leaf = 'M0 30 Q8 20 14 25 Q17 14 26 19 Q31 8 40 15 Q49 8 54 19 Q63 14 66 25 Q72 20 80 30 Q72 40 66 35 Q63 46 54 41 Q49 52 40 45 Q31 52 26 41 Q17 46 14 35 Q8 40 0 30 Z';
  return svg('0 0 140 90', px, px * 0.643, `
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ed36f"/><stop offset="1" stop-color="#127a2e"/></linearGradient>
    <radialGradient id="b" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".5" stop-color="#e3192c"/><stop offset="1" stop-color="#8d0613"/></radialGradient>
  </defs>
  <g transform="translate(4 30) rotate(-18 40 30)"><path d="${leaf}" fill="url(#l)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/><path d="M6 30 Q40 26 74 30" stroke="#0b4a1c" stroke-width="2.5" fill="none" stroke-opacity=".6"/></g>
  <g transform="translate(56 30) rotate(18 40 30)"><path d="${leaf}" fill="url(#l)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/><path d="M6 30 Q40 26 74 30" stroke="#0b4a1c" stroke-width="2.5" fill="none" stroke-opacity=".6"/></g>
  <g stroke="#5a0410" stroke-width="3">
    <circle cx="60" cy="40" r="13" fill="url(#b)"/><circle cx="80" cy="42" r="13" fill="url(#b)"/><circle cx="70" cy="24" r="13" fill="url(#b)"/>
  </g>
  <g fill="#fff" fill-opacity=".85"><circle cx="56" cy="35" r="4"/><circle cx="76" cy="37" r="4"/><circle cx="66" cy="19" r="4"/></g>`);
}

function lockSVG(px) {
  return svg('0 0 100 110', px, px * 1.1, `
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#f4b000"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a97ad"/><stop offset=".4" stop-color="#f1f5fb"/><stop offset="1" stop-color="#7b879c"/></linearGradient>
  </defs>
  <path d="M28 50 V34 A22 22 0 0 1 72 34 V50" fill="none" stroke="#3d4655" stroke-width="16" stroke-linecap="round"/>
  <path d="M28 50 V34 A22 22 0 0 1 72 34 V50" fill="none" stroke="url(#s)" stroke-width="10" stroke-linecap="round"/>
  <rect x="14" y="46" width="72" height="56" rx="14" fill="url(#b)" stroke="#6b4300" stroke-width="5"/>
  <circle cx="50" cy="68" r="8" fill="#6b4300"/><rect x="46" y="70" width="8" height="18" rx="4" fill="#6b4300"/>
  <rect x="20" y="51" width="60" height="9" rx="4.5" fill="#fff" fill-opacity=".5"/>`);
}

// Иконки (белые, для круглых кнопок)
function gearPath() {
  const pts = [];
  const rad = (d) => (d * Math.PI) / 180;
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    for (const [da, r] of [[-19, 30], [-11, 42], [11, 42], [19, 30]]) {
      pts.push([50 + Math.cos(rad(a + da)) * r, 50 + Math.sin(rad(a + da)) * r]);
    }
  }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z M63 50 A13 13 0 1 0 37 50 A13 13 0 1 0 63 50 Z';
}
const ICONS = {
  gear: `<path d="${gearPath()}" fill="#fff" fill-rule="evenodd" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
  sound: `<path d="M18 40 H34 L54 22 V78 L34 60 H18 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M64 36 Q74 50 64 64 M72 26 Q90 50 72 74" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>`,
  mute: `<path d="M18 40 H34 L54 22 V78 L34 60 H18 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M64 38 L84 62 M84 38 L64 62" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
  music: `<path d="M40 70 V24 L80 16 V60" stroke="#fff" stroke-width="8" fill="none" stroke-linejoin="round"/><ellipse cx="32" cy="72" rx="12" ry="9" fill="#fff"/><ellipse cx="72" cy="62" rx="12" ry="9" fill="#fff"/>`,
  home: `<path d="M16 50 L50 20 L84 50" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M26 46 V80 H44 V62 H56 V80 H74 V46" fill="#fff"/>`,
  restart: `<path d="M74 50 A24 24 0 1 1 64 30" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M54 16 L76 26 L60 44 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`,
  close: `<path d="M28 28 L72 72 M72 28 L28 72" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`,
  play: `<path d="M36 24 L76 50 L36 76 Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`,
  prev: `<path d="M64 24 L24 50 L64 76 Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`,
  trophy: `<path d="M30 18 H70 V40 A20 20 0 0 1 30 40 Z" fill="#fff"/><path d="M30 26 H16 Q16 46 34 48 M70 26 H84 Q84 46 66 48" stroke="#fff" stroke-width="6" fill="none"/><rect x="45" y="58" width="10" height="14" fill="#fff"/><rect x="32" y="72" width="36" height="10" rx="3" fill="#fff"/>`,
  plus: `<path d="M50 22 V78 M22 50 H78" stroke="#fff" stroke-width="13" stroke-linecap="round"/>`,
  star: `<path d="M50 14 L60 38 L86 40 L66 57 L72 83 L50 69 L28 83 L34 57 L14 40 L40 38 Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`,
  invite: `<circle cx="40" cy="36" r="14" fill="#fff"/><path d="M14 80 Q14 56 40 56 Q66 56 66 80 Z" fill="#fff"/><path d="M76 34 V58 M64 46 H88" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
};
function iconSVG(name, px) {
  return svg('0 0 100 100', px, px, ICONS[name]);
}

function videoBadgeSVG(px) {
  return svg('0 0 100 70', px, px * 0.7, `
  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd35a"/><stop offset="1" stop-color="#f08c00"/></linearGradient></defs>
  <rect x="6" y="8" width="64" height="54" rx="14" fill="url(#v)" stroke="#8a4a00" stroke-width="5"/>
  <path d="M70 30 L92 16 V54 L70 40 Z" fill="url(#v)" stroke="#8a4a00" stroke-width="5" stroke-linejoin="round"/>
  <path d="M30 22 L50 35 L30 48 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`);
}

function handSVG(px) {
  const shapes = `
    <rect x="38" y="4" width="20" height="62" rx="10"/>
    <rect x="28" y="46" width="54" height="52" rx="18"/>
    <circle cx="66" cy="50" r="10"/><circle cx="76" cy="58" r="9"/>
    <ellipse cx="30" cy="70" rx="9" ry="16" transform="rotate(-28 30 70)"/>`;
  return svg('0 0 100 124', px, px * 1.24, `
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7e2f0"/></linearGradient></defs>
  <g fill="none" stroke="#1b2b4a" stroke-width="9" stroke-linejoin="round">${shapes}<rect x="34" y="94" width="46" height="22" rx="6"/></g>
  <g fill="url(#h)">${shapes}</g>
  <rect x="34" y="94" width="46" height="22" rx="6" fill="#4aa3ff" stroke="#1b2b4a" stroke-width="4"/>
  <path d="M58 52 Q60 62 58 70 M68 60 Q70 66 68 72" stroke="#1b2b4a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M43 12 V40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`);
}


// ---------- Реестр и растеризация ----------
export const ART = { sprites: new Map(), scale: 1, images: [], bg: {} };

function defs() {
  const d = [];
  d.push(['nest', 100, 50, nestSVG]);
  d.push(['sparkle', 100, 100, sparkleSVG]);
  d.push(['flake0', 100, 100, (px) => snowflakeSVG(px, 0)]);
  d.push(['flake1', 100, 100, (px) => snowflakeSVG(px, 1)]);
  d.push(['flake2', 100, 100, (px) => snowflakeSVG(px, 2)]);
  d.push(['snowdot', 40, 40, snowDotSVG]);
  d.push(['holly', 140, 90, hollySVG]);
  d.push(['lock', 100, 110, lockSVG]);
  d.push(['video', 100, 70, videoBadgeSVG]);
  d.push(['hand', 100, 124, handSVG]);
  for (const k of Object.keys(ICONS)) d.push([`i_${k}`, 100, 100, (px) => iconSVG(k, px)]);
  return d;
}

// Желаемый размер спрайта на экране (в дизайн-единицах) — чтобы не растить лишние пиксели
const DISPLAY = {
  nest: 90, sparkle: 70, flake0: 40, flake1: 40, flake2: 40, snowdot: 24, holly: 130, lock: 60, video: 60, hand: 110,
};

async function rasterize(svgText, w, h) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// векторные спрайты пересобираются при сильной смене масштаба экрана
export async function buildArt(scale, onProgress) {
  ART.scale = scale;
  const list = defs();
  let done = 0;
  const jobs = list.map(async ([name, w, h, fn]) => {
    const disp = name.startsWith('i_') ? 70 : DISPLAY[name] || Math.max(w, h);
    const k = (disp / Math.max(w, h)) * scale;
    const pxW = Math.max(8, w * k);
    const canvas = await rasterize(fn(Math.round(pxW)), pxW, h * k);
    ART.sprites.set(name, { canvas, w, h });
    done++;
    if (onProgress) onProgress(done / list.length);
  });
  await Promise.all(jobs);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('не загрузилась картинка ' + src));
    img.src = src;
  });
}

// растровый атлас и фоны (один раз при старте)
export async function loadRaster(onProgress) {
  const files = ATLAS.files.map((f) => 'assets/' + f);
  const bgs = [['menu', 'assets/' + ATLAS.bg.menu], ['game', 'assets/' + ATLAS.bg.game]];
  const total = files.length + bgs.length;
  let done = 0;
  const tick = () => { done++; if (onProgress) onProgress(done / total); };
  // одна повторная попытка — на случай обрыва сети
  const loadRetry = async (src) => {
    try { return await loadImage(src); } catch (e) { return loadImage(src + '?r=' + Date.now()); }
  };
  const imgs = await Promise.all(files.map((f) => loadRetry(f).then((i) => { tick(); return i; })));
  const bgImgs = await Promise.all(bgs.map(([k, f]) => loadRetry(f).then((i) => { tick(); return [k, i]; })));
  ART.images = imgs;
  for (const [k, i] of bgImgs) ART.bg[k] = i;
  for (const [name, f] of Object.entries(ATLAS.frames)) {
    const [ai, sx, sy, sw, sh, w, h] = f;
    ART.sprites.set(name, { img: imgs[ai], sx, sy, sw, sh, w, h });
  }
}

export function spr(name) {
  return ART.sprites.get(name);
}

export function meta(name) {
  return ATLAS.meta[name] || {};
}

function blit(ctx, s, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) return;
  if (s.img) {
    const kx = s.sw / s.w, ky = s.sh / s.h;
    ctx.drawImage(s.img, s.sx + sx * kx, s.sy + sy * ky, sw * kx, sh * ky, dx, dy, dw, dh);
  } else {
    const kx = s.canvas.width / s.w, ky = s.canvas.height / s.h;
    ctx.drawImage(s.canvas, sx * kx, sy * ky, sw * kx, sh * ky, dx, dy, dw, dh);
  }
}

// Рисует спрайт с центром в (x, y), шириной w (высота по пропорции)
export function drawSprite(ctx, name, x, y, w, opts) {
  const s = ART.sprites.get(name);
  if (!s) return;
  const h = (w * s.h) / s.w;
  const rot = opts && opts.rot;
  const alpha = opts && opts.alpha != null ? opts.alpha : 1;
  const sx = opts && opts.sx != null ? opts.sx : 1;
  const sy = opts && opts.sy != null ? opts.sy : 1;
  const ay = opts && opts.ay != null ? opts.ay : 0.5;
  const ax = opts && opts.ax != null ? opts.ax : 0.5;
  if (alpha <= 0 || w <= 0) return;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  blit(ctx, s, 0, 0, s.w, s.h, -w * ax, -h * ay, w, h);
  ctx.restore();
}

// Спрайт целиком по левому верхнему углу; k — дизайн-единиц на пиксель референса
export function drawAt(ctx, name, x, y, k, alpha = 1) {
  const s = ART.sprites.get(name);
  if (!s) return;
  if (alpha < 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  blit(ctx, s, 0, 0, s.w, s.h, x, y, s.w * k, s.h * k);
  if (alpha < 1) ctx.restore();
}

// 9-slice: прямоугольник (x, y, w, h); края масштабируются на k, середина растягивается
export function drawNine(ctx, name, x, y, w, h, k) {
  const s = ART.sprites.get(name);
  if (!s) return;
  const [l, t, r, b] = meta(name).slice;
  const L = l * k, T = t * k, R = r * k, B = b * k;
  const mw = s.w - l - r, mh = s.h - t - b;
  const MW = Math.max(0, w - L - R), MH = Math.max(0, h - T - B);
  const xs = [[0, l, x, L], [l, mw, x + L, MW], [s.w - r, r, x + L + MW, R]];
  const ys = [[0, t, y, T], [t, mh, y + T, MH], [s.h - b, b, y + T + MH, B]];
  for (const [syy, shh, dy, dh] of ys) {
    for (const [sxx, sww, dx, dw] of xs) blit(ctx, s, sxx, syy, sww, shh, dx, dy, dw + 0.5, dh + 0.5);
  }
}

// 3-slice по горизонтали: левый/правый края масштабируются по высоте, середина тянется
export function drawThree(ctx, name, x, y, w, h) {
  const s = ART.sprites.get(name);
  if (!s) return;
  const [l, , r] = meta(name).slice;
  const k = h / s.h;
  const L = Math.min(l * k, w / 2), R = Math.min(r * k, w / 2);
  const MW = Math.max(0, w - L - R);
  blit(ctx, s, 0, 0, l, s.h, x, y, L + 0.5, h);
  blit(ctx, s, l, 0, s.w - l - r, s.h, x + L, y, MW + 0.5, h);
  blit(ctx, s, s.w - r, 0, r, s.h, x + L + MW, y, R, h);
}
