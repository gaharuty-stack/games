// Игровая сцена: поле стрелок, подарочные коробки, полка ожидания, бонусы.
// Оформление — как на референсе «новое оформление игры»: деревянная рамка с гирляндой,
// табличка «Уровень N», подарки в деревянных ячейках, табличка «далее», доска с бонусами.
import { drawSprite, drawAt, drawNine, drawThree, meta } from './art.js';
import { decodeLevel, remixLevel, DIRS, firstBlocker, rayClear, BOX_SIZE } from './level.js';
import { LEVELS } from './levels-data.js';
import { Particles } from './particles.js';
import { Ease, lerp, clamp } from './tween.js';
import { Button, text, rr, drawSign, drawSnowCap, drawCounterPill } from './ui.js';
import { SAVE, persist } from './save.js';
import { stageOf, coverMap } from './bg.js';
import { WinPopup, FailPopup, PausePopup, BoosterPopup } from './popups.js';

const ANG = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
const ITEM_OFF = [-54, 0, 54]; // смещения стрелок в коробке (пиксели референса)
const MAX_SLOTS = 7;

// ---- геометрия элементов на референсе (пиксели картинки 1672×941) ----
const FRAME = [205, 82, 1080, 928];
const INTERIOR = [289, 192, 990, 866];
const SIGN_TEXT = [576, 76];
const SETTINGS = [128, 10, 254, 134];
const COIN_PILL = [1340, 36, 1566, 110];
const COIN = [1363, 73, 91];
const HEARTS = [[1142, 175], [1200, 175], [1258, 175]];
const HEART_W = 61;
const GIFT_PILL = [1340, 130, 1566, 202];
const GIFT = [1368, 166, 84];
const SHELF = [1078, 248, 1552, 526];
const BOX_RECT = [[1108, 262, 1297, 442], [1331, 262, 1521, 442]]; // спрайт коробки 189×180
const BOX_W = 189, BOX_H = 180, BOX_BODY_TOP = 48; // верх «тела» коробки в спрайте
const SLOTS = [[1348, 489], [1417, 489]];
const BOOST = [1074, 712, 1598, 914];
const BOOST_BTN = [[1158, 806, 67], [1339, 804, 67], [1503, 803, 64]];
const WAIT = { cx: 1336, top: 664, pitch: 66, arrow: 64 }; // полка ожидания (её нет на референсе — между «далее» и бонусами)

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
    this.bulbs = (meta('frame').bulbs || []).map((b, i) => ({ x: b[0], y: b[1], r: b[2], c: b[3], ph: (i * 1.7) % 6.28 }));
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
    this.btnPause = new Button({ sprite: 'btn_set_blue', onClick: () => this.openPause() });
    const mk = (key, sprite) => new Button({ sprite, onClick: () => this.useBooster(key) });
    this.btnHint = mk('hint', 'btn_wand');
    this.btnMagnet = mk('magnet', 'btn_magnet');
    this.btnSnow = mk('snowball', 'btn_snowball');
    this.buttons = [this.btnPause, this.btnHint, this.btnMagnet, this.btnSnow];
    this.boosterBtns = { hint: this.btnHint, magnet: this.btnMagnet, snowball: this.btnSnow };
  }

  layout() {
    const view = this.app.view;
    const { DW: W, DH: H, landscape } = view;
    const { w, h } = this.lv;
    const L = { landscape };
    if (landscape) {
      // всё — на своих местах, как на референсе
      const st = stageOf(view);
      const k = st.k;
      const X = (x) => st.ox + x * k, Y = (y) => st.oy + y * k;
      L.k = k;
      L.frame = { x: X(FRAME[0]), y: Y(FRAME[1]), w: (FRAME[2] - FRAME[0]) * k, h: (FRAME[3] - FRAME[1]) * k, bs: k };
      L.sign = { x: X(SIGN_TEXT[0]), y: Y(SIGN_TEXT[1]), k };
      L.pause = { x: X((SETTINGS[0] + SETTINGS[2]) / 2), y: Y((SETTINGS[1] + SETTINGS[3]) / 2), k };
      L.coinPill = { x: X(COIN_PILL[0]), y: Y(COIN_PILL[1]), w: (COIN_PILL[2] - COIN_PILL[0]) * k, h: (COIN_PILL[3] - COIN_PILL[1]) * k };
      L.coin = { x: X(COIN[0]), y: Y(COIN[1]), w: COIN[2] * k };
      L.hearts = HEARTS.map(([x, y]) => [X(x), Y(y)]);
      L.heartW = HEART_W * k;
      L.giftPill = { x: X(GIFT_PILL[0]), y: Y(GIFT_PILL[1]), w: (GIFT_PILL[2] - GIFT_PILL[0]) * k, h: (GIFT_PILL[3] - GIFT_PILL[1]) * k };
      L.gift = { x: X(GIFT[0]), y: Y(GIFT[1]), w: GIFT[2] * k };
      L.shelfBox = { x: X(SHELF[0]), y: Y(SHELF[1]), k };
      L.bk = k;
      L.box = BOX_RECT.map((r) => [X((r[0] + r[2]) / 2), Y((r[1] + r[3]) / 2)]);
      L.slotsPrev = SLOTS.map(([x, y]) => [X(x), Y(y)]);
      L.boost = { x: X(BOOST[0]), y: Y(BOOST[1]), k };
      L.boostBtns = BOOST_BTN.map(([x, y, r]) => [X(x), Y(y), r * k]);
      L.wait = { cx: X(WAIT.cx), top: Y(WAIT.top), pitch: WAIT.pitch * k, arrow: WAIT.arrow * k, maxW: 470 * k };
      this.app.setBg('game', st);
    } else {
      // портрет: сверху HUD, ниже подарки, поле, полка ожидания и бонусы
      const col = Math.min(720, W);
      const left = W / 2 - col / 2, right = left + col;
      const topY = 62;
      L.k = 0.8;
      L.pause = { x: left + 58, y: topY, k: 98 / (SETTINGS[2] - SETTINGS[0]) };
      L.coinPill = { x: right - 14 - 172, y: topY - 27, w: 172, h: 54 };
      L.coin = { x: L.coinPill.x + 22, y: topY, w: 66 };
      const sk = Math.min(0.6, (col - 300) / 698);
      L.sign = { x: left + 112 + (col - 112 - 190) / 2, y: topY + 2, k: sk };
      const hy = 148;
      L.heartW = 52;
      L.hearts = [0, 1, 2].map((i) => [left + 52 + i * 56, hy]);
      L.giftPill = { x: right - 14 - 172, y: hy - 26, w: 172, h: 52 };
      L.gift = { x: L.giftPill.x + 24, y: hy - 1, w: 64 };
      // подарки в ячейках
      const bk = clamp(0.7 + ((H - 1180) / 380) * 0.2, 0.7, 0.9) * Math.min(1, col / 600);
      const shelfW = (SHELF[2] - SHELF[0]) * bk;
      const shelfY = 178;
      L.shelfBox = { x: W / 2 - shelfW / 2, y: shelfY, k: bk };
      L.bk = bk;
      const SX = (x) => L.shelfBox.x + (x - SHELF[0]) * bk, SY = (y) => shelfY + (y - SHELF[1]) * bk;
      L.box = BOX_RECT.map((r) => [SX((r[0] + r[2]) / 2), SY((r[1] + r[3]) / 2)]);
      L.slotsPrev = SLOTS.map(([x, y]) => [SX(x), SY(y)]);
      // бонусы внизу
      const bbk = Math.min(0.84, (col - 24) / (BOOST[2] - BOOST[0]));
      const bH = (BOOST[3] - BOOST[1]) * bbk;
      const bx0 = W / 2 - ((BOOST[2] - BOOST[0]) * bbk) / 2, by0 = H - bH - 2;
      L.boost = { x: bx0, y: by0, k: bbk };
      L.boostBtns = BOOST_BTN.map(([x, y, r]) => [bx0 + (x - BOOST[0]) * bbk, by0 + (y - BOOST[1]) * bbk, r * bbk]);
      // полка ожидания — над доской с бонусами (выше снежных шапок кнопок)
      const wk = 0.86;
      L.wait = { cx: W / 2, top: by0 - 30, pitch: 66 * wk, arrow: 64 * wk, maxW: col - 40 };
      // поле: рамка занимает всё место между подарками и полкой, поле — по центру рамки
      const fTop = shelfY + (SHELF[3] - SHELF[1]) * bk + 2;
      const fBot = L.wait.top - L.wait.arrow - 6;
      const fw = Math.min(col - 6, 760);
      L.frame = { x: W / 2 - fw / 2, y: fTop, w: fw, h: fBot - fTop, bs: 0.6 };
      this.app.setBg('game', coverMap(view, 1330, 470));
    }
    // внутренность рамки (поле)
    const F = L.frame, bs = F.bs;
    const ix = F.x + (INTERIOR[0] - FRAME[0]) * bs;
    const iy = F.y + (INTERIOR[1] - FRAME[1]) * bs;
    const iw = F.w - (INTERIOR[0] - FRAME[0] + FRAME[2] - INTERIOR[2]) * bs;
    const ih = F.h - (INTERIOR[1] - FRAME[1] + FRAME[3] - INTERIOR[3]) * bs;
    L.inner = { x: ix, y: iy, w: iw, h: ih };
    // обучение: место под подсказку внизу поля
    const tipLines = this.tipText ? this.tipText.split('\n').length : 0;
    L.tipH = tipLines ? (tipLines * 34 + 34) : 0;
    const pad = 8;
    const availH = ih - pad * 2 - (L.tipH ? L.tipH + 8 : 0);
    L.cell = Math.min((iw - pad * 2) / w, availH / h, landscape ? 112 * L.k : 104);
    L.bx = ix + iw / 2 - (w * L.cell) / 2;
    L.by = iy + pad + (availH - h * L.cell) / 2;
    L.pad = L.cell * 0.2;
    this.L = L;
    // кнопки
    const p = L.pause;
    this.btnPause.x = p.x; this.btnPause.y = p.y;
    this.btnPause.spriteW = (SETTINGS[2] - SETTINGS[0]) * p.k;
    this.btnPause.hitR = 56 * p.k;
    [this.btnHint, this.btnMagnet, this.btnSnow].forEach((b, i) => {
      const [x, y, r] = L.boostBtns[i];
      const kk = r / BOOST_BTN[i][2];
      b.x = x; b.y = y;
      b.spriteW = (BOOST_BTN[i][2] * 2 + 20) * kk;
      b.spriteDY = -7 * kk;
      b.hitR = r + 4;
      b.badgeAt = [56 * kk, -56 * kk];
      b.badgeR = 24 * kk;
    });
    this.layoutShelf();
  }

  layoutShelf() {
    const L = this.L;
    const slots = Math.min(MAX_SLOTS, this.shelfCap + (this.lockedSlot ? 1 : 0));
    L.slots = slots;
    const W8 = L.wait;
    L.slotSp = Math.min(W8.pitch, (W8.maxW - 30) / slots);
    L.shelfW = slots * L.slotSp + 34 * (W8.pitch / 66);
    L.shelfArrow = Math.min(W8.arrow, L.slotSp * 0.96);
  }

  onResize() { this.layout(); }
  onArtRebuilt() {}

  slotPos(i) {
    const L = this.L;
    const x = L.wait.cx - ((L.slots - 1) / 2) * L.slotSp + i * L.slotSp;
    return { x, y: L.wait.top - L.shelfArrow * 0.42, nestY: L.wait.top };
  }

  cellCenter(x, y) {
    const L = this.L;
    return [L.bx + (x + 0.5) * L.cell, L.by + (y + 0.5) * L.cell];
  }

  // ---------- логика коробок и полки ----------
  spawnBox(slot, waitFor, delay) {
    if (this.qi >= this.lv.queue.length) return null;
    const p = this.L.box[slot];
    const b = {
      color: this.lv.queue[this.qi++], slot, count: 0, landed: 0, items: [], state: 'wait', waitFor, delay,
      scale: 0, x: p[0], y: p[1], bowS: 0, open: false, squash: 0, rot: 0, alpha: 1,
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
      const k = p.s * this.L.bk;
      return { x: p.x + ITEM_OFF[a.dest.idx] * k, y: p.y + (BOX_BODY_TOP - BOX_H / 2 - 10) * k, size: 70 * k };
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
      if (Math.hypot(x - p.x, y - (p.nestY - this.L.slotSp * 0.4)) < this.L.slotSp * 0.62) { this.unlockSlot(); return; }
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
    // бант «завязывается» сверху
    b.squash = 1;
    await tw.to(b, { bowS: 1 }, 0.3, Ease.outBack);
    const k = this.L.bk;
    this.particles.sparkles(b.x, b.y - 60 * k, 14, 300, 40);
    await tw.wait(0.14);
    // коробка улетает к счётчику, а на её место сразу выскакивает следующая
    b.state = 'leave';
    const L = this.L;
    tw.to(b, { rot: -0.35 }, 0.45, Ease.inQuad);
    await tw.to(b, { x: L.gift.x, y: L.gift.y, scale: 0.28, alpha: 0.6 }, 0.42, Ease.inBack);
    b.state = 'gone';
    this.boxes = this.boxes.filter((q) => q !== b);
    this.boxesDone++;
    SAVE.data.stats.boxes = (SAVE.data.stats.boxes || 0) + 1;
    this.counterBump = 1;
    this.particles.sparkles(L.gift.x, L.gift.y, 8, 180, 30);
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
      if (this.app.scene !== this) return;
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
    const firstTime = this.n >= SAVE.data.level;
    SAVE.data.level = Math.max(SAVE.data.level, this.n + 1);
    const S = SAVE.data.stats;
    S.wins = (S.wins || 0) + 1;
    if (firstTime && this.lv.hard) S.hard = (S.hard || 0) + 1;
    if (this.hearts >= this.lv.hearts && this.continues === 0) S.perfect = (S.perfect || 0) + 1;
    persist(true);
    app.tw.wait(0.12).then(() => {
      app.sfx('win');
      const { DW, DH } = app.view;
      this.particles.confetti(DW * 0.25, DH * 0.55, 50);
      this.particles.confetti(DW * 0.75, DH * 0.55, 50);
      return app.tw.wait(0.45);
    }).then(() => { if (app.scene === this) app.addPopup(new WinPopup(app, this, reward)); });
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
    if (used) {
      SAVE.data.boosters[key]--;
      SAVE.data.stats.boosters = (SAVE.data.stats.boosters || 0) + 1;
      persist();
    }
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
    SAVE.data.stats.boosters = (SAVE.data.stats.boosters || 0) + 1;
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
    this.btnSnow.glow = this.aim ? 0.6 + 0.4 * Math.sin(this.t * 8) : 0;
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
      const kk = this.L.bk / 0.8;
      a.px = tgt.x;
      a.py = tgt.y - (48 + depth * 44) * kk + Math.sin(this.t * 7 + depth) * 4;
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
    const s = size * 1.04;
    drawSprite(ctx, `ashadow_${a.dir}`, x + size * 0.02, y + size * 0.06, s, { rot: a.rot, alpha: 0.85 * alpha, sx, sy });
    drawSprite(ctx, `arrow_${a.color}_${a.dir}`, x, y, s, { rot: a.rot, alpha, sx, sy });
  }

  drawFrame(ctx, time) {
    const F = this.L.frame;
    drawNine(ctx, 'frame', F.x, F.y, F.w, F.h, F.bs);
    // огоньки гирлянды мерцают
    if (!this.bulbs.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bulbs) {
      const a = 0.5 + 0.5 * Math.sin(time * 2.6 + b.ph);
      if (a < 0.12) continue;
      const [x, y] = this.frameMap(b.x, b.y);
      const r = (b.r * 2.4 + 8) * F.bs;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${b.c},${0.5 * a})`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // точка спрайта рамки (пиксели референса) -> экран, с учётом 9-slice
  frameMap(px, py) {
    const F = this.L.frame;
    const [l, t, r, b] = meta('frame').slice;
    const SW = FRAME[2] - FRAME[0], SH = FRAME[3] - FRAME[1];
    const k = F.bs;
    const mapAxis = (p, a0, a1, S, D) => {
      if (p < a0) return p * k;
      if (p > S - a1) return D - (S - p) * k;
      const mid = D - (a0 + a1) * k;
      return a0 * k + ((p - a0) / (S - a0 - a1)) * mid;
    };
    return [F.x + mapAxis(px, l, r, SW, F.w), F.y + mapAxis(py, t, b, SH, F.h)];
  }

  draw(ctx, time) {
    const L = this.L;
    ctx.save();
    if (this.shakeT > 0) {
      const m = (this.shakeT / 0.22) * 7;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    // поле в рамке с гирляндой
    this.drawFrame(ctx, time);
    const { w, h, mask } = this.lv;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        drawSprite(ctx, 'cell', L.bx + (x + 0.5) * L.cell, L.by + (y + 0.5) * L.cell, L.cell * 0.98);
      }
    }
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
      ctx.fillRect(L.inner.x, L.inner.y, L.inner.w, L.inner.h);
    }
    // подарки в ячейках и «далее»
    const sb = L.shelfBox;
    drawAt(ctx, 'boxshelf', sb.x, sb.y, sb.k);
    this.drawBoxes(ctx, time);
    this.drawPreview(ctx);
    // полка ожидания
    this.drawWaitShelf(ctx, time);
    for (const a of this.arrows) if (a.state === 'shelf') this.drawArrow(ctx, a, a.px, a.py, a.size);
    // доска с бонусами
    const bb = L.boost;
    drawAt(ctx, 'boostboard', bb.x, bb.y, bb.k);
    // летящие стрелки поверх всего
    for (const a of this.arrows) if (a.state === 'flying' && a.fly) this.drawArrow(ctx, a, a.px, a.py, a.size);
    this.particles.draw(ctx);
    ctx.restore();
    this.drawHUD(ctx, time);
  }

  drawWaitShelf(ctx, time) {
    const L = this.L;
    const kk = L.wait.pitch / 66;
    const ph = 34 * kk * 1.2;
    const x0 = L.wait.cx - L.shelfW / 2;
    // тень, доска, снег
    ctx.fillStyle = 'rgba(10,5,20,.28)';
    rr(ctx, x0 + 6, L.wait.top + ph * 0.55, L.shelfW - 12, ph * 0.7, ph * 0.35);
    ctx.fill();
    drawThree(ctx, 'plank', x0, L.wait.top - 2, L.shelfW, ph);
    drawSnowCap(ctx, x0 + 6, L.wait.top + 1, L.shelfW - 12, 2.3, 9 * kk);
    for (let i = 0; i < L.slots; i++) {
      const p = this.slotPos(i);
      drawSprite(ctx, 'nest', p.x, p.nestY + 2 * kk, L.slotSp * 0.8, { alpha: 0.85 });
      if (this.lockedSlot && i === this.shelfCap) {
        const k = 1 + Math.sin(time * 4) * 0.05;
        drawSprite(ctx, 'lock', p.x, p.nestY - L.slotSp * 0.42, L.slotSp * 0.52 * k);
        drawSprite(ctx, 'video', p.x + L.slotSp * 0.28, p.nestY - L.slotSp * 0.72, L.slotSp * 0.44, { rot: 0.15 });
      }
    }
  }

  drawBoxes(ctx) {
    const L = this.L;
    for (const b of this.boxes) {
      if (b.state === 'wait' || b.scale <= 0.01) continue;
      const k = L.bk;
      const s = b.scale;
      const sq = b.squash;
      const sx = s * (1 + 0.08 * sq), sy = s * (1 - 0.08 * sq);
      ctx.save();
      ctx.globalAlpha = b.alpha;
      // опора — низ коробки
      ctx.translate(b.x, b.y + (BOX_H / 2) * k * s);
      ctx.rotate(b.rot);
      ctx.scale(sx, sy);
      ctx.translate(0, -(BOX_H / 2) * k);
      // стрелки внутри — выглядывают из-за передней стенки
      for (const a of b.items) {
        if (a.state !== 'inbox') continue;
        const lift = a.sq * 6;
        this.drawArrow(ctx, a, ITEM_OFF[a.dest.idx] * k, (BOX_BODY_TOP - BOX_H / 2 - 10) * k - lift, 70 * k);
      }
      drawSprite(ctx, `box_${b.color}`, 0, 0, BOX_W * k);
      if (b.bowS > 0) {
        const bow = b.color === 'gold' || b.color === 'orange' ? 'bow_red' : 'bow_gold';
        const by = (30 - BOX_H / 2) * k; // центр банта
        ctx.save();
        ctx.translate(0, by);
        ctx.scale(b.bowS, b.bowS);
        drawSprite(ctx, bow, 0, -by, BOX_W * k);
        ctx.restore();
      }
      // счётчик заполненности
      if (b.state === 'open' || b.state === 'enter') {
        for (let i = 0; i < BOX_SIZE; i++) {
          const filled = i < b.landed;
          const dx = (i - 1) * 20 * k, dy = 68 * k;
          ctx.fillStyle = 'rgba(40,10,0,.45)';
          ctx.beginPath(); ctx.arc(dx, dy + 1.5 * k, 7.5 * k, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = filled ? '#ffffff' : 'rgba(255,255,255,.35)';
          ctx.beginPath(); ctx.arc(dx, dy, 6.5 * k, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
    if (this.magnetFx) {
      const b = this.magnetFx.box;
      const t = this.magnetFx.t;
      const k = L.bk;
      drawSprite(ctx, 'btn_magnet', b.x + 80 * k, b.y - 80 * k - Math.sin(t * 10) * 6, 86 * k, { alpha: Math.min(1, (1 - t) * 3) });
    }
  }

  drawPreview(ctx) {
    const L = this.L;
    const next = this.lv.queue.slice(this.qi, this.qi + 2);
    const k = L.bk;
    next.forEach((c, i) => {
      const [x, y] = L.slotsPrev[i];
      const w = 54 * k;
      const bow = c === 'gold' || c === 'orange' ? 'bow_red' : 'bow_gold';
      drawSprite(ctx, `box_${c}`, x, y + 3 * k, w);
      drawSprite(ctx, bow, x, y + 3 * k, w);
    });
  }

  drawHUD(ctx, time) {
    const L = this.L;
    // табличка уровня
    const S = L.sign;
    drawSign(ctx, S.x, S.y, S.k, `Уровень ${this.n}`, { size: 58 });
    if (this.lv.hard) {
      const pw = 190 * S.k, phh = 40 * S.k;
      ctx.fillStyle = '#3a0f6a';
      rr(ctx, S.x - pw / 2, S.y + 44 * S.k, pw, phh, phh / 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, 'СЛОЖНЫЙ', S.x, S.y + 44 * S.k + phh / 2 + 1, 25 * S.k, { stroke: null, color: '#ffd23a' });
    }
    // сердечки
    for (let i = 0; i < this.lv.hearts && i < L.hearts.length; i++) {
      const [x, y] = L.hearts[i];
      const fx = this.heartFx[i];
      if (i < this.hearts) drawSprite(ctx, 'heart', x, y, L.heartW * (1 + Math.sin(time * 3 + i) * 0.03));
      else {
        drawSprite(ctx, 'heart_empty', x, y, L.heartW * 0.92);
        if (fx > 0) drawSprite(ctx, 'heart', x, y - (1 - fx) * 20, L.heartW * (1 + (1 - fx) * 0.5), { alpha: fx });
      }
    }
    // счётчик подарков
    const gp = L.giftPill;
    drawCounterPill(ctx, gp.x, gp.y, gp.w, gp.h);
    const bump = 1 + this.counterBump * 0.25;
    drawSprite(ctx, 'gift', L.gift.x, L.gift.y, L.gift.w * bump);
    const tx = (L.gift.x + L.gift.w * 0.45 + gp.x + gp.w) / 2;
    text(ctx, `${this.boxesDone}/${this.lv.queue.length}`, tx, gp.y + gp.h / 2 + 1, gp.h * 0.62 * bump, { stroke: '#0a1840', sw: gp.h * 0.1, maxW: gp.w * 0.55 });
    // монеты
    const cp = L.coinPill;
    drawCounterPill(ctx, cp.x, cp.y, cp.w, cp.h);
    drawSprite(ctx, 'coin', L.coin.x, L.coin.y, L.coin.w);
    const ctx2 = (L.coin.x + L.coin.w * 0.45 + cp.x + cp.w) / 2;
    text(ctx, String(Math.round(this.coinsShown)), ctx2, cp.y + cp.h / 2 + 1, cp.h * 0.64, { stroke: '#0a1840', sw: cp.h * 0.1, maxW: cp.w * 0.55 });
    for (const b of this.buttons) b.draw(ctx, time);
    // подпись снежка
    if (this.aim) {
      const t = 'Выбери любую стрелку — снежок выбьет её!';
      const y = L.inner.y + 30;
      ctx.font = `800 26px Nunito, Arial`;
      const w = Math.min(L.inner.w - 16, ctx.measureText(t).width + 50);
      ctx.fillStyle = 'rgba(8,22,58,.86)';
      rr(ctx, L.inner.x + L.inner.w / 2 - w / 2, y - 24, w, 48, 24);
      ctx.fill();
      text(ctx, t, L.inner.x + L.inner.w / 2, y + 1, 26, { stroke: null, weight: 800, maxW: w - 30 });
    }
    // подсказка-обучение (внизу поля)
    if (this.tipText && this.tipA > 0) {
      const lines = this.tipText.split('\n');
      const bw2 = Math.min(L.inner.w - 16, 620);
      const bh = 26 + lines.length * 34;
      const x = L.inner.x + L.inner.w / 2;
      const y = L.inner.y + L.inner.h - 8 - bh / 2;
      ctx.save();
      ctx.globalAlpha = this.tipA;
      const g = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
      g.addColorStop(0, '#fff3dc');
      g.addColorStop(1, '#f6d6a2');
      ctx.fillStyle = 'rgba(40,14,2,.35)';
      rr(ctx, x - bw2 / 2, y - bh / 2 + 4, bw2, bh, 22);
      ctx.fill();
      ctx.fillStyle = g;
      rr(ctx, x - bw2 / 2, y - bh / 2, bw2, bh, 22);
      ctx.fill();
      ctx.strokeStyle = '#a35a22';
      ctx.lineWidth = 4;
      ctx.stroke();
      lines.forEach((ln, i) => text(ctx, ln, x, y + (i - (lines.length - 1) / 2) * 34 + 1, 27, { stroke: null, color: '#5a2208', weight: 900, maxW: bw2 - 36 }));
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
      drawSign(ctx, 0, 0, Math.min(1.05, (DW - 40) / 698), 'Сложный уровень', { size: 54, color: '#ffe36a', stroke: '#3a0f6a' });
      ctx.restore();
    }
  }
}
