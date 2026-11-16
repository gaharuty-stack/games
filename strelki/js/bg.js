// Фон: ночное зимнее небо, северное сияние, луна, деревня, ели, падающий снег.
import { rng } from './level.js';

// Пушистый силуэт ели: выпуклые бока и «лапы» по нижнему краю каждого яруса
function firShape(ctx, x, base, h, w) {
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const top = base - h + (h * i) / (tiers + 0.4);
    const bot = base - h * 0.08 - ((h * 0.92) * (tiers - 1 - i)) / (tiers + 0.9);
    const hw = (w / 2) * (0.42 + (i / (tiers - 1)) * 0.58);
    const H = bot - top;
    ctx.moveTo(x, top);
    ctx.bezierCurveTo(x + hw * 0.3, top + H * 0.15, x + hw * 0.9, bot - H * 0.45, x + hw, bot);
    const n = 3 + i;
    const step = (hw * 2) / n;
    for (let k = 0; k < n; k++) {
      const x1 = x + hw - step * k, x2 = x1 - step;
      ctx.bezierCurveTo(x1 - step * 0.1, bot + H * 0.16, x2 + step * 0.1, bot + H * 0.16, x2, bot);
    }
    ctx.bezierCurveTo(x - hw * 0.9, bot - H * 0.45, x - hw * 0.3, top + H * 0.15, x, top);
  }
  ctx.rect(x - w * 0.05, base - h * 0.1, w * 0.1, h * 0.12);
}

export class Background {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.flakes = [];
    this.w = 0;
    this.h = 0;
  }

  build(vw, vh, dpr) {
    this.w = vw;
    this.h = vh;
    const c = this.canvas;
    c.width = Math.round(vw * dpr);
    c.height = Math.round(vh * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(42);
    const m = Math.min(vw, vh);

    const sky = ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, '#060d30');
    sky.addColorStop(0.42, '#122868');
    sky.addColorStop(0.78, '#2b58a8');
    sky.addColorStop(1, '#5b8ed4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, vh);

    // северное сияние
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) {
      const y0 = vh * (0.16 + b * 0.07);
      const grad = ctx.createLinearGradient(0, y0 - m * 0.12, 0, y0 + m * 0.12);
      const col = b === 1 ? '120,90,255' : '40,230,170';
      grad.addColorStop(0, `rgba(${col},0)`);
      grad.addColorStop(0.5, `rgba(${col},${0.1 - b * 0.02})`);
      grad.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= vw + 40; x += 40) {
        ctx.lineTo(x, y0 + Math.sin(x / (vw * 0.18) + b * 2) * m * 0.05 - m * 0.1);
      }
      for (let x = vw + 40; x >= 0; x -= 40) {
        ctx.lineTo(x, y0 + Math.sin(x / (vw * 0.18) + b * 2 + 0.6) * m * 0.05 + m * 0.1);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // звёзды
    for (let i = 0; i < Math.round((vw * vh) / 5000); i++) {
      const x = r() * vw, y = r() * vh * 0.62;
      const s = r() < 0.08 ? 1.8 + r() * 1.2 : 0.6 + r() * 1.1;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    this.twinkles = [];
    for (let i = 0; i < 18; i++) this.twinkles.push({ x: r() * vw, y: r() * vh * 0.5, p: r() * 6, s: 3 + r() * 4 });

    // луна — отдельным слоем: каждая сцена ставит её туда, где она не мешает интерфейсу
    this.buildMoon(m * 0.055, dpr);

    // дальние холмы
    const hillY = vh * 0.74;
    const hg = ctx.createLinearGradient(0, hillY - m * 0.1, 0, vh);
    hg.addColorStop(0, '#a9c9ef');
    hg.addColorStop(1, '#6d98d2');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(0, vh);
    ctx.lineTo(0, hillY);
    ctx.bezierCurveTo(vw * 0.2, hillY - m * 0.09, vw * 0.38, hillY - m * 0.02, vw * 0.55, hillY - m * 0.06);
    ctx.bezierCurveTo(vw * 0.72, hillY - m * 0.11, vw * 0.88, hillY - m * 0.03, vw, hillY - m * 0.05);
    ctx.lineTo(vw, vh);
    ctx.closePath();
    ctx.fill();

    // домики с огоньками
    const houses = Math.max(4, Math.round(vw / 140));
    for (let i = 0; i < houses; i++) {
      const hx = (vw * (i + 0.3 + r() * 0.4)) / houses;
      const t = hx / vw;
      const baseY = hillY - m * 0.06 * Math.sin(t * Math.PI * 1.7) - m * 0.012;
      const hw = m * (0.035 + r() * 0.02), hh = hw * 0.7;
      ctx.fillStyle = '#25427a';
      ctx.fillRect(hx - hw / 2, baseY - hh, hw, hh);
      ctx.beginPath();
      ctx.moveTo(hx - hw * 0.62, baseY - hh);
      ctx.quadraticCurveTo(hx, baseY - hh - hw * 0.7, hx + hw * 0.62, baseY - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8f3ff';
      ctx.beginPath();
      ctx.moveTo(hx - hw * 0.64, baseY - hh + 1);
      ctx.quadraticCurveTo(hx, baseY - hh - hw * 0.78, hx + hw * 0.64, baseY - hh + 1);
      ctx.quadraticCurveTo(hx, baseY - hh - hw * 0.45, hx - hw * 0.64, baseY - hh + 1);
      ctx.fill();
      const wg = ctx.createRadialGradient(hx, baseY - hh * 0.5, 1, hx, baseY - hh * 0.5, hw);
      wg.addColorStop(0, 'rgba(255,200,90,.45)');
      wg.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(hx - hw, baseY - hh * 1.5, hw * 2, hh * 2);
      ctx.fillStyle = '#ffd36b';
      ctx.fillRect(hx - hw * 0.28, baseY - hh * 0.7, hw * 0.2, hh * 0.32);
      ctx.fillRect(hx + hw * 0.08, baseY - hh * 0.7, hw * 0.2, hh * 0.32);
    }

    // ели второго плана
    ctx.fillStyle = '#183968';
    ctx.beginPath();
    for (let i = 0; i < Math.round(vw / 70); i++) {
      const x = r() * vw;
      const t = x / vw;
      const base = hillY - m * 0.05 * Math.sin(t * Math.PI * 1.7) + m * 0.02;
      const h = m * (0.07 + r() * 0.06);
      firShape(ctx, x, base, h, h * 0.62);
    }
    ctx.fill();

    // ближний снег
    const nearY = vh * 0.86;
    const ng = ctx.createLinearGradient(0, nearY - m * 0.05, 0, vh);
    ng.addColorStop(0, '#f2f8ff');
    ng.addColorStop(1, '#b7d3f0');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.moveTo(0, vh);
    ctx.lineTo(0, nearY);
    ctx.bezierCurveTo(vw * 0.3, nearY - m * 0.07, vw * 0.6, nearY + m * 0.03, vw, nearY - m * 0.04);
    ctx.lineTo(vw, vh);
    ctx.closePath();
    ctx.fill();

    // большие ели по краям
    const edge = (x, base, h, flip) => {
      const g = ctx.createLinearGradient(x - h * 0.3, 0, x + h * 0.3, 0);
      g.addColorStop(flip ? 1 : 0, '#1f6a3a');
      g.addColorStop(flip ? 0 : 1, '#0c3a22');
      ctx.fillStyle = g;
      ctx.beginPath();
      firShape(ctx, x, base, h, h * 0.62);
      ctx.fill();
      // снег на лапах
      ctx.fillStyle = 'rgba(240,248,255,.92)';
      for (let i = 0; i < 4; i++) {
        const bot = base - h * 0.08 - ((h * 0.92) * (3 - i)) / 4.9;
        const hw = h * 0.31 * (0.42 + (i / 3) * 0.58);
        const n = 3 + i;
        const step = (hw * 2) / n;
        for (let k = 0; k < n; k++) {
          const cx = x + hw - step * (k + 0.5);
          ctx.beginPath();
          ctx.ellipse(cx, bot - h * 0.012, step * 0.36, h * 0.014, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    edge(-m * 0.02, vh * 1.01, m * 0.42, false);
    edge(m * 0.12, vh * 1.03, m * 0.3, false);
    edge(vw + m * 0.02, vh * 1.01, m * 0.44, true);
    edge(vw - m * 0.13, vh * 1.04, m * 0.28, true);

    // хлопья
    this.flakes = [];
    const n = Math.round(Math.min(110, (vw * vh) / 9000));
    for (let i = 0; i < n; i++) this.flakes.push(this.newFlake(true));
  }

  buildMoon(mr, dpr) {
    const R = mr * 4;
    const c = this.moonCanvas || (this.moonCanvas = document.createElement('canvas'));
    c.width = c.height = Math.ceil(R * 2 * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx = R, my = R;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, R);
    glow.addColorStop(0, 'rgba(255,248,220,.35)');
    glow.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2); ctx.fill();
    const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, '#fffdf0');
    mg.addColorStop(1, '#f1e2b0');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,130,.35)';
    [[0.3, -0.2, 0.18], [-0.25, 0.25, 0.13], [0.1, 0.4, 0.09]].forEach(([dx, dy, rr2]) => {
      ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, rr2 * mr, 0, Math.PI * 2); ctx.fill();
    });
    this.moonR = R;
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

  draw(ctx, dpr, dt, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.canvas, 0, 0);
    if (this.moonCanvas) {
      // moonPos — в CSS-пикселях; без него луна в правом верхнем углу
      const [mx, my] = this.moonPos || [this.w * 0.84, this.h * 0.1];
      ctx.drawImage(this.moonCanvas, Math.round((mx - this.moonR) * dpr), Math.round((my - this.moonR) * dpr));
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const t of this.twinkles || []) {
      const a = 0.5 + 0.5 * Math.sin(time * 2.2 + t.p);
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - t.s);
      ctx.quadraticCurveTo(t.x, t.y, t.x + t.s, t.y);
      ctx.quadraticCurveTo(t.x, t.y, t.x, t.y + t.s);
      ctx.quadraticCurveTo(t.x, t.y, t.x - t.s, t.y);
      ctx.quadraticCurveTo(t.x, t.y, t.x, t.y - t.s);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSnow(ctx, dpr, dt, time) {
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
