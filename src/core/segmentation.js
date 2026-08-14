// src/core/segmentation.js
// DİKKAT: En üstteki "import" satırını sildik! 
// Kütüphaneyi index.html'den "window.SelfieSegmentation" olarak alacağız.

let segmenterInstance = null;

async function getSegmenter() {
  if (!segmenterInstance) {
    // window üzerinden kütüphaneyi çağırıyoruz
    segmenterInstance = new window.SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    
    // Mobil için hafif model seçimi
    segmenterInstance.setOptions({ modelSelection: 1 });
    
    // ÇOK KRİTİK: Mobilde yavaş bağlantılarda AI'nin hazır olmasını beklemek zorundayız
    await segmenterInstance.initialize(); 
  }
  return segmenterInstance;
}

export async function extractSubject(imageObj) {
  // Önce AI motorunun %100 yüklendiğinden emin ol
  const segmenter = await getSegmenter();

  return new Promise((resolve, reject) => {
    segmenter.onResults((results) => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      
      mCtx.drawImage(results.segmentationMask, 0, 0, imageObj.width, imageObj.height);
      resolve(maskCanvas);
    });

    // Mobilde RAM çökmesini önlemek için dublör kanvas oluşturuyoruz
    const MAX_AI_SIZE = 1024;
    let scale = 1;
    if (imageObj.width > MAX_AI_SIZE || imageObj.height > MAX_AI_SIZE) {
      scale = Math.min(MAX_AI_SIZE / imageObj.width, MAX_AI_SIZE / imageObj.height);
    }

    const aiWorkCanvas = document.createElement('canvas');
    aiWorkCanvas.width = imageObj.width * scale;
    aiWorkCanvas.height = imageObj.height * scale;
    const aiCtx = aiWorkCanvas.getContext('2d');
    
    aiCtx.drawImage(imageObj, 0, 0, aiWorkCanvas.width, aiWorkCanvas.height);

    // Görseli AI'ya gönder
    segmenter.send({ image: aiWorkCanvas }).catch(err => {
        console.error("Yapay Zeka Çalıştırma Hatası:", err);
        reject(err);
    });
  });
}