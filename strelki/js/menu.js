// Главное меню — как на референсе «новое меню»: ёлка со снеговиком на фоне,
// логотип, «Играть», прогресс украшения ёлки и три круглые кнопки.
import { drawSprite, drawAt, meta, spr } from './art.js';
import { Button, text, rr, drawCounterPill } from './ui.js';
import { Ease, clamp } from './tween.js';
import { Particles } from './particles.js';
import { SAVE, persist } from './save.js';
import { VK } from './vk.js';
import { stageOf, REF_W } from './bg.js';
import {
  DailyPopup, SettingsPopup, MessagePopup, AchievementsPopup, RatingPopup, ShopPopup,
  dailyAvailable, achClaimable, MAX_DECOR,
} from './popups.js';

export { MAX_DECOR };

// позиции на референсе (пиксели картинки 1672×941)
const R = {
  logo: [812, 82, 1552, 382],
  play: [928, 388, 1478, 598],
  progress: [955, 610, 1462, 744],
  ach: [976, 756, 1148, 899],
  rate: [1142, 756, 1314, 899],
  gifts: [1307, 756, 1479, 899],
  settings: [34, 18, 152, 138],
  plus: [1564, 24, 1641, 101],
  coin: [1415, 62, 70], // центр и ширина монеты
  pill: [1424, 35, 1590, 90],
};
const cxOf = (r) => (r[0] + r[2]) / 2;
const cyOf = (r) => (r[1] + r[3]) / 2;
const wOf = (r) => r[2] - r[0];
const hOf = (r) => r[3] - r[1];

export class MenuScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.particles = new Particles();
    const target = Math.min(MAX_DECOR, Math.max(0, SAVE.data.level - 1));
    this.decorTarget = target;
    const shown = Math.min(SAVE.data.decor || 0, target);
    this.coinsShown = SAVE.data.coins;
    // ёлка «в полутьме»: каждая зажжённая игрушка — круглое окошко в тёмной копии ёлки
    const TM = meta('tree_dark');
    this.treeRect = TM.rect || [0, 0, 1, 1];
    this.wins = (TM.windows || []).slice(0, MAX_DECOR);
    this.starWin = TM.star || [0, 0, 0];
    this.lit = this.wins.map((_, i) => (i < shown ? 1 : 0));
    this.starK = shown >= 10 ? 1 : 0;
    this.darkA = shown >= MAX_DECOR ? 0 : 1;
    this.flashes = [];
    this.treeDirty = true;
    this.lights = (meta('bg_menu').lights || []).map((p, i) => {
      // каждый огонёк гирлянды горит, только когда зажжена ближайшая игрушка
      let near = -1, best = 1e9;
      this.wins.forEach((w, j) => { const d = Math.hypot(w[0] - p[0], w[1] - p[1]); if (d < w[2] * 1.45 && d < best) { best = d; near = j; } });
      const inStar = Math.hypot(this.starWin[0] - p[0], this.starWin[1] - p[1]) < this.starWin[2] * 1.4;
      return { x: p[0], y: p[1], r: p[2], ph: (i * 2.39) % 6.28, sp: 1.6 + ((i * 7) % 5) * 0.35, near, inStar };
    });

    const mk = (sprite, onClick, extra = {}) => new Button({ sprite, onClick, ...extra });
    this.play = mk('btn_play', () => app.startLevel(SAVE.data.level), { pulse: true });
    this.btnAch = mk('btn_ach', () => this.openAch());
    this.btnRate = mk('btn_rate', () => app.addPopup(new RatingPopup(app)));
    this.btnGifts = mk('btn_gifts', () => this.openDaily());
    this.btnSettings = mk('btn_set_wood', () => app.addPopup(new SettingsPopup(app)));
    this.btnPlus = mk('btn_plus', () => app.addPopup(new ShopPopup(app)));
    this.buttons = [this.play, this.btnAch, this.btnRate, this.btnGifts, this.btnSettings, this.btnPlus];
    this.layout();
  }

  get decorShown() {
    let n = 0;
    for (const v of this.lit) n += Math.min(1, v);
    return n;
  }

  // зажечь игрушку i: окошко раскрывается, вспышка, искры, звон
  lightUp(i, k) {
    const app = this.app;
    const w = this.wins[i];
    app.tw.to(this.lit, { [i]: 1 }, 0.5, Ease.outBack);
    this.flashes.push({ x: w[0], y: w[1], r: w[2], t: 0 });
    const [x, y] = this.refToDesign(w[0], w[1]);
    this.particles.sparkles(x, y, 10, 220, 32);
    app.sfx('box', k % 3);
  }

  enter() {
    const app = this.app;
    let after = 0.6;
    const from = Math.round(this.decorShown), to = this.decorTarget;
    if (to > from) {
      const STEP = 0.42;
      const animated = Math.min(to - from, 6);
      // первые 6 новых игрушек загораются по одной, остальные — сразу вместе с последней
      for (let k = 0; k < animated; k++) {
        const last = k === animated - 1;
        app.tw.wait(0.5 + k * STEP).then(() => {
          if (app.scene !== this) return;
          if (last) for (let i = from + animated; i < to; i++) this.lit[i] = 1;
          this.lightUp(from + k, k);
          if (from < 10 && to >= 10 && last) this.lightStar();
          if (last && to >= MAX_DECOR) this.lightAll();
          this.treeDirty = true;
        });
      }
      SAVE.data.decor = to;
      persist();
      after = 0.5 + animated * STEP + (to >= MAX_DECOR ? 1.6 : 0.5);
    }
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

  lightStar() {
    const app = this.app;
    app.tw.to(this, { starK: 1 }, 0.7, Ease.outBack, 0.25).then(() => {
      if (app.scene !== this) return;
      const [x, y] = this.refToDesign(this.starWin[0], this.starWin[1]);
      this.particles.sparkles(x, y, 20, 320, 42);
      app.sfx('win');
    });
    this.flashes.push({ x: this.starWin[0], y: this.starWin[1], r: this.starWin[2], t: -0.25 });
  }

  // все 40 игрушек — ёлка сияет целиком
  lightAll() {
    const app = this.app;
    app.tw.to(this, { darkA: 0 }, 1.2, Ease.inOutQuad, 0.5).then(() => {
      if (app.scene !== this) return;
      const r = this.treeRect;
      for (let i = 0; i < 4; i++) {
        const [x, y] = this.refToDesign(r[0] + (r[2] - r[0]) * (0.3 + i * 0.13), r[1] + (r[3] - r[1]) * (0.25 + (i % 2) * 0.35));
        this.particles.sparkles(x, y, 14, 300, 40);
      }
      app.sfx('win');
    });
  }

  refToDesign(x, y) {
    const m = this.map;
    return [m.ox + x * m.k, m.oy + y * m.k];
  }

  openDaily() {
    this.app.addPopup(new DailyPopup(this.app, () => { this.particles.confetti(this.app.view.DW / 2, this.app.view.DH * 0.5, 40); }));
  }

  openAch() {
    this.app.addPopup(new AchievementsPopup(this.app));
  }

  // ---------- раскладка ----------
  layout() {
    const view = this.app.view;
    const { DW: W, DH: H, landscape } = view;
    const P = {};
    if (landscape) {
      // всё — ровно как на референсе, сцена вписана в экран
      const st = stageOf(view);
      this.map = st;
      const at = (r) => ({ x: st.ox + cxOf(r) * st.k, y: st.oy + cyOf(r) * st.k, k: st.k });
      for (const key of ['logo', 'play', 'progress', 'ach', 'rate', 'gifts', 'settings', 'plus']) P[key] = at(R[key]);
      P.coin = { x: st.ox + R.coin[0] * st.k, y: st.oy + R.coin[1] * st.k, w: R.coin[2] * st.k };
      P.pill = { x: st.ox + R.pill[0] * st.k, y: st.oy + R.pill[1] * st.k, w: wOf(R.pill) * st.k, h: hOf(R.pill) * st.k };
      this.app.setBg('menu', st);
    } else {
      // портрет: логотип сверху, кнопки снизу, между ними — вся сцена (ёлка со звездой и снеговик);
      // небо выше и снег ниже картинки дорисовываются продолжением её краёв
      const col = Math.min(720, W);
      const left = W / 2 - col / 2;
      const right = left + col;
      const topY = 66;
      const kSet = 104 / wOf(R.settings);
      P.settings = { x: left + 66, y: topY, k: kSet };
      const kPlus = 66 / wOf(R.plus);
      P.plus = { x: right - 50, y: topY, k: kPlus };
      P.pill = { x: right - 50 - 172, y: topY - 26, w: 172, h: 52 };
      P.coin = { x: right - 50 - 168, y: topY, w: 64 };
      const lw = Math.min(650, col - 50);
      const kLogo = lw / wOf(R.logo);
      const logoTop = 104;
      P.logo = { x: W / 2, y: logoTop + (hOf(R.logo) * kLogo) / 2, k: kLogo };
      const logoBottom = logoTop + hOf(R.logo) * kLogo;
      const kRow = Math.min(0.95, (col - 30) / (3 * 172));
      const rowY = H - 20 - (hOf(R.ach) * kRow) / 2;
      P.ach = { x: W / 2 - 172 * kRow, y: rowY, k: kRow };
      P.rate = { x: W / 2, y: rowY, k: kRow };
      P.gifts = { x: W / 2 + 172 * kRow, y: rowY, k: kRow };
      const kProg = Math.min(0.95, (col - 50) / wOf(R.progress));
      const progY = rowY - (hOf(R.ach) * kRow) / 2 - 14 - (hOf(R.progress) * kProg) / 2;
      P.progress = { x: W / 2, y: progY, k: kProg };
      const kPlay = Math.min(0.92, (col - 70) / wOf(R.play));
      P.play = { x: W / 2, y: progY - (hOf(R.progress) * kProg) / 2 - 2 - (hOf(R.play) * kPlay) / 2, k: kPlay };
      const stackTop = P.play.y - (hOf(R.play) * kPlay) / 2;
      // сцена: по ширине — от снеговика (x≈110) до правого края ёлки (x≈880);
      // по высоте — от звезды (y≈12) до шарфа снеговика (y≈620) между логотипом и кнопкой «Играть»
      const SX0 = 110, SX1 = 880, SY0 = 12, SY1 = 620;
      // картинка всегда закрывает всю ширину экрана (по бокам без пустот)
      const k = Math.max(W / REF_W, Math.min(W / (SX1 - SX0), (stackTop - logoBottom - 6) / (SY1 - SY0), 1.4));
      let ox = W / 2 - ((SX0 + SX1) / 2) * k;
      ox = Math.min(0, Math.max(W - REF_W * k, ox));
      const map = { k, ox, oy: logoBottom + 4 - SY0 * k, extend: true };
      this.map = map;
      this.app.setBg('menu', map);
    }
    this.P = P;
    const place = (b, key, hit) => {
      const p = P[key];
      const r = R[key];
      b.x = p.x;
      b.y = p.y;
      b.spriteW = wOf(r) * p.k;
      b.w = (hit ? hit[0] : wOf(r)) * p.k;
      b.h = (hit ? hit[1] : hOf(r)) * p.k;
      b.hitR = 0;
    };
    place(this.play, 'play', [504, 150]);
    place(this.btnAch, 'ach', [150, 140]);
    place(this.btnRate, 'rate', [150, 140]);
    place(this.btnGifts, 'gifts', [150, 140]);
    place(this.btnSettings, 'settings');
    this.btnSettings.hitR = 56 * P.settings.k;
    place(this.btnPlus, 'plus');
    this.btnPlus.hitR = 40 * P.plus.k;
    const bk = P.ach.k;
    for (const b of [this.btnAch, this.btnGifts]) { b.badgeAt = [52 * bk, -50 * bk]; b.badgeR = 20 * bk; }
  }

  onResize() { this.layout(); }

  // конец зелёной полоски прогресса (для искр)
  barEnd() {
    const p = this.P.progress;
    const r = R.progress;
    const bar = meta('panel_progress').bar;
    const k = p.k;
    const x0 = p.x + (bar[0] - cxOf(r)) * k;
    const w = (bar[2] - bar[0]) * k;
    return [x0 + w * (this.decorShown / MAX_DECOR), p.y + ((bar[1] + bar[3]) / 2 - cyOf(r)) * k];
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
    this.btnGifts.badge = dailyAvailable() ? '!' : null;
    this.btnAch.badge = achClaimable() ? '!' : null;
    this.coinsShown += (SAVE.data.coins - this.coinsShown) * Math.min(1, dt * 6);
  }

  // тёмная копия ёлки с круглыми окошками над зажжёнными игрушками
  drawTree(ctx) {
    if (this.darkA <= 0.001) return;
    const m = this.map;
    const r = this.treeRect;
    const { s, dpr } = this.app.view;
    const pw = Math.max(1, Math.round((r[2] - r[0]) * m.k * s * dpr));
    const ph = Math.max(1, Math.round((r[3] - r[1]) * m.k * s * dpr));
    const animating = this.flashes.length || this.lit.some((v) => v > 0 && v < 1) || (this.starK > 0 && this.starK < 1);
    if (!this.treeCanvas || this.treeCanvas.width !== pw || this.treeCanvas.height !== ph) {
      this.treeCanvas = this.treeCanvas || document.createElement('canvas');
      this.treeCanvas.width = pw;
      this.treeCanvas.height = ph;
      this.treeDirty = true;
    }
    if (this.treeDirty || animating) {
      const c = this.treeCanvas.getContext('2d');
      const kk = pw / (r[2] - r[0]);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, pw, ph);
      drawAt(c, 'tree_dark', 0, 0, kk);
      c.globalCompositeOperation = 'destination-out';
      const hole = (x, y, R, f) => {
        if (f <= 0.01) return;
        const X = (x - r[0]) * kk, Y = (y - r[1]) * kk, RR = R * kk * Math.max(0.01, f);
        const g = c.createRadialGradient(X, Y, 0, X, Y, RR);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.62, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(X, Y, RR, 0, Math.PI * 2); c.fill();
      };
      this.wins.forEach((w, i) => hole(w[0], w[1], w[2] * 1.55, this.lit[i]));
      hole(this.starWin[0], this.starWin[1], this.starWin[2] * 1.45, this.starK);
      c.globalCompositeOperation = 'source-over';
      this.treeDirty = false;
    }
    ctx.save();
    ctx.globalAlpha = this.darkA;
    ctx.drawImage(this.treeCanvas, m.ox + r[0] * m.k, m.oy + r[1] * m.k, (r[2] - r[0]) * m.k, (r[3] - r[1]) * m.k);
    ctx.restore();
  }

  // вспышки при зажигании
  drawFlashes(ctx, dt) {
    if (!this.flashes.length) return;
    const m = this.map;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flashes) {
      f.t += dt;
      if (f.t < 0) continue;
      const a = Math.max(0, 1 - f.t / 0.7);
      const x = m.ox + f.x * m.k, y = m.oy + f.y * m.k;
      const R = f.r * m.k * (1.4 + f.t * 2.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,250,220,${0.95 * a})`);
      g.addColorStop(0.35, `rgba(255,214,120,${0.55 * a})`);
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    this.flashes = this.flashes.filter((f) => f.t < 0.7);
  }

  drawLights(ctx, time) {
    const m = this.map;
    if (!m || !this.lights.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const all = 1 - this.darkA;
    for (const l of this.lights) {
      // гирлянда горит только возле зажжённых игрушек (или вся, когда ёлка зажжена целиком)
      const on = Math.max(all, l.near >= 0 ? Math.min(1, this.lit[l.near]) : 0, l.inStar ? this.starK : 0);
      if (on <= 0.02) continue;
      const a = (0.5 + 0.5 * Math.sin(time * l.sp + l.ph)) * on;
      if (a < 0.15) continue;
      const x = m.ox + l.x * m.k, y = m.oy + l.y * m.k;
      const r = (l.r * 2.6 + 6) * m.k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,236,170,${0.55 * a})`);
      g.addColorStop(0.4, `rgba(255,200,90,${0.22 * a})`);
      g.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  drawProgress(ctx) {
    const p = this.P.progress;
    const r = R.progress;
    const k = p.k;
    const x0 = p.x - (wOf(r) * k) / 2, y0 = p.y - (hOf(r) * k) / 2;
    drawAt(ctx, 'panel_progress', x0, y0, k);
    const M = meta('panel_progress');
    const [bx0, by0, bx1, by1] = M.bar;
    const X = x0 + (bx0 - r[0]) * k, Y = y0 + (by0 - r[1]) * k;
    const BW = (bx1 - bx0) * k, BH = (by1 - by0) * k;
    const f = clamp(this.decorShown / MAX_DECOR, 0, 1);
    if (f > 0) {
      const fw = Math.max(BH, BW * f);
      ctx.save();
      const g = ctx.createLinearGradient(0, Y, 0, Y + BH);
      g.addColorStop(0, '#c4f760');
      g.addColorStop(0.45, '#7fd52a');
      g.addColorStop(1, '#3a9a10');
      ctx.fillStyle = '#2a6e0c';
      rr(ctx, X, Y, fw, BH, BH / 2);
      ctx.fill();
      ctx.fillStyle = g;
      rr(ctx, X + 1.5 * k, Y + 1.5 * k, fw - 3 * k, BH - 3 * k, BH / 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      rr(ctx, X + BH * 0.35, Y + BH * 0.16, Math.max(0, fw - BH * 0.7), BH * 0.26, BH * 0.13);
      ctx.fill();
      ctx.restore();
    }
    const [tx, ty] = M.text;
    const shown = Math.round(this.decorShown);
    text(ctx, `Зажжено: ${shown}/${MAX_DECOR}`, x0 + (tx - r[0]) * k, y0 + (ty - r[1]) * k, 36 * k, { stroke: null, color: '#5a2208', weight: 900, maxW: 270 * k });
  }

  drawCoins(ctx) {
    const P = this.P;
    drawCounterPill(ctx, P.pill.x, P.pill.y, P.pill.w, P.pill.h);
    drawSprite(ctx, 'coin', P.coin.x, P.coin.y, P.coin.w);
    const tx = P.pill.x + P.coin.w * 0.42 + (P.pill.w - P.coin.w * 0.42) / 2 - P.pill.h * 0.3;
    text(ctx, String(Math.round(this.coinsShown)), tx, P.pill.y + P.pill.h / 2 + 1, P.pill.h * 0.72, { stroke: '#0a1840', sw: P.pill.h * 0.12, maxW: P.pill.w * 0.5 });
  }

  draw(ctx, time) {
    const dt = Math.max(0, Math.min(0.05, time - (this.lastT || time)));
    this.lastT = time;
    this.drawTree(ctx);
    this.drawLights(ctx, time);
    this.drawFlashes(ctx, dt);
    const P = this.P;
    // логотип чуть «дышит»
    const lp = P.logo;
    const bob = Math.sin(time * 1.6) * 3 * lp.k;
    drawSprite(ctx, 'logo', lp.x, lp.y + bob, wOf(R.logo) * lp.k);
    this.drawProgress(ctx);
    this.drawCoins(ctx);
    for (const b of this.buttons) b.draw(ctx, time);
    this.particles.draw(ctx);
  }
}
