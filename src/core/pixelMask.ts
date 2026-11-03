// src/core/pixelMask.ts

/**
 * Kullanıcının yüklediği özel şekil veya metin görselini
 * yüksek kontrastlı piksel maskesine (Binary Stencil Mask) dönüştürür.
 * 
 * Şeffaf PNG ise doğrudan alfa kanalını kullanır,
 * Opak görsel ise siyah/beyaz parlaklık eşiğine (Luminance Threshold) göre ayrıştırır.
 */
export function generatePixelMaskCanvas(
  img: CanvasImageSource,
  width: number,
  height: number,
  invert = false
): HTMLCanvasElement {
  const mCanvas = document.createElement('canvas');
  mCanvas.width = width;
  mCanvas.height = height;
  const mCtx = mCanvas.getContext('2d');
  if (!mCtx) return mCanvas;

  mCtx.clearRect(0, 0, width, height);
  mCtx.drawImage(img, 0, 0, width, height);

  const imgData = mCtx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Görselde gerçek şeffaflık (alpha kanalı) var mı?
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 16) {
    if (d[i] < 220) {
      hasAlpha = true;
      break;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const alpha = d[i + 3];

    if (hasAlpha) {
      // Şeffaf PNG: Dolu pikseller şekildir
      const isSolid = invert ? alpha < 128 : alpha >= 128;
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = isSolid ? 255 : 0;
    } else {
      // Opak Görsel: Siyah pikseller (metin / şekil) dolu, beyaz arka plan boş
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const isSolid = invert ? lum >= 128 : lum < 128;
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = isSolid ? 255 : 0;
    }
  }

  mCtx.putImageData(imgData, 0, 0);
  return mCanvas;
}