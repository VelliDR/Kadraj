// src/core/shadowEngine.js

export function calculateOffsetFromAngle(angleDeg, distance, scaleMultiplier = 1) {
  const rad = (angleDeg * Math.PI) / 180;
  const scaledDist = distance * scaleMultiplier;
  return {
    x: Math.round(scaledDist * Math.cos(rad)),
    y: Math.round(scaledDist * Math.sin(rad)),
  };
}

export function createTintedSilhouette(imgObj, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(imgObj, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}