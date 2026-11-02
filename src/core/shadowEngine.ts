// src/core/shadowEngine.ts

export interface Offset2D {
  x: number;
  y: number;
}

export function calculateOffsetFromAngle(angleDeg: number, distance: number, scaleMultiplier = 1): Offset2D {
  const rad = (angleDeg * Math.PI) / 180;
  const scaledDist = distance * scaleMultiplier;
  return {
    x: Math.round(scaledDist * Math.cos(rad)),
    y: Math.round(scaledDist * Math.sin(rad)),
  };
}

export function createTintedSilhouette(imgObj: CanvasImageSource, colorHex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = (imgObj as HTMLImageElement).naturalWidth || (imgObj as HTMLCanvasElement).width || 360;
  const height = (imgObj as HTMLImageElement).naturalHeight || (imgObj as HTMLCanvasElement).height || 500;
  
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(imgObj, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}