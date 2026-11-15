// Сборка для ВК: один минифицированный game.js + статика → dist/ и архив strelki-vk.zip
// Запуск: npm run build
import { build } from 'esbuild';
import { copyFileSync, rmSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);

await build({
  entryPoints: [join(root, 'js', 'main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2018', 'chrome64', 'safari12'],
  outfile: join(dist, 'game.js'),
  legalComments: 'none',
});

// cpSync с папками ломается на путях с кириллицей и двойными пробелами — копируем по файлам
const copyDir = (from, to) => {
  mkdirSync(to, { recursive: true });
  for (const e of readdirSync(from, { withFileTypes: true })) {
    if (e.isDirectory()) copyDir(join(from, e.name), join(to, e.name));
    else copyFileSync(join(from, e.name), join(to, e.name));
  }
};
copyFileSync(join(root, 'style.css'), join(dist, 'style.css'));
copyDir(join(root, 'fonts'), join(dist, 'fonts'));
copyDir(join(root, 'lib'), join(dist, 'lib'));

const ver = Date.now().toString(36);
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<script type="module" src="js/main.js"></script>', `<script src="game.js?v=${ver}"></script>`)
  .replace('href="style.css"', `href="style.css?v=${ver}"`);
writeFileSync(join(dist, 'index.html'), html);

// размер сборки
let total = 0;
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else total += statSync(p).size;
});
walk(dist);
console.log(`dist/ готов: ${(total / 1024).toFixed(0)} КБ`);

// архив для загрузки
const zip = join(root, 'strelki-vk.zip');
rmSync(zip, { force: true });
try {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
  console.log(`Архив: ${zip} (${(statSync(zip).size / 1024).toFixed(0)} КБ)`);
} catch (e) {
  console.log('Не удалось собрать zip автоматически — заархивируйте содержимое папки dist вручную.');
}
