// src/core/segmentation.js
import { removeBackground } from '@imgly/background-removal';

export async function extractSubject(imageObj, modelName = 'isnet_quint8', onProgress = null) {
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
  aiCtx.drawImage(imageObj, 0, 0, aiWorkCanvas.width, aiWorkCanvas.height);

  const blob = await new Promise((res) => aiWorkCanvas.toBlob(res, 'image/png'));

  // 2. Model Yapılandırması (Seçilen Modele Göre)
  const config = {
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/',
    model: modelName, // 'isnet_quint8' veya 'isnet_fp16'
    progress: (key, current, total) => {
      if (onProgress && total > 0) {
        const pct = Math.round((current / total) * 100);
        onProgress(`Model yükleniyor: %${pct}`);
      }
    },
  };

  const resultBlob = await removeBackground(blob, config);
  const resultUrl = URL.createObjectURL(resultBlob);

  return new Promise((resolve) => {
    const cutoutImg = new Image();
    cutoutImg.onload = () => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.drawImage(cutoutImg, 0, 0, imageObj.width, imageObj.height);
      URL.revokeObjectURL(resultUrl);
      resolve(maskCanvas);
    };
    cutoutImg.src = resultUrl;
  });
}