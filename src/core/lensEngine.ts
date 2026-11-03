// src/core/lensEngine.ts
import type { LensConfig, LensTint, SerializedLensItem } from '../types';

export const DEFAULT_LENS_CONFIG: LensConfig = {
  enabled: false,
  zoom: 1.6,
  bulge: 35,
  aberration: 3,
  tint: 'none',
  glassReflect: true,
};

export const TINT_COLORS: Record<LensTint, string | null> = {
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
 * 
 * Çoklu mercek desteği için odak noktası (focusPoint) alabilir.
 */
export function generateLensCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  lensWidth: number,
  lensHeight: number,
  config: LensConfig | SerializedLensItem,
  imagePosition?: { x: number; y: number; width: number; height: number } | null,
  focusPoint?: { x: number; y: number } | null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(10, Math.round(lensWidth));
  canvas.height = Math.max(10, Math.round(lensHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const zoom = Math.max(1.0, config.zoom || 1.6);

  // 1. ADIM: Mercek Büyütmesi (Lens Zoom) ve Odaklama
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);

  if (focusPoint && imagePosition) {
    // Merceğin merkezini sahnede durduğu odak noktasına göre ötele
    const offsetX = imagePosition.x - focusPoint.x;
    const offsetY = imagePosition.y - focusPoint.y;
    ctx.drawImage(source, offsetX, offsetY, imagePosition.width, imagePosition.height);
  } else if (imagePosition) {
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(source, imagePosition.x, imagePosition.y, imagePosition.width, imagePosition.height);
  } else {
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(source, 0, 0, w, h);
  }
  ctx.restore();

  // 2. ADIM: Balıkgözü / Küresel Bombe ve Kromatik Aberasyon (Prizma Kırılması)
  const bulge = config.bulge !== undefined ? config.bulge : 35;
  const aberration = config.aberration !== undefined ? config.aberration : 3;

  if (bulge > 0 || aberration > 0) {
    applyOpticalDistortion(ctx, w, h, bulge, aberration);
  }

  // 3. ADIM: Renkli Cam Filtresi (Minami Prizma Tonları)
  const tint = config.tint || 'none';
  const tintColor = TINT_COLORS[tint];
  if (tintColor) {
    ctx.save();
    ctx.fillStyle = tintColor;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w, h);

    // Canlılığı artırmak için hafif color-dodge/overlay geçişi
    ctx.fillStyle = tintColor.replace(/[\d.]+\)$/, '0.14)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // 4. ADIM: Cam Yansıması ve Parıltı (Glass Sheen / Specular Light)
  if (config.glassReflect !== false) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');

    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, w, h);
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
  const maxR2 = maxR * maxR;

  // Normalize edilmiş distorsiyon katsayısı
  const bulgeStrength = (bulgeAmount / 100) * 0.45;
  const aberFactor = (aberrationPx / maxR) * 1.5;

  for (let y = 0; y < h; y += 1) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const dstRowOffset = y * w * 4;

    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const r2 = dx * dx + dy2;

      if (r2 <= 0 || r2 >= maxR2) continue;

      const normR2 = r2 / maxR2;
      // Küresel mercek eğrilik formülü (Analitik vektörel sadeleştirme)
      const factorG = 1 - bulgeStrength * (1 - normR2);
      const factorR = factorG * (1 - aberFactor);
      const factorB = factorG * (1 + aberFactor);

      const dstIdx = dstRowOffset + x * 4;

      // Yeşil Kanal (Ana Merkez)
      const srcXG = Math.round(cx + dx * factorG);
      const srcYG = Math.round(cy + dy * factorG);
      if (srcXG >= 0 && srcXG < w && srcYG >= 0 && srcYG < h) {
        const srcIdxG = (srcYG * w + srcXG) * 4;
        dst[dstIdx + 1] = src[srcIdxG + 1];
        dst[dstIdx + 3] = src[srcIdxG + 3];
      }

      // Kırmızı Kanal (Prizma Kırılması İç)
      const srcXR = Math.round(cx + dx * factorR);
      const srcYR = Math.round(cy + dy * factorR);
      if (srcXR >= 0 && srcXR < w && srcYR >= 0 && srcYR < h) {
        const srcIdxR = (srcYR * w + srcXR) * 4;
        dst[dstIdx] = src[srcIdxR];
      }

      // Mavi Kanal (Prizma Kırılması Dış)
      const srcXB = Math.round(cx + dx * factorB);
      const srcYB = Math.round(cy + dy * factorB);
      if (srcXB >= 0 && srcXB < w && srcYB >= 0 && srcYB < h) {
        const srcIdxB = (srcYB * w + srcXB) * 4;
        dst[dstIdx + 2] = src[srcIdxB + 2];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
