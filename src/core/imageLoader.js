// src/core/imageLoader.js
import heic2anyModule from 'heic2any';

export async function processImageFile(file, onProgress) {
  if (!file) throw new Error('Dosya seçilmedi.');

  let imageBlob = file;
  const fileName = (file.name || '').toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';

  if (isHeic) {
    if (onProgress) onProgress('HEIC formatı yüksek kalitede dönüştürülüyor...');
    const converter = heic2anyModule.default || heic2anyModule;
    const conversionResult = await converter({
      blob: file,
      toType: 'image/jpeg',
      quality: 1.0,
    });
    imageBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}