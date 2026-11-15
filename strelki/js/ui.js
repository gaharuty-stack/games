// Интерфейс: кнопки, панели, ленты, текст. Всё рисуется в дизайн-единицах.
import { drawSprite } from './art.js';
import { Ease } from './tween.js';

export const FONT = 'Nunito, "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

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
    ctx.strokeStyle = 'rgba(5,14,40,.35)';
    ctx.lineWidth = sw;
    ctx.strokeText(s, x, y + size * 0.09);
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

export const STYLES = {
  green: ['#9df57a', '#36b23a', '#1f7a22', '#124a17'],
  blue: ['#86d0ff', '#2f7fe6', '#1b4fa0', '#102f66'],
  red: ['#ff9292', '#e0303c', '#9a1420', '#5c0812'],
  gold: ['#ffe680', '#f5a300', '#a8620a', '#6b3a00'],
  purple: ['#dba6ff', '#8a45e0', '#55209c', '#331066'],
  gray: ['#dfe5ee', '#9aa6b7', '#6b7788', '#424c5c'],
  white: ['#ffffff', '#dce9f7', '#9fb2c9', '#4f6582'],
};

export function drawButtonShape(ctx, x, y, w, h, style, pressed, round) {
  const [top, bot, lip, border] = STYLES[style] || STYLES.green;
  const r = round ? h / 2 : Math.min(h / 2, 30);
  const depth = h * 0.11;
  const off = pressed ? depth * 0.7 : 0;
  ctx.fillStyle = 'rgba(5,16,42,.35)';
  rr(ctx, x, y + 6, w, h, r);
  ctx.fill();
  ctx.fillStyle = border;
  rr(ctx, x, y + off, w, h - off, r);
  ctx.fill();
  ctx.fillStyle = lip;
  rr(ctx, x + 3, y + off + 3, w - 6, h - off - 6, r - 3);
  ctx.fill();
  const bodyH = h - 6 - depth;
  const g = ctx.createLinearGradient(0, y + off, 0, y + off + bodyH);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  rr(ctx, x + 3, y + 3 + off, w - 6, bodyH, r - 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  rr(ctx, x + 10, y + off + 7, w - 20, bodyH * 0.4, (r - 3) * 0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.ellipse(x + Math.min(r, w * 0.2) + 4, y + off + bodyH * 0.24 + 3, Math.min(10, w * 0.06), Math.min(6, h * 0.06), -0.4, 0, Math.PI * 2);
  ctx.fill();
  return off;
}

export class Button {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, w: 260, h: 96, style: 'green', label: '', icon: null, iconW: 0, size: 40,
      onClick: null, visible: true, enabled: true, round: false, badge: null, pulse: false, sub: null, ad: false,
      appear: 1,
    }, o);
    this.pressed = false;
  }

  hit(px, py) {
    if (!this.visible || this.appear < 0.5) return false;
    if (this.round) return Math.hypot(px - this.x, py - this.y) <= this.w / 2 + 6;
    return Math.abs(px - this.x) <= this.w / 2 + 4 && Math.abs(py - this.y) <= this.h / 2 + 4;
  }

  draw(ctx, time) {
    if (!this.visible || this.appear <= 0) return;
    let s = this.appear * (this.pulse ? 1 + Math.sin(time * 5) * 0.035 : 1) * (this.pressed ? 0.97 : 1);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    const style = this.enabled ? this.style : 'gray';
    const h = this.round ? this.w : this.h;
    const off = drawButtonShape(ctx, -this.w / 2, -h / 2, this.w, h, style, this.pressed, this.round);
    const cy = -h * 0.055 + off;
    if (this.label) {
      let lx = 0;
      const iw = this.icon ? this.iconW || h * 0.62 : 0;
      ctx.font = `900 ${this.size}px ${FONT}`;
      const tw = Math.min(ctx.measureText(this.label).width, this.w - iw - 40);
      if (this.icon) {
        const total = iw + 12 + tw;
        drawSprite(ctx, this.icon, -total / 2 + iw / 2, cy + (this.sub ? -8 : 0), iw);
        lx = -total / 2 + iw + 12 + tw / 2;
      }
      text(ctx, this.label, lx, cy + (this.sub ? -10 : 0), this.size, { stroke: STYLES[style][3], sw: this.size * 0.18, maxW: this.w - iw - 40 });
      if (this.sub) text(ctx, this.sub, lx, cy + this.size * 0.62, this.size * 0.5, { stroke: STYLES[style][3], sw: 5, maxW: this.w - 40 });
    } else if (this.icon) {
      drawSprite(ctx, this.icon, 0, cy, this.iconW || h * 0.58);
    }
    if (this.ad) drawSprite(ctx, 'video', this.w / 2 - 12, -h / 2 + 6, 46, { rot: 0.15 });
    if (this.badge != null && this.badge !== '') {
      const bx = this.w / 2 - 10, by = -h / 2 + 10;
      ctx.fillStyle = '#5c0812';
      ctx.beginPath(); ctx.arc(bx, by + 2, 19, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, by - 17, 0, by + 17);
      g.addColorStop(0, '#ff7a7a'); g.addColorStop(1, '#d81f2c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, 17, 0, Math.PI * 2); ctx.fill();
      text(ctx, String(this.badge), bx, by + 1, 22, { stroke: '#5c0812', sw: 4, shadow: false });
    }
    ctx.restore();
  }
}

// Лента-баннер с подвёрнутыми концами
export function drawRibbon(ctx, cx, cy, w, h, color = 'red') {
  const C = color === 'purple'
    ? { a: '#c27bff', b: '#7a2fc8', tail: '#5a1fa0', dark: '#2e0a5c' }
    : color === 'green'
      ? { a: '#6fe080', b: '#1f9a3a', tail: '#157030', dark: '#0a3d18' }
      : { a: '#ff6670', b: '#c8162a', tail: '#94101f', dark: '#5c0812' };
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const tw = h * 0.85, drop = h * 0.28, arch = h * 0.16;
  ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const ex = side < 0 ? x0 : x1;
    ctx.beginPath();
    ctx.moveTo(ex - side * h * 0.2, y0 + drop);
    ctx.lineTo(ex + side * tw, y0 + drop);
    ctx.lineTo(ex + side * (tw - h * 0.3), cy + drop);
    ctx.lineTo(ex + side * tw, y1 + drop);
    ctx.lineTo(ex - side * h * 0.2, y1 + drop);
    ctx.closePath();
    ctx.fillStyle = C.tail;
    ctx.fill();
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, y1 - 2);
    ctx.lineTo(ex - side * h * 0.2, y1 + drop);
    ctx.lineTo(ex, y1 + drop);
    ctx.closePath();
    ctx.fillStyle = C.dark;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, y0 - arch, x1, y0);
  ctx.lineTo(x1, y1);
  ctx.quadraticCurveTo(cx, y1 - arch, x0, y1);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y0 - arch, 0, y1);
  g.addColorStop(0, C.a);
  g.addColorStop(1, C.b);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = 'rgba(255,230,160,.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0 + 10, y0 + 8);
  ctx.quadraticCurveTo(cx, y0 - arch + 8, x1 - 10, y0 + 8);
  ctx.moveTo(x0 + 10, y1 - 8);
  ctx.quadraticCurveTo(cx, y1 - arch - 8, x1 - 10, y1 - 8);
  ctx.stroke();
  ctx.restore();
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
  g.addColorStop(1, '#d3e8fa');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#a9c8e4';
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

// Окно-попап
export function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(3,10,32,.45)';
  rr(ctx, x - 2, y + 12, w + 4, h + 4, 40);
  ctx.fill();
  ctx.fillStyle = '#163a78';
  rr(ctx, x, y, w, h, 40);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f6fbff');
  g.addColorStop(1, '#cde3f6');
  ctx.fillStyle = g;
  rr(ctx, x + 8, y + 8, w - 16, h - 16, 33);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 3;
  rr(ctx, x + 12, y + 12, w - 24, h - 24, 30);
  ctx.stroke();
  // узор снежинок
  ctx.save();
  rr(ctx, x + 8, y + 8, w - 16, h - 16, 33);
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    drawSprite(ctx, 'flake' + (i % 3), x + 40 + ((i * 137) % (w - 80)), y + 90 + ((i * 211) % (h - 140)), 46 + (i % 3) * 14, { alpha: 0.13, rot: i });
  }
  ctx.restore();
  drawSnowCap(ctx, x + 6, y + 6, w - 12, w * 0.01, 22);
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
  get cy() { return this.app.view.DH / 2; }

  update(dt) { this.t += dt; }

  // кнопки задаются относительно центра окна: b.rx, b.ry
  layoutButtons() {
    for (const b of this.buttons) {
      b.x = this.cx + (b.rx || 0);
      b.y = this.cy + (b.ry || 0);
    }
  }

  draw(ctx, time) {
    const k = Math.max(0, this.k);
    ctx.fillStyle = `rgba(4,10,32,${0.62 * Math.min(1, k)})`;
    ctx.fillRect(0, 0, this.app.view.DW, this.app.view.DH);
    ctx.save();
    const sc = 0.6 + 0.4 * k;
    ctx.translate(this.cx, this.cy);
    ctx.scale(sc, sc);
    ctx.translate(-this.cx, -this.cy);
    ctx.globalAlpha = Math.min(1, k * 1.5);
    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;
    drawPanel(ctx, x, y, this.w, this.h);
    drawSprite(ctx, 'holly', x + 34, y + 30, 120, { rot: -0.25 });
    if (this.title) {
      drawRibbon(ctx, this.cx, y + 6, Math.min(this.w - 90, 470), 84, this.titleColor);
      text(ctx, this.title, this.cx, y + 2, 46, { stroke: '#4a0710', maxW: Math.min(this.w - 150, 420) });
    }
    this.drawContent(ctx, time, x, y);
    this.layoutButtons();
    for (const b of this.buttons) b.draw(ctx, time);
    ctx.restore();
  }

  drawContent() {}

  pointerDown(px, py) {
    for (const b of this.buttons) if (b.hit(px, py) && b.enabled) { b.pressed = true; return true; }
    return true;
  }

  pointerUp(px, py) {
    for (const b of this.buttons) {
      if (b.pressed) {
        b.pressed = false;
        if (b.hit(px, py) && b.onClick && !this.closing && this.k > 0.6) {
          this.app.sfx('click');
          b.onClick();
        }
      }
    }
    return true;
  }
}
