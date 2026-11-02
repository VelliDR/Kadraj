// src/core/imageLoader.ts

export async function processImageFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<HTMLImageElement> {
  if (!file) throw new Error('Dosya seçilmedi.');

  let imageBlob: Blob = file;
  const fileName = (file.name || '').toLowerCase();
  const isHeic =
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  if (isHeic) {
    if (onProgress) onProgress('HEIC dönüştürücü modülü yükleniyor...');
    // Lazy-load heic2any only when an HEIC file is provided
    const heicModule = await import('heic2any');
    const converter = heicModule.default;

    if (onProgress) onProgress('HEIC formatı yüksek kalitede dönüştürülüyor...');
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Görsel dosyası açılamadı. Lütfen geçerli bir JPG, PNG, WebP veya HEIC dosyası seçin.'));
    };
    img.src = objectUrl;
  });
}