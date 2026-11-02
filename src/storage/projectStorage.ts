// src/storage/projectStorage.ts
import { get, set, del } from 'idb-keyval';
import type { StoredProject } from '../types';

const DRAFT_STORAGE_KEY = 'kadraj_active_draft';

/**
 * Taslağı doğrudan Blob ve JSON olarak IndexedDB içine yazar.
 */
export async function saveDraftToStorage(draft: StoredProject): Promise<void> {
  try {
    await set(DRAFT_STORAGE_KEY, draft);
  } catch (err) {
    console.error('Taslak kaydedilirken hata oluştu:', err);
  }
}

/**
 * IndexedDB'den aktif taslağı çeker.
 */
export async function loadDraftFromStorage(): Promise<StoredProject | undefined> {
  try {
    return await get<StoredProject>(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Taslak okunurken hata oluştu:', err);
    return undefined;
  }
}

/**
 * Kayıtlı taslağı IndexedDB'den temizler.
 */
export async function clearDraftFromStorage(): Promise<void> {
  try {
    await del(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Taslak silinirken hata oluştu:', err);
  }
}

/**
 * HTMLImageElement nesnesini Blob'a dönüştürür.
 */
export async function imageElementToBlob(img: HTMLImageElement): Promise<Blob | undefined> {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return undefined;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || undefined), 'image/png');
    });
  } catch (err) {
    console.warn('Görsel Blob dönüşümü başarısız oldu:', err);
    return undefined;
  }
}

/**
 * HTMLCanvasElement nesnesini Blob'a dönüştürür.
 */
export async function canvasElementToBlob(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
  if (!canvas.width || !canvas.height) return undefined;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || undefined), 'image/png');
  });
}

/**
 * Blob nesnesinden HTMLImageElement yükler.
 */
export async function blobToImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
