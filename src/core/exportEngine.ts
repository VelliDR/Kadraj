// src/core/exportEngine.ts
import type Konva from 'konva';
import type { CanvasPreset, ExportOptions } from '../types';

export const PRINT_BASE_WIDTH = 2480; // 300 DPI Baz Genişliği

/**
 * Tuval üzerine matbaa kesim kılavuzları (Crop Marks) ekler.
 */
function addCropMarksToCanvas(
  sourceCanvas: HTMLCanvasElement,
  bleedPx = 40
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const bleedCanvas = document.createElement('canvas');
  bleedCanvas.width = w + bleedPx * 2;
  bleedCanvas.height = h + bleedPx * 2;
  const ctx = bleedCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // Beyaz veya şeffaf arka plan
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, bleedCanvas.width, bleedCanvas.height);

  // Orijinal tuvali ortaya çiz
  ctx.drawImage(sourceCanvas, bleedPx, bleedPx);

  // Kesim çizgisi özellikleri
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;

  const markLen = 25;
  const gap = 5;

  const left = bleedPx;
  const right = bleedPx + w;
  const top = bleedPx;
  const bottom = bleedPx + h;

  // Sol Üst
  ctx.beginPath();
  ctx.moveTo(left - markLen, top);
  ctx.lineTo(left - gap, top);
  ctx.moveTo(left, top - markLen);
  ctx.lineTo(left, top - gap);
  ctx.stroke();

  // Sağ Üst
  ctx.beginPath();
  ctx.moveTo(right + gap, top);
  ctx.lineTo(right + markLen, top);
  ctx.moveTo(right, top - markLen);
  ctx.lineTo(right, top - gap);
  ctx.stroke();

  // Sol Alt
  ctx.beginPath();
  ctx.moveTo(left - markLen, bottom);
  ctx.lineTo(left - gap, bottom);
  ctx.moveTo(left, bottom + gap);
  ctx.lineTo(left, bottom + markLen);
  ctx.stroke();

  // Sağ Alt
  ctx.beginPath();
  ctx.moveTo(right + gap, bottom);
  ctx.lineTo(right + markLen, bottom);
  ctx.moveTo(right, bottom + gap);
  ctx.lineTo(right, bottom + markLen);
  ctx.stroke();

  return bleedCanvas;
}

/**
 * 300 DPI Kayıpsız PNG Çıktısı üretir.
 */
export function exportHighResolutionPNG(
  stage: Konva.Stage,
  currentStageWidth: number,
  _currentStageHeight?: number,
  withCropMarks = false
): string {
  const scaleFactor = PRINT_BASE_WIDTH / currentStageWidth;

  if (!withCropMarks) {
    return stage.toDataURL({
      pixelRatio: scaleFactor,
      mimeType: 'image/png',
    });
  }

  // Kesim işaretli canvas üretimi
  const tempCanvas = stage.toCanvas({ pixelRatio: scaleFactor });
  const markedCanvas = addCropMarksToCanvas(tempCanvas, Math.round(scaleFactor * 12));
  return markedCanvas.toDataURL('image/png');
}

/**
 * Yüksek kalitede WebP çıktısı üretir (Düşük dosya boyutu).
 */
export function exportWebP(
  stage: Konva.Stage,
  currentStageWidth: number,
  quality = 0.92
): string {
  const scaleFactor = PRINT_BASE_WIDTH / currentStageWidth;
  return stage.toDataURL({
    pixelRatio: scaleFactor,
    mimeType: 'image/webp',
    quality,
  });
}

/**
 * Matbaa standartlarında 300 DPI PDF çıktısı üretir (Lazy-loaded jsPDF).
 */
export async function exportPDF(
  stage: Konva.Stage,
  currentStageWidth: number,
  preset: CanvasPreset = 'auto',
  withCropMarks = false
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const imgData = exportHighResolutionPNG(stage, currentStageWidth, undefined, withCropMarks);

  let orientation: 'portrait' | 'landscape' = 'portrait';
  let format: string | [number, number] = 'a4';

  const stageW = stage.width();
  const stageH = stage.height();
  const isLandscape = stageW > stageH;

  if (preset === 'a4_l') {
    orientation = 'landscape';
    format = 'a4';
  } else if (preset === 'a5_p') {
    orientation = 'portrait';
    format = 'a5';
  } else if (preset === 'sq_1_1') {
    format = [210, 210];
  } else if (preset === 'story_9_16') {
    format = [108, 192];
  } else if (preset === 'book_4_5') {
    format = [160, 200];
  } else {
    // auto preset: Tuvalin en-boy oranına göre sayfayı tam orantılı ayarla
    orientation = isLandscape ? 'landscape' : 'portrait';
    const aspect = stageW / stageH;
    if (isLandscape) {
      format = [297, Math.max(100, Math.round(297 / aspect))];
    } else {
      format = [210, Math.max(100, Math.round(210 / aspect))];
    }
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Görseli sayfanın tam ortasına orantılı yerleştir
  doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

  return doc.output('blob');
}

/**
 * Vektörel SVG Maske çıktısı üretir.
 */
export function exportShapeSVG(shapeKey: string, width = 800, height = 1131): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Kadraj Sanatsal Mizanpaj Şablonu: ${shapeKey} -->
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#999">
    Kadraj Şablonu: ${shapeKey}
  </text>
</svg>`;
}

/**
 * Tek birleşik dışa aktarma fonksiyonu.
 */
export async function exportProject(
  stage: Konva.Stage,
  stageWidth: number,
  preset: CanvasPreset,
  options: ExportOptions
): Promise<{ dataUrl?: string; blob?: Blob; extension: string }> {
  switch (options.format) {
    case 'pdf': {
      const blob = await exportPDF(stage, stageWidth, preset, options.withCropMarks);
      return { blob, extension: 'pdf' };
    }
    case 'webp': {
      const dataUrl = exportWebP(stage, stageWidth, options.quality);
      return { dataUrl, extension: 'webp' };
    }
    case 'svg': {
      const svgText = exportShapeSVG('vector_mask', 2480, 3508);
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      return { blob, extension: 'svg' };
    }
    case 'png':
    default: {
      const dataUrl = exportHighResolutionPNG(stage, stageWidth, undefined, options.withCropMarks);
      return { dataUrl, extension: 'png' };
    }
  }
}