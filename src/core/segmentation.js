// src/core/segmentation.js
import { removeBackground } from '@imgly/background-removal';

// ========================================================
// 1. MOTOR: MEDIAPIPE (HIZLI PORTRE)
// ========================================================
let mediaPipeInstance = null;

async function getMediaPipe() {
  if (!mediaPipeInstance) {
    mediaPipeInstance = new window.SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    mediaPipeInstance.setOptions({ modelSelection: 1 });
    await mediaPipeInstance.initialize();
  }
  return mediaPipeInstance;
}

async function extractWithMediaPipe(imageObj) {
  const segmenter = await getMediaPipe();

  return new Promise((resolve, reject) => {
    segmenter.onResults((results) => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.drawImage(results.segmentationMask, 0, 0, imageObj.width, imageObj.height);
      resolve(maskCanvas);
    });

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

    segmenter.send({ image: aiWorkCanvas }).catch(reject);
  });
}

// ========================================================
// 2. MOTOR: IMGLY (8-BIT VE FP32 MODELLERİ)
// ========================================================
async function extractWithImgly(imageObj, modelName, onProgress) {
  // RAM koruması için görseli ölçekle
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

  // modelName: 'isnet_quint8' veya 'isnet' (tam hassasiyetli FP32 modeli)
  const config = {
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/',
    model: modelName,
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

// ========================================================
// ANA DAĞITICI
// ========================================================
export async function extractSubject(imageObj, engineSelection = 'mediapipe', onProgress = null) {
  if (engineSelection === 'imgly-fp32') {
    // 'isnet', imgly'nin tam hassasiyetli (FP32) ana modelidir
    return await extractWithImgly(imageObj, 'isnet', onProgress);
  } else if (engineSelection === 'imgly-quint8') {
    // 8-bit kuantize hafif model
    return await extractWithImgly(imageObj, 'isnet_quint8', onProgress);
  } else {
    return await extractWithMediaPipe(imageObj);
  }
}