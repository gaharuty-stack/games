// Бот-игрок для калибровки сложности.
// casual: берёт случайную подходящую по цвету свободную стрелку, иначе — любую свободную.
import { rayClear, BOX_SIZE, ACTIVE_BOXES } from '../js/level.js';

export function playBot(lv, r, smart = false) {
  const { w, h } = lv;
  const grid = new Array(w * h).fill(-1);
  const arrows = lv.arrows.map((a) => ({ ...a, gone: false }));
  arrows.forEach((a, i) => (grid[a.y * w + a.x] = i));
  const queue = lv.queue;
  let qi = 0;
  const active = [];
  for (let i = 0; i < ACTIVE_BOXES; i++) active.push(qi < queue.length ? { c: queue[qi++], n: 0 } : null);
  const shelf = [];
  let left = arrows.length;
  const complete = (bi) => {
    active[bi] = qi < queue.length ? { c: queue[qi++], n: 0 } : null;
    const b = active[bi];
    if (!b) return;
    for (let s = shelf.length - 1; s >= 0 && b.n < BOX_SIZE; s--) if (shelf[s] === b.c) { shelf.splice(s, 1); b.n++; }
    if (b.n >= BOX_SIZE) complete(bi);
  };
  while (left > 0) {
    const free = [];
    for (let i = 0; i < arrows.length; i++) {
      const a = arrows[i];
      if (!a.gone && rayClear(grid, w, h, a.x, a.y, a.dir) >= 0) free.push(i);
    }
    if (!free.length) return false;
    const match = free.filter((i) => active.some((b) => b && b.c === arrows[i].color && b.n < BOX_SIZE));
    let pick;
    if (match.length) pick = match[Math.floor(r() * match.length)];
    else if (smart) {
      const next = queue.slice(qi, qi + 2);
      const pref = free.filter((i) => next.includes(arrows[i].color));
      const pool = pref.length ? pref : free;
      pick = pool[Math.floor(r() * pool.length)];
    } else pick = free[Math.floor(r() * free.length)];
    const a = arrows[pick];
    a.gone = true; left--;
    grid[a.y * w + a.x] = -1;
    const bi = active.findIndex((b) => b && b.c === a.color && b.n < BOX_SIZE);
    if (bi >= 0) {
      active[bi].n++;
      if (active[bi].n >= BOX_SIZE) complete(bi);
    } else {
      shelf.push(a.color);
      if (shelf.length >= lv.shelf) return false;
    }
  }
  return true;
}

export function winRate(lv, r, runs, smart = false) {
  let wins = 0;
  for (let k = 0; k < runs; k++) if (playBot(lv, r, smart)) wins++;
  return wins / runs;
}

// Целевая кривая: пила «сложный → передышка», плавное усложнение
export function targetWin(n, hard) {
  if (n <= 4) return 1;
  let t;
  if (n <= 10) t = 0.92 - (n - 5) * 0.02;
  else if (n <= 30) t = 0.8 - (n - 10) * 0.01;
  else if (n <= 60) t = 0.6 - (n - 30) * 0.004;
  else t = 0.48 + 0.04 * Math.sin(n * 1.7);
  if (hard) t = Math.max(0.22, t - 0.28);
  else if (n % 5 === 1) t = Math.min(0.95, t + 0.1);
  return t;
}
