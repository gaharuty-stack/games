// Игровая сцена: поле стрелок, подарочные коробки, полка ожидания, бонусы.
import { drawSprite, buildShelf, ART } from './art.js';
import { decodeLevel, remixLevel, DIRS, firstBlocker, rayClear, BOX_SIZE } from './level.js';
import { LEVELS } from './levels-data.js';
import { Particles } from './particles.js';
import { Ease, lerp, clamp } from './tween.js';
import { Button, text, rr, drawRibbon, drawSnowCap } from './ui.js';
import { SAVE, persist } from './save.js';
import { WinPopup, FailPopup, PausePopup, BoosterPopup } from './popups.js';

const ANG = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
const ITEM_OFF = [-31, 0, 31];
const MAX_SLOTS = 7;
const LID_REST = -37;
const BOW_REST = -66;
const BS = 1.16; // общий масштаб коробок
const CAP = 0.42; // высота полосы под снег и гирлянду над полем, в клетках

export function getLevel(n) {
  if (n <= LEVELS.length) return decodeLevel(LEVELS[n - 1], n);
  const span = LEVELS.length - 100;
  const base = 101 + ((n - 101) % span);
  return remixLevel(decodeLevel(LEVELS[base - 1], base), n);
}

const TIPS = {
  1: 'Нажми на стрелку —\nона улетит в подарок!',
  2: 'Стрелка улетает, только если\nпуть свободен. Не врезайся!',
  3: 'Нет подарка нужного цвета?\nСтрелка подождёт на полке.\nНе заполни её целиком!',
  4: 'Застрял? Используй бонусы:\nподсказку, магнит и снежок',
};

export class GameScene {
  constructor(app, n) {
    this.app = app;
    this.n = n;
    this.lv = getLevel(n);
    this.particles = new Particles();
    this.t = 0;
    this.state = 'play';
    this.inputAt = 0.45;
    this.hearts = this.lv.hearts;
    this.heartFx = [0, 0, 0];
    this.shelfCap = this.lv.shelf;
    this.lockedSlot = true;
    this.continues = 0;
    this.boxesDone = 0;
    this.counterBump = 0;
    this.coinsShown = SAVE.data.coins;
    const { w, h } = this.lv;
    this.grid = new Array(w * h).fill(-1);
    this.arrows = this.lv.arrows.map((a, i) => ({
      id: i, x: a.x, y: a.y, dir: a.dir, color: a.color, state: 'board',
      px: 0, py: 0, size: 0, rot: 0, pop: 0, shake: 0, flash: 0, sq: 0, fly: null, dest: null, bump: null,
    }));
    this.arrows.forEach((a) => (this.grid[a.y * w + a.x] = a.id));
    this.shelf = new Array(MAX_SLOTS).fill(null);
    this.qi = 0;
    this.boxes = [];
    this.slots = [{ box: null }, { box: null }];
    this.hint = null;
    this.aim = false;
    this.shakeT = 0;
    this.tipText = TIPS[n] || null;
    this.tipA = 0;
    this.tapsDone = 0;
    this.splash = this.lv.hard ? { t: 0 } : null;
    this.makeButtons();
    this.layout();
    for (let i = 0; i < 2; i++) this.slots[i].box = this.spawnBox(i, null, 0.25 + i * 0.12);
    // появление стрелок волной от центра
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (const a of this.arrows) {
      const d = Math.hypot(a.x - cx, a.y - cy);
      app.tw.to(a, { pop: 1 }, 0.38, Ease.outBack, 0.15 + d * 0.045);
    }
    if (this.tipText) app.tw.to(this, { tipA: 1 }, 0.4, Ease.outQuad, 0.6);
    if (n === 1) this.showHint(1.2);
  }

  // ---------- раскладка ----------
  makeButtons() {
    const app = this.app;
    this.btnPause = new Button({ round: true, w: 84, style: 'blue', icon: 'i_gear', iconW: 50, onClick: () => this.openPause() });
    const mk = (key, icon, style) => new Button({ round: true, w: 108, style, icon, iconW: 78, onClick: () => this.useBooster(key) });
    this.btnHint = mk('hint', 'wand', 'purple');
    this.btnMagnet = mk('magnet', 'magnet', 'blue');
    this.btnSnow = mk('snowball', 'snowball', 'blue');
    this.buttons = [this.btnPause, this.btnHint, this.btnMagnet, this.btnSnow];
    this.boosterBtns = { hint: this.btnHint, magnet: this.btnMagnet, snowball: this.btnSnow };
      }

  layout() {
    const { DW: W, DH: H, landscape } = this.app.view;
    const { w, h } = this.lv;
    const L = {};
    if (!landscape) {
      const col = Math.min(720, W);
      const left = W / 2 - col / 2;
      L.cx = W / 2;
      L.pause = [left + 60, 62];
      L.coins = [left + col - 112, 62];
      L.ribbon = [W / 2 - 18, 58, 236];
      L.heartsY = 142;
      L.heartsX = W / 2 - 128;
      L.counter = [W / 2 + 116, 142];
      L.box = [[W / 2 - 100, 276], [W / 2 + 100, 276]];
      L.preview = [W / 2 + 232, 272];
      L.boosterY = H - 92;
      L.boosters = [[W / 2 - 150, H - 92], [W / 2, H - 92], [W / 2 + 150, H - 92]];
      L.shelfY = H - 238;
      L.shelfCX = W / 2;
      L.shelfMaxW = col - 40;
      // сверху поля — полоса под снежную шапку и гирлянду, чтобы они не закрывали первый ряд
      const top = 396, bottom = H - 340;
      L.cell = Math.min((col - 44) / w, (bottom - top) / (h + CAP), 98);
      L.cap = L.cell * CAP;
      L.bx = W / 2 - (w * L.cell) / 2;
      L.by = top + L.cap + (bottom - top - L.cap - h * L.cell) / 2;
      L.moon = [left + 84, 196];
    } else {
      const px = W - 250;
      L.cx = px;
      L.pause = [58, 56];
      L.coins = [W - 118, 56];
      const boardW = W - 520;
      const bcx = 30 + boardW / 2;
      L.ribbon = [bcx, 54, 290];
      L.heartsY = 136;
      L.heartsX = px - 160;
      L.counter = [px + 120, 136];
      L.box = [[px - 100, 270], [px + 100, 270]];
      // очередь коробок — строкой под коробками: справа от них она упиралась в край экрана
      L.preview = [px, 376];
      L.previewRow = true;
      L.boosters = [[px - 135, H - 90], [px, H - 90], [px + 135, H - 90]];
      L.shelfY = H - 255;
      L.shelfCX = px;
      L.shelfMaxW = 470;
      const top = 146, bottom = H - 24;
      L.cell = Math.min((boardW - 20) / w, (bottom - top) / (h + CAP), 100);
      L.cap = L.cell * CAP;
      L.bx = bcx - (w * L.cell) / 2;
      L.by = top + L.cap + (bottom - top - L.cap - h * L.cell) / 2;
      L.moon = [px - 150, 60];
    }
    L.pad = L.cell * 0.26;
    this.L = L;
    this.btnPause.x = L.pause[0]; this.btnPause.y = L.pause[1];
    [this.btnHint, this.btnMagnet, this.btnSnow].forEach((b, i) => { b.x = L.boosters[i][0]; b.y = L.boosters[i][1]; });
    this.layoutShelf();
    this.buildBoard();
  }

  layoutShelf() {
    const L = this.L;
    const slots = Math.min(MAX_SLOTS, this.shelfCap + (this.lockedSlot ? 1 : 0));
    L.slots = slots;
    L.slotSp = Math.min(92, (L.shelfMaxW - 40) / slots);
    L.shelfW = slots * L.slotSp + 44;
    L.shelfArrow = Math.min(74, L.slotSp * 0.86);
    buildShelf(Math.round(L.shelfW), this.app.artScale);
  }

  onResize() { this.layout(); }
  onArtRebuilt() { this.layoutShelf(); this.buildBoard(); }
  moonPos() { return this.L.moon; }

  slotPos(i) {
    const L = this.L;
    const x = L.shelfCX - ((L.slots - 1) / 2) * L.slotSp + i * L.slotSp;
    return { x, y: L.shelfY - 9 - L.shelfArrow * 0.36, nestY: L.shelfY - 9 };
  }

  cellCenter(x, y) {
    const L = this.L;
    return [L.bx + (x + 0.5) * L.cell, L.by + (y + 0.5) * L.cell];
  }

  buildBoard() {
    const { w, h, mask } = this.lv;
    const L = this.L;
    const sc = this.app.artScale;
    const pad = L.pad;
    const cap = L.cap;
    const bw = w * L.cell + pad * 2, bh = h * L.cell + pad * 2 + cap;
    const c = document.createElement('canvas');
    c.width = Math.ceil(bw * sc);
    c.height = Math.ceil(bh * sc);
    const ctx = c.getContext('2d');
    ctx.scale(sc, sc);
    // подложка почти непрозрачная: сквозь неё не должны просвечивать домики и ёлки фона
    const g = ctx.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, 'rgba(20,48,110,.97)');
    g.addColorStop(1, 'rgba(10,26,66,.98)');
    ctx.fillStyle = g;
    rr(ctx, 2, 2, bw - 4, bh - 4, Math.min(48, L.cell * 0.5));
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,210,255,.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2;
    rr(ctx, 7, 7, bw - 14, bh - 14, Math.min(42, L.cell * 0.45));
    ctx.stroke();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        drawSprite(ctx, 'socket', pad + (x + 0.5) * L.cell, pad + cap + (y + 0.5) * L.cell, L.cell);
      }
    }
    this.boardImg = { canvas: c, x: L.bx - pad, y: L.by - pad - cap, w: bw, h: bh };
  }

  // ---------- логика коробок и полки ----------
  spawnBox(slot, waitFor, delay) {
    if (this.qi >= this.lv.queue.length) return null;
    const p = this.L.box[slot];
    const b = {
      color: this.lv.queue[this.qi++], slot, count: 0, landed: 0, items: [], state: 'wait', waitFor, delay,
      scale: 0, x: p[0], y: p[1], lidY: -170, lidA: 0, bowS: 0, open: false, squash: 0, rot: 0, alpha: 1,
    };
    this.boxes.push(b);
    return b;
  }

  freeSlot() {
    for (let i = 0; i < this.shelfCap; i++) if (!this.shelf[i]) return i;
    return -1;
  }

  shelfCount() {
    let c = 0;
    for (let i = 0; i < this.shelfCap; i++) if (this.shelf[i]) c++;
    return c;
  }

  activeBoxFor(color) {
    for (const s of this.slots) if (s.box && s.box.color === color && s.box.count < BOX_SIZE) return s.box;
    return null;
  }

  assign(a) {
    const box = this.activeBoxFor(a.color);
    if (box) {
      const idx = box.count++;
      box.items.push(a);
      a.dest = { type: 'box', box, idx };
      if (box.count === BOX_SIZE) this.onBoxFilled(box);
      return 'box';
    }
    const si = this.freeSlot();
    if (si < 0) return null;
    this.shelf[si] = a;
    a.dest = { type: 'shelf', i: si };
    return 'shelf';
  }

  onBoxFilled(box) {
    const slot = this.slots[box.slot];
    slot.box = this.spawnBox(box.slot, box, 0.04);
    if (slot.box) this.pullFromShelf(slot.box);
  }

  pullFromShelf(box) {
    for (let i = 0; i < MAX_SLOTS && box.count < BOX_SIZE; i++) {
      const a = this.shelf[i];
      if (a && a.color === box.color) {
        this.shelf[i] = null;
        const idx = box.count++;
        box.items.push(a);
        a.dest = { type: 'box', box, idx };
        if (a.state === 'shelf') {
          a.state = 'flying';
          this.startArc(a, a.px, a.py, { dur: 0.45, delay: 0.05 * idx });
        }
        if (box.count === BOX_SIZE) { this.onBoxFilled(box); break; }
      }
    }
  }

  boxPos(b) {
    if (b.state === 'wait') {
      const p = this.L.box[b.slot];
      return { x: p[0], y: p[1], s: 1 };
    }
    return { x: b.x, y: b.y, s: Math.max(0.01, b.scale) };
  }

  destPos(a) {
    if (a.dest.type === 'box') {
      const p = this.boxPos(a.dest.box);
      const k = p.s * BS;
      return { x: p.x + ITEM_OFF[a.dest.idx] * k, y: p.y - 24 * k, size: 56 * k };
    }
    const s = this.slotPos(a.dest.i);
    return { x: s.x, y: s.y, size: this.L.shelfArrow };
  }

  // ---------- действия игрока ----------
  pointerDown(x, y) {
    for (const b of this.buttons) if (b.hit(x, y)) { b.pressed = true; return; }
    if (this.state !== 'play' || this.t < this.inputAt) return;
    // замок на полке
    if (this.lockedSlot) {
      const p = this.slotPos(this.shelfCap);
      if (Math.hypot(x - p.x, y - p.nestY + 20) < this.L.slotSp * 0.55) { this.unlockSlot(); return; }
    }
    const L = this.L;
    const cx = Math.floor((x - L.bx) / L.cell), cy = Math.floor((y - L.by) / L.cell);
    if (cx < 0 || cy < 0 || cx >= this.lv.w || cy >= this.lv.h) return;
    const id = this.grid[cy * this.lv.w + cx];
    if (id < 0) return;
    this.tapArrow(this.arrows[id]);
  }

  pointerUp(x, y) {
    for (const b of this.buttons) {
      if (b.pressed) {
        b.pressed = false;
        if (b.hit(x, y) && b.onClick) { this.app.sfx('click'); b.onClick(); }
      }
    }
  }

  tapArrow(a) {
    if (a.state !== 'board' || a.bump) return;
    this.hint = null;
    this.tapsDone++;
    if (this.tapsDone >= 3 && this.tipA > 0 && !this.tipFading) {
      this.tipFading = true;
      this.app.tw.to(this, { tipA: 0 }, 0.5, Ease.inQuad, 2.5);
    }
    if (this.aim) { this.useSnowballOn(a); return; }
    const { w, h } = this.lv;
    const bi = firstBlocker(this.grid, w, h, a.x, a.y, a.dir);
    if (bi >= 0) { this.bump(a, this.arrows[this.grid[bi]], bi); return; }
    this.launch(a);
  }

  launch(a) {
    const { w, h } = this.lv;
    const L = this.L;
    this.grid[a.y * w + a.x] = -1;
    a.state = 'flying';
    a.pop = 1;
    const res = this.assign(a);
    const [dx, dy] = DIRS[a.dir];
    let ex = a.px, ey = a.py;
    if (dx > 0) ex = L.bx + w * L.cell + L.cell * 0.65;
    if (dx < 0) ex = L.bx - L.cell * 0.65;
    if (dy > 0) ey = L.by + h * L.cell + L.cell * 0.65;
    if (dy < 0) ey = L.by - L.cell * 0.65;
    const dist = Math.hypot(ex - a.px, ey - a.py);
    a.fly = { phase: 'exit', t: 0, dur: clamp(dist / 2300, 0.07, 0.3), sx: a.px, sy: a.py, ex, ey };
    this.app.sfx('whoosh');
    if (res === 'shelf' && this.shelfCount() >= this.shelfCap) this.lose('shelf');
    this.checkWinLogical();
  }

  startArc(a, sx, sy, o = {}) {
    const tgt = this.destPos(a);
    const cur = ANG[a.dir] + a.rot;
    let delta = -Math.PI / 2 - cur;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    a.fly = {
      phase: 'arc', t: -(o.delay || 0), dur: o.dur || (a.dest.type === 'box' ? 0.5 : 0.42),
      sx, sy, cx: (sx + tgt.x) / 2 + (sx - tgt.x) * 0.12, cy: Math.min(sy, tgt.y) - 130 - Math.abs(sx - tgt.x) * 0.08,
      r0: a.rot, rotTo: a.rot + delta, size0: a.size, magic: !!o.magic,
    };
  }

  land(a) {
    const tgt = this.destPos(a);
    a.fly = null;
    a.px = tgt.x; a.py = tgt.y; a.size = tgt.size;
    a.dir = 0; a.rot = 0; a.sq = 1;
    if (a.dest.type === 'box') {
      const b = a.dest.box;
      a.state = 'inbox';
      b.landed++;
      b.squash = 1;
      this.app.sfx('box', b.landed - 1);
      this.particles.sparkles(tgt.x, tgt.y - 10, 5, 160, 26);
      if (b.landed >= BOX_SIZE && b.count >= BOX_SIZE) this.closeBox(b);
    } else {
      a.state = 'shelf';
      this.app.sfx('shelf');
      this.particles.snowPuff(tgt.x, this.slotPos(a.dest.i).nestY, 6, 120);
    }
  }

  async closeBox(b) {
    if (b.state === 'closing' || b.state === 'leave') return;
    b.state = 'closing';
    b.open = false;
    const tw = this.app.tw;
    this.app.sfx('boxDone');
    b.lidY = LID_REST - 90;
    b.lidA = 0;
    tw.to(b, { lidA: 1 }, 0.08);
    await tw.to(b, { lidY: LID_REST }, 0.2, Ease.outBounce);
    b.squash = 1;
    tw.to(b, { bowS: 1 }, 0.26, Ease.outBack);
    this.particles.sparkles(b.x, b.y - 50, 14, 300, 40);
    await tw.wait(0.12);
    // коробка улетает, а на её место сразу выскакивает следующая
    b.state = 'leave';
    const L = this.L;
    tw.to(b, { rot: -0.35 }, 0.45, Ease.inQuad);
    await tw.to(b, { x: L.counter[0] - 46, y: L.counter[1], scale: 0.22, alpha: 0.6 }, 0.42, Ease.inBack);
    b.state = 'gone';
    this.boxes = this.boxes.filter((q) => q !== b);
    this.boxesDone++;
    this.counterBump = 1;
    this.particles.sparkles(L.counter[0] - 46, L.counter[1], 8, 180, 30);
    this.checkWin();
  }

  bump(a, blocker, bi) {
    const { w } = this.lv;
    const dCells = Math.abs((bi % w) - a.x) + Math.abs(Math.floor(bi / w) - a.y);
    const dist = (dCells - 1) * this.L.cell + this.L.cell * 0.2;
    a.bump = { t: 0, dist, t1: 0.06 + dist / 2600, hit: false, blocker };
    this.app.sfx('whoosh');
  }

  onBumpHit(a) {
    a.bump.hit = true;
    a.flash = 1;
    a.bump.blocker.shake = 1;
    this.shakeT = 0.22;
    this.app.sfx('bump');
    const [dx, dy] = DIRS[a.dir];
    const [bx, by] = this.cellCenter(a.bump.blocker.x, a.bump.blocker.y);
    this.particles.sparkles(bx - dx * this.L.cell * 0.45, by - dy * this.L.cell * 0.45, 6, 200, 26);
    if (this.state !== 'play') return;
    this.hearts--;
    this.heartFx[this.hearts] = 1;
    this.app.sfx('heart');
    if (this.hearts <= 0) this.lose('hearts');
  }

  lose(reason) {
    if (this.state !== 'play') return;
    this.state = 'lost';
    this.hint = null;
    this.aim = false;
    this.app.tw.wait(0.9).then(() => {
      this.app.sfx('fail');
      this.app.addPopup(new FailPopup(this.app, this, reason));
    });
  }

  continueAfter(reason) {
    this.continues++;
    if (reason === 'shelf') {
      if (this.lockedSlot) this.lockedSlot = false;
      this.shelfCap = Math.min(MAX_SLOTS, this.shelfCap + 1);
      this.layoutShelf();
      const p = this.slotPos(this.shelfCap - 1);
      this.particles.sparkles(p.x, p.nestY, 12, 220, 34);
      this.app.sfx('unlock');
    } else {
      this.hearts = this.lv.hearts;
      this.heartFx = [0, 0, 0];
      this.app.sfx('booster');
    }
    this.state = 'play';
  }

  async unlockSlot() {
    if (!this.lockedSlot || this.app.busy) return;
    const ok = await this.app.showRewarded();
    if (!ok || !this.lockedSlot) return;
    this.lockedSlot = false;
    this.shelfCap++;
    this.layoutShelf();
    const p = this.slotPos(this.shelfCap - 1);
    this.particles.sparkles(p.x, p.nestY - 20, 14, 240, 36);
    this.app.sfx('unlock');
  }

  checkWinLogical() {
    if (this.state !== 'play') return;
    const left = this.arrows.some((a) => a.state === 'board') || this.shelfCount() > 0;
    if (!left) this.state = 'winning';
  }

  checkWin() {
    if (this.state !== 'winning' && this.state !== 'play') return;
    const done = this.arrows.every((a) => a.state === 'inbox') && this.boxes.length === 0;
    if (!done) return;
    this.state = 'won';
    const app = this.app;
    const reward = this.lv.hard ? 40 : 20;
    SAVE.data.level = Math.max(SAVE.data.level, this.n + 1);
    persist(true);
    app.tw.wait(0.12).then(() => {
      app.sfx('win');
      const { DW, DH } = app.view;
      this.particles.confetti(DW * 0.25, DH * 0.55, 50);
      this.particles.confetti(DW * 0.75, DH * 0.55, 50);
      return app.tw.wait(0.45);
    }).then(() => app.addPopup(new WinPopup(app, this, reward)));
  }

  // переход дальше после победы
  async next(coins) {
    const app = this.app;
    SAVE.data.coins += coins;
    persist(true);
    await app.maybeInterstitial();
    const nextN = this.n + 1;
    if (this.n % 5 === 0 || this.n === 3) app.toMenu();
    else app.startLevel(nextN);
  }

  restart() {
    this.app.startLevel(this.n);
  }

  openPause() {
    if (this.state !== 'play' && this.state !== 'winning') return;
    this.app.addPopup(new PausePopup(this.app, this));
  }

  // ---------- бонусы ----------
  useBooster(key) {
    if (this.state !== 'play') return;
    if (key === 'snowball' && this.aim) { this.aim = false; return; }
    const have = SAVE.data.boosters[key] || 0;
    if (have <= 0) { this.app.addPopup(new BoosterPopup(this.app, this, key)); return; }
    let used = false;
    if (key === 'hint') used = this.showHint(0);
    else if (key === 'magnet') used = this.useMagnet();
    else if (key === 'snowball') { this.aim = true; this.hint = null; return; }
    if (used) { SAVE.data.boosters[key]--; persist(); }
  }

  freeList() {
    const { w, h } = this.lv;
    return this.arrows.filter((a) => a.state === 'board' && !a.bump && rayClear(this.grid, w, h, a.x, a.y, a.dir) >= 0);
  }

  showHint(delay = 0) {
    const free = this.freeList();
    if (!free.length) return false;
    const boxes = this.slots.map((s) => s.box).filter(Boolean);
    const nextColors = this.lv.queue.slice(this.qi, this.qi + 2);
    const best =
      free.find((a) => boxes.some((b) => b.color === a.color && b.count === BOX_SIZE - 1)) ||
      free.find((a) => boxes.some((b) => b.color === a.color && b.count < BOX_SIZE)) ||
      free.find((a) => nextColors.includes(a.color)) ||
      free[0];
    this.hint = { a: best, t: -delay };
    if (!delay) this.app.sfx('booster');
    return true;
  }

  useMagnet() {
    const boxes = this.slots.map((s) => s.box).filter((b) => b && b.count < BOX_SIZE);
    if (!boxes.length) return false;
    boxes.sort((p, q) => q.count - p.count);
    const box = boxes[0];
    const need = BOX_SIZE - box.count;
    const picks = [];
    for (let i = 0; i < MAX_SLOTS && picks.length < need; i++) if (this.shelf[i] && this.shelf[i].color === box.color && this.shelf[i].state === 'shelf') picks.push(this.shelf[i]);
    const board = this.arrows.filter((a) => a.state === 'board' && a.color === box.color && !a.bump);
    board.sort((p, q) => p.y - q.y);
    for (const a of board) { if (picks.length >= need) break; picks.push(a); }
    if (!picks.length) return false;
    this.app.sfx('booster');
    this.hint = null;
    const { w } = this.lv;
    picks.forEach((a, k) => {
      if (a.state === 'shelf') {
        const i = this.shelf.indexOf(a);
        if (i >= 0) this.shelf[i] = null;
      } else {
        this.grid[a.y * w + a.x] = -1;
        a.pop = 1;
      }
      a.state = 'flying';
      const idx = box.count++;
      box.items.push(a);
      a.dest = { type: 'box', box, idx };
      this.startArc(a, a.px, a.py, { dur: 0.6, delay: k * 0.08, magic: true });
      this.particles.sparkles(a.px, a.py, 6, 150, 28);
    });
    if (box.count === BOX_SIZE) this.onBoxFilled(box);
    this.magnetFx = { box, t: 0 };
    this.checkWinLogical();
    return true;
  }

  useSnowballOn(a) {
    this.aim = false;
    SAVE.data.boosters.snowball--;
    persist();
    const { w } = this.lv;
    this.grid[a.y * w + a.x] = -1;
    a.state = 'flying';
    a.pop = 1;
    this.app.sfx('snow');
    this.particles.snowPuff(a.px, a.py, 18, 260);
    const res = this.assign(a);
    this.startArc(a, a.px, a.py, { dur: 0.55, magic: true });
    if (res === 'shelf' && this.shelfCount() >= this.shelfCap) this.lose('shelf');
    this.checkWinLogical();
  }

  // ---------- обновление ----------
  update(dt) {
    this.t += dt;
    const tw = this.app.tw;
    if (this.splash) { this.splash.t += dt; if (this.splash.t > 1.8) this.splash = null; }
    for (const b of this.boxes) {
      if (b.state === 'wait') {
        const prev = b.waitFor;
        if (!prev || prev.state === 'leave' || prev.state === 'gone') {
          b.delay -= dt;
          if (b.delay <= 0) {
            b.state = 'enter';
            tw.to(b, { scale: 1 }, 0.3, Ease.outBack).then(() => { if (b.state === 'enter') { b.state = 'open'; b.open = true; } });
          }
        }
      }
      // принимаем стрелки, не дожидаясь конца анимации появления
      if (b.state === 'enter' && b.scale > 0.55) b.open = true;
      if (b.state !== 'leave' && b.state !== 'gone') {
        const p = this.L.box[b.slot];
        b.x = p[0]; b.y = p[1];
      }
      b.squash = Math.max(0, b.squash - dt * 4);
    }
    for (const a of this.arrows) this.updateArrow(a, dt);
    for (let i = 0; i < 3; i++) this.heartFx[i] = Math.max(0, this.heartFx[i] - dt * 1.6);
    this.counterBump = Math.max(0, this.counterBump - dt * 3);
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.hint) this.hint.t += dt;
    if (this.magnetFx) { this.magnetFx.t += dt; if (this.magnetFx.t > 1) this.magnetFx = null; }
    this.coinsShown += (SAVE.data.coins - this.coinsShown) * Math.min(1, dt * 6);
    this.btnHint.badge = this.badgeOf('hint');
    this.btnMagnet.badge = this.badgeOf('magnet');
    this.btnSnow.badge = this.badgeOf('snowball');
    this.btnSnow.style = this.aim ? 'gold' : 'blue';
    this.particles.update(dt);
  }

  badgeOf(k) {
    const v = SAVE.data.boosters[k] || 0;
    return v > 0 ? v : '+';
  }

  updateArrow(a, dt) {
    a.sq = Math.max(0, a.sq - dt * 5);
    a.flash = Math.max(0, a.flash - dt * 2.5);
    a.shake = Math.max(0, a.shake - dt * 4);
    if (a.state === 'board') {
      const [x, y] = this.cellCenter(a.x, a.y);
      let ox = 0, oy = 0;
      if (a.bump) {
        const bmp = a.bump;
        bmp.t += dt;
        let off;
        if (bmp.t < bmp.t1) off = bmp.dist * Ease.inQuad(bmp.t / bmp.t1);
        else {
          if (!bmp.hit) this.onBumpHit(a);
          const k = Math.min(1, (bmp.t - bmp.t1) / 0.28);
          off = bmp.dist * (1 - Ease.outBack(k));
          if (k >= 1) a.bump = null;
        }
        const [dx, dy] = DIRS[a.dir];
        ox = dx * off; oy = dy * off;
      }
      if (a.shake > 0) {
        const [dx, dy] = DIRS[a.dir];
        const s = Math.sin(this.t * 55) * a.shake * 5;
        ox += -dy * s + dx * s * 0.3; oy += dx * s + dy * s * 0.3;
      }
      a.px = x + ox; a.py = y + oy;
      a.size = this.L.cell;
      return;
    }
    if (a.state === 'inbox') return;
    if (a.state === 'shelf') {
      const p = this.destPos(a);
      a.px = p.x; a.py = p.y; a.size = p.size;
      return;
    }
    const f = a.fly;
    if (!f) return;
    f.t += dt;
    if (f.phase === 'exit') {
      const k = Ease.inQuad(Math.min(1, f.t / f.dur));
      a.px = lerp(f.sx, f.ex, k);
      a.py = lerp(f.sy, f.ey, k);
      if (Math.random() < 0.8) this.particles.trail(a.px, a.py, a.color);
      if (f.t >= f.dur) this.startArc(a, a.px, a.py);
    } else if (f.phase === 'arc') {
      if (f.t < 0) return;
      const tgt = this.destPos(a);
      const k0 = Math.min(1, f.t / f.dur);
      const k = Ease.inOutQuad(k0);
      const u = 1 - k;
      a.px = u * u * f.sx + 2 * u * k * f.cx + k * k * tgt.x;
      a.py = u * u * f.sy + 2 * u * k * f.cy + k * k * tgt.y;
      a.rot = lerp(f.r0, f.rotTo, Ease.outCubic(Math.min(1, k0 * 1.4)));
      a.size = lerp(f.size0, tgt.size, k);
      if (f.magic || Math.random() < 0.35) this.particles.trail(a.px, a.py, a.color);
      if (k0 >= 1) {
        if (a.dest.type === 'box' && !a.dest.box.open) { f.phase = 'hover'; f.t = 0; }
        else this.land(a);
      }
    } else if (f.phase === 'hover') {
      const tgt = this.destPos(a);
      // стрелки для коробок дальше в очереди висят выше, чтобы не накладываться
      let depth = 0;
      for (let q = a.dest.box.waitFor; q && (q.state === 'wait' || q.state === 'enter' || q.state === 'open'); q = q.waitFor) depth++;
      a.px = tgt.x;
      a.py = tgt.y - 48 - depth * 44 + Math.sin(this.t * 7 + depth) * 4;
      a.size = tgt.size;
      if (a.dest.box.open) { f.phase = 'drop'; f.t = 0; f.sy = a.py; }
    } else if (f.phase === 'drop') {
      const tgt = this.destPos(a);
      const k = Math.min(1, f.t / 0.12);
      a.px = tgt.x;
      a.py = lerp(f.sy, tgt.y, Ease.inQuad(k));
      if (k >= 1) this.land(a);
    }
  }

  // ---------- отрисовка ----------
  drawArrow(ctx, a, x, y, size, alpha = 1) {
    const sq = a.sq;
    const sx = 1 + 0.16 * sq, sy = 1 - 0.16 * sq;
    const s = size * 1.1;
    drawSprite(ctx, `ashadow_${a.dir}`, x, y + size * 0.07, s, { rot: a.rot, alpha: 0.9 * alpha, sx, sy });
    drawSprite(ctx, `arrow_${a.color}_${a.dir}`, x, y, s, { rot: a.rot, alpha, sx, sy });
  }

  draw(ctx, time) {
    const L = this.L;
    ctx.save();
    if (this.shakeT > 0) {
      const m = (this.shakeT / 0.22) * 7;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    // поле
    const bi = this.boardImg;
    ctx.drawImage(bi.canvas, bi.x, bi.y, bi.w, bi.h);
    drawSnowCap(ctx, bi.x + 10, bi.y + 4, bi.w - 20, this.n * 0.37, Math.min(22, L.cell * 0.28));
    this.drawGarland(ctx, bi, time);
    // подсветка подсказки
    if (this.hint && this.hint.t > 0 && this.hint.a.state === 'board') {
      const a = this.hint.a;
      const pulse = 0.5 + 0.5 * Math.sin(this.hint.t * 7);
      const g = ctx.createRadialGradient(a.px, a.py, L.cell * 0.2, a.px, a.py, L.cell * 0.75);
      g.addColorStop(0, `rgba(255,236,120,${0.55 + pulse * 0.35})`);
      g.addColorStop(1, 'rgba(255,236,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.px, a.py, L.cell * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    // стрелки на поле
    for (const a of this.arrows) {
      if (a.state !== 'board') continue;
      if (a.flash > 0) {
        ctx.fillStyle = `rgba(255,60,60,${a.flash * 0.55})`;
        ctx.beginPath();
        ctx.arc(a.px, a.py, L.cell * 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
      const p = Math.max(0, a.pop);
      if (p <= 0) continue;
      this.drawArrow(ctx, a, a.px, a.py, a.size * p, Math.min(1, p * 2));
    }
    if (this.aim) {
      ctx.fillStyle = 'rgba(180,220,255,.12)';
      ctx.fillRect(bi.x, bi.y, bi.w, bi.h);
    }
    // коробки
    this.drawBoxes(ctx, time);
    this.drawPreview(ctx);
    // полка
    drawSprite(ctx, 'shelf', L.shelfCX, L.shelfY, L.shelfW);
    for (let i = 0; i < L.slots; i++) {
      const p = this.slotPos(i);
      drawSprite(ctx, 'nest', p.x, p.nestY, L.slotSp * 0.86);
      if (this.lockedSlot && i === this.shelfCap) {
        const k = 1 + Math.sin(time * 4) * 0.05;
        drawSprite(ctx, 'lock', p.x, p.nestY - 30, L.slotSp * 0.5 * k);
        drawSprite(ctx, 'video', p.x + L.slotSp * 0.26, p.nestY - 52, L.slotSp * 0.42, { rot: 0.15 });
      }
    }
    for (const a of this.arrows) if (a.state === 'shelf') this.drawArrow(ctx, a, a.px, a.py, a.size);
    // летящие стрелки поверх всего
    for (const a of this.arrows) if (a.state === 'flying' && a.fly) {
      if (a.fly.phase === 'arc' && a.fly.t < 0) this.drawArrow(ctx, a, a.px, a.py, a.size);
      else this.drawArrow(ctx, a, a.px, a.py, a.size);
    }
    this.particles.draw(ctx);
    ctx.restore();
    this.drawHUD(ctx, time);
  }

  drawGarland(ctx, bi, time) {
    const x0 = bi.x + 26, x1 = bi.x + bi.w - 26, y = bi.y + 10;
    const swags = Math.max(2, Math.round((x1 - x0) / 200));
    const sw = (x1 - x0) / swags;
    const sag = Math.min(18, this.L.cap * 0.45);
    ctx.strokeStyle = '#173a1f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) {
      ctx.moveTo(x0 + i * sw, y);
      ctx.quadraticCurveTo(x0 + (i + 0.5) * sw, y + sag * 2, x0 + (i + 1) * sw, y);
    }
    ctx.stroke();
    const cols = ['#ff4a5a', '#ffd23a', '#3aa0ff', '#38d06a', '#ff7ad1'];
    let k = 0;
    for (let i = 0; i < swags; i++) {
      for (let j = 1; j < 6; j++) {
        const t = j / 6;
        const bx = x0 + (i + t) * sw;
        const by = y + 2 * t * (1 - t) * sag * 2;
        const on = 0.55 + 0.45 * Math.sin(time * 3 + k * 1.3);
        const c = cols[k % cols.length];
        const g = ctx.createRadialGradient(bx, by + 6, 1, bx, by + 6, 16);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.5 * on;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by + 6, 16, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.65 + 0.35 * on;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(bx, by + 7, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath(); ctx.arc(bx - 1.5, by + 5, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2a3b2a';
        ctx.fillRect(bx - 2.5, by - 1, 5, 4);
        k++;
      }
    }
  }

  drawBoxes(ctx, time) {
    const W = 150;
    for (const b of this.boxes) {
      if (b.state === 'wait' || b.scale <= 0.01) continue;
      const s = b.scale * BS;
      const sq = b.squash;
      const sx = s * (1 + 0.1 * sq), sy = s * (1 - 0.1 * sq);
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(b.x, b.y + 40 * s);
      ctx.rotate(b.rot);
      ctx.scale(sx, sy);
      ctx.translate(0, -40);
      drawSprite(ctx, `boxback_${b.color}`, 0, 0, W);
      for (const a of b.items) {
        if (a.state !== 'inbox') continue;
        const off = ITEM_OFF[a.dest.idx];
        const lift = a.sq * 6;
        this.drawArrow(ctx, a, off, -24 - lift, 56);
      }
      drawSprite(ctx, `boxfront_${b.color}`, 0, 0, W);
      if (b.lidA > 0) drawSprite(ctx, `lid_${b.color}`, 0, b.lidY, W, { alpha: b.lidA });
      if (b.bowS > 0) drawSprite(ctx, b.color === 'gold' ? 'bow_red' : 'bow_gold', 0, BOW_REST, 92 * b.bowS);
      // счётчик заполненности
      if (b.state === 'open' || b.state === 'enter') {
        for (let i = 0; i < BOX_SIZE; i++) {
          const filled = i < b.landed;
          ctx.fillStyle = filled ? '#ffffff' : 'rgba(0,0,0,.28)';
          ctx.beginPath();
          ctx.arc(-18 + i * 18, 52, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (this.magnetFx) {
      const b = this.magnetFx.box;
      const k = this.magnetFx.t;
      drawSprite(ctx, 'magnet', b.x + 70, b.y - 70 - Math.sin(k * 10) * 6, 70, { alpha: Math.min(1, (1 - k) * 3) });
    }
  }

  drawPreview(ctx) {
    const L = this.L;
    const next = this.lv.queue.slice(this.qi, this.qi + 2);
    if (!next.length) return;
    const [x, y] = L.preview;
    ctx.fillStyle = 'rgba(8,22,58,.55)';
    if (L.previewRow) {
      // строка: «далее» и мини-коробки
      const wRow = 104 + next.length * 56;
      const x0 = x - wRow / 2;
      rr(ctx, x0, y - 27, wRow, 54, 27);
      ctx.fill();
      text(ctx, 'далее', x0 + 54, y + 1, 20, { stroke: null, weight: 800, color: '#bfe0ff' });
      next.forEach((c, i) => {
        const bx = x0 + 120 + i * 56;
        drawSprite(ctx, `boxback_${c}`, bx, y + 2, 50, { alpha: 0.95 });
        drawSprite(ctx, `boxfront_${c}`, bx, y + 2, 50, { alpha: 0.95 });
      });
      return;
    }
    rr(ctx, x - 38, y - 56, 76, 30 + next.length * 46, 20);
    ctx.fill();
    text(ctx, 'далее', x, y - 40, 18, { stroke: null, weight: 800, color: '#bfe0ff' });
    next.forEach((c, i) => {
      drawSprite(ctx, `boxback_${c}`, x, y + i * 46, 50, { alpha: 0.95 });
      drawSprite(ctx, `boxfront_${c}`, x, y + i * 46, 50, { alpha: 0.95 });
    });
  }

  drawHUD(ctx, time) {
    const L = this.L;
    // лента уровня
    const [rx, ry, rw] = L.ribbon;
    drawRibbon(ctx, rx, ry, rw, 72, this.lv.hard ? 'purple' : 'red');
    text(ctx, `Уровень ${this.n}`, rx, ry - 3, 38, { stroke: this.lv.hard ? '#2e0a5c' : '#4a0710', maxW: rw - 40 });
    if (this.lv.hard) {
      ctx.fillStyle = '#2e0a5c';
      rr(ctx, rx - 62, ry + 30, 124, 26, 13);
      ctx.fill();
      text(ctx, 'СЛОЖНЫЙ', rx, ry + 43, 17, { stroke: null, color: '#ffd23a' });
    }
    // сердечки
    for (let i = 0; i < this.lv.hearts; i++) {
      const x = L.heartsX + i * 52, y = L.heartsY;
      const fx = this.heartFx[i];
      if (i < this.hearts) drawSprite(ctx, 'heart', x, y, 46 * (1 + Math.sin(time * 3 + i) * 0.03));
      else {
        drawSprite(ctx, 'heart_empty', x, y, 42);
        if (fx > 0) drawSprite(ctx, 'heart', x, y - (1 - fx) * 20, 46 * (1 + (1 - fx) * 0.5), { alpha: fx });
      }
    }
    // счётчик подарков
    const [cx, cy] = L.counter;
    const bump = 1 + this.counterBump * 0.25;
    ctx.fillStyle = 'rgba(8,22,58,.6)';
    rr(ctx, cx - 82, cy - 25, 164, 50, 25);
    ctx.fill();
    drawSprite(ctx, 'gift', cx - 52, cy - 2, 54 * bump);
    text(ctx, `${this.boxesDone}/${this.lv.queue.length}`, cx + 18, cy + 1, 30 * bump, { stroke: '#0d2350' });
    // монеты
    const [mx, my] = L.coins;
    ctx.fillStyle = 'rgba(8,22,58,.6)';
    rr(ctx, mx - 86, my - 28, 176, 56, 28);
    ctx.fill();
    drawSprite(ctx, 'coin', mx - 62, my, 58);
    text(ctx, String(Math.round(this.coinsShown)), mx + 14, my + 1, 32, { stroke: '#0d2350' });
    for (const b of this.buttons) b.draw(ctx, time);
    // подпись бонусов
    if (this.aim) {
      const t = 'Выбери любую стрелку — снежок выбьет её!';
      const y = L.by - L.pad - L.cap - 26;
      ctx.fillStyle = 'rgba(8,22,58,.8)';
      ctx.font = `800 26px Nunito, Arial`;
      const w = Math.min(this.app.view.DW - 30, ctx.measureText(t).width + 50);
      rr(ctx, L.bx + (this.lv.w * L.cell) / 2 - w / 2, y - 24, w, 48, 24);
      ctx.fill();
      text(ctx, t, L.bx + (this.lv.w * L.cell) / 2, y + 1, 26, { stroke: null, weight: 800, maxW: w - 30 });
    }
    // подсказка-обучение
    if (this.tipText && this.tipA > 0) {
      const bw2 = Math.min(this.app.view.DW - 30, 640);
      const x = L.bx + (this.lv.w * L.cell) / 2;
      const y = this.app.view.landscape ? L.by + this.lv.h * L.cell + L.pad + 2 : (L.by + this.lv.h * L.cell + L.pad + L.shelfY - 70) / 2;
      ctx.save();
      ctx.globalAlpha = this.tipA;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      const lines = this.tipText.split('\n');
      const bh = 30 + lines.length * 36;
      rr(ctx, x - bw2 / 2, y - bh / 2, bw2, bh, 26);
      ctx.fill();
      ctx.strokeStyle = '#2f7fe6';
      ctx.lineWidth = 4;
      ctx.stroke();
      lines.forEach((ln, i) => text(ctx, ln, x, y + (i - (lines.length - 1) / 2) * 36 + 1, 29, { stroke: null, color: '#173a78', weight: 900, maxW: bw2 - 40 }));
      ctx.restore();
    }
    // рука-указатель
    if (this.hint && this.hint.t > 0 && this.hint.a.state === 'board') {
      const a = this.hint.a;
      const k = Math.sin(this.hint.t * 6) * 10;
      drawSprite(ctx, 'hand', a.px + 30 + k * 0.4, a.py + 70 + k, 86, { rot: -0.35 });
    }
    // заставка «сложный уровень»
    if (this.splash) {
      const t = this.splash.t;
      const inK = Ease.outBack(Math.min(1, t / 0.35));
      const outK = t > 1.4 ? 1 - (t - 1.4) / 0.4 : 1;
      const { DW, DH } = this.app.view;
      ctx.save();
      ctx.globalAlpha = Math.max(0, outK);
      ctx.fillStyle = 'rgba(20,6,50,.45)';
      ctx.fillRect(0, DH / 2 - 110, DW, 220);
      ctx.translate(DW / 2, DH / 2);
      ctx.scale(inK, inK);
      drawRibbon(ctx, 0, 0, 470, 100, 'purple');
      text(ctx, 'СЛОЖНЫЙ УРОВЕНЬ', 0, -4, 46, { stroke: '#2e0a5c', maxW: 420 });
      ctx.restore();
    }
  }
}
