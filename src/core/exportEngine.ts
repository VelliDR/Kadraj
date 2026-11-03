// src/core/exportEngine.ts
import type Konva from 'konva';
import type { CanvasPreset, ExportOptions, TextureConfig } from '../types';
import { SHAPES } from './shapes';
import { generateTextureCanvas } from './textureEngine';

export const PRINT_BASE_WIDTH = 2480; // 300 DPI A4 Baz Genişliği

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

  // Beyaz arka plan
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
 * Dışa aktarılan tuval üzerine yüksek çözünürlüklü prosedürel dokuyu
 * donanım destekli doğrudan Canvas 2D blend modu ile giydirir.
 */
function applyExportTexture(
  targetCanvas: HTMLCanvasElement,
  textureConfig?: TextureConfig
): void {
  if (!textureConfig || textureConfig.type === 'none' || textureConfig.opacity <= 0) {
    return;
  }

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const texCanvas = generateTextureCanvas(textureConfig.type, w, h, Math.max(w, h));
  if (!texCanvas) return;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.globalAlpha = textureConfig.opacity;
  ctx.globalCompositeOperation = textureConfig.blendMode;
  ctx.drawImage(texCanvas, 0, 0, w, h);
  ctx.restore();
}

function captureStageClean(stage: Konva.Stage, scaleFactor: number): HTMLCanvasElement {
  const texLayer = stage.findOne('#textureLayer') || stage.findOne('.texture-layer');
  const wasVisible = texLayer ? texLayer.visible() : false;
  if (texLayer) texLayer.visible(false);

  const rawCanvas = stage.toCanvas({ pixelRatio: scaleFactor });

  if (texLayer) texLayer.visible(wasVisible);
  return rawCanvas;
}

/**
 * Kullanıcının seçtiği çözünürlük moduna göre dışa aktarma piksel genişliğini belirler.
 */
export function getExportTargetWidth(
  _currentStageWidth: number,
  options?: ExportOptions
): number {
  const res = options?.resolution || 'original';
  if (res === 'original') {
    if (options?.originalImageWidth && options.originalImageWidth > 0) {
      return Math.round(options.originalImageWidth);
    }
    return PRINT_BASE_WIDTH;
  }
  if (res === 'a3') {
    return 4960; // 300 DPI A3 / 2x Ultra HD
  }
  if (res === 'screen') {
    return 1240; // Web / Dijital Ekran
  }
  // 'a4' veya standart
  return PRINT_BASE_WIDTH; // 2480 (300 DPI A4)
}

/**
 * Saydam arka planların JPEG çıktısında siyah piksellere dönüşmesini önlemek için
 * beyaz opak zemin oluşturur.
 */
function ensureOpaqueCanvas(sourceCanvas: HTMLCanvasElement, bgColor = '#ffffff'): HTMLCanvasElement {
  const opaqueCanvas = document.createElement('canvas');
  opaqueCanvas.width = sourceCanvas.width;
  opaqueCanvas.height = sourceCanvas.height;
  const ctx = opaqueCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return opaqueCanvas;
}

/**
 * Kayıpsız PNG Çıktısı üretir.
 */
export function exportHighResolutionPNG(
  stage: Konva.Stage,
  currentStageWidth: number,
  _currentStageHeight?: number,
  withCropMarks = false,
  textureConfig?: TextureConfig,
  options?: ExportOptions
): string {
  const mergedOptions: ExportOptions = {
    format: 'png',
    withCropMarks,
    ...options,
  };
  const targetWidth = getExportTargetWidth(currentStageWidth, mergedOptions);
  const scaleFactor = targetWidth / currentStageWidth;
  const rawCanvas = captureStageClean(stage, scaleFactor);

  // Yüksek çözünürlüklü dokuyu uygula
  if (textureConfig && textureConfig.type !== 'none') {
    applyExportTexture(rawCanvas, textureConfig);
  }

  if (!mergedOptions.withCropMarks) {
    return rawCanvas.toDataURL('image/png');
  }

  // Kesim işaretli canvas üretimi
  const markedCanvas = addCropMarksToCanvas(rawCanvas, Math.round(scaleFactor * 12));
  return markedCanvas.toDataURL('image/png');
}

/**
 * Yüksek kalitede JPEG / JPG çıktısı üretir (Beyaz opak zemin destekli).
 */
export function exportHighResolutionJPEG(
  stage: Konva.Stage,
  currentStageWidth: number,
  quality = 0.95,
  withCropMarks = false,
  textureConfig?: TextureConfig,
  options?: ExportOptions
): string {
  const mergedOptions: ExportOptions = {
    format: 'jpeg',
    quality,
    withCropMarks,
    ...options,
  };
  const targetWidth = getExportTargetWidth(currentStageWidth, mergedOptions);
  const scaleFactor = targetWidth / currentStageWidth;
  const rawCanvas = captureStageClean(stage, scaleFactor);

  if (textureConfig && textureConfig.type !== 'none') {
    applyExportTexture(rawCanvas, textureConfig);
  }

  const finalCanvas = mergedOptions.withCropMarks
    ? addCropMarksToCanvas(rawCanvas, Math.round(scaleFactor * 12))
    : rawCanvas;

  const opaqueCanvas = ensureOpaqueCanvas(finalCanvas, '#ffffff');
  return opaqueCanvas.toDataURL('image/jpeg', mergedOptions.quality ?? 0.95);
}

/**
 * Yüksek kalitede WebP çıktısı üretir (Düşük dosya boyutu).
 */
export function exportWebP(
  stage: Konva.Stage,
  currentStageWidth: number,
  quality = 0.92,
  textureConfig?: TextureConfig,
  options?: ExportOptions
): string {
  const mergedOptions: ExportOptions = {
    format: 'webp',
    quality,
    ...options,
  };
  const targetWidth = getExportTargetWidth(currentStageWidth, mergedOptions);
  const scaleFactor = targetWidth / currentStageWidth;
  const rawCanvas = captureStageClean(stage, scaleFactor);

  if (textureConfig && textureConfig.type !== 'none') {
    applyExportTexture(rawCanvas, textureConfig);
  }

  return rawCanvas.toDataURL('image/webp', mergedOptions.quality ?? 0.92);
}

/**
 * Matbaa standartlarında 300 DPI PDF çıktısı üretir (Lazy-loaded jsPDF).
 */
export async function exportPDF(
  stage: Konva.Stage,
  currentStageWidth: number,
  preset: CanvasPreset = 'auto',
  withCropMarks = false,
  textureConfig?: TextureConfig,
  options?: ExportOptions
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const imgData = exportHighResolutionPNG(
    stage,
    currentStageWidth,
    undefined,
    withCropMarks,
    textureConfig,
    options
  );

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
 * CanvasRenderingContext2D komutlarını dinleyerek gerçek vektörel SVG path dizesine dönüştürür.
 */
function recordShapeToSVGPath(
  shapeFunc: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number
): string {
  const commands: string[] = [];
  const fmt = (n: number) => n.toFixed(2);

  const mockCtx = {
    beginPath: () => {},
    closePath: () => commands.push('Z'),
    moveTo: (x: number, y: number) => commands.push(`M ${fmt(x)} ${fmt(y)}`),
    lineTo: (x: number, y: number) => commands.push(`L ${fmt(x)} ${fmt(y)}`),
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
      commands.push(`C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(x)} ${fmt(y)}`);
    },
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => {
      commands.push(`Q ${fmt(cpx)} ${fmt(cpy)}, ${fmt(x)} ${fmt(y)}`);
    },
    arc: (
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise = false
    ) => {
      const x1 = x + radius * Math.cos(startAngle);
      const y1 = y + radius * Math.sin(startAngle);
      const x2 = x + radius * Math.cos(endAngle);
      const y2 = y + radius * Math.sin(endAngle);
      const delta = (endAngle - startAngle + Math.PI * 4) % (Math.PI * 2);
      const largeArc = delta > Math.PI ? 1 : 0;
      const sweep = counterclockwise ? 0 : 1;
      commands.push(`M ${fmt(x1)} ${fmt(y1)} A ${fmt(radius)} ${fmt(radius)} 0 ${largeArc} ${sweep} ${fmt(x2)} ${fmt(y2)}`);
    },
    arcTo: (x1: number, y1: number, _x2: number, _y2: number, _radius: number) => {
      commands.push(`L ${fmt(x1)} ${fmt(y1)}`);
    },
    rect: (x: number, y: number, rw: number, rh: number) => {
      commands.push(`M ${fmt(x)} ${fmt(y)} h ${fmt(rw)} v ${fmt(rh)} h ${fmt(-rw)} Z`);
    },
    ellipse: (
      x: number,
      y: number,
      rx: number,
      ry: number,
      _rotation: number,
      _startAngle: number,
      _endAngle: number
    ) => {
      commands.push(`M ${fmt(x - rx)} ${fmt(y)} a ${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(rx * 2)} 0 a ${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(-rx * 2)} 0`);
    },
  } as unknown as CanvasRenderingContext2D;

  try {
    shapeFunc(mockCtx, w, h);
  } catch (err) {
    console.warn('SVG path kaydı sırasında hata:', err);
  }

  return commands.join(' ');
}

/**
 * Gerçek Vektörel SVG Şablon Maske çıktısı üretir.
 */
export function exportShapeSVG(shapeKey?: string | null, width = 2480, height = 3508): string {
  let pathD = '';
  const title = shapeKey || 'Standart Çerçeve';

  if (shapeKey && SHAPES[shapeKey]) {
    pathD = recordShapeToSVGPath(SHAPES[shapeKey], width, height);
  } else {
    pathD = `M 0 0 h ${width} v ${height} h -${width} Z`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Kadraj Sanatsal Mizanpaj Şablonu: ${title} -->
  <defs>
    <style>
      .mask-shape { fill: #191c20; stroke: #373d49; stroke-width: 2px; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff" />
  <path d="${pathD}" class="mask-shape" />
</svg>`;
}

/**
 * Tek birleşik dışa aktarma fonksiyonu.
 */
export async function exportProject(
  stage: Konva.Stage,
  stageWidth: number,
  preset: CanvasPreset,
  options: ExportOptions,
  shapeKey?: string | null,
  textureConfig?: TextureConfig
): Promise<{ dataUrl?: string; blob?: Blob; extension: string }> {
  switch (options.format) {
    case 'jpeg': {
      const dataUrl = exportHighResolutionJPEG(
        stage,
        stageWidth,
        options.quality ?? 0.95,
        options.withCropMarks,
        textureConfig,
        options
      );
      return { dataUrl, extension: 'jpg' };
    }
    case 'pdf': {
      const blob = await exportPDF(
        stage,
        stageWidth,
        preset,
        options.withCropMarks,
        textureConfig,
        options
      );
      return { blob, extension: 'pdf' };
    }
    case 'webp': {
      const dataUrl = exportWebP(stage, stageWidth, options.quality ?? 0.92, textureConfig, options);
      return { dataUrl, extension: 'webp' };
    }
    case 'svg': {
      const targetWidth = getExportTargetWidth(stageWidth, options);
      const aspect = stage.height() / stage.width();
      const targetHeight = Math.round(targetWidth * aspect);
      const svgText = exportShapeSVG(shapeKey, targetWidth, targetHeight);
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      return { blob, extension: 'svg' };
    }
    case 'png':
    default: {
      const dataUrl = exportHighResolutionPNG(
        stage,
        stageWidth,
        undefined,
        options.withCropMarks,
        textureConfig,
        options
      );
      return { dataUrl, extension: 'png' };
    }
  }
}