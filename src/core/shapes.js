// src/core/shapes.js

export const SHAPES = {
  // --- AKIŞKAN VE ORGANİK ---
  fluidRiver: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(140, 0); ctx.bezierCurveTo(150, 160, 290, 240, 360, 310); ctx.lineTo(360, 509);
    ctx.lineTo(240, 509); ctx.bezierCurveTo(230, 370, 90, 280, 0, 180); ctx.lineTo(0, 0); ctx.closePath();
  },
  fluidCorners: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(140, 0); ctx.bezierCurveTo(150, 160, 290, 240, 360, 310); ctx.lineTo(360, 0); ctx.closePath();
    ctx.moveTo(0, 180); ctx.bezierCurveTo(90, 280, 230, 370, 240, 509); ctx.lineTo(0, 509); ctx.closePath();
  },
  blob: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(180, 40); ctx.bezierCurveTo(300, 30, 350, 150, 330, 280); ctx.bezierCurveTo(310, 420, 250, 480, 160, 470);
    ctx.bezierCurveTo(50, 460, 20, 380, 30, 250); ctx.bezierCurveTo(40, 100, 80, 50, 180, 40); ctx.closePath();
  },
  waveTop: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 120); ctx.bezierCurveTo(90, 60, 180, 180, 270, 100); ctx.bezierCurveTo(315, 60, 340, 80, 360, 110);
    ctx.lineTo(360, 509); ctx.lineTo(0, 509); ctx.closePath();
  },

  // --- MİMARİ VE RETRO ---
  arch: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(30, 500); ctx.lineTo(30, 180); ctx.bezierCurveTo(30, 20, 330, 20, 330, 180);
    ctx.lineTo(330, 500); ctx.closePath();
  },
  doubleArch: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(20, 490); ctx.lineTo(20, 160); ctx.bezierCurveTo(20, 50, 170, 50, 170, 160); ctx.lineTo(170, 490); ctx.closePath();
    ctx.moveTo(190, 490); ctx.lineTo(190, 160); ctx.bezierCurveTo(190, 50, 340, 50, 340, 160); ctx.lineTo(340, 490); ctx.closePath();
  },
  cinemaFrame: (ctx) => {
    const x = 25, y = 30, w = 310, h = 450, r = 35;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  },
  ticket: (ctx) => {
    const x = 20, y = 40, w = 320, h = 430, r = 25;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h / 2 - r);
    ctx.arc(x + w, y + h / 2, r, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h / 2 + r); ctx.arc(x, y + h / 2, r, Math.PI / 2, -Math.PI / 2, true); ctx.closePath();
  },

  // --- YIRTIK VE DOKULU ---
  torn1: (ctx) => {
    ctx.beginPath(); ctx.moveTo(25, 20); ctx.lineTo(335, 15); ctx.quadraticCurveTo(320, 250, 345, 490);
    ctx.lineTo(15, 495); ctx.quadraticCurveTo(40, 250, 25, 20); ctx.closePath();
  },
  torn2: (ctx) => {
    ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(340, 30); ctx.lineTo(340, 420);
    for (let i = 340; i > 20; i -= 20) ctx.lineTo(i - 10, 420 + (i % 40 === 0 ? 25 : -10));
    ctx.lineTo(20, 420); ctx.closePath();
  },
  tornWindow: (ctx) => {
    ctx.beginPath(); ctx.moveTo(35, 60);
    for (let i = 35; i < 325; i += 20) ctx.lineTo(i + 10, 60 + (i % 40 === 0 ? 10 : -8));
    ctx.lineTo(325, 450);
    for (let i = 325; i > 35; i -= 20) ctx.lineTo(i - 10, 450 + (i % 40 === 0 ? -10 : 8));
    ctx.lineTo(35, 60); ctx.closePath();
  },
  stamp: (ctx) => {
    ctx.beginPath();
    const w = 320, h = 460, x = 20, y = 25, step = 20, r = 4;
    ctx.moveTo(x, y);
    for (let i = x; i < x + w; i += step) { ctx.lineTo(i + step / 2 - r, y); ctx.arc(i + step / 2, y, r, Math.PI, 0, true); ctx.lineTo(i + step, y); }
    for (let i = y; i < y + h; i += step) { ctx.lineTo(x + w, i + step / 2 - r); ctx.arc(x + w, i + step / 2, r, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(x + w, i + step); }
    for (let i = x + w; i > x; i -= step) { ctx.lineTo(i - step / 2 + r, y + h); ctx.arc(i - step / 2, y + h, r, 0, Math.PI, true); ctx.lineTo(i - step, y + h); }
    for (let i = y + h; i > y; i -= step) { ctx.lineTo(x, i - step / 2 + r); ctx.arc(x, i - step / 2, r, Math.PI / 2, -Math.PI / 2, true); ctx.lineTo(x, i - step); }
    ctx.closePath();
  },
  puzzle: (ctx) => {
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(150, 40); ctx.bezierCurveTo(150, 10, 210, 10, 210, 40); ctx.lineTo(320, 40);
    ctx.lineTo(320, 220); ctx.bezierCurveTo(290, 220, 290, 280, 320, 280); ctx.lineTo(320, 460);
    ctx.lineTo(210, 460); ctx.bezierCurveTo(210, 430, 150, 430, 150, 460); ctx.lineTo(40, 460);
    ctx.lineTo(40, 280); ctx.bezierCurveTo(70, 280, 70, 220, 40, 220); ctx.closePath();
  },

  // --- GEOMETRİK VE MODERN ---
  diagonal: (ctx) => {
    ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(340, 80); ctx.lineTo(320, 490); ctx.lineTo(20, 430); ctx.closePath();
  },
  diagonalSplit: (ctx) => {
    ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(360, 0); ctx.lineTo(360, 420); ctx.lineTo(0, 500); ctx.closePath();
  },
  hexagon: (ctx) => {
    ctx.beginPath(); ctx.moveTo(180, 25); ctx.lineTo(335, 125); ctx.lineTo(335, 385); ctx.lineTo(180, 485); ctx.lineTo(25, 385); ctx.lineTo(25, 125); ctx.closePath();
  },
  diamond: (ctx) => {
    ctx.beginPath(); ctx.moveTo(180, 15); ctx.lineTo(345, 254); ctx.lineTo(180, 495); ctx.lineTo(15, 254); ctx.closePath();
  },
  badge: (ctx) => {
    ctx.beginPath();
    const cx = 180, cy = 254, rOuter = 160, rInner = 140, points = 16;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i * Math.PI) / points;
      ctx.lineTo(cx + r * Math.sin(a), cy - r * Math.cos(a));
    }
    ctx.closePath();
  },
  circle: (ctx) => {
    ctx.beginPath(); ctx.arc(180, 254, 160, 0, Math.PI * 2); ctx.closePath();
  },
  ellipse: (ctx) => {
    ctx.beginPath(); ctx.ellipse(180, 254, 145, 220, 0, 0, Math.PI * 2); ctx.closePath();
  },
  windowGrid: (ctx) => {
    const gap = 12, pad = 25, w = (360 - pad * 2 - gap) / 2, h = (509 - pad * 2 - gap) / 2;
    ctx.beginPath(); ctx.rect(pad, pad, w, h); ctx.rect(pad + w + gap, pad, w, h);
    ctx.rect(pad, pad + h + gap, w, h); ctx.rect(pad + w + gap, pad + h + gap, w, h); ctx.closePath();
  }
};