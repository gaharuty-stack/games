// Частицы: искры, снежинки, конфетти. Координаты — дизайн-единицы.
import { drawSprite } from './art.js';

const CONFETTI = ['#ff4a5a', '#ffd23a', '#38d06a', '#3aa0ff', '#c46bff', '#ff8a2a', '#ffffff'];

export class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    this.list.push({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 1, t: 0,
      size: 20, size1: null, rot: 0, vr: 0, alpha: 1, fadeIn: 0, kind: 'sprite', sprite: 'sparkle',
      ...p,
    });
  }

  // Звёздочки-искры во все стороны
  sparkles(x, y, n = 10, spread = 260, size = 34) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.35 + Math.random() * 0.65);
      this.add({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 3.2,
        life: 0.45 + Math.random() * 0.35, size: size * (0.6 + Math.random() * 0.6), size1: 0,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, sprite: 'sparkle',
      });
    }
  }

  // След за летящей стрелкой
  trail(x, y, color) {
    this.add({
      x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
      life: 0.35 + Math.random() * 0.2, size: 16 + Math.random() * 12, size1: 0,
      sprite: Math.random() < 0.5 ? 'sparkle' : 'snowdot',
    });
  }

  snowPuff(x, y, n = 12, spread = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.3 + Math.random() * 0.7);
      this.add({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 500, drag: 2,
        life: 0.5 + Math.random() * 0.4, size: 14 + Math.random() * 18, size1: 4,
        sprite: Math.random() < 0.3 ? 'flake' + Math.floor(Math.random() * 3) : 'snowdot',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 5,
      });
    }
  }

  confetti(x, y, n = 60, spread = 700) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = spread * (0.4 + Math.random() * 0.6);
      this.add({
        kind: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, drag: 1.6,
        life: 1.6 + Math.random() * 1.2, size: 12 + Math.random() * 10,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, phase: Math.random() * 6, spin: 6 + Math.random() * 10,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.phase != null) p.phase += p.spin * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
  }

  draw(ctx) {
    for (const p of this.list) {
      const k = p.t / p.life;
      const size = p.size1 != null ? p.size + (p.size1 - p.size) * k : p.size;
      let alpha = p.alpha * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
      if (p.fadeIn && p.t < p.fadeIn) alpha *= p.t / p.fadeIn;
      if (p.kind === 'confetti') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.phase));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-size / 2, -size * 0.22);
        ctx.quadraticCurveTo(0, -size * 0.42, size / 2, -size * 0.22);
        ctx.lineTo(size / 2, size * 0.22);
        ctx.quadraticCurveTo(0, 0, -size / 2, size * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        drawSprite(ctx, p.sprite, p.x, p.y, size, { rot: p.rot, alpha });
      }
    }
  }
}
