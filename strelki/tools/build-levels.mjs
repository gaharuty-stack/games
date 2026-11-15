// Запекание откалиброванных уровней в js/levels-data.js
// Запуск: node tools/build-levels.mjs [количество]
import { writeFileSync } from 'node:fs';
import { generateCandidate, encodeLevel, decodeLevel, rng } from '../js/level.js';
import { winRate, targetWin } from './bot.mjs';

const COUNT = +process.argv[2] || 300;
const MULS = [0.25, 0.5, 0.8, 1.1, 1.5, 2.1, 2.8];
const out = [];
const t0 = Date.now();
let report = '';
for (let n = 1; n <= COUNT; n++) {
  let best = null;
  if (n <= 4) {
    best = { lv: generateCandidate(n, 0, 1), wr: 1, t: 1 };
  } else {
    const t = targetWin(n, n % 5 === 0);
    for (let v = 0; v < 4; v++) {
      for (const mul of MULS) {
        const lv = generateCandidate(n, v, mul);
        const wr = winRate(lv, rng(n * 31 + v), 160);
        const score = Math.abs(wr - t);
        if (!best || score < best.score) best = { lv, wr, t, score };
      }
      if (best.score < 0.04) break;
    }
  }
  const enc = encodeLevel(best.lv);
  // проверка, что кодирование обратимо
  const back = decodeLevel(enc, n);
  if (back.arrows.length !== best.lv.arrows.length) throw new Error('codec ' + n);
  out.push(enc);
  report += `${String(n).padStart(3)} ${best.lv.hard ? '*' : ' '} ${best.lv.shape.padEnd(8)} ${String(best.lv.arrows.length).padStart(3)} цель ${Math.round(best.t * 100)}% → ${Math.round(best.wr * 100)}%\n`;
}
writeFileSync(new URL('../js/levels-data.js', import.meta.url),
  '// Сгенерировано tools/build-levels.mjs — не править руками\nexport const LEVELS = ' + JSON.stringify(out, null, 0).replace(/","/g, '",\n"') + ';\n');
console.log(report);
console.log(`Готово: ${COUNT} уровней за ${((Date.now() - t0) / 1000).toFixed(1)} с`);
