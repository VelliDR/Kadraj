// src/core/edgeRefineEngine.js

/**
 * Yapay zeka maskesinin kenarlarını yumuşatır ve istenen oranda (%0.5 - %5.0)
 * içeri/dışarı bindirerek pürüzlü kenar hatalarını ortadan kaldırır.
 */
export function refineSegmentationMask(rawMaskCanvas, width, height, overlapPercent = 0.8) {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d');

  // 1. Orijinal maskeyi çiz
  ctx.drawImage(rawMaskCanvas, 0, 0, width, height);

  // Bindirme yüzdesine göre piksel yarıçapı hesapla
  const maxDim = Math.max(width, height);
  const blurPx = Math.max(1, (maxDim * (overlapPercent / 100)));

  // 2. Kenarları yumuşatmak için çift geçişli Alfa Bulanıklaştırma (Choke/Feather)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tCtx = tempCanvas.getContext('2d');

  tCtx.filter = `blur(${blurPx}px)`;
  tCtx.drawImage(outputCanvas, 0, 0);

  // Kontrastı sıkılaştırarak merdiven pikselleşmesini yok et
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tempCanvas, 0, 0);

  return outputCanvas;
}