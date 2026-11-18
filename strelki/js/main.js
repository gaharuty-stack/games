// Точка входа: цикл, масштабирование, ввод, сцены, всплывающие окна.
import { buildArt, loadRaster } from './art.js';
import { Background } from './bg.js';
import { Tweens, Ease } from './tween.js';
import { AUDIO } from './audio.js';
import { VK } from './vk.js';
import { SAVE, loadSave, persist } from './save.js';
import { MenuScene } from './menu.js';
import { GameScene } from './game.js';
import { text, rr } from './ui.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.tw = new Tweens();
    this.bg = new Background();
    this.popups = [];
    this.toasts = [];
    this.scene = null;
    this.time = 0;
    this.view = {};
    this.fade = 0;
    this.artScale = 0;
    this.adOverlay = null;
    this.busy = false;
  }

  async start() {
    this.computeView();
    await VK.init();
    await loadSave();
    AUDIO.setSound(SAVE.data.sound);
    AUDIO.musicOn = SAVE.data.music;
    VK.onPause = () => AUDIO.pause();
    VK.onResume = () => AUDIO.resume();
    VK.mockAd = (type) => this.mockAd(type);
    document.addEventListener('visibilitychange', () => (document.hidden ? AUDIO.pause() : AUDIO.resume()));
    try {
      await Promise.all([document.fonts.load('900 40px Nunito'), document.fonts.load('800 40px Nunito')]);
    } catch (e) { /* системный шрифт */ }
    const bar = document.getElementById('bootbar');
    const prog = [0, 0];
    const show = () => { if (bar) bar.style.width = Math.round((prog[0] * 0.85 + prog[1] * 0.15) * 100) + '%'; };
    await Promise.all([
      loadRaster((p) => { prog[0] = p; show(); }),
      buildArt(this.targetArtScale(), (p) => { prog[1] = p; show(); }),
    ]);
    this.artScale = this.targetArtScale();
    this.bg.build(this.view.vw, this.view.vh, this.view.dpr);
    const boot = document.getElementById('boot');
    if (boot) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 400); }
    this.bindInput();
    window.addEventListener('resize', () => this.onResize());
    const q = new URLSearchParams(location.search);
    if (q.get('level')) {
      SAVE.data.level = Math.max(SAVE.data.level, 1);
      this.setScene(new GameScene(this, +q.get('level')));
    } else this.setScene(new MenuScene(this));
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.__app = this;
    window.__ready = true;
  }

  computeView() {
    const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';
    const landscape = vw / vh > 1.12;
    const s = landscape ? Math.min(vh / 760, vw / 1180) : Math.min(vw / 720, vh / 1180);
    this.view = { vw, vh, dpr, s, DW: vw / s, DH: vh / s, landscape };
  }

  targetArtScale() {
    return Math.max(0.5, Math.min(3, this.view.s * this.view.dpr));
  }

  onResize() {
    clearTimeout(this.resizeTimer);
    this.computeView();
    this.bg.build(this.view.vw, this.view.vh, this.view.dpr);
    if (this.scene && this.scene.onResize) this.scene.onResize();
    this.resizeTimer = setTimeout(async () => {
      const t = this.targetArtScale();
      if (Math.abs(t - this.artScale) / this.artScale > 0.15) {
        await buildArt(t);
        this.artScale = t;
        if (this.scene && this.scene.onArtRebuilt) this.scene.onArtRebuilt();
      }
    }, 250);
  }

  // фон сцены: map — { k, ox, oy } в дизайн-единицах (k — единиц на пиксель референса)
  setBg(key, map) {
    const s = this.view.s;
    this.bg.set({ key, mode: 'stage', ox: map.ox * s, oy: map.oy * s, k: map.k * s, extend: !!map.extend });
  }

  setScene(scene) {
    if (this.scene && this.scene.destroy) this.scene.destroy();
    this.scene = scene;
    if (scene.enter) scene.enter();
  }

  // плавный переход между сценами
  async goto(factory) {
    if (this.transitioning) return;
    this.transitioning = true;
    await this.tw.to(this, { fade: 1 }, 0.22, Ease.inQuad);
    this.popups = [];
    this.setScene(factory());
    await this.tw.to(this, { fade: 0 }, 0.28, Ease.outQuad);
    this.transitioning = false;
  }

  startLevel(n) {
    this.goto(() => new GameScene(this, n));
  }

  toMenu() {
    this.goto(() => new MenuScene(this));
  }

  addPopup(p) {
    this.popups.push(p);
    p.open();
    return p;
  }

  removePopup(p) {
    this.popups = this.popups.filter((x) => x !== p);
  }

  sfx(name, arg) {
    AUDIO.play(name, arg);
  }

  toast(msg, dur = 2.2) {
    this.toasts.push({ msg, t: 0, dur });
  }

  // --- реклама ---
  async showRewarded() {
    if (this.busy) return false;
    this.busy = true;
    AUDIO.pause();
    const ok = await VK.showRewarded();
    AUDIO.resume();
    this.busy = false;
    if (!ok) this.toast('Реклама сейчас недоступна. Попробуйте позже');
    return ok;
  }

  async maybeInterstitial() {
    const now = Date.now();
    // первая реклама — после 5-го уровня, дальше не чаще раза в 90 секунд
    if (SAVE.data.level < 6 || now - (SAVE.data.lastAd || 0) < 90000) return;
    SAVE.data.lastAd = now;
    persist();
    this.busy = true;
    AUDIO.pause();
    await VK.showInterstitial();
    AUDIO.resume();
    this.busy = false;
  }

  // имитация рекламы вне ВК (для теста)
  mockAd(type) {
    return new Promise((resolve) => {
      this.adOverlay = { type, t: 0, dur: type === 'reward' ? 1.6 : 1.0, resolve };
    });
  }

  // --- ввод ---
  bindInput() {
    const toDesign = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / this.view.s, (e.clientY - r.top) / this.view.s];
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AUDIO.unlock();
      if (this.transitioning || this.adOverlay || this.busy) return;
      const [x, y] = toDesign(e);
      const top = this.popups[this.popups.length - 1];
      if (top) top.pointerDown(x, y);
      else if (this.scene && this.scene.pointerDown) this.scene.pointerDown(x, y);
    });
    window.addEventListener('pointerup', (e) => {
      if (this.transitioning || this.adOverlay) return;
      const [x, y] = toDesign(e);
      const top = this.popups[this.popups.length - 1];
      if (top) top.pointerUp(x, y);
      else if (this.scene && this.scene.pointerUp) this.scene.pointerUp(x, y);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const [x, y] = toDesign(e);
      if (this.scene && this.scene.pointerMove && !this.popups.length) this.scene.pointerMove(x, y);
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.time += dt;
    this.update(dt);
    this.draw(dt);
    requestAnimationFrame((tt) => this.loop(tt));
  }

  update(dt) {
    this.tw.update(dt);
    if (this.scene) this.scene.update(dt);
    for (const p of this.popups) p.update(dt);
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
    if (this.adOverlay) {
      this.adOverlay.t += dt;
      if (this.adOverlay.t >= this.adOverlay.dur) {
        const r = this.adOverlay.resolve;
        this.adOverlay = null;
        r(true);
      }
    }
  }

  draw(dt) {
    const { ctx } = this;
    const { dpr, s, DW, DH } = this.view;
    this.bg.draw(ctx);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    if (this.scene) this.scene.draw(ctx, this.time);
    this.bg.drawSnow(ctx, dpr, dt);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    if (this.scene && this.scene.drawOver) this.scene.drawOver(ctx, this.time);
    for (const p of this.popups) p.draw(ctx, this.time);
    // тосты
    let ty = 150;
    for (const t of this.toasts) {
      const a = Math.min(1, t.t * 6, (t.dur - t.t) * 4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 30px Nunito, Arial`;
      const w = Math.min(DW - 40, ctx.measureText(t.msg).width + 60);
      ctx.fillStyle = 'rgba(70,30,8,.9)';
      rr(ctx, DW / 2 - w / 2, ty - 30, w, 60, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,160,.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
      text(ctx, t.msg, DW / 2, ty + 1, 28, { stroke: null, weight: 800, maxW: w - 40 });
      ctx.restore();
      ty += 72;
    }
    if (this.adOverlay) {
      const a = this.adOverlay;
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      ctx.fillRect(0, 0, DW, DH);
      text(ctx, a.type === 'reward' ? 'Реклама с наградой (тест)' : 'Реклама (тест)', DW / 2, DH / 2 - 20, 40);
      text(ctx, 'В игре здесь будет настоящая реклама', DW / 2, DH / 2 + 34, 24, { stroke: null, weight: 800 });
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(DW / 2 - 150, DH / 2 + 80, 300 * Math.min(1, a.t / a.dur), 10);
    }
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(6,13,48,${this.fade})`;
      ctx.fillRect(0, 0, DW, DH);
    }
  }
}

const app = new App();
app.start().catch((e) => {
  console.error(e);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'Ошибка загрузки: ' + e.message;
});
