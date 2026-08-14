// src/core/pixelMask.js

export function generatePixelMaskCanvas(img, width, height, invert = false) {
  const mCanvas = document.createElement('canvas');
  mCanvas.width = width;
  mCanvas.height = height;
  const mCtx = mCanvas.getContext('2d');

  const scale = Math.max(width / img.width, height / img.height);
  const x = (width - img.width * scale) / 2;
  const y = (height - img.height * scale) / 2;
  mCtx.drawImage(img, x, y, img.width * scale, img.height * scale);

  const imgData = mCtx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Parlaklık (Luminance) eşiğine göre pikselleri şeffaflaştır
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const isSolid = invert ? lum > 128 : lum < 128;
    d[i + 3] = isSolid ? 255 : 0;
  }

  mCtx.putImageData(imgData, 0, 0);
  return mCanvas;
}