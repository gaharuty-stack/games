// Логика уровней: генерация с гарантией решаемости, кривая сложности, симуляция.
// Чистый модуль без DOM — используется и игрой, и тестами в node.

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // вверх, вправо, вниз, влево
export const COLORS = ['red', 'green', 'blue', 'gold', 'purple', 'orange', 'pink', 'cyan'];
export const BOX_SIZE = 3;
export const ACTIVE_BOXES = 2;

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Формы поля в нормализованных координатах u,v ∈ [-1, 1]
const SHAPES = {
  rect: () => true,
  round: (u, v) => u * u + v * v <= 1.42,
  diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1.32,
  heart: (u, v) => {
    const x = u * 1.22, y = -v * 1.3 + 0.28;
    const a = x * x + y * y - 1;
    return a * a * a - x * x * y * y * y <= 0.02;
  },
  tree: (u, v) => {
    if (v > 0.72) return Math.abs(u) < 0.3;
    const t = (v + 1) / 1.72;
    return Math.abs(u) <= 0.2 + t * 0.9;
  },
  plus: (u, v) => Math.abs(u) < 0.48 || Math.abs(v) < 0.48,
  ring: (u, v) => {
    const r = u * u + v * v;
    return r <= 1.42 && r >= 0.16;
  },
  star: (u, v) => {
    const a = Math.atan2(v, u) + Math.PI / 2;
    const r = Math.hypot(u, v);
    const k = Math.cos(5 * a / 2);
    return r <= 0.62 + 0.55 * Math.pow(Math.abs(k), 1.6);
  },
};
export const SHAPE_NAMES = Object.keys(SHAPES);

// Кривая сложности. Каждый 5-й уровень — «сложный».
export function levelParams(n, variant = 0) {
  const base = { shelf: 5, hearts: 3, hard: false, shape: 'rect', window: 4 };
  if (n === 1) return { ...base, w: 4, h: 4, target: 6, colors: 2, swaps: 0, pw: 0, margin: 4 };
  if (n === 2) return { ...base, w: 5, h: 5, target: 9, colors: 3, swaps: 0, pw: 1, margin: 4 };
  if (n === 3) return { ...base, w: 5, h: 6, target: 15, colors: 3, swaps: 3, window: 3, pw: 1.2, margin: 3 };
  if (n === 4) return { ...base, w: 6, h: 6, target: 18, colors: 3, swaps: 5, window: 4, pw: 1.4, margin: 3 };

  const hard = n % 5 === 0;
  const d = Math.min(1, (n - 5) / 55); // 0..1 на уровнях 5..60
  const r = rng(n * 31 + 7);
  const sizes = [[6, 6], [6, 7], [7, 7], [7, 8], [7, 9], [8, 9], [8, 10]];
  const si = Math.min(sizes.length - 1, Math.floor(d * (sizes.length - 1) + r() * 1.6));
  const [w, h] = sizes[si];
  let shape = 'rect';
  if (n >= 7) {
    const pool = ['rect', 'round', 'diamond', 'heart', 'tree', 'plus', 'ring', 'star'];
    shape = pool[(Math.floor(r() * pool.length) + variant * 3) % pool.length];
    if (w < 7 && (shape === 'star' || shape === 'ring')) shape = 'round';
  }
  let colors = Math.min(7, 3 + Math.floor(n / 7));
  let swaps = Math.round(6 + d * 30);
  let window = Math.round(4 + d * 8);
  let margin = 2;
  let fill = 0.78 + d * 0.14;
  let pw = 1.4 + d * 1.6;
  if (hard) {
    colors = Math.min(8, colors + 1);
    swaps = Math.round(swaps * 1.7 + 6);
    window = Math.round(window * 1.6 + 2);
    margin = 1;
    fill = Math.min(0.95, fill + 0.06);
    pw += 0.8;
  }
  return { ...base, w, h, shape, colors, swaps, window, margin, fill, pw, hard, target: 0 };
}

// Сколько клеток до края в направлении dir; -1 если путь перекрыт стрелкой
export function rayClear(grid, w, h, x, y, dir) {
  const [dx, dy] = DIRS[dir];
  let cx = x + dx, cy = y + dy, len = 0;
  while (cx >= 0 && cy >= 0 && cx < w && cy < h) {
    if (grid[cy * w + cx] >= 0) return -1;
    cx += dx; cy += dy; len++;
  }
  return len;
}

// Первая стрелка на пути (индекс клетки) или -1
export function firstBlocker(grid, w, h, x, y, dir) {
  const [dx, dy] = DIRS[dir];
  let cx = x + dx, cy = y + dy;
  while (cx >= 0 && cy >= 0 && cx < w && cy < h) {
    if (grid[cy * w + cx] >= 0) return cy * w + cx;
    cx += dx; cy += dy;
  }
  return -1;
}

function makeQueue(m, k, r) {
  const pool = [];
  for (let i = 0; i < m; i++) pool.push(i % k);
  shuffle(pool, r);
  // разводим одинаковые соседние цвета
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < pool.length; i++) {
      if (pool[i] === pool[i - 1]) {
        for (let j = i + 1; j < pool.length; j++) {
          if (pool[j] !== pool[i] && pool[j] !== pool[i - 1]) {
            [pool[i], pool[j]] = [pool[j], pool[i]];
            break;
          }
        }
      }
    }
  }
  return pool;
}

// Симуляция «коробки + полка» для последовательности цветов.
// Возвращает максимальную занятость полки (Infinity при тупике).
export function simulateOrder(colorSeq, queue) {
  const active = [];
  let qi = 0;
  for (let i = 0; i < ACTIVE_BOXES && qi < queue.length; i++) active.push({ c: queue[qi++], n: 0 });
  const shelf = [];
  let maxShelf = 0;
  const complete = (bi) => {
    if (qi < queue.length) active[bi] = { c: queue[qi++], n: 0 };
    else active[bi] = null;
    const b = active[bi];
    if (!b) return;
    for (let s = shelf.length - 1; s >= 0 && b.n < BOX_SIZE; s--) {
      if (shelf[s] === b.c) { shelf.splice(s, 1); b.n++; }
    }
    if (b.n >= BOX_SIZE) complete(bi);
  };
  for (const c of colorSeq) {
    let bi = active.findIndex((b) => b && b.c === c && b.n < BOX_SIZE);
    if (bi >= 0) {
      active[bi].n++;
      if (active[bi].n >= BOX_SIZE) complete(bi);
    } else {
      shelf.push(c);
      maxShelf = Math.max(maxShelf, shelf.length);
    }
  }
  return shelf.length === 0 ? maxShelf : Infinity;
}

function tryGenerate(p, r) {
  const { w, h } = p;
  const shapeFn = SHAPES[p.shape] || SHAPES.rect;
  const mask = new Array(w * h).fill(0);
  const cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 2 - 1;
      const v = ((y + 0.5) / h) * 2 - 1;
      if (shapeFn(u, v)) { mask[y * w + x] = 1; cells.push(y * w + x); }
    }
  }
  let target = p.target || Math.floor((cells.length * p.fill) / BOX_SIZE) * BOX_SIZE;
  target = Math.min(target, Math.floor(cells.length / BOX_SIZE) * BOX_SIZE);
  if (target < 6) return null;

  // Обратная сборка: каждая новая стрелка должна видеть край поверх уже поставленных.
  // Порядок удаления = обратный порядку постановки, значит уровень всегда решаем.
  const grid = new Array(w * h).fill(-1);
  const order = [];
  shuffle(cells, r);
  for (const c of cells) {
    if (order.length >= target) break;
    const x = c % w, y = Math.floor(c / w);
    const opts = [];
    let total = 0;
    for (let d = 0; d < 4; d++) {
      const len = rayClear(grid, w, h, x, y, d);
      if (len < 0) continue;
      const wgt = Math.pow(len + 1, p.pw) * (0.6 + r() * 0.8);
      opts.push([d, wgt]);
      total += wgt;
    }
    if (!opts.length) continue;
    let pick = r() * total, dir = opts[0][0];
    for (const [d, wgt] of opts) { pick -= wgt; if (pick <= 0) { dir = d; break; } }
    grid[c] = order.length;
    order.push({ x, y, dir });
  }
  const count = Math.floor(order.length / BOX_SIZE) * BOX_SIZE;
  if (count < 6 || count < target * 0.8) return null;
  order.length = count;

  const removal = order.slice().reverse();
  const m = count / BOX_SIZE;
  const k = Math.min(p.colors, m);
  const palette = shuffle(COLORS.slice(), r).slice(0, k);
  const queueIdx = makeQueue(m, k, r);

  const limit = p.shelf - p.margin;
  let best = null;
  let swaps = p.swaps;
  for (let t = 0; t < 30; t++) {
    const seq = new Array(count);
    for (let i = 0; i < count; i++) seq[i] = queueIdx[Math.floor(i / BOX_SIZE)];
    for (let s = 0; s < swaps; s++) {
      const i = Math.floor(r() * count);
      const j = i + 1 + Math.floor(r() * p.window);
      if (j < count && seq[i] !== seq[j]) [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    const used = simulateOrder(seq, queueIdx);
    if (used <= limit) { best = seq; break; }
    if (t % 3 === 2) swaps = Math.floor(swaps * 0.75);
  }
  if (!best) {
    best = new Array(count);
    for (let i = 0; i < count; i++) best[i] = queueIdx[Math.floor(i / BOX_SIZE)];
  }

  const arrows = removal.map((a, i) => ({ x: a.x, y: a.y, dir: a.dir, color: palette[best[i]] }));
  return {
    w, h, mask,
    arrows,
    queue: queueIdx.map((i) => palette[i]),
    shelf: p.shelf,
    hearts: p.hearts,
    shape: p.shape,
  };
}

// Кандидат уровня: variant меняет зерно, mul — силу перемешивания цветов
export function generateCandidate(n, variant = 0, mul = 1) {
  const p = levelParams(n, variant);
  const pp = { ...p, swaps: Math.round(p.swaps * mul) };
  for (let attempt = 0; attempt < 60; attempt++) {
    const r = rng(n * 9973 + variant * 104729 + attempt * 7919 + 17);
    const lv = tryGenerate(pp, r);
    if (lv) return { ...lv, n, hard: p.hard };
  }
  const r = rng(n * 13 + variant + 5);
  const lv = tryGenerate({ ...pp, shape: 'rect', w: 6, h: 6, target: 18, colors: 3, swaps: 2 }, r);
  return { ...lv, n, hard: false };
}

export function generateLevel(n) {
  return generateCandidate(n, 0, 1);
}

// ---- Компактное хранение заранее откалиброванных уровней ----
const CL = { red: 'r', green: 'g', blue: 'b', gold: 'y', purple: 'p', orange: 'o', pink: 'k', cyan: 'c' };
const LC = Object.fromEntries(Object.entries(CL).map(([k, v]) => [v, k]));

export function encodeLevel(lv) {
  const a = lv.arrows.map((q) => q.x.toString(36) + q.y.toString(36) + q.dir + CL[q.color]).join('');
  return [lv.w, lv.h, lv.shape, lv.hard ? 1 : 0, lv.mask.join(''), a, lv.queue.map((c) => CL[c]).join('')].join('|');
}

export function decodeLevel(str, n) {
  const [w, h, shape, hard, mask, a, q] = str.split('|');
  const arrows = [];
  for (let i = 0; i < a.length; i += 4) {
    arrows.push({ x: parseInt(a[i], 36), y: parseInt(a[i + 1], 36), dir: +a[i + 2], color: LC[a[i + 3]] });
  }
  return {
    n, w: +w, h: +h, shape, hard: hard === '1',
    mask: mask.split('').map(Number),
    arrows, queue: q.split('').map((c) => LC[c]),
    shelf: 5, hearts: 3,
  };
}

// Зеркалим уровень и переставляем цвета — для уровней сверх запечённых
export function remixLevel(lv, n) {
  const r = rng(n * 7 + 3);
  const perm = shuffle(COLORS.slice(), r);
  const used = [...new Set(lv.queue)];
  const map = Object.fromEntries(used.map((c, i) => [c, perm[i]]));
  const mirror = r() < 0.5;
  const flipDir = (d) => (d === 1 ? 3 : d === 3 ? 1 : d);
  const mask = lv.mask.slice();
  if (mirror) {
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) mask[y * lv.w + x] = lv.mask[y * lv.w + (lv.w - 1 - x)];
  }
  return {
    ...lv, n, mask,
    arrows: lv.arrows.map((a) => ({
      x: mirror ? lv.w - 1 - a.x : a.x, y: a.y,
      dir: mirror ? flipDir(a.dir) : a.dir, color: map[a.color],
    })),
    queue: lv.queue.map((c) => map[c]),
  };
}

// Утилита для тестов и подсказок: какие стрелки сейчас свободны
export function freeArrows(grid, w, h, arrows) {
  const res = [];
  for (let i = 0; i < arrows.length; i++) {
    const a = arrows[i];
    if (!a || a.gone) continue;
    if (rayClear(grid, w, h, a.x, a.y, a.dir) >= 0) res.push(i);
  }
  return res;
}
