// Проверка уровней: решаемость по эталонному порядку + винрейт «казуального» бота.
// Запуск: node tools/test-levels.mjs [от] [до] [прогонов]
import { generateLevel, rayClear, rng, BOX_SIZE, ACTIVE_BOXES, simulateOrder } from '../js/level.js';

const from = +process.argv[2] || 1;
const to = +process.argv[3] || 60;
const runs = +process.argv[4] || 300;

function playBot(lv, r, smart) {
  const { w, h } = lv;
  const grid = new Array(w * h).fill(-1);
  const arrows = lv.arrows.map((a, i) => ({ ...a, gone: false }));
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
      // «умный» игрок: кладёт на полку цвет ближайших коробок
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

let bad = 0;
console.log('ур  форма    сетка стрелок цветов своб.старт эталон_полка  казуал%  умный%');
for (let n = from; n <= to; n++) {
  const t0 = Date.now();
  const lv = generateLevel(n);
  const ms = Date.now() - t0;
  const { w, h } = lv;
  // эталонная проверка: порядок удаления = порядок в массиве arrows
  const grid = new Array(w * h).fill(-1);
  lv.arrows.forEach((a, i) => (grid[a.y * w + a.x] = i));
  let ok = true;
  for (let i = 0; i < lv.arrows.length; i++) {
    const a = lv.arrows[i];
    if (rayClear(grid, w, h, a.x, a.y, a.dir) < 0) { ok = false; break; }
    grid[a.y * w + a.x] = -1;
  }
  const seqIdx = lv.arrows.map((a) => a.color);
  const shelfUsed = simulateOrder(seqIdx, lv.queue);
  if (!ok || shelfUsed >= lv.shelf) { ok = false; bad++; }
  const g2 = new Array(w * h).fill(-1);
  lv.arrows.forEach((a, i) => (g2[a.y * w + a.x] = i));
  let free0 = 0;
  lv.arrows.forEach((a) => { if (rayClear(g2, w, h, a.x, a.y, a.dir) >= 0) free0++; });
  const colors = new Set(lv.queue).size;
  let wins = 0, winsSmart = 0;
  const r = rng(n * 101);
  for (let k = 0; k < runs; k++) { if (playBot(lv, r, false)) wins++; if (playBot(lv, r, true)) winsSmart++; }
  console.log(
    String(n).padStart(3), (lv.hard ? '*' : ' ') + lv.shape.padEnd(8), `${w}x${h}`.padEnd(6),
    String(lv.arrows.length).padStart(5), String(colors).padStart(6), String(free0).padStart(9),
    String(shelfUsed).padStart(10), (ok ? '' : ' НЕРЕШАЕМ!').padEnd(1),
    String(Math.round((wins / runs) * 100)).padStart(8), String(Math.round((winsSmart / runs) * 100)).padStart(7),
    ms > 50 ? ` (${ms}мс)` : ''
  );
}
console.log(bad ? `ОШИБОК: ${bad}` : 'Все уровни решаемы.');
