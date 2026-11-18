// Всплывающие окна: победа, поражение, пауза, бонусы, подарок дня, настройки,
// достижения, рейтинг, бесплатные монеты.
import { Popup, Button, text, rr, INK, INK_SOFT, drawBadge } from './ui.js';
import { drawSprite } from './art.js';
import { SAVE, persist } from './save.js';
import { AUDIO } from './audio.js';
import { Ease } from './tween.js';
import { VK } from './vk.js';

export const MAX_DECOR = 40;

export const BOOSTERS = {
  hint: { name: 'Подсказка', icon: 'btn_wand', price: 80, desc: 'Покажет лучший ход' },
  magnet: { name: 'Магнит', icon: 'btn_magnet', price: 150, desc: 'Притянет стрелки в подарок' },
  snowball: { name: 'Снежок', icon: 'btn_snowball', price: 120, desc: 'Выбьет любую стрелку с поля' },
};

export const DAILY = [
  { coins: 50 }, { hint: 1 }, { coins: 80 }, { snowball: 1 }, { coins: 120 }, { magnet: 1 },
  { coins: 250, hint: 1, magnet: 1, snowball: 1 },
];

// ---------- достижения ----------
const lv = () => Math.max(0, SAVE.data.level - 1);
const st = (k) => (SAVE.data.stats && SAVE.data.stats[k]) || 0;
export const ACHIEVEMENTS = [
  { id: 'lv5', title: 'Первые шаги', desc: 'Пройди 5 уровней', goal: 5, val: lv, reward: 50, icon: 'arrow_green_1' },
  { id: 'lv25', title: 'Мастер стрелок', desc: 'Пройди 25 уровней', goal: 25, val: lv, reward: 150, icon: 'arrow_blue_0' },
  { id: 'tree', title: 'Ёлка сияет', desc: 'Зажги все игрушки на ёлке', goal: MAX_DECOR, val: () => Math.min(MAX_DECOR, lv()), reward: 300, icon: 'tree_icon' },
  { id: 'lv100', title: 'Легенда', desc: 'Пройди 100 уровней', goal: 100, val: lv, reward: 500, icon: 'arrow_gold_0' },
  { id: 'box100', title: 'Упаковщик', desc: 'Собери 100 подарков', goal: 100, val: () => st('boxes'), reward: 100, icon: 'gift' },
  { id: 'box1000', title: 'Помощник Деда Мороза', desc: 'Собери 1000 подарков', goal: 1000, val: () => st('boxes'), reward: 400, icon: 'box_pink' },
  { id: 'hard5', title: 'Сложный путь', desc: 'Пройди 5 сложных уровней', goal: 5, val: () => st('hard'), reward: 200, icon: 'arrow_purple_0' },
  { id: 'perfect10', title: 'Без единой ошибки', desc: 'Пройди 10 уровней, не потеряв сердечко', goal: 10, val: () => st('perfect'), reward: 150, icon: 'heart' },
  { id: 'boost20', title: 'Волшебник', desc: 'Используй 20 бонусов', goal: 20, val: () => st('boosters'), reward: 100, icon: 'btn_wand' },
  { id: 'daily7', title: 'Верный друг', desc: 'Забирай подарок дня 7 дней подряд', goal: 7, val: () => st('bestStreak'), reward: 250, icon: 'coin' },
];

export function achDone(a) { return a.val() >= a.goal; }
export function achClaimable() {
  return ACHIEVEMENTS.some((a) => achDone(a) && !SAVE.data.ach[a.id]);
}

function soundButtons(app, y, gap = 130) {
  const s = new Button({ round: true, w: 92, style: SAVE.data.sound ? 'green' : 'gray', icon: SAVE.data.sound ? 'i_sound' : 'i_mute', iconW: 54, rx: -gap / 2, ry: y });
  const m = new Button({ round: true, w: 92, style: SAVE.data.music ? 'green' : 'gray', icon: 'i_music', iconW: 52, rx: gap / 2, ry: y });
  s.onClick = () => {
    SAVE.data.sound = !SAVE.data.sound;
    AUDIO.setSound(SAVE.data.sound);
    s.style = SAVE.data.sound ? 'green' : 'gray';
    s.icon = SAVE.data.sound ? 'i_sound' : 'i_mute';
    persist();
  };
  m.onClick = () => {
    SAVE.data.music = !SAVE.data.music;
    AUDIO.setMusic(SAVE.data.music);
    m.style = SAVE.data.music ? 'green' : 'gray';
    persist();
  };
  return [s, m];
}

function closeButton(popup) {
  const c = new Button({ round: true, w: 70, style: 'red', icon: 'i_close', iconW: 38, rx: popup.w / 2 - 22, ry: -popup.h / 2 + 22 });
  c.onClick = () => popup.close();
  return c;
}

// тонкая полоска прогресса на кремовой панели
function miniBar(ctx, x, y, w, h, p, label) {
  ctx.fillStyle = '#9c5524';
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  rr(ctx, x, y, w, h * 0.45, h / 2);
  ctx.fill();
  if (p > 0) {
    const fw = Math.max(h, w * Math.min(1, p));
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#b6f25a');
    g.addColorStop(0.5, '#5cc61e');
    g.addColorStop(1, '#2e8f0c');
    ctx.fillStyle = g;
    rr(ctx, x, y, fw, h, h / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    rr(ctx, x + h * 0.3, y + h * 0.15, Math.max(0, fw - h * 0.6), h * 0.28, h * 0.14);
    ctx.fill();
  }
  if (label) text(ctx, label, x + w / 2, y + h / 2 + 1, h * 0.78, { stroke: '#4a1a06', sw: 4, shadow: false, color: '#fff' });
}

export class WinPopup extends Popup {
  constructor(app, scene, reward) {
    super(app, 600, 640);
    this.scene = scene;
    this.reward = reward;
    this.title = 'Отлично!';
    this.coinK = 0;
    app.tw.to(this, { coinK: 1 }, 0.6, Ease.outBack, 0.25);
    const x2 = new Button({ w: 400, h: 100, style: 'green', label: 'Забрать x2', size: 40, icon: 'video', iconW: 62, ry: 150, pulse: true });
    const next = new Button({ w: 290, h: 84, style: 'blue', label: 'Далее', size: 38, ry: 262 });
    x2.onClick = async () => {
      const ok = await app.showRewarded();
      if (!ok) return;
      app.sfx('coin');
      this.finish(reward * 2);
    };
    next.onClick = () => this.finish(reward);
    this.buttons = [x2, next];
  }

  finish(coins) {
    if (this.done) return;
    this.done = true;
    this.close();
    this.scene.next(coins);
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    text(ctx, `Уровень ${this.scene.n} пройден!`, cx, y + 92, 34, { stroke: null, color: INK });
    const k = this.coinK;
    // подарок с бантом и награда
    const bob = Math.sin(time * 3) * 4;
    drawSprite(ctx, 'box_red', cx - 150, y + 200 + bob, 150);
    drawSprite(ctx, 'bow_gold', cx - 150, y + 200 + bob, 150);
    ctx.fillStyle = 'rgba(122,58,18,.12)';
    rr(ctx, cx - 40, y + 156, 250, 100, 30);
    ctx.fill();
    drawSprite(ctx, 'coin', cx + 20, y + 206, 80 * Math.max(0.01, k), { rot: Math.sin(time * 3) * 0.08 });
    text(ctx, `+${this.reward}`, cx + 120, y + 208, 54 * Math.max(0.01, k), { stroke: '#7a4a00', gradient: ['#fff6c4', '#ffd23a', '#f59a00'] });
    // ёлка в меню наряжается
    const decor = Math.min(MAX_DECOR, Math.max(0, SAVE.data.level - 1));
    drawSprite(ctx, 'tree_icon', cx - 190, y + 305, 52);
    text(ctx, 'Ёлка зажжена:', cx - 150, y + 293, 22, { stroke: null, color: INK, weight: 800, align: 'left' });
    miniBar(ctx, cx - 150, y + 310, 340, 22, decor / MAX_DECOR, `${decor}/${MAX_DECOR}`);
  }
}

export class FailPopup extends Popup {
  constructor(app, scene, reason) {
    super(app, 600, 660);
    this.scene = scene;
    this.reason = reason;
    this.title = reason === 'shelf' ? 'Полка заполнена!' : 'Нет сердечек!';
    const sub = reason === 'shelf' ? '+1 место на полке' : 'Сердечки восстановятся';
    const ad = new Button({ w: 430, h: 108, style: 'green', label: 'Продолжить', sub, size: 40, icon: 'video', iconW: 62, ry: 66, pulse: true });
    const price = 150;
    const coins = new Button({ w: 350, h: 90, style: 'gold', label: `${price}`, sub: 'продолжить', size: 36, icon: 'coin', iconW: 54, ry: 182 });
    coins.enabled = SAVE.data.coins >= price;
    const retry = new Button({ w: 290, h: 80, style: 'red', label: 'Заново', size: 34, icon: 'i_restart', iconW: 40, ry: 280 });
    ad.onClick = async () => {
      const ok = await app.showRewarded();
      if (!ok) return;
      this.close();
      scene.continueAfter(reason);
    };
    coins.onClick = () => {
      if (SAVE.data.coins < price) return;
      SAVE.data.coins -= price;
      persist();
      app.sfx('coin');
      this.close();
      scene.continueAfter(reason);
    };
    retry.onClick = () => { this.close(); scene.restart(); };
    if (scene.continues >= 3) { ad.visible = false; coins.ry = 100; }
    this.buttons = [ad, coins, retry];
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    if (this.reason === 'shelf') {
      const cols = (this.scene.shelf || []).filter(Boolean).map((a) => a.color).slice(0, 5);
      if (!cols.length) cols.push('red', 'blue', 'green', 'gold');
      const n = cols.length, sp = 92;
      cols.forEach((c, i) => {
        const ax = cx + (i - (n - 1) / 2) * sp;
        drawSprite(ctx, `arrow_${c}_0`, ax, y + 168 + Math.sin(time * 3 + i * 0.9) * 2.5, 88);
      });
    } else {
      for (let i = 0; i < 3; i++) drawSprite(ctx, 'heart_empty', cx - 80 + i * 80, y + 168, 66);
    }
    const sc = this.scene;
    const total = sc.lv && sc.lv.queue ? sc.lv.queue.length : 0;
    const msg = total && sc.boxesDone / total >= 0.6 ? 'Не сдавайся — ты почти у цели!' : 'Не сдавайся — у тебя получится!';
    text(ctx, msg, cx, y + 258, 28, { stroke: null, color: INK, weight: 800, maxW: this.w - 80 });
  }
}

export class PausePopup extends Popup {
  constructor(app, scene) {
    super(app, 560, 640);
    this.scene = scene;
    this.title = 'Пауза';
    const resume = new Button({ w: 370, h: 96, style: 'green', label: 'Продолжить', size: 40, ry: -114 });
    const restart = new Button({ w: 370, h: 86, style: 'blue', label: 'Заново', size: 36, icon: 'i_restart', iconW: 40, ry: -2 });
    const menu = new Button({ w: 370, h: 86, style: 'red', label: 'В меню', size: 36, icon: 'i_home', iconW: 42, ry: 104 });
    resume.onClick = () => this.close();
    restart.onClick = () => { this.close(); scene.restart(); };
    menu.onClick = () => { this.close(); app.toMenu(); };
    this.buttons = [resume, restart, menu, ...soundButtons(app, 222)];
  }
}

export class SettingsPopup extends Popup {
  constructor(app) {
    super(app, 520, 430);
    this.title = 'Настройки';
    const ok = new Button({ w: 270, h: 84, style: 'green', label: 'Готово', size: 36, ry: 118 });
    ok.onClick = () => this.close();
    this.buttons = [...soundButtons(app, -2, 140), ok];
  }

  drawContent(ctx) {
    text(ctx, 'Звуки', this.cx - 70, this.cy - 80, 26, { stroke: null, color: INK, weight: 900 });
    text(ctx, 'Музыка', this.cx + 70, this.cy - 80, 26, { stroke: null, color: INK, weight: 900 });
  }
}

export class BoosterPopup extends Popup {
  constructor(app, scene, key) {
    super(app, 560, 600);
    this.key = key;
    const B = BOOSTERS[key];
    this.title = B.name;
    const ad = new Button({ w: 390, h: 100, style: 'green', label: 'Бесплатно', size: 40, icon: 'video', iconW: 60, ry: 104, pulse: true });
    const buy = new Button({ w: 330, h: 88, style: 'gold', label: `${B.price}`, size: 38, icon: 'coin', iconW: 54, ry: 214 });
    buy.enabled = SAVE.data.coins >= B.price;
    const give = () => {
      SAVE.data.boosters[key] = (SAVE.data.boosters[key] || 0) + 1;
      persist();
      app.sfx('booster');
      app.toast(`${B.name}: +1`);
      this.close();
    };
    ad.onClick = async () => { if (await app.showRewarded()) give(); };
    buy.onClick = () => {
      if (SAVE.data.coins < B.price) return;
      SAVE.data.coins -= B.price;
      give();
    };
    this.buttons = [ad, buy, closeButton(this)];
  }

  drawContent(ctx, time, x, y) {
    const B = BOOSTERS[this.key];
    drawSprite(ctx, B.icon, this.cx, y + 168, 150 * (1 + Math.sin(time * 3) * 0.03));
    text(ctx, B.desc, this.cx, y + 276, 30, { stroke: null, color: INK, weight: 800, maxW: this.w - 70 });
  }
}

const pad2 = (v) => String(v).padStart(2, '0');
function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function todayStr() {
  return dateStr(new Date());
}
// разница в днях между сохранённой датой и сегодня
function daysSince(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return Infinity;
  const [y, m, d] = s.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
}

export function dailyAvailable() {
  return daysSince(SAVE.data.daily.last) !== 0;
}

// индекс дня в 7-дневном цикле: продолжение серии или сброс
function dailyDayIndex() {
  const d = SAVE.data.daily;
  const diff = daysSince(d.last);
  if (diff === 0) return Math.max(0, (d.streak || 1) - 1) % 7;
  if (diff === 1) return (d.streak || 0) % 7;
  return 0;
}

export class DailyPopup extends Popup {
  constructor(app, onDone) {
    super(app, 640, 660);
    this.title = 'Подарок дня';
    this.onDone = onDone;
    this.day = dailyDayIndex();
    this.avail = dailyAvailable();
    const claim = new Button({ w: 350, h: 96, style: this.avail ? 'green' : 'gray', label: this.avail ? 'Забрать' : 'Завтра ещё!', size: 38, ry: 240, pulse: this.avail });
    claim.onClick = () => {
      if (!this.avail) { this.close(); return; }
      const r = DAILY[this.day];
      SAVE.data.coins += r.coins || 0;
      for (const k of ['hint', 'magnet', 'snowball']) if (r[k]) SAVE.data.boosters[k] = (SAVE.data.boosters[k] || 0) + r[k];
      const cont = daysSince(SAVE.data.daily.last) === 1;
      SAVE.data.daily.streak = cont ? (SAVE.data.daily.streak || 0) + 1 : 1;
      SAVE.data.daily.last = todayStr();
      SAVE.data.stats.bestStreak = Math.max(SAVE.data.stats.bestStreak || 0, SAVE.data.daily.streak);
      persist(true);
      app.sfx('coin');
      this.close();
      if (onDone) onDone();
    };
    this.buttons = [claim, closeButton(this)];
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    text(ctx, 'Заходи каждый день — подарки растут!', cx, y + 86, 25, { stroke: null, color: INK, weight: 800, maxW: this.w - 70 });
    const cw = 126, ch = 148;
    for (let i = 0; i < 7; i++) {
      const row = i < 4 ? 0 : 1;
      const inRow = row === 0 ? 4 : 3;
      const col = row === 0 ? i : i - 4;
      const bx = cx + (col - (inRow - 1) / 2) * (cw + 12);
      const by = y + 202 + row * (ch + 14);
      const done = i < this.day || (!this.avail && i === this.day);
      const today = i === this.day && this.avail;
      const k = today ? 1 + Math.sin(time * 5) * 0.04 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(k, k);
      const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
      if (today) { g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#f6b52a'); } else if (done) { g.addColorStop(0, '#d6f3b8'); g.addColorStop(1, '#a6d982'); } else { g.addColorStop(0, '#fff7e6'); g.addColorStop(1, '#f3dcb4'); }
      ctx.fillStyle = 'rgba(90,38,8,.25)';
      rr(ctx, -cw / 2, -ch / 2 + 4, cw, ch, 22);
      ctx.fill();
      ctx.fillStyle = g;
      rr(ctx, -cw / 2, -ch / 2, cw, ch, 22);
      ctx.fill();
      ctx.strokeStyle = today ? '#b86a00' : '#b07a48';
      ctx.lineWidth = 4;
      ctx.stroke();
      text(ctx, `День ${i + 1}`, 0, -ch / 2 + 22, 22, { stroke: null, color: INK, weight: 900 });
      const r = DAILY[i];
      if (r.coins && !r.hint) {
        drawSprite(ctx, 'coin', 0, 4, 58);
        text(ctx, `${r.coins}`, 0, ch / 2 - 25, 28, { stroke: '#7a4a00', gradient: ['#fff6c4', '#ffd23a'] });
      } else if (i === 6) {
        drawSprite(ctx, 'box_purple', 0, 6, 92);
        drawSprite(ctx, 'bow_gold', 0, 6, 92);
        text(ctx, 'Суперприз', 0, ch / 2 - 20, 20, { stroke: null, color: '#a3135c', weight: 900, maxW: cw - 14 });
      } else {
        const key = Object.keys(r)[0];
        drawSprite(ctx, BOOSTERS[key].icon, 0, 2, 66);
        text(ctx, '+1', 0, ch / 2 - 25, 28, { stroke: '#1b4fa0' });
      }
      if (done) {
        ctx.strokeStyle = '#1f7a22';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(-4, 16); ctx.lineTo(24, -16);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export class MessagePopup extends Popup {
  constructor(app, title, msg, okLabel, onOk, cancelLabel) {
    super(app, 580, 460);
    this.title = title;
    this.msg = msg;
    const ok = new Button({ w: 310, h: 92, style: 'green', label: okLabel, size: 36, ry: cancelLabel ? 66 : 110 });
    ok.onClick = () => { this.close(); if (onOk) onOk(); };
    this.buttons = [ok];
    if (cancelLabel) {
      const c = new Button({ w: 250, h: 74, style: 'blue', label: cancelLabel, size: 30, ry: 164 });
      c.onClick = () => this.close();
      this.buttons.push(c);
    }
  }

  drawContent(ctx, time, x, y) {
    const lines = this.msg.split('\n');
    lines.forEach((l, i) => text(ctx, l, this.cx, y + 108 + i * 40, 28, { stroke: null, color: INK, weight: 800, maxW: this.w - 60 }));
  }
}

// ---------- Достижения ----------
const PER_PAGE = 5;
export class AchievementsPopup extends Popup {
  constructor(app, onChange) {
    super(app, 660, 720);
    this.title = 'Достижения';
    this.onChange = onChange;
    // первыми — те, где можно забрать награду
    this.page = 0;
    const firstReady = ACHIEVEMENTS.findIndex((a) => achDone(a) && !SAVE.data.ach[a.id]);
    if (firstReady >= 0) this.page = Math.floor(firstReady / PER_PAGE);
    this.pages = Math.ceil(ACHIEVEMENTS.length / PER_PAGE);
    this.build();
  }

  build() {
    const app = this.app;
    const btns = [closeButton(this)];
    const list = ACHIEVEMENTS.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);
    list.forEach((a, i) => {
      if (achDone(a) && !SAVE.data.ach[a.id]) {
        const b = new Button({ w: 150, h: 60, style: 'green', label: `+${a.reward}`, size: 28, icon: 'coin', iconW: 34, rx: 222, ry: this.rowY(i), pulse: true });
        b.onClick = () => {
          if (SAVE.data.ach[a.id]) return;
          SAVE.data.ach[a.id] = true;
          SAVE.data.coins += a.reward;
          persist(true);
          app.sfx('coin');
          app.toast(`${a.title}: +${a.reward} монет`);
          this.build();
          if (this.onChange) this.onChange();
        };
        btns.push(b);
      }
    });
    if (this.pages > 1) {
      const prev = new Button({ round: true, w: 70, style: 'blue', icon: 'i_prev', iconW: 36, rx: -110, ry: this.h / 2 - 66 });
      const next = new Button({ round: true, w: 70, style: 'blue', icon: 'i_play', iconW: 36, rx: 110, ry: this.h / 2 - 66 });
      prev.enabled = this.page > 0;
      next.enabled = this.page < this.pages - 1;
      prev.onClick = () => { if (this.page > 0) { this.page--; this.build(); } };
      next.onClick = () => { if (this.page < this.pages - 1) { this.page++; this.build(); } };
      btns.push(prev, next);
    }
    this.buttons = btns;
  }

  rowY(i) { return -this.h / 2 + 128 + i * 104; }

  drawContent(ctx, time, x, y) {
    const list = ACHIEVEMENTS.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);
    list.forEach((a, i) => {
      const cy = this.cy + this.rowY(i);
      const v = Math.min(a.goal, a.val());
      const done = v >= a.goal;
      const claimed = !!SAVE.data.ach[a.id];
      ctx.fillStyle = claimed ? 'rgba(80,150,40,.16)' : 'rgba(122,58,18,.12)';
      rr(ctx, x + 32, cy - 46, this.w - 64, 92, 22);
      ctx.fill();
      drawSprite(ctx, a.icon, x + 82, cy, a.icon.startsWith('btn_') || a.icon.startsWith('box_') ? 70 : 58);
      text(ctx, a.title, x + 128, cy - 22, 25, { stroke: null, color: INK, align: 'left', maxW: 300 });
      text(ctx, a.desc, x + 128, cy + 4, 18, { stroke: null, color: INK_SOFT, weight: 800, align: 'left', maxW: 300 });
      miniBar(ctx, x + 128, cy + 20, 290, 18, v / a.goal, `${v}/${a.goal}`);
      if (claimed) {
        ctx.strokeStyle = '#2f8a1c';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const ox = this.cx + 222;
        ctx.moveTo(ox - 22, cy); ctx.lineTo(ox - 6, cy + 16); ctx.lineTo(ox + 24, cy - 16);
        ctx.stroke();
      } else if (!done) {
        drawSprite(ctx, 'coin', this.cx + 196, cy, 40, { alpha: 0.75 });
        text(ctx, `${a.reward}`, this.cx + 248, cy + 1, 26, { stroke: null, color: INK_SOFT, weight: 900 });
      }
    });
    if (this.pages > 1) text(ctx, `${this.page + 1} / ${this.pages}`, this.cx, this.cy + this.h / 2 - 64, 28, { stroke: null, color: INK });
  }
}

// ---------- Рейтинг ----------
export class RatingPopup extends Popup {
  constructor(app) {
    super(app, 600, 600);
    this.title = 'Рейтинг';
    const btns = [closeButton(this)];
    if (VK.hasLeaderboard) {
      const top = new Button({ w: 400, h: 92, style: 'green', label: 'Таблица рекордов', size: 34, icon: 'i_trophy', iconW: 46, ry: 118 });
      top.onClick = () => VK.leaderboard(SAVE.data.level - 1);
      btns.push(top);
    }
    if (VK.inVK) {
      const inv = new Button({ w: 400, h: 84, style: 'blue', label: 'Позвать друзей', size: 32, icon: 'i_invite', iconW: 44, ry: VK.hasLeaderboard ? 222 : 160 });
      inv.onClick = () => VK.invite();
      btns.push(inv);
    }
    this.buttons = btns;
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    text(ctx, 'Твои успехи', cx, y + 88, 30, { stroke: null, color: INK });
    const rows = [
      ['arrow_gold_0', 'Пройдено уровней', `${Math.max(0, SAVE.data.level - 1)}`],
      ['gift', 'Собрано подарков', `${(SAVE.data.stats && SAVE.data.stats.boxes) || 0}`],
      ['tree_icon', 'Ёлка зажжена', `${Math.min(MAX_DECOR, Math.max(0, SAVE.data.level - 1))}/${MAX_DECOR}`],
    ];
    rows.forEach(([icon, label, val], i) => {
      const ry = y + 150 + i * 70;
      ctx.fillStyle = 'rgba(122,58,18,.12)';
      rr(ctx, x + 40, ry - 30, this.w - 80, 60, 20);
      ctx.fill();
      drawSprite(ctx, icon, x + 84, ry, 48);
      text(ctx, label, x + 120, ry + 1, 26, { stroke: null, color: INK, weight: 800, align: 'left', maxW: 290 });
      text(ctx, val, x + this.w - 70, ry + 1, 30, { stroke: null, color: INK, align: 'right' });
    });
    // про другую площадку пишем только вне ВК и Одноклассников (в ОК упоминать ВК нельзя)
    if (!VK.inVK && !VK.isOK) {
      text(ctx, 'Таблица рекордов с друзьями', cx, y + this.h - 128 + (VK.inVK ? -44 : 0), 23, { stroke: null, color: INK_SOFT, weight: 800 });
      text(ctx, 'доступна в игре ВКонтакте', cx, y + this.h - 98 + (VK.inVK ? -44 : 0), 23, { stroke: null, color: INK_SOFT, weight: 800 });
    }
  }
}

// ---------- Бесплатные монеты ----------
export const SHOP_LIMIT = 5;
export const SHOP_COINS = 50;
export function shopLeft() {
  const s = SAVE.data.shop || { day: '', n: 0 };
  return s.day === todayStr() ? Math.max(0, SHOP_LIMIT - s.n) : SHOP_LIMIT;
}

export class ShopPopup extends Popup {
  constructor(app) {
    super(app, 560, 560);
    this.title = 'Монеты';
    const left = shopLeft();
    const get = new Button({ w: 380, h: 98, style: left ? 'green' : 'gray', label: left ? `+${SHOP_COINS}` : 'Завтра ещё!', size: 42, icon: left ? 'video' : null, iconW: 60, ry: 150, pulse: !!left });
    get.onClick = async () => {
      if (!shopLeft()) { this.close(); return; }
      const ok = await app.showRewarded();
      if (!ok) return;
      const t = todayStr();
      if (SAVE.data.shop.day !== t) SAVE.data.shop = { day: t, n: 0 };
      SAVE.data.shop.n++;
      SAVE.data.coins += SHOP_COINS;
      persist(true);
      app.sfx('coin');
      app.toast(`+${SHOP_COINS} монет`);
      this.close();
    };
    this.buttons = [get, closeButton(this)];
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    drawSprite(ctx, 'coin', cx - 40, y + 168, 110, { rot: Math.sin(time * 2.5) * 0.08 });
    drawSprite(ctx, 'coin', cx + 50, y + 186, 84, { rot: Math.sin(time * 2.5 + 1) * 0.08 });
    text(ctx, 'Посмотри короткую рекламу —', cx, y + 262, 25, { stroke: null, color: INK, weight: 800, maxW: this.w - 60 });
    text(ctx, `получи ${SHOP_COINS} монет!`, cx, y + 294, 25, { stroke: null, color: INK, weight: 800, maxW: this.w - 60 });
    const left = shopLeft();
    text(ctx, left ? `Осталось сегодня: ${left} из ${SHOP_LIMIT}` : 'На сегодня всё — приходи завтра', cx, y + 334, 21, { stroke: null, color: INK_SOFT, weight: 800 });
  }
}

export { drawBadge };
