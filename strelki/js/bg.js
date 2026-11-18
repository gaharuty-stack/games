// Фон: нарисованная картинка (меню или игры) и падающий снег.
// В альбомной ориентации картинка ложится ровно под «сцену» (раскладку как на референсе),
// а свободные поля по краям заполняются размытым продолжением той же картинки.
// В портретной — картинка обрезается «по высоте» вокруг заданной точки.
import { ART } from './art.js';

export const REF_W = 1672;
export const REF_H = 941;

// Сцена в альбомной ориентации: масштаб k (дизайн-единиц на пиксель референса) и смещение
export function stageOf(view) {
  const k = Math.min(view.DW / REF_W, view.DH / REF_H);
  return { k, ox: (view.DW - REF_W * k) / 2, oy: (view.DH - REF_H * k) / 2 };
}

// Картинка «на весь экран» с обрезкой вокруг точки (fx, fy) референса — для портретной ориентации
export function coverMap(view, fx, fy, zoom = 1) {
  const k = Math.max(view.DW / REF_W, view.DH / REF_H) * zoom;
  let ox = view.DW / 2 - fx * k;
  let oy = view.DH / 2 - fy * k;
  ox = Math.min(0, Math.max(view.DW - REF_W * k, ox));
  oy = Math.min(0, Math.max(view.DH - REF_H * k, oy));
  return { k, ox, oy };
}

export class Background {
  constructor() {
    this.flakes = [];
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.place = null;
    this.cache = null;
    this.cacheKey = '';
  }

  build(vw, vh, dpr) {
    this.w = vw;
    this.h = vh;
    this.dpr = dpr;
    this.cache = null;
    this.flakes = [];
    const n = Math.round(Math.min(110, (vw * vh) / 9000));
    for (let i = 0; i < n; i++) this.flakes.push(this.newFlake(true));
  }

  // place: { key: 'menu'|'game', mode: 'stage', ox, oy, k } — в CSS-пикселях
  //        { key, mode: 'cover', fx, fy, zoom } — fx, fy: точка картинки (в пикселях референса), которая будет в центре
  set(place) {
    this.place = place;
  }

  compose() {
    const p = this.place;
    const img = p && ART.bg[p.key];
    const key = p ? JSON.stringify(p) + '|' + this.w + 'x' + this.h + '@' + this.dpr : '';
    if (this.cache && key === this.cacheKey) return this.cache;
    const W = Math.max(1, Math.round(this.w * this.dpr)), H = Math.max(1, Math.round(this.h * this.dpr));
    const c = this.cache || document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b1a4a';
    ctx.fillRect(0, 0, W, H);
    this.cache = c;
    this.cacheKey = key;
    if (!img) return c;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const d = this.dpr;
    if (p.mode === 'stage') {
      const x = p.ox * d, y = p.oy * d, w = REF_W * p.k * d, h = REF_H * p.k * d;
      const gapX = x > 0.5 || x + w < W - 0.5, gapY = y > 0.5 || y + h < H - 0.5;
      if (p.extend && gapY && !gapX) {
        // небо сверху и снег снизу продолжаем цветом краёв картинки (для портретного меню)
        const sm = document.createElement('canvas');
        sm.width = 48;
        sm.height = 27;
        const sc = sm.getContext('2d');
        sc.drawImage(img, 0, 0, iw, ih * 0.04, 0, 0, 48, 1);
        sc.drawImage(img, 0, ih * 0.96, iw, ih * 0.04, 0, 26, 48, 1);
        const px = sc.getImageData(0, 0, 48, 27).data;
        const vx0 = Math.max(0, Math.floor((-x / w) * 48)), vx1 = Math.min(48, Math.ceil(((W - x) / w) * 48));
        const avg = (row) => {
          const c = [0, 0, 0];
          let n = 0;
          for (let i = vx0; i < vx1; i++) { const o = (row * 48 + i) * 4; c[0] += px[o]; c[1] += px[o + 1]; c[2] += px[o + 2]; n++; }
          return c.map((v) => Math.round(v / Math.max(1, n)));
        };
        const top = avg(0), bot = avg(26);
        const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
        const f = Math.min(70 * d, h * 0.1); // ширина плавного перехода на краях картинки
        // цвет края картинки берём по самой крайней полоске, а заливку тянем под зону перехода
        let g = ctx.createLinearGradient(0, 0, 0, y + f);
        g.addColorStop(0, rgb(top, 0.55));
        g.addColorStop(1, rgb(top));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, Math.ceil(y + f) + 2);
        g = ctx.createLinearGradient(0, y + h - f, 0, H);
        g.addColorStop(0, rgb(bot));
        g.addColorStop(1, rgb(bot, 0.9));
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.floor(y + h - f) - 2, W, H - (y + h - f) + 2);
        // звёзды на дорисованном небе
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < Math.round((W * y) / (9000 * d)); i++) {
          const sx = rnd() * W, sy = rnd() * y, r = (0.6 + rnd() * 1.4) * d;
          ctx.globalAlpha = 0.35 + rnd() * 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const t = document.createElement('canvas');
        t.width = Math.max(1, Math.round(w));
        t.height = Math.max(1, Math.round(h));
        const tc = t.getContext('2d');
        tc.drawImage(img, 0, 0, t.width, t.height);
        tc.globalCompositeOperation = 'destination-in';
        const fg = tc.createLinearGradient(0, 0, 0, t.height);
        fg.addColorStop(0, 'rgba(0,0,0,0)');
        fg.addColorStop(f / t.height, 'rgba(0,0,0,1)');
        fg.addColorStop(1 - f / t.height, 'rgba(0,0,0,1)');
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        tc.fillStyle = fg;
        tc.fillRect(0, 0, t.width, t.height);
        ctx.drawImage(t, Math.round(x), Math.round(y));
      } else if (gapX || gapY) {
        // размытая подложка «на весь экран»
        const small = document.createElement('canvas');
        small.width = 96;
        small.height = 54;
        small.getContext('2d').drawImage(img, 0, 0, 96, 54);
        const cs = Math.max(W / iw, H / ih);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(small, (W - iw * cs) / 2, (H - ih * cs) / 2, iw * cs, ih * cs);
        ctx.fillStyle = 'rgba(8,16,48,.18)';
        ctx.fillRect(0, 0, W, H);
        // резкая картинка с мягко растворёнными краями
        const t = document.createElement('canvas');
        t.width = Math.max(1, Math.round(w));
        t.height = Math.max(1, Math.round(h));
        const tc = t.getContext('2d');
        tc.drawImage(img, 0, 0, t.width, t.height);
        tc.globalCompositeOperation = 'destination-in';
        const f = Math.min(60 * d, (gapX ? t.width : t.height) * 0.08);
        const g = gapX ? tc.createLinearGradient(0, 0, t.width, 0) : tc.createLinearGradient(0, 0, 0, t.height);
        const L = gapX ? t.width : t.height;
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(f / L, 'rgba(0,0,0,1)');
        g.addColorStop(1 - f / L, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        tc.fillStyle = g;
        tc.fillRect(0, 0, t.width, t.height);
        ctx.drawImage(t, Math.round(x), Math.round(y));
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    } else {
      const cs = Math.max(W / iw, H / ih) * (p.zoom || 1);
      const sc = iw / REF_W; // пикселей картинки на пиксель референса
      let x = W / 2 - (p.fx || REF_W / 2) * sc * cs;
      let y = H / 2 - (p.fy || REF_H / 2) * sc * cs;
      x = Math.min(0, Math.max(W - iw * cs, x));
      y = Math.min(0, Math.max(H - ih * cs, y));
      ctx.drawImage(img, x, y, iw * cs, ih * cs);
    }
    return c;
  }

  newFlake(anywhere) {
    const depth = Math.random();
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -10,
      r: 1.2 + depth * 3.2,
      vy: 18 + depth * 50,
      sway: 10 + Math.random() * 24,
      p: Math.random() * 6,
      a: 0.45 + depth * 0.5,
    };
  }

  draw(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.compose(), 0, 0);
  }

  drawSnow(ctx, dpr, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.y += f.vy * dt;
      f.p += dt;
      const x = f.x + Math.sin(f.p * 0.9) * f.sway;
      if (f.y > this.h + 10) this.flakes[i] = this.newFlake(false);
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
