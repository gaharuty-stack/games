// Всплывающие окна: победа, поражение, пауза, бонусы, подарок дня, настройки.
import { Popup, Button, text, rr } from './ui.js';
import { drawSprite } from './art.js';
import { SAVE, persist } from './save.js';
import { AUDIO } from './audio.js';
import { Ease } from './tween.js';

const DARK = '#173a78';

export const BOOSTERS = {
  hint: { name: 'Подсказка', icon: 'wand', price: 80, desc: 'Покажет лучший ход' },
  magnet: { name: 'Магнит', icon: 'magnet', price: 150, desc: 'Притянет стрелки в подарок' },
  snowball: { name: 'Снежок', icon: 'snowball', price: 120, desc: 'Выбьет любую стрелку с поля' },
};

export const DAILY = [
  { coins: 50 }, { hint: 1 }, { coins: 80 }, { snowball: 1 }, { coins: 120 }, { magnet: 1 },
  { coins: 250, hint: 1, magnet: 1, snowball: 1 },
];

function soundButtons(app, popup, y, gap = 110) {
  const s = new Button({ round: true, w: 92, style: SAVE.data.sound ? 'green' : 'gray', icon: SAVE.data.sound ? 'i_sound' : 'i_mute', iconW: 56, rx: -gap / 2, ry: y });
  const m = new Button({ round: true, w: 92, style: SAVE.data.music ? 'green' : 'gray', icon: 'i_music', iconW: 54, rx: gap / 2, ry: y });
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

export class WinPopup extends Popup {
  constructor(app, scene, reward) {
    super(app, 600, 640);
    this.scene = scene;
    this.reward = reward;
    this.title = 'Отлично!';
    this.titleColor = 'green';
    this.coinK = 0;
    app.tw.to(this, { coinK: 1 }, 0.6, Ease.outBack, 0.25);
    const x2 = new Button({ w: 420, h: 104, style: 'green', label: 'Забрать x2', size: 40, icon: 'video', iconW: 64, ry: 150, pulse: true });
    const next = new Button({ w: 300, h: 88, style: 'blue', label: 'Далее', size: 38, ry: 262 });
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
    text(ctx, `Уровень ${this.scene.n} пройден!`, cx, y + 96, 36, { stroke: null, color: DARK });
    drawSprite(ctx, 'snowman', cx - 170, y + 270, 170, { sy: 1 + Math.sin(time * 4) * 0.02 });
    const k = this.coinK;
    ctx.fillStyle = 'rgba(23,58,120,.1)';
    rr(ctx, cx - 70, y + 150, 280, 110, 30);
    ctx.fill();
    drawSprite(ctx, 'coin', cx + 0, y + 205, 84 * k, { rot: Math.sin(time * 3) * 0.1 });
    text(ctx, `+${this.reward}`, cx + 110, y + 207, 54 * Math.max(0.01, k), { stroke: '#7a4a00', gradient: ['#fff6c4', '#ffd23a', '#f59a00'] });
    drawSprite(ctx, 'orn_red', cx + 10, y + 302, 40);
    text(ctx, '+1 игрушка на ёлку', cx + 130, y + 304, 26, { stroke: null, color: DARK, weight: 800, maxW: 200 });
  }
}

export class FailPopup extends Popup {
  constructor(app, scene, reason) {
    super(app, 600, 660);
    this.scene = scene;
    this.reason = reason;
    this.title = reason === 'shelf' ? 'Полка заполнена!' : 'Нет сердечек!';
    const sub = reason === 'shelf' ? '+1 место на полке' : 'Сердечки восстановятся';
    const ad = new Button({ w: 440, h: 112, style: 'green', label: 'Продолжить', sub, size: 40, icon: 'video', iconW: 64, ry: 66, pulse: true });
    const price = 150;
    const coins = new Button({ w: 360, h: 92, style: 'gold', label: `${price}`, sub: 'продолжить', size: 36, icon: 'coin', iconW: 56, ry: 182 });
    coins.enabled = SAVE.data.coins >= price;
    const retry = new Button({ w: 300, h: 84, style: 'red', label: 'Заново', size: 34, icon: 'i_restart', iconW: 40, ry: 282 });
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
      drawSprite(ctx, 'nest', cx - 60, y + 160, 80);
      drawSprite(ctx, 'nest', cx + 60, y + 160, 80);
      drawSprite(ctx, 'lock', cx, y + 140, 70 * (1 + Math.sin(time * 4) * 0.04));
    } else {
      for (let i = 0; i < 3; i++) drawSprite(ctx, 'heart_empty', cx - 70 + i * 70, y + 150, 60);
    }
    text(ctx, 'Не сдавайся — ты почти у цели!', cx, y + 232, 28, { stroke: null, color: DARK, weight: 800, maxW: this.w - 80 });
  }
}

export class PausePopup extends Popup {
  constructor(app, scene) {
    super(app, 560, 640);
    this.scene = scene;
    this.title = 'Пауза';
    const resume = new Button({ w: 380, h: 100, style: 'green', label: 'Продолжить', size: 40, ry: -110 });
    const restart = new Button({ w: 380, h: 92, style: 'blue', label: 'Заново', size: 36, icon: 'i_restart', iconW: 42, ry: 4 });
    const menu = new Button({ w: 380, h: 92, style: 'red', label: 'В меню', size: 36, icon: 'i_home', iconW: 44, ry: 112 });
    resume.onClick = () => this.close();
    restart.onClick = () => { this.close(); scene.restart(); };
    menu.onClick = () => { this.close(); app.toMenu(); };
    this.buttons = [resume, restart, menu, ...soundButtons(app, this, 228)];
  }
}

export class SettingsPopup extends Popup {
  constructor(app) {
    super(app, 520, 420);
    this.title = 'Настройки';
    const ok = new Button({ w: 280, h: 88, style: 'green', label: 'Готово', size: 36, ry: 110 });
    ok.onClick = () => this.close();
    this.buttons = [...soundButtons(app, this, -10, 130), ok];
  }

  drawContent(ctx, time, x, y) {
    text(ctx, 'Звуки', this.cx - 65, this.cy - 82, 24, { stroke: null, color: DARK, weight: 800 });
    text(ctx, 'Музыка', this.cx + 65, this.cy - 82, 24, { stroke: null, color: DARK, weight: 800 });
  }
}

export class BoosterPopup extends Popup {
  constructor(app, scene, key) {
    super(app, 560, 600);
    this.key = key;
    const B = BOOSTERS[key];
    this.title = B.name;
    const ad = new Button({ w: 400, h: 104, style: 'green', label: 'Бесплатно', size: 40, icon: 'video', iconW: 62, ry: 100, pulse: true });
    const buy = new Button({ w: 340, h: 90, style: 'gold', label: `${B.price}`, size: 38, icon: 'coin', iconW: 56, ry: 212 });
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
    const close = new Button({ round: true, w: 70, style: 'red', icon: 'i_close', iconW: 40, rx: 230, ry: -262 });
    close.onClick = () => this.close();
    this.buttons = [ad, buy, close];
  }

  drawContent(ctx, time, x, y) {
    const B = BOOSTERS[this.key];
    drawSprite(ctx, B.icon, this.cx, y + 165, 140 * (1 + Math.sin(time * 3) * 0.04));
    text(ctx, B.desc, this.cx, y + 268, 30, { stroke: null, color: DARK, weight: 800, maxW: this.w - 70 });
  }
}

const pad2 = (v) => String(v).padStart(2, '0');
function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function todayStr() {
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
    const claim = new Button({ w: 360, h: 100, style: this.avail ? 'green' : 'gray', label: this.avail ? 'Забрать' : 'Завтра ещё!', size: 38, ry: 238, pulse: this.avail });
    claim.onClick = () => {
      if (!this.avail) { this.close(); return; }
      const r = DAILY[this.day];
      SAVE.data.coins += r.coins || 0;
      for (const k of ['hint', 'magnet', 'snowball']) if (r[k]) SAVE.data.boosters[k] = (SAVE.data.boosters[k] || 0) + r[k];
      const cont = daysSince(SAVE.data.daily.last) === 1;
      SAVE.data.daily.streak = cont ? (SAVE.data.daily.streak || 0) + 1 : 1;
      SAVE.data.daily.last = todayStr();
      persist(true);
      app.sfx('coin');
      this.close();
      if (onDone) onDone();
    };
    const close = new Button({ round: true, w: 70, style: 'red', icon: 'i_close', iconW: 40, rx: 270, ry: -292 });
    close.onClick = () => this.close();
    this.buttons = [claim, close];
  }

  drawContent(ctx, time, x, y) {
    const cx = this.cx;
    text(ctx, 'Заходи каждый день — подарки растут!', cx, y + 92, 25, { stroke: null, color: DARK, weight: 800, maxW: this.w - 60 });
    const cw = 128, ch = 150;
    for (let i = 0; i < 7; i++) {
      const row = i < 4 ? 0 : 1;
      const inRow = row === 0 ? 4 : 3;
      const col = row === 0 ? i : i - 4;
      const big = i === 6;
      const w = big ? cw * 1.0 : cw;
      const bx = cx + (col - (inRow - 1) / 2) * (cw + 12);
      const by = y + 210 + row * (ch + 16);
      const done = i < this.day || (!this.avail && i === this.day);
      const today = i === this.day && this.avail;
      const k = today ? 1 + Math.sin(time * 5) * 0.04 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(k, k);
      ctx.fillStyle = today ? '#ffcf3a' : done ? '#9fd38f' : '#ffffff';
      rr(ctx, -w / 2, -ch / 2, w, ch, 22);
      ctx.fill();
      ctx.strokeStyle = today ? '#c27a00' : '#7fa6d6';
      ctx.lineWidth = 4;
      ctx.stroke();
      text(ctx, `День ${i + 1}`, 0, -ch / 2 + 22, 22, { stroke: null, color: DARK, weight: 900 });
      const r = DAILY[i];
      if (r.coins && !r.hint) {
        drawSprite(ctx, 'coin', 0, 4, 56);
        text(ctx, `${r.coins}`, 0, ch / 2 - 26, 28, { stroke: '#7a4a00', gradient: ['#fff6c4', '#ffd23a'] });
      } else if (big) {
        drawSprite(ctx, 'gift', 0, 6, 70);
        text(ctx, 'Суперприз', 0, ch / 2 - 24, 21, { stroke: null, color: '#a3135c', weight: 900 });
      } else {
        const key = Object.keys(r)[0];
        drawSprite(ctx, BOOSTERS[key].icon, 0, 4, 60);
        text(ctx, '+1', 0, ch / 2 - 26, 28, { stroke: '#1b4fa0' });
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
    const ok = new Button({ w: 320, h: 96, style: 'green', label: okLabel, size: 36, ry: cancelLabel ? 70 : 110 });
    ok.onClick = () => { this.close(); if (onOk) onOk(); };
    this.buttons = [ok];
    if (cancelLabel) {
      const c = new Button({ w: 260, h: 76, style: 'blue', label: cancelLabel, size: 30, ry: 166 });
      c.onClick = () => this.close();
      this.buttons.push(c);
    }
  }

  drawContent(ctx, time, x, y) {
    const lines = this.msg.split('\n');
    lines.forEach((l, i) => text(ctx, l, this.cx, y + 110 + i * 40, 28, { stroke: null, color: DARK, weight: 800, maxW: this.w - 60 }));
  }
}
