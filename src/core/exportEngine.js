// src/core/exportEngine.js

export const PRINT_A4_WIDTH = 2480;  // A4 @ 300 DPI
export const PRINT_A4_HEIGHT = 3508;

/**
 * Konva sahnesini hiçbir kalite kaybı olmadan 300 DPI baskı kalitesinde dışa aktarır.
 */
export function exportHighResolutionPNG(stage, stageWidth) {
  // Önizleme ile baskı arasındaki ölçek çarpanı (Örn: 2480 / 360 = ~6.88x)
  const scaleFactor = PRINT_A4_WIDTH / stageWidth;

  return stage.toDataURL({
    pixelRatio: scaleFactor,
    mimeType: 'image/png',
  });
}