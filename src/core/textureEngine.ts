// src/core/textureEngine.ts
import type { TextureType, TextureBlendMode } from '../types';

/**
 * Prosedürel (kod tabanlı) sanatsal kağıt dokuları ve film greni üreticisi.
 * Harici dosya indirme gerektirmez (0 KB network), tamamen istemci tarafında
 * yüksek çözünürlüklü ve kayıpsız olarak üretilir.
 */
export function generateTextureCanvas(
  type: TextureType,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (type === 'none') return null;

  const canvas = document.createElement('canvas');
  // Performans ve keskinlik dengesi için uygun boyutlandırma
  canvas.width = Math.max(256, Math.min(width, 1600));
  canvas.height = Math.max(256, Math.min(height, 1600));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;

  switch (type) {
    case 'parchment':
      renderParchment(ctx, w, h);
      break;
    case 'newsprint':
      renderNewsprint(ctx, w, h);
      break;
    case 'coated':
      renderCoated(ctx, w, h);
      break;
    case 'grain':
      renderFilmGrain(ctx, w, h);
      break;
    case 'linen':
      renderLinen(ctx, w, h);
      break;
    default:
      return null;
  }

  return canvas;
}

/**
 * 1. Parşömen (Parchment): Sıcak, hafif lifli, antik edebiyat dergisi dokusu
 */
function renderParchment(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Sıcak bej/kum baz rengi
  ctx.fillStyle = '#f6f0dd';
  ctx.fillRect(0, 0, w, h);

  // Mikro gürültü ve leke katmanı
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
  }
  ctx.putImageData(imgData, 0, 0);

  // Organik lif çizgileri
  ctx.strokeStyle = 'rgba(120, 95, 60, 0.08)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 35;
      y += (Math.random() - 0.5) * 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * 2. Saman Kağıdı / Gazete (Newsprint): Mat, nostaljik gri-bej, lif benekleri
 */
function renderNewsprint(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#eae4d3';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const noise = (Math.random() - 0.5) * 32;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.9));
  }
  ctx.putImageData(imgData, 0, 0);

  // Koyu saman benekleri
  ctx.fillStyle = 'rgba(70, 55, 40, 0.18)';
  for (let i = 0; i < 120; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const rSize = 0.6 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rSize * 1.8, rSize, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 3. Kuşe Kağıt (Coated Paper): Temiz, pürüzsüz çağdaş dergi dokusu
 */
function renderCoated(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * 4. Analog Film Greni (35mm Grain): Sinematik monokrom gürültü
 */
function renderFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    // Yüksek kontrastlı gürültü
    const noise = (Math.random() - 0.5) * 65;
    const val = Math.min(255, Math.max(0, 128 + noise));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * 5. Keten / Tuval (Linen Cloth): Sanatsal mikro örgü dokuma
 */
function renderLinen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#f0ede5';
  ctx.fillRect(0, 0, w, h);

  // Yatay ve dikey ince çizgilerle örgü oluşturma
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;

  const step = 4;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 0.5, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 0.5, h);
    ctx.stroke();
  }

  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 0.5);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 0.5);
    ctx.stroke();
  }

  // Hafif zemin greni ekle
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Doku tipi için varsayılan uygun karışım modunu döner
 */
export function getDefaultBlendModeForTexture(type: TextureType): TextureBlendMode {
  switch (type) {
    case 'grain':
      return 'overlay';
    case 'parchment':
    case 'newsprint':
    case 'linen':
      return 'multiply';
    case 'coated':
      return 'soft-light';
    default:
      return 'multiply';
  }
}
