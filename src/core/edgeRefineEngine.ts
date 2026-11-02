// src/core/edgeRefineEngine.ts

export interface EdgeRefineOptions {
  overlapPercent?: number; // 0.1 - 5.0
  erodePixels?: number;    // 0 - 5 piksel içeri çekme (halo temizliği)
  featherBlur?: number;    // 0 - 10 piksel kenar yumuşatma
}

/**
 * Yapay zeka maskesinin kenarlarını morfolojik aşındırma (erosion),
 * renk kirliliği giderme (de-fringing) ve alfa yumuşatma (feathering) ile rafine eder.
 */
export function refineSegmentationMask(
  rawMaskCanvas: HTMLCanvasElement | HTMLImageElement,
  width: number,
  height: number,
  optionsOrOverlap: number | EdgeRefineOptions = 0.8
): HTMLCanvasElement {
  let overlapPercent = 0.8;
  let erodePixels = 0;
  let featherBlur = 0;

  if (typeof optionsOrOverlap === 'number') {
    overlapPercent = optionsOrOverlap;
  } else {
    overlapPercent = optionsOrOverlap.overlapPercent ?? 0.8;
    erodePixels = optionsOrOverlap.erodePixels ?? 0;
    featherBlur = optionsOrOverlap.featherBlur ?? 0;
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return outputCanvas;

  // 1. Orijinal maskeyi çiz
  ctx.drawImage(rawMaskCanvas, 0, 0, width, height);

  // 2. Morfolojik Aşındırma (Erosion / De-fringe) - Kenardaki arka plan sızıntılarını yok eder
  if (erodePixels > 0) {
    applyMorphologicalErosion(ctx, width, height, erodePixels);
  }

  // 3. Bindirme yüzdesine ve feather değerine göre yumuşatma hesapla
  const maxDim = Math.max(width, height);
  const calculatedBlur = Math.min(16, Math.max(0.5, (maxDim * (overlapPercent / 100)) * 0.15));
  const finalBlur = featherBlur > 0 ? featherBlur : calculatedBlur;

  // 4. Kenarları kadifemsi yumuşatmak için Çift Geçişli Alfa Bulanıklaştırma
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tCtx = tempCanvas.getContext('2d');
  if (!tCtx) return outputCanvas;

  tCtx.filter = `blur(${finalBlur.toFixed(1)}px)`;
  tCtx.drawImage(outputCanvas, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tempCanvas, 0, 0);

  return outputCanvas;
}

/**
 * Morfolojik Aşındırma: Kenar piksellerini analiz ederek saç/ten dışındaki
 * istenmeyen renk halolarını (fringe) içeriye doğru traşlar.
 */
function applyMorphologicalErosion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const r = Math.min(4, Math.max(1, Math.round(radius)));

  // Alfa kanalı kopyası
  const alphaCopy = new Uint8Array(width * height);
  for (let i = 0; i < alphaCopy.length; i++) {
    alphaCopy[i] = src[i * 4 + 3];
  }

  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const idx = y * width + x;
      const currentAlpha = alphaCopy[idx];
      if (currentAlpha === 0) continue;

      // Hızlı Atlama: İç kısımdaki piksellerin (kenar olmayan) taranmasına gerek yoktur
      if (
        currentAlpha === 255 &&
        alphaCopy[idx - width] === 255 &&
        alphaCopy[idx + width] === 255 &&
        alphaCopy[idx - 1] === 255 &&
        alphaCopy[idx + 1] === 255
      ) {
        continue;
      }

      let minNeighborAlpha = currentAlpha;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nAlpha = alphaCopy[(y + dy) * width + (x + dx)];
          if (nAlpha < minNeighborAlpha) {
            minNeighborAlpha = nAlpha;
          }
        }
      }

      // Kenar pikseline aşındırılmış alfayı uygula
      src[idx * 4 + 3] = minNeighborAlpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}