// src/core/segmentation.ts
import type { SegmentationModelName } from '../types';

export async function extractSubject(
  imageObj: HTMLImageElement,
  modelName: SegmentationModelName = 'isnet_quint8',
  onProgress: ((progressText: string) => void) | null = null
): Promise<HTMLCanvasElement> {
  // 1. Mobil RAM Güvenliği (1024px Dublör Kanvas)
  const MAX_AI_SIZE = 1024;
  let scale = 1;
  if (imageObj.width > MAX_AI_SIZE || imageObj.height > MAX_AI_SIZE) {
    scale = Math.min(MAX_AI_SIZE / imageObj.width, MAX_AI_SIZE / imageObj.height);
  }

  const aiWorkCanvas = document.createElement('canvas');
  aiWorkCanvas.width = Math.round(imageObj.width * scale);
  aiWorkCanvas.height = Math.round(imageObj.height * scale);
  const aiCtx = aiWorkCanvas.getContext('2d');
  if (!aiCtx) throw new Error('2D Canvas Context oluşturulamadı.');

  aiCtx.drawImage(imageObj, 0, 0, aiWorkCanvas.width, aiWorkCanvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    aiWorkCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob başarısız oldu.'));
    }, 'image/png');
  });

  // 2. Dinamik Modül Yükleme (Code Splitting - Lazy Loading)
  if (onProgress) onProgress('AI Motoru (ONNX/WASM) hazırlanıyor...');
  const { removeBackground } = await import('@imgly/background-removal');

  const config = {
    model: modelName,
    progress: (_key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
        const pct = Math.round((current / total) * 100);
        onProgress(`Model yükleniyor: %${pct}`);
      }
    },
  };

  // 3. Ayrıştırma İşlemi
  const resultBlob = await removeBackground(blob, config);
  const resultUrl = URL.createObjectURL(resultBlob);

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const cutoutImg = new Image();
    cutoutImg.onload = () => {
      // Çıktıyı orijinal yüksek çözünürlüklü boyuta geri aktar
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      if (!mCtx) {
        URL.revokeObjectURL(resultUrl);
        reject(new Error('Mask canvas context oluşturulamadı.'));
        return;
      }
      mCtx.drawImage(cutoutImg, 0, 0, imageObj.width, imageObj.height);
      URL.revokeObjectURL(resultUrl);
      resolve(maskCanvas);
    };
    cutoutImg.onerror = (err) => {
      URL.revokeObjectURL(resultUrl);
      reject(err);
    };
    cutoutImg.src = resultUrl;
  });
}