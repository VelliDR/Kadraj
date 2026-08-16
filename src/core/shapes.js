// src/core/shapes.js

export const SHAPES = {
  // --- AKIŞKAN VE ORGANİK ---
  fluidRiver: (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.38, 0); 
    ctx.bezierCurveTo(w * 0.41, h * 0.31, w * 0.8, h * 0.47, w, h * 0.6); 
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.66, h); 
    ctx.bezierCurveTo(w * 0.63, h * 0.72, w * 0.25, h * 0.55, 0, h * 0.35); 
    ctx.lineTo(0, 0); 
    ctx.closePath();
  },
  fluidCorners: (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.38, 0); 
    ctx.bezierCurveTo(w * 0.41, h * 0.31, w * 0.8, h * 0.47, w, h * 0.6); 
    ctx.lineTo(w, 0); 
    ctx.closePath();
    
    ctx.moveTo(0, h * 0.35); 
    ctx.bezierCurveTo(w * 0.25, h * 0.55, w * 0.63, h * 0.72, w * 0.66, h); 
    ctx.lineTo(0, h); 
    ctx.closePath();
  },
  blob: (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.08); 
    ctx.bezierCurveTo(w * 0.83, h * 0.06, w * 0.97, h * 0.29, w * 0.91, h * 0.55); 
    ctx.bezierCurveTo(w * 0.86, h * 0.82, w * 0.69, h * 0.94, w * 0.44, h * 0.92);
    ctx.bezierCurveTo(w * 0.13, h * 0.9, w * 0.05, h * 0.74, w * 0.08, h * 0.49); 
    ctx.bezierCurveTo(w * 0.11, h * 0.19, w * 0.22, h * 0.09, w * 0.5, h * 0.08); 
    ctx.closePath();
  },
  waveTop: (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(0, h * 0.23); 
    ctx.bezierCurveTo(w * 0.25, h * 0.11, w * 0.5, h * 0.35, w * 0.75, h * 0.19); 
    ctx.bezierCurveTo(w * 0.87, h * 0.11, w * 0.94, h * 0.15, w, h * 0.21);
    ctx.lineTo(w, h); 
    ctx.lineTo(0, h); 
    ctx.closePath();
  },

  // --- MİMARİ VE RETRO ---
  arch: (ctx, w, h) => {
    const pad = w * 0.08;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad); 
    ctx.lineTo(pad, h * 0.35); 
    ctx.bezierCurveTo(pad, pad * 0.5, w - pad, pad * 0.5, w - pad, h * 0.35);
    ctx.lineTo(w - pad, h - pad); 
    ctx.closePath();
  },
  doubleArch: (ctx, w, h) => {
    const padX = w * 0.05;
    const padY = h * 0.04;
    const archW = (w - (padX * 3)) / 2;
    
    ctx.beginPath();
    // Sol Kemer
    ctx.moveTo(padX, h - padY); 
    ctx.lineTo(padX, h * 0.3); 
    ctx.bezierCurveTo(padX, h * 0.1, padX + archW, h * 0.1, padX + archW, h * 0.3); 
    ctx.lineTo(padX + archW, h - padY); 
    ctx.closePath();
    
    // Sağ Kemer
    const rightX = padX * 2 + archW;
    ctx.moveTo(rightX, h - padY); 
    ctx.lineTo(rightX, h * 0.3); 
    ctx.bezierCurveTo(rightX, h * 0.1, rightX + archW, h * 0.1, rightX + archW, h * 0.3); 
    ctx.lineTo(rightX + archW, h - padY); 
    ctx.closePath();
  },
  cinemaFrame: (ctx, w, h) => {
    const x = w * 0.07, y = h * 0.06, fw = w * 0.86, fh = h * 0.88, r = Math.min(w, h) * 0.1;
    ctx.beginPath(); 
    ctx.moveTo(x + r, y); ctx.lineTo(x + fw - r, y); ctx.arcTo(x + fw, y, x + fw, y + r, r);
    ctx.lineTo(x + fw, y + fh - r); ctx.arcTo(x + fw, y + fh, x + fw - r, y + fh, r); ctx.lineTo(x + r, y + fh);
    ctx.arcTo(x, y + fh, x, y + fh - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); 
    ctx.closePath();
  },
  ticket: (ctx, w, h) => {
    const x = w * 0.05, y = h * 0.08, fw = w * 0.9, fh = h * 0.84, r = Math.min(w, h) * 0.08;
    ctx.beginPath(); 
    ctx.moveTo(x, y); ctx.lineTo(x + fw, y); ctx.lineTo(x + fw, y + fh / 2 - r);
    ctx.arc(x + fw, y + fh / 2, r, -Math.PI / 2, Math.PI / 2, true); 
    ctx.lineTo(x + fw, y + fh); ctx.lineTo(x, y + fh);
    ctx.lineTo(x, y + fh / 2 + r); 
    ctx.arc(x, y + fh / 2, r, Math.PI / 2, -Math.PI / 2, true); 
    ctx.closePath();
  },

  // --- YIRTIK VE DOKULU ---
  torn1: (ctx, w, h) => {
    ctx.beginPath(); 
    ctx.moveTo(w * 0.07, h * 0.04); 
    ctx.lineTo(w * 0.93, h * 0.03); 
    ctx.quadraticCurveTo(w * 0.88, h * 0.5, w * 0.95, h * 0.96);
    ctx.lineTo(w * 0.04, h * 0.97); 
    ctx.quadraticCurveTo(w * 0.11, h * 0.5, w * 0.07, h * 0.04); 
    ctx.closePath();
  },
  torn2: (ctx, w, h) => {
    ctx.beginPath(); 
    const pad = w * 0.05;
    ctx.moveTo(pad, h * 0.06); 
    ctx.lineTo(w - pad, h * 0.06); 
    ctx.lineTo(w - pad, h * 0.82);
    
    const teethCount = 15;
    const step = (w - pad * 2) / teethCount;
    for (let i = w - pad; i > pad; i -= step) {
      // Rastgelelik hissi vermek için matematiksel zig-zag
      ctx.lineTo(i - step / 2, h * 0.82 + ((Math.round(i) % 3 === 0) ? h * 0.05 : -h * 0.02));
    }
    ctx.lineTo(pad, h * 0.82); 
    ctx.closePath();
  },
  tornWindow: (ctx, w, h) => {
    ctx.beginPath(); 
    const padX = w * 0.1;
    const padY = h * 0.12;
    ctx.moveTo(padX, padY);
    
    const stepX = (w - padX * 2) / 10;
    for (let i = padX; i < w - padX; i += stepX) {
      ctx.lineTo(i + stepX / 2, padY + ((Math.round(i) % 3 === 0) ? h * 0.02 : -h * 0.015));
    }
    ctx.lineTo(w - padX, h - padY);
    
    for (let i = w - padX; i > padX; i -= stepX) {
      ctx.lineTo(i - stepX / 2, h - padY + ((Math.round(i) % 3 === 0) ? -h * 0.02 : h * 0.015));
    }
    ctx.lineTo(padX, padY); 
    ctx.closePath();
  },
  stamp: (ctx, w, h) => {
    ctx.beginPath();
    const px = w * 0.05, py = h * 0.05, pw = w * 0.9, ph = h * 0.9;
    const r = Math.min(w, h) * 0.015;
    const stepsX = Math.floor(pw / (r * 4));
    const stepW = pw / stepsX;
    const stepsY = Math.floor(ph / (r * 4));
    const stepH = ph / stepsY;

    ctx.moveTo(px, py);
    for (let i = 0; i < stepsX; i++) { ctx.lineTo(px + i * stepW + stepW / 2 - r, py); ctx.arc(px + i * stepW + stepW / 2, py, r, Math.PI, 0, true); ctx.lineTo(px + (i + 1) * stepW, py); }
    for (let i = 0; i < stepsY; i++) { ctx.lineTo(px + pw, py + i * stepH + stepH / 2 - r); ctx.arc(px + pw, py + i * stepH + stepH / 2, r, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(px + pw, py + (i + 1) * stepH); }
    for (let i = stepsX; i > 0; i--) { ctx.lineTo(px + i * stepW - stepW / 2 + r, py + ph); ctx.arc(px + i * stepW - stepW / 2, py + ph, r, 0, Math.PI, true); ctx.lineTo(px + (i - 1) * stepW, py + ph); }
    for (let i = stepsY; i > 0; i--) { ctx.lineTo(px, py + i * stepH - stepH / 2 + r); ctx.arc(px, py + i * stepH - stepH / 2, r, Math.PI / 2, -Math.PI / 2, true); ctx.lineTo(px, py + (i - 1) * stepH); }
    ctx.closePath();
  },
  puzzle: (ctx, w, h) => {
    const x = w * 0.1, y = h * 0.1, pw = w * 0.8, ph = h * 0.8;
    const knob = Math.min(w, h) * 0.08;
    
    ctx.beginPath(); 
    // Üst kenar
    ctx.moveTo(x, y); 
    ctx.lineTo(x + pw/2 - knob, y); 
    ctx.bezierCurveTo(x + pw/2 - knob, y - knob*2, x + pw/2 + knob, y - knob*2, x + pw/2 + knob, y); 
    ctx.lineTo(x + pw, y);
    // Sağ kenar
    ctx.lineTo(x + pw, y + ph/2 - knob); 
    ctx.bezierCurveTo(x + pw - knob*2, y + ph/2 - knob, x + pw - knob*2, y + ph/2 + knob, x + pw, y + ph/2 + knob); 
    ctx.lineTo(x + pw, y + ph);
    // Alt kenar
    ctx.lineTo(x + pw/2 + knob, y + ph); 
    ctx.bezierCurveTo(x + pw/2 + knob, y + ph - knob*2, x + pw/2 - knob, y + ph - knob*2, x + pw/2 - knob, y + ph); 
    ctx.lineTo(x, y + ph);
    // Sol kenar
    ctx.lineTo(x, y + ph/2 + knob); 
    ctx.bezierCurveTo(x + knob*2, y + ph/2 + knob, x + knob*2, y + ph/2 - knob, x, y + ph/2 - knob); 
    ctx.closePath();
  },

  // --- GEOMETRİK VE MODERN ---
  diagonal: (ctx, w, h) => {
    ctx.beginPath(); 
    ctx.moveTo(w * 0.1, h * 0.04); 
    ctx.lineTo(w * 0.94, h * 0.15); 
    ctx.lineTo(w * 0.88, h * 0.96); 
    ctx.lineTo(w * 0.05, h * 0.84); 
    ctx.closePath();
  },
  diagonalSplit: (ctx, w, h) => {
    ctx.beginPath(); 
    ctx.moveTo(0, h * 0.15); 
    ctx.lineTo(w, 0); 
    ctx.lineTo(w, h * 0.82); 
    ctx.lineTo(0, h * 0.98); 
    ctx.closePath();
  },
  hexagon: (ctx, w, h) => {
    ctx.beginPath(); 
    ctx.moveTo(w * 0.5, h * 0.05); 
    ctx.lineTo(w * 0.93, h * 0.25); 
    ctx.lineTo(w * 0.93, h * 0.75); 
    ctx.lineTo(w * 0.5, h * 0.95); 
    ctx.lineTo(w * 0.07, h * 0.75); 
    ctx.lineTo(w * 0.07, h * 0.25); 
    ctx.closePath();
  },
  diamond: (ctx, w, h) => {
    ctx.beginPath(); 
    ctx.moveTo(w * 0.5, h * 0.03); 
    ctx.lineTo(w * 0.95, h * 0.5); 
    ctx.lineTo(w * 0.5, h * 0.97); 
    ctx.lineTo(w * 0.05, h * 0.5); 
    ctx.closePath();
  },
  badge: (ctx, w, h) => {
    ctx.beginPath();
    const cx = w / 2, cy = h / 2;
    // Yıldız formu için ekranın dar kenarını baz al
    const minD = Math.min(w, h);
    const rOuter = minD * 0.45;
    const rInner = minD * 0.38;
    const points = 16;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i * Math.PI) / points;
      ctx.lineTo(cx + r * Math.sin(a), cy - r * Math.cos(a));
    }
    ctx.closePath();
  },
  circle: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.45;
    ctx.beginPath(); 
    ctx.arc(cx, cy, r, 0, Math.PI * 2); 
    ctx.closePath();
  },
  ellipse: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    ctx.beginPath(); 
    ctx.ellipse(cx, cy, w * 0.4, h * 0.43, 0, 0, Math.PI * 2); 
    ctx.closePath();
  },
  windowGrid: (ctx, w, h) => {
    const gap = w * 0.03, padX = w * 0.07, padY = h * 0.05;
    const rw = (w - padX * 2 - gap) / 2;
    const rh = (h - padY * 2 - gap) / 2;
    ctx.beginPath(); 
    ctx.rect(padX, padY, rw, rh); 
    ctx.rect(padX + rw + gap, padY, rw, rh);
    ctx.rect(padX, padY + rh + gap, rw, rh); 
    ctx.rect(padX + rw + gap, padY + rh + gap, rw, rh); 
    ctx.closePath();
  }
};