// src/core/lensEngine.ts
import type { LensConfig, LensTint } from '../types';

export const DEFAULT_LENS_CONFIG: LensConfig = {
  enabled: false,
  zoom: 1.6,
  bulge: 35,
  aberration: 3,
  tint: 'none',
  glassReflect: true,
};

const TINT_COLORS: Record<LensTint, string | null> = {
  none: null,
  emerald: 'rgba(0, 230, 118, 0.28)', // Minami Zümrüt Yeşili
  sky: 'rgba(0, 176, 255, 0.28)',     // Gökyüzü Cam Mavisi
  storm: 'rgba(69, 90, 100, 0.40)',    // Fırtına Grisi
  amber: 'rgba(255, 179, 0, 0.28)',   // Nostaljik Kehribar
  rose: 'rgba(255, 64, 129, 0.26)',    // Neon Pembe
};

/**
 * Optik mercek distorsiyonu (Büyüteç, Balıkgözü bombe ve Kromatik Aberasyon)
 * uygular ve saf Canvas 2D üzerinde çizim üretir.
 */
export function generateLensCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  stageWidth: number,
  stageHeight: number,
  config: LensConfig,
  imagePosition?: { x: number; y: number; width: number; height: number } | null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = stageWidth;
  canvas.height = stageHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. ADIM: Mercek Büyütmesi (Lens Zoom)
  // Görüntüyü mercek zoom faktörüyle sahne merkezinden büyüt
  const zoom = Math.max(1.0, config.zoom);
  const cx = stageWidth / 2;
  const cy = stageHeight / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  if (imagePosition) {
    ctx.drawImage(source, imagePosition.x, imagePosition.y, imagePosition.width, imagePosition.height);
  } else {
    ctx.drawImage(source, 0, 0, stageWidth, stageHeight);
  }
  ctx.restore();

  // 2. ADIM: Balıkgözü / Küresel Bombe ve Kromatik Aberasyon (Prizma Kırılması)
  if (config.bulge > 0 || config.aberration > 0) {
    applyOpticalDistortion(ctx, stageWidth, stageHeight, config.bulge, config.aberration);
  }

  // 3. ADIM: Renkli Cam Filtresi (Minami Prizma Tonları)
  const tintColor = TINT_COLORS[config.tint];
  if (tintColor) {
    ctx.save();
    ctx.fillStyle = tintColor;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, stageWidth, stageHeight);

    // Canlılığı artırmak için hafif color-dodge geçişi
    ctx.fillStyle = tintColor.replace(/[\d.]+\)$/, '0.12)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.restore();
  }

  // 4. ADIM: Cam Yansıması ve Parıltı (Glass Sheen / Specular Light)
  if (config.glassReflect) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, stageWidth, stageHeight);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.18)');

    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.restore();
  }

  return canvas;
}

/**
 * Optik Balıkgözü (Bulge) ve Kromatik Aberasyon (RGB Ayrışması) piksel dönüşümü.
 */
function applyOpticalDistortion(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bulgeAmount: number,
  aberrationPx: number
): void {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);

  // Normalize edilmiş distorsiyon katsayısı
  const bulgeStrength = (bulgeAmount / 100) * 0.45;
  const aberFactor = (aberrationPx / maxR) * 1.5;

  for (let y = 0; y < h; y += 1) {
    const dy = y - cy;
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const r = Math.hypot(dx, dy);
      const normR = r / maxR;

      if (normR <= 0 || normR >= 1.0) continue;

      // Küresel mercek eğrilik formülü (Merkez dışarı doğru yayılır)
      const factor = 1 - bulgeStrength * (1 - normR * normR);
      const angle = Math.atan2(dy, dx);

      const rGreen = r * factor;
      const rRed = r * (factor * (1 - aberFactor));
      const rBlue = r * (factor * (1 + aberFactor));

      const dstIdx = (y * w + x) * 4;

      // Yeşil Kanal (Ana Merkez)
      const srcXG = Math.round(cx + Math.cos(angle) * rGreen);
      const srcYG = Math.round(cy + Math.sin(angle) * rGreen);
      if (srcXG >= 0 && srcXG < w && srcYG >= 0 && srcYG < h) {
        const srcIdxG = (srcYG * w + srcXG) * 4;
        dst[dstIdx + 1] = src[srcIdxG + 1];
        dst[dstIdx + 3] = src[srcIdxG + 3];
      }

      // Kırmızı Kanal (Prizma Kırılması İç)
      const srcXR = Math.round(cx + Math.cos(angle) * rRed);
      const srcYR = Math.round(cy + Math.sin(angle) * rRed);
      if (srcXR >= 0 && srcXR < w && srcYR >= 0 && srcYR < h) {
        const srcIdxR = (srcYR * w + srcXR) * 4;
        dst[dstIdx] = src[srcIdxR];
      }

      // Mavi Kanal (Prizma Kırılması Dış)
      const srcXB = Math.round(cx + Math.cos(angle) * rBlue);
      const srcYB = Math.round(cy + Math.sin(angle) * rBlue);
      if (srcXB >= 0 && srcXB < w && srcYB >= 0 && srcYB < h) {
        const srcIdxB = (srcYB * w + srcXB) * 4;
        dst[dstIdx + 2] = src[srcIdxB + 2];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
