// src/core/exportEngine.js

// Sadece genişliği baz alıyoruz, yükseklik resmin doğasına göre uzayacak.
export const PRINT_BASE_WIDTH = 2480;  // 300 DPI Baz Genişliği

/**
 * Konva sahnesini hiçbir kalite kaybı olmadan, resmin organik oranlarını koruyarak
 * 300 DPI matbaa kalitesinde dışa aktarır.
 */
export function exportHighResolutionPNG(stage, currentStageWidth, currentStageHeight) {
  // Sahnedeki mevcut genişliğin, 300 DPI baskı genişliğine (2480) oranını bul
  const scaleFactor = PRINT_BASE_WIDTH / currentStageWidth;

  // Çıktı DataURL'ini üret. (Yükseklik otomatik olarak scaleFactor ile çarpılacak)
  return stage.toDataURL({
    pixelRatio: scaleFactor,
    mimeType: 'image/png',
  });
}