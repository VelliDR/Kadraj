// src/core/segmentation.js
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

let segmenterInstance = null;

function getSegmenter() {
  if (!segmenterInstance) {
    segmenterInstance = new SelfieSegmentation({
      // Sürümü sabitleyerek (0.1.1675465747) uyumsuzluk çökmelerini önlüyoruz
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`,
    });
    // modelSelection 1: Daha hızlı ve hafif model (Mobil için mükemmel)
    segmenterInstance.setOptions({ modelSelection: 1 });
  }
  return segmenterInstance;
}

export function extractSubject(imageObj) {
  const segmenter = getSegmenter();

  return new Promise((resolve, reject) => {
    segmenter.onResults((results) => {
      const maskCanvas = document.createElement('canvas');
      // Maskeyi %100 Orijinal Baskı Boyutunda hazırlıyoruz
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      
      // AI'dan gelen küçük maskeyi devasa orijinal boyuta geri esneterek çiziyoruz
      mCtx.drawImage(results.segmentationMask, 0, 0, imageObj.width, imageObj.height);
      resolve(maskCanvas);
    });

    /* ========================================================
       MOBİL ÇÖKME (OOM) ÖNLEMİ: DUBLÖR KANVAS
       ========================================================
       Devasa fotoğraflar mobilde AI motorunu çökertir. 
       Bu yüzden AI'ya fotoğrafın sadece max 1024px'lik hafif bir kopyasını gönderiyoruz.
    */
    const MAX_AI_SIZE = 1024;
    let scale = 1;
    if (imageObj.width > MAX_AI_SIZE || imageObj.height > MAX_AI_SIZE) {
      scale = Math.min(MAX_AI_SIZE / imageObj.width, MAX_AI_SIZE / imageObj.height);
    }

    const aiWorkCanvas = document.createElement('canvas');
    aiWorkCanvas.width = imageObj.width * scale;
    aiWorkCanvas.height = imageObj.height * scale;
    const aiCtx = aiWorkCanvas.getContext('2d');
    
    // Orijinal fotoğrafı küçük kanvasa (dublöre) kopyala
    aiCtx.drawImage(imageObj, 0, 0, aiWorkCanvas.width, aiWorkCanvas.height);

    // AI'ya asıl fotoğrafı değil, küçük dublörü gönder. İşlemi başlat ve hatayı yakala:
    segmenter.send({ image: aiWorkCanvas }).catch(err => {
        console.error("Yapay Zeka Hatası:", err);
        reject(err);
    });
  });
}