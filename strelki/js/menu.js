// Главное меню: ёлка наряжается по мере прохождения уровней.
import { drawSprite, TREE_TIERS, PAL } from './art.js';
import { Button, text, rr, drawRibbon } from './ui.js';
import { Ease } from './tween.js';
import { Particles } from './particles.js';
import { SAVE, persist } from './save.js';
import { VK } from './vk.js';
import { rng } from './level.js';
import { DailyPopup, SettingsPopup, MessagePopup, dailyAvailable } from './popups.js';

export const MAX_DECOR = 40;
const ORN = ['red', 'gold', 'blue', 'purple', 'pink', 'cyan', 'green', 'orange'];

// Точки для игрушек в координатах спрайта ёлки (420×580)
function decorPoints() {
  const pts = [];
  const rows = [
    [0, 446, 0.78, 7], [0, 402, 0.62, 6],
    [1, 346, 0.78, 6], [1, 306, 0.55, 5],
    [2, 248, 0.78, 5], [2, 212, 0.5, 4],
    [3, 150, 0.75, 4], [3, 108, 0.45, 2], [3, 74, 0.2, 1],
  ];
  const r = rng(77);
  for (const [ti, y, spread, n] of rows) {
    const t = TREE_TIERS[ti];
    const k = Math.pow(Math.max(0.05, (y - t.top) / (t.bot - t.top)), 0.75);
    const hw = t.hw * k * spread;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
      pts.push([210 + u * hw + (r() - 0.5) * 14, y + (r() - 0.5) * 10]);
    }
  }
  // перемешиваем, чтобы ёлка наряжалась равномерно
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts.slice(0, MAX_DECOR).map((p, i) => ({
    x: p[0], y: p[1],
    kind: i % 9 === 4 ? 'candy' : i % 9 === 7 ? 'bell' : 'orn_' + ORN[i % ORN.length],
  }));
}
const POINTS = decorPoints();

export class MenuScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.particles = new Particles();
    const done = Math.min(MAX_DECOR, SAVE.data.level - 1);
    this.shown = Math.min(SAVE.data.decor || 0, done);
    this.target = done;
    this.decorK = POINTS.map((_, i) => (i < this.shown ? 1 : 0));
    this.starK = done >= 10 && (SAVE.data.decor || 0) >= 10 ? 1 : 0;
    this.blink = 0;
    this.coinsShown = SAVE.data.coins;
    this.play = new Button({ w: 430, h: 128, style: 'green', label: 'Играть', size: 56, sub: `Уровень ${SAVE.data.level}`, pulse: true });
    this.play.onClick = () => app.startLevel(SAVE.data.level);
    this.btnGift = new Button({ round: true, w: 100, style: 'red', icon: 'gift', iconW: 70 });
    this.btnGift.onClick = () => this.openDaily();
    this.btnTop = new Button({ round: true, w: 100, style: 'gold', icon: 'i_trophy', iconW: 58, visible: VK.hasLeaderboard });
    this.btnTop.onClick = () => VK.leaderboard(SAVE.data.level - 1);
    this.btnInvite = new Button({ round: true, w: 100, style: 'purple', icon: 'i_invite', iconW: 58, visible: VK.inVK });
    this.btnInvite.onClick = () => VK.invite();
    this.btnSettings = new Button({ round: true, w: 84, style: 'blue', icon: 'i_gear', iconW: 50 });
    this.btnSettings.onClick = () => app.addPopup(new SettingsPopup(app));
    this.buttons = [this.play, this.btnGift, this.btnTop, this.btnInvite, this.btnSettings];
    this.layout();
  }

  enter() {
    const app = this.app;
    let delay = 0.5;
    // новые игрушки прилетают на ёлку
    const fresh = [];
    for (let i = this.shown; i < this.target; i++) fresh.push(i);
    fresh.forEach((i, k) => {
      const d = delay + Math.min(k, 6) * 0.32;
      if (k < 6) {
        app.tw.wait(d).then(() => {
          app.tw.to(this.decorK, { [i]: 1 }, 0.45, Ease.outBack).then(() => {
            const p = this.treePt(POINTS[i]);
            this.particles.sparkles(p[0], p[1], 8, 180, 30);
            app.sfx('box', k % 3);
          });
        });
      } else this.decorK[i] = 1;
    });
    if (this.target >= 10 && !this.starK) {
      app.tw.to(this, { starK: 1 }, 0.6, Ease.outBack, delay + Math.min(fresh.length, 6) * 0.32 + 0.2).then(() => {
        this.particles.sparkles(this.treeX, this.treeTop + 10, 18, 300, 40);
        app.sfx('win');
      });
    }
    if (fresh.length) {
      SAVE.data.decor = this.target;
      persist();
    }
    const after = delay + Math.min(fresh.length, 6) * 0.32 + 0.6;
    const noDaily = new URLSearchParams(location.search).has('nodaily');
    if (dailyAvailable() && !noDaily) app.tw.wait(after).then(() => { if (app.scene === this && !app.popups.length) this.openDaily(); });
    else if (VK.inVK && !SAVE.data.favAsked && SAVE.data.level >= 4) {
      app.tw.wait(after).then(() => {
        if (app.scene !== this || app.popups.length) return;
        SAVE.data.favAsked = true;
        persist();
        app.addPopup(new MessagePopup(app, 'Не потеряй игру!', 'Добавь «Стрелки» в избранное,\nчтобы быстро возвращаться', 'Добавить', () => VK.addToFavorites(), 'Позже'));
      });
    }
  }

  openDaily() {
    this.app.addPopup(new DailyPopup(this.app, () => { this.particles.confetti(this.app.view.DW / 2, this.app.view.DH * 0.5, 40); }));
  }

  layout() {
    const { DW: W, DH: H, landscape } = this.app.view;
    if (!landscape) {
      const col = Math.min(720, W);
      const left = W / 2 - col / 2;
      this.titleX = W / 2;
      // заголовок ниже счётчика монет; сверху у ёлки запас под звезду, чтобы она не заходила на ленту
      this.titleY = 164;
      const top = 345, bottom = H - 330;
      this.moon = [left + col - 92, 410];
      this.treeW = Math.min(470, ((bottom - top) * 420) / 580);
      this.treeX = W / 2 - 30;
      this.treeY = top + ((this.treeW * 580) / 420) / 2 + Math.max(0, (bottom - top - (this.treeW * 580) / 420) / 2);
      this.snowman = [W / 2 + Math.min(230, col * 0.33), this.treeY + this.treeW * 0.45, Math.min(190, this.treeW * 0.45)];
      this.play.x = W / 2; this.play.y = H - 215;
      const by = H - 78;
      const row = [this.btnGift, this.btnTop, this.btnInvite].filter((b) => b.visible);
      row.forEach((b, i) => { b.x = W / 2 + (i - (row.length - 1) / 2) * 130; b.y = by; });
      this.btnSettings.x = left + 60; this.btnSettings.y = 62;
      this.coinsPos = [left + col - 112, 62];
    } else {
      this.treeW = Math.min(520, ((H - 120) * 420) / 580);
      this.treeX = W * 0.3;
      this.treeY = H / 2 + 24;
      this.snowman = [this.treeX + this.treeW * 0.56, this.treeY + this.treeW * 0.62, this.treeW * 0.36];
      const rx = W * 0.72;
      this.titleX = rx;
      this.titleY = H * 0.24;
      this.play.x = rx; this.play.y = H * 0.6;
      const row = [this.btnGift, this.btnTop, this.btnInvite].filter((b) => b.visible);
      row.forEach((b, i) => { b.x = rx + (i - (row.length - 1) / 2) * 130; b.y = H * 0.8; });
      this.btnSettings.x = 58; this.btnSettings.y = 56;
      this.coinsPos = [W - 118, 56];
      this.moon = [Math.max(150, this.treeX - this.treeW * 0.48), 140];
    }
    this.treeTop = this.treeY - ((this.treeW * 580) / 420) / 2 + (32 / 580) * ((this.treeW * 580) / 420);
  }

  onResize() { this.layout(); }
  moonPos() { return this.moon; }

  treePt(p) {
    const k = this.treeW / 420;
    const h = (this.treeW * 580) / 420;
    return [this.treeX + (p.x - 210) * k, this.treeY - h / 2 + p.y * k];
  }

  pointerDown(x, y) {
    for (const b of this.buttons) if (b.hit(x, y)) { b.pressed = true; return; }
  }

  pointerUp(x, y) {
    for (const b of this.buttons) {
      if (b.pressed) {
        b.pressed = false;
        if (b.hit(x, y) && b.onClick) { this.app.sfx('click'); b.onClick(); }
      }
    }
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    this.btnGift.badge = dailyAvailable() ? '!' : null;
    this.play.sub = `Уровень ${SAVE.data.level}`;
    this.coinsShown += (SAVE.data.coins - this.coinsShown) * Math.min(1, dt * 6);
    this.blink -= dt;
    if (this.blink < -3.2) this.blink = 0.14;
  }

  drawTitle(ctx, time) {
    const word = 'СТРЕЛКИ';
    const cols = ['red', 'gold', 'green', 'blue', 'pink', 'orange', 'purple'];
    const size = 108;
    ctx.font = `900 ${size}px Nunito, Arial`;
    const widths = [...word].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + (word.length - 1) * 2;
    const maxW = Math.min(this.app.view.DW - 40, 660);
    const k = Math.min(1, maxW / total);
    let x = this.titleX - (total * k) / 2;
    ctx.save();
    ctx.translate(0, this.titleY);
    ctx.scale(k, k);
    x /= k;
    [...word].forEach((ch, i) => {
      const w = widths[i];
      const y = Math.sin(time * 2.4 + i * 0.7) * 6;
      const rot = Math.sin(time * 1.7 + i) * 0.04;
      ctx.save();
      ctx.translate(x + w / 2, y);
      ctx.rotate(rot);
      const P = PAL[cols[i % cols.length]];
      text(ctx, ch, 0, 0, size, { stroke: '#ffffff', sw: 26, shadow: false });
      text(ctx, ch, 0, 0, size, { stroke: P.dark, sw: 12, gradient: [P.light, P.base, P.mid] });
      // снежок на букве
      if (i % 2 === 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-w * 0.05, -size * 0.36, w * 0.3, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      x += w + 2;
    });
    ctx.restore();
    drawRibbon(ctx, this.titleX, this.titleY + 96, Math.min(440, this.app.view.DW - 140), 66, 'red');
    text(ctx, 'новогодняя сортировка', this.titleX, this.titleY + 92, 32, { stroke: '#4a0710', maxW: Math.min(390, this.app.view.DW - 190) });
  }

  draw(ctx, time) {
    // ёлка
    const h = (this.treeW * 580) / 420;
    const glow = ctx.createRadialGradient(this.treeX, this.treeY, 10, this.treeX, this.treeY, this.treeW * 0.8);
    glow.addColorStop(0, 'rgba(255,230,150,.22)');
    glow.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(this.treeX - this.treeW, this.treeY - h * 0.7, this.treeW * 2, h * 1.4);
    drawSprite(ctx, 'tree', this.treeX, this.treeY, this.treeW);
    this.drawLights(ctx, time);
    const k = this.treeW / 420;
    POINTS.forEach((p, i) => {
      const a = this.decorK[i];
      if (a <= 0) return;
      const [x, y] = this.treePt(p);
      const sway = Math.sin(time * 2 + i) * 0.08;
      const fy = y - (1 - Math.min(1, a)) * 120;
      const size = (p.kind === 'candy' ? 30 : p.kind === 'bell' ? 40 : 44) * k * Math.max(0.01, a);
      drawSprite(ctx, p.kind, x, fy, size, { rot: sway, ay: 0.15 });
    });
    if (this.starK > 0) {
      const s = this.starK;
      drawSprite(ctx, 'startop', this.treeX, this.treeTop - 8 * k, 120 * k * s * (1 + Math.sin(time * 3) * 0.04), { rot: Math.sin(time * 1.5) * 0.05 });
    }
    // прогресс украшения
    const done = Math.round(this.decorK.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0));
    const py = this.treeY + h / 2 + 6;
    ctx.fillStyle = 'rgba(8,22,58,.62)';
    rr(ctx, this.treeX - 130, py - 22, 260, 44, 22);
    ctx.fill();
    text(ctx, `Украшено: ${done}/${MAX_DECOR}`, this.treeX, py + 1, 26, { stroke: null, weight: 800 });
    // снеговик с морганием
    const [sx, sy, sw] = this.snowman;
    const bob = Math.sin(time * 2.2) * 0.025;
    drawSprite(ctx, 'snowman_noeyes', sx, sy, sw, { sy: 1 + bob, sx: 1 - bob * 0.5, ay: 0.9 });
    const sk = sw / 220;
    const sh = (290 * sk);
    const top = sy - sh * 0.9 * (1 + bob);
    const eyeY = top + 68 * sk * (1 + bob);
    const blinkK = this.blink > 0 ? 0.15 : 1;
    ctx.fillStyle = '#1d2433';
    for (const ex of [98, 124]) {
      ctx.beginPath();
      ctx.ellipse(sx + (ex - 110) * sk, eyeY, 5 * sk, 6 * sk * blinkK, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (blinkK === 1) {
      ctx.fillStyle = '#fff';
      for (const ex of [96.5, 122.5]) { ctx.beginPath(); ctx.arc(sx + (ex - 110) * sk, eyeY - 2 * sk, 1.8 * sk, 0, Math.PI * 2); ctx.fill(); }
    }
    this.drawTitle(ctx, time);
    // монеты
    const [mx, my] = this.coinsPos;
    ctx.fillStyle = 'rgba(8,22,58,.6)';
    rr(ctx, mx - 86, my - 28, 176, 56, 28);
    ctx.fill();
    drawSprite(ctx, 'coin', mx - 62, my, 58);
    text(ctx, String(Math.round(this.coinsShown)), mx + 14, my + 1, 32, { stroke: '#0d2350' });
    for (const b of this.buttons) b.draw(ctx, time);
    this.particles.draw(ctx);
  }

  drawLights(ctx, time) {
    const k = this.treeW / 420;
    const h = (this.treeW * 580) / 420;
    const ox = this.treeX - 210 * k, oy = this.treeY - h / 2;
    const swags = [[[95, 250], [325, 300]], [[70, 350], [345, 400]], [[60, 445], [370, 455]], [[140, 165], [290, 200]]];
    const cols = ['#ff4a5a', '#ffd23a', '#3aa0ff', '#38d06a', '#ff7ad1'];
    let n = 0;
    for (const [[x1, y1], [x2, y2]] of swags) {
      const cx = (x1 + x2) / 2, cy = Math.max(y1, y2) + 34;
      ctx.strokeStyle = 'rgba(30,50,30,.7)';
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      ctx.moveTo(ox + x1 * k, oy + y1 * k);
      ctx.quadraticCurveTo(ox + cx * k, oy + cy * k, ox + x2 * k, oy + y2 * k);
      ctx.stroke();
      for (let i = 1; i < 9; i++) {
        const t = i / 9, u = 1 - t;
        const x = u * u * x1 + 2 * u * t * cx + t * t * x2;
        const y = u * u * y1 + 2 * u * t * cy + t * t * y2;
        const on = 0.5 + 0.5 * Math.sin(time * 3.2 + n * 1.1);
        const c = cols[n % cols.length];
        const X = ox + x * k, Y = oy + y * k + 5 * k;
        const g = ctx.createRadialGradient(X, Y, 1, X, Y, 15 * k);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.6 * on;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(X, Y, 15 * k, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.7 + 0.3 * on;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(X, Y, 4 * k, 5.5 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        n++;
      }
    }
  }
}
