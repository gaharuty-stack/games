// Интерфейс: кнопки, панели, таблички, текст. Всё рисуется в дизайн-единицах.
import { drawSprite, drawThree, drawAt, spr } from './art.js';
import { Ease } from './tween.js';

export const FONT = 'Nunito, "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

// цвета под деревянно-кремовый стиль референса
export const INK = '#5a2a0c';      // тёмно-коричневый текст на кремовой панели
export const INK_SOFT = '#8a4f22';

export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, s, x, y, size, o = {}) {
  const color = o.color || '#ffffff';
  const align = o.align || 'center';
  const stroke = o.stroke === undefined ? '#16305f' : o.stroke;
  const weight = o.weight || 900;
  ctx.font = `${weight} ${size}px ${FONT}`;
  if (o.maxW) {
    const m = ctx.measureText(s).width;
    if (m > o.maxW) {
      size = (size * o.maxW) / m;
      ctx.font = `${weight} ${size}px ${FONT}`;
    }
  }
  ctx.textAlign = align;
  ctx.textBaseline = o.base || 'middle';
  ctx.lineJoin = 'round';
  const sw = o.sw != null ? o.sw : size * 0.2;
  if (stroke && o.shadow !== false) {
    ctx.strokeStyle = 'rgba(20,8,2,.35)';
    ctx.lineWidth = sw;
    ctx.strokeText(s, x, y + size * 0.08);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.strokeText(s, x, y);
  }
  if (o.gradient) {
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    o.gradient.forEach((c, i) => g.addColorStop(i / (o.gradient.length - 1), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  return size;
}

// обводка текста под цвет кнопки
export const STYLES = {
  green: '#14561a', blue: '#0f3d86', red: '#6e0c14', gold: '#7a4300', purple: '#3c1474', gray: '#454c58',
};

// Кнопка-«таблетка» (как «Играть»): w×h — размер цветного тела кнопки
export function drawPill(ctx, style, cx, cy, w, h) {
  const name = 'btn_' + (STYLES[style] ? style : 'green');
  const s = spr(name);
  if (!s) return;
  // тело кнопки в спрайте: x 18..522, y 37..169 из 550×210
  const k = h / 132;
  drawThree(ctx, name, cx - w / 2 - 18 * k, cy - h / 2 - 37 * k, w + 46 * k, 210 * k);
}

// Круглая глянцевая кнопка со снежной шапкой; d — диаметр круга
export function drawRound(ctx, style, cx, cy, d) {
  const name = 'round_' + (STYLES[style] ? style : 'blue');
  const k = d / 106;
  drawAt(ctx, name, cx - 63 * k, cy - 63 * k, k);
}

// Красный кружок-счётчик (как «3» на бонусах)
export function drawBadge(ctx, x, y, r, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,0,0,.35)';
  ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 1.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#ff6a6a');
  g.addColorStop(0.55, '#e3192b');
  g.addColorStop(1, '#a50a18');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 0.84, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.42, r * 0.38, r * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
  text(ctx, String(label), x, y + r * 0.04, r * 1.05, { stroke: '#6e0610', sw: r * 0.26, shadow: false });
  ctx.restore();
}

// Тёмная полупрозрачная «пилюля» под счётчиками (монеты, подарки)
export function drawCounterPill(ctx, x, y, w, h) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(10,22,66,.72)');
  g.addColorStop(1, 'rgba(6,14,44,.72)');
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,180,255,.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export class Button {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, w: 260, h: 96, style: 'green', label: '', icon: null, iconW: 0, size: 40,
      onClick: null, visible: true, enabled: true, round: false, badge: null, pulse: false, sub: null, ad: false,
      appear: 1, sprite: null, spriteW: 0, spriteDY: 0, hitR: 0, badgeAt: null, badgeR: 22, glow: 0,
    }, o);
    this.pressed = false;
  }

  hit(px, py) {
    if (!this.visible || this.appear < 0.5) return false;
    if (this.round || this.hitR) {
      const r = this.hitR || this.w / 2 + 6;
      return Math.hypot(px - this.x, py - this.y) <= r;
    }
    return Math.abs(px - this.x) <= this.w / 2 + 4 && Math.abs(py - this.y) <= this.h / 2 + 4;
  }

  draw(ctx, time) {
    if (!this.visible || this.appear <= 0) return;
    const s = this.appear * (this.pulse ? 1 + Math.sin(time * 5) * 0.03 : 1) * (this.pressed ? 0.95 : 1);
    ctx.save();
    ctx.translate(this.x, this.y + (this.pressed ? 2 : 0));
    ctx.scale(s, s);
    const style = this.enabled ? this.style : 'gray';
    if (!this.enabled) ctx.globalAlpha *= 0.92;
    if (this.sprite) {
      if (this.glow > 0) {
        const r = (this.hitR || this.spriteW / 2) * 1.15;
        const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
        g.addColorStop(0, `rgba(255,236,120,${0.55 * this.glow})`);
        g.addColorStop(1, 'rgba(255,236,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      drawSprite(ctx, this.sprite, 0, this.spriteDY, this.spriteW || this.w);
    } else if (this.round) {
      drawRound(ctx, style, 0, 0, this.w);
      if (this.icon) drawSprite(ctx, this.icon, 0, 2, this.iconW || this.w * 0.55);
    } else {
      drawPill(ctx, style, 0, 0, this.w, this.h);
      const cy = -this.h * 0.03;
      const stroke = STYLES[style] || STYLES.green;
      if (this.label) {
        let lx = 0;
        const iw = this.icon ? this.iconW || this.h * 0.62 : 0;
        ctx.font = `900 ${this.size}px ${FONT}`;
        const tw = Math.min(ctx.measureText(this.label).width, this.w - iw - 40);
        if (this.icon) {
          const total = iw + 12 + tw;
          drawSprite(ctx, this.icon, -total / 2 + iw / 2, cy + (this.sub ? -6 : 0), iw);
          lx = -total / 2 + iw + 12 + tw / 2;
        }
        text(ctx, this.label, lx, cy + (this.sub ? -9 : 0), this.size, { stroke, sw: this.size * 0.2, maxW: this.w - iw - 40, color: '#fffbf0' });
        if (this.sub) text(ctx, this.sub, lx, cy + this.size * 0.6, this.size * 0.5, { stroke, sw: 5, maxW: this.w - 40, color: '#fffbf0' });
      } else if (this.icon) {
        drawSprite(ctx, this.icon, 0, cy, this.iconW || this.h * 0.58);
      }
    }
    if (this.ad) drawSprite(ctx, 'video', this.w / 2 - 14, -(this.round ? this.w : this.h) / 2 + 4, 48, { rot: 0.15 });
    if (this.badge != null && this.badge !== '') {
      const [bx, by] = this.badgeAt || [this.w / 2 - 10, -(this.round ? this.w : this.h) / 2 + 10];
      drawBadge(ctx, bx, by, this.badgeR, this.badge);
    }
    ctx.restore();
  }
}

// Табличка-доска со снегом и остролистом (как «Уровень 19»); надпись по центру доски
// k — масштаб (дизайн-единиц на пиксель референса), (cx, cy) — центр надписи
export function drawSign(ctx, cx, cy, k, label, o = {}) {
  drawAt(ctx, 'sign', cx - 410 * k, cy - 70 * k, k);
  if (label) {
    text(ctx, label, cx, cy + 2 * k, (o.size || 56) * k, {
      color: o.color || '#fff4dc', stroke: o.stroke || '#4a1a06', sw: (o.size || 56) * k * 0.2, maxW: 330 * k,
    });
  }
}

// Снежная шапка вдоль верхнего края прямоугольника
export function drawSnowCap(ctx, x, y, w, seed = 1, thick = 18) {
  const n = Math.max(3, Math.round(w / 60));
  const step = w / n;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + thick * 0.55);
  for (let i = 0; i < n; i++) {
    const xx = x + i * step;
    const hgt = thick * (0.75 + 0.35 * Math.abs(Math.sin(i * 2.3 + seed)));
    ctx.quadraticCurveTo(xx + step * 0.5, y - hgt, xx + step, y - thick * 0.15);
  }
  ctx.lineTo(x + w + 4, y + thick * 0.55);
  const drips = [0.82, 0.55, 0.22];
  ctx.quadraticCurveTo(x + w * 0.5, y + thick * 0.9, x - 4, y + thick * 0.55);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - thick, 0, y + thick);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d6e6f8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,180,215,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = g;
  for (const t of drips) {
    const dx = x + w * ((t + seed * 0.07) % 1);
    const dl = thick * (0.9 + (t * 7 % 1) * 0.8);
    ctx.beginPath();
    ctx.moveTo(dx - 13, y + thick * 0.4);
    ctx.quadraticCurveTo(dx - 11, y + thick * 0.4 + dl, dx, y + thick * 0.45 + dl);
    ctx.quadraticCurveTo(dx + 11, y + thick * 0.4 + dl, dx + 13, y + thick * 0.4);
    ctx.closePath();
    ctx.fill();
  }
}

// Деревянная панель с кремовой серединой (в стиле панели «Украшено» из меню)
export function drawPanel(ctx, x, y, w, h) {
  const R = 38;
  ctx.save();
  ctx.fillStyle = 'rgba(10,4,0,.4)';
  rr(ctx, x - 2, y + 12, w + 4, h + 4, R);
  ctx.fill();
  // деревянная рамка
  let g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#d7894a');
  g.addColorStop(0.5, '#b8642c');
  g.addColorStop(1, '#8a4318');
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, R);
  ctx.fill();
  ctx.strokeStyle = '#5a2608';
  ctx.lineWidth = 4;
  ctx.stroke();
  // светлый кант
  ctx.strokeStyle = 'rgba(255,214,160,.55)';
  ctx.lineWidth = 2.5;
  rr(ctx, x + 5, y + 5, w - 10, h - 10, R - 5);
  ctx.stroke();
  // волокна дерева
  ctx.save();
  rr(ctx, x, y, w, h, R);
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,38,8,.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const yy = y + 6 + ((i * 37) % Math.max(20, h - 12));
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.bezierCurveTo(x + w * 0.3, yy - 4, x + w * 0.6, yy + 5, x + w, yy - 2);
    ctx.stroke();
  }
  ctx.restore();
  // кремовая середина
  const ix = x + 16, iy = y + 16, iw = w - 32, ih = h - 32;
  ctx.fillStyle = '#7a3a12';
  rr(ctx, ix - 2, iy - 2, iw + 4, ih + 4, R - 12);
  ctx.fill();
  g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, '#fff1d6');
  g.addColorStop(0.5, '#fbe0b2');
  g.addColorStop(1, '#f1c98e');
  ctx.fillStyle = g;
  rr(ctx, ix, iy, iw, ih, R - 14);
  ctx.fill();
  // внутренняя тень сверху
  ctx.save();
  rr(ctx, ix, iy, iw, ih, R - 14);
  ctx.clip();
  g = ctx.createLinearGradient(0, iy, 0, iy + 26);
  g.addColorStop(0, 'rgba(120,60,20,.28)');
  g.addColorStop(1, 'rgba(120,60,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, 26);
  ctx.restore();
  ctx.restore();
  drawSnowCap(ctx, x + 10, y + 4, w - 20, w * 0.01, 20);
}

// Всплывающее окно с анимацией появления
export class Popup {
  constructor(app, w, h) {
    this.app = app;
    this.w = w;
    this.h = h;
    this.k = 0;
    this.buttons = [];
    this.closing = false;
    this.t = 0;
    this.title = '';
    this.titleColor = 'red';
  }

  open() {
    this.app.tw.to(this, { k: 1 }, 0.38, Ease.outBack);
    return this;
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.app.tw.to(this, { k: 0 }, 0.18, Ease.inQuad).then(() => this.app.removePopup(this));
  }

  get cx() { return this.app.view.DW / 2; }
  // окно всегда целиком на экране (с запасом под табличку заголовка)
  get cy() {
    const DH = this.app.view.DH;
    return Math.max(this.h / 2 + 40, Math.min(DH / 2 + 14, DH - this.h / 2 - 8));
  }

  // общий масштаб окна, если оно не помещается на маленьком экране
  get fit() {
    const { DW, DH } = this.app.view;
    return Math.min(1, (DW - 16) / this.w, (DH - 60) / this.h);
  }

  update(dt) { this.t += dt; }

  // кнопки задаются относительно центра окна (b.rx, b.ry) и живут в системе координат окна
  layoutButtons() {
    for (const b of this.buttons) {
      b.x = this.cx + (b.rx || 0);
      b.y = this.cy + (b.ry || 0);
    }
  }

  // перевод координат касания в систему окна (с учётом масштаба fit)
  local(px, py) {
    const f = this.fit;
    return [this.cx + (px - this.cx) / f, this.cy + (py - this.cy) / f];
  }

  draw(ctx, time) {
    const k = Math.max(0, this.k);
    ctx.fillStyle = `rgba(6,10,30,${0.6 * Math.min(1, k)})`;
    ctx.fillRect(0, 0, this.app.view.DW, this.app.view.DH);
    ctx.save();
    const sc = (0.6 + 0.4 * k) * this.fit;
    ctx.translate(this.cx, this.cy);
    ctx.scale(sc, sc);
    ctx.translate(-this.cx, -this.cy);
    ctx.globalAlpha = Math.min(1, k * 1.5);
    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;
    drawPanel(ctx, x, y, this.w, this.h);
    drawSprite(ctx, 'holly', x + this.w - 36, y + this.h - 24, 110, { rot: 0.4 });
    if (this.title) {
      const sk = Math.min(0.78, (this.w - 30) / 698);
      drawSign(ctx, this.cx, y - 4, sk, this.title, { size: 60 });
    }
    this.drawContent(ctx, time, x, y);
    this.layoutButtons();
    for (const b of this.buttons) b.draw(ctx, time);
    ctx.restore();
  }

  drawContent() {}

  pointerDown(px, py) {
    const [x, y] = this.local(px, py);
    this.layoutButtons();
    for (const b of this.buttons) if (b.hit(x, y) && b.enabled) { b.pressed = true; break; }
    return true;
  }

  pointerUp(px, py) {
    const [x, y] = this.local(px, py);
    this.layoutButtons();
    let fire = null;
    for (const b of this.buttons) {
      if (b.pressed) {
        b.pressed = false;
        if (b.hit(x, y) && b.onClick && !this.closing && this.k > 0.6) fire = b;
      }
    }
    if (fire) {
      this.app.sfx('click');
      fire.onClick();
    }
    return true;
  }
}
