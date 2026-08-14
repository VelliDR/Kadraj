// src/main.js
import { registerSW } from 'virtual:pwa-register';

// PWA Servis İşçisi Kaydı
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Yeni sürüm mevcut, güncelleniyor...');
  },
  onOfflineReady() {
    console.log('Kadraj çevrimdışı kullanıma hazır!');
  }
});

import { 
  initCanvas, 
  loadMainImage, 
  applyVectorShape, 
  applyPixelMaskNode, 
  removeForegroundSubject,
  hasForegroundSubject,
  setZoom, 
  toggleBackground, 
  exportPNG, 
  hasImage, 
  getOriginalImage, 
  resetEngine, 
  addTextNode, 
  updateSelectedText, 
  deleteSelectedText,
  updateShapeShadow,
  updateSubjectSilhouetteShadow,
  processRawSegmentation,
  setEdgeOverlap,
  STAGE_WIDTH, 
  STAGE_HEIGHT 
} from './core/canvasEngine.js';

import { processImageFile } from './core/imageLoader.js';
import { SHAPES } from './core/shapes.js';
import { generatePixelMaskCanvas } from './core/pixelMask.js';
import { extractSubject } from './core/segmentation.js';

// =========================================================
// DOM ELEMANLARI
// =========================================================
const statusText = document.getElementById('statusText');
const canvasContainer = document.getElementById('canvas-container');
const zoomRange = document.getElementById('zoomRange');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const btnInvertMask = document.getElementById('btnInvertMask');
const btnSegment = document.getElementById('btnSegment');
const aiEngineSelect = document.getElementById('aiEngineSelect');

// Tipografi DOM
const textInput = document.getElementById('textInput');
const fontSelect = document.getElementById('fontSelect');
const fontSizeRange = document.getElementById('fontSizeRange');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const textRotationRange = document.getElementById('textRotationRange');
const textRotationDisplay = document.getElementById('textRotationDisplay');
const textColor = document.getElementById('textColor');
const btnAddText = document.getElementById('btnAddText');
const btnDeleteText = document.getElementById('btnDeleteText');

// Gölgeler & Kenar Bindirme DOM
const edgeOverlapRange = document.getElementById('edgeOverlapRange');
const edgeOverlapDisplay = document.getElementById('edgeOverlapDisplay');
const shapeShadowAngle = document.getElementById('shapeShadowAngle');
const shapeShadowAngleDisplay = document.getElementById('shapeShadowAngleDisplay');
const shapeShadowDist = document.getElementById('shapeShadowDist');
const shapeShadowDistDisplay = document.getElementById('shapeShadowDistDisplay');
const shapeShadowBlur = document.getElementById('shapeShadowBlur');

const chkSubjectShadow = document.getElementById('chkSubjectShadow');
const subjShadowAngle = document.getElementById('subjShadowAngle');
const subjShadowAngleDisplay = document.getElementById('subjShadowAngleDisplay');
const subjShadowDist = document.getElementById('subjShadowDist');
const subjShadowDistDisplay = document.getElementById('subjShadowDistDisplay');
const subjShadowColor = document.getElementById('subjShadowColor');

let customMaskRawImg = null;
let isMaskInverted = false;
let rawSegmentationResult = null;

// Yardımcı Yükleme Ekranı Fonksiyonları
function showLoading(msg) {
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  if (loadingText) loadingText.innerText = msg || 'İşleniyor...';
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// =========================================================
// 1. SOL MENÜ GEÇİŞLERİ (DOCK TABS)
// =========================================================
document.querySelectorAll('.dock-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const targetPanel = document.getElementById(tab.dataset.tab);
    if (targetPanel) targetPanel.classList.add('active');
  });
});

// =========================================================
// 2. KANVASI BAŞLAT
// =========================================================
initCanvas('canvas-container', (selectedNode) => {
  if (selectedNode) {
    btnDeleteText.classList.remove('hidden');
    textInput.value = selectedNode.text();
    fontSelect.value = selectedNode.fontFamily();
    textColor.value = selectedNode.fill();
    fontSizeRange.value = selectedNode.fontSize();
    fontSizeDisplay.innerText = `${selectedNode.fontSize()}px`;

    const rot = Math.round((selectedNode.rotation() % 360 + 360) % 360);
    textRotationRange.value = rot;
    textRotationDisplay.innerText = `${rot}°`;

    // Metin seçildiğinde otomatik Yazı sekmesini aç
    const typoTab = document.querySelector('[data-tab="tab-typography"]');
    if (typoTab) typoTab.click();
  } else {
    btnDeleteText.classList.add('hidden');
  }
});

// =========================================================
// 3. GÖRSEL YÜKLEME (HEIC / PNG / JPG)
// =========================================================
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showLoading('Görsel %100 kalitede işleniyor...');

  try {
    const imgObj = await processImageFile(file, (msg) => {
      loadingText.innerText = msg;
    });

    loadMainImage(imgObj);
    rawSegmentationResult = null;
    btnSegment.innerText = '✨ Özneyi Ayır';

    zoomRange.value = 1;
    btnInvertMask.classList.add('hidden');
    document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
    statusText.innerText = 'Görsel tam kalitede yüklendi.';
  } catch (err) {
    statusText.innerText = 'Görsel yüklenirken hata oluştu.';
    console.error(err);
  } finally {
    hideLoading();
  }
});

// =========================================================
// 4. YAPAY ZEKA İLE ÖZNEYİ AYIRMA (MEDIAPIPE / IMGLY)
// =========================================================
btnSegment.addEventListener('click', async () => {
  if (!hasImage()) return showWarning();

  // Zaten özne ayrılmışsa butona basınca kaldır (Toggle)
  if (hasForegroundSubject()) {
    removeForegroundSubject();
    rawSegmentationResult = null;
    btnSegment.innerText = '✨ Özneyi Ayır';
    chkSubjectShadow.checked = false;
    statusText.innerText = 'Özne katmanı kaldırıldı.';
    return;
  }

  const origImg = getOriginalImage();
  if (!origImg) return showWarning();

  const selectedEngine = aiEngineSelect ? aiEngineSelect.value : 'mediapipe';
  showLoading(selectedEngine === 'imgly' ? 'imgly modeli hazırlanıyor...' : 'MediaPipe özneyi ayrıştırıyor...');

  try {
    const maskCanvas = await extractSubject(origImg, selectedEngine, (progressText) => {
      loadingText.innerText = progressText;
    });

    rawSegmentationResult = maskCanvas;
    processRawSegmentation(rawSegmentationResult);
    btnSegment.innerText = '🗑️ Özneyi Kaldır';
    statusText.innerText = 'Özne başarıyla ayrıştırıldı (3D Pop-Out aktif).';
  } catch (error) {
    console.error('Özne ayırma hatası:', error);
    statusText.innerText = 'Özne ayrıştırılamadı.';
    alert('Özne ayrıştırılamadı. Diğer motoru deneyebilir veya manuel maske yükleyebilirsiniz.');
  } finally {
    hideLoading();
  }
});

// =========================================================
// 5. KENAR BİNDİRME SÜRGÜSÜ
// =========================================================
edgeOverlapRange.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  edgeOverlapDisplay.innerText = `%${val.toFixed(1)}`;
  setEdgeOverlap(val);
});

// =========================================================
// 6. TİPOGRAFİ OLAYLARI
// =========================================================
textRotationRange.addEventListener('input', (e) => {
  const rot = parseInt(e.target.value, 10);
  textRotationDisplay.innerText = `${rot}°`;
  updateSelectedText({ rotation: rot });
});

fontSizeRange.addEventListener('input', (e) => {
  const size = parseInt(e.target.value, 10);
  fontSizeDisplay.innerText = `${size}px`;
  updateSelectedText({ fontSize: size });
});

fontSelect.addEventListener('change', (e) => updateSelectedText({ fontFamily: e.target.value }));
textColor.addEventListener('input', (e) => updateSelectedText({ fill: e.target.value }));
textInput.addEventListener('input', (e) => updateSelectedText({ text: e.target.value }));

btnAddText.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) return;

  addTextNode({
    text,
    fontFamily: fontSelect.value,
    fill: textColor.value,
    fontSize: parseInt(fontSizeRange.value, 10),
    rotation: parseInt(textRotationRange.value, 10),
  });
});

btnDeleteText.addEventListener('click', () => deleteSelectedText());

// =========================================================
// 7. GÖLGELER & SİLÜET (AKICI 60 FPS OPTİMİZASYONLU)
// =========================================================
let shapeShadowRaf = null;
let subjShadowRaf = null;

// Şekil Gölgesi Dinleyicileri (rAF Kilidiyle Hafifletildi)
shapeShadowAngle.addEventListener('input', (e) => {
  shapeShadowAngleDisplay.innerText = `${e.target.value}°`;
  if (shapeShadowRaf) cancelAnimationFrame(shapeShadowRaf);
  shapeShadowRaf = requestAnimationFrame(() => {
    updateShapeShadow({ angle: parseInt(e.target.value, 10) });
  });
});

shapeShadowDist.addEventListener('input', (e) => {
  shapeShadowDistDisplay.innerText = `${e.target.value}px`;
  if (shapeShadowRaf) cancelAnimationFrame(shapeShadowRaf);
  shapeShadowRaf = requestAnimationFrame(() => {
    updateShapeShadow({ distance: parseInt(e.target.value, 10) });
  });
});

shapeShadowBlur.addEventListener('input', (e) => {
  if (shapeShadowRaf) cancelAnimationFrame(shapeShadowRaf);
  shapeShadowRaf = requestAnimationFrame(() => {
    updateShapeShadow({ blur: parseInt(e.target.value, 10) });
  });
});

// Silüet Gölgesi Dinleyicileri
chkSubjectShadow.addEventListener('change', (e) => {
  updateSubjectSilhouetteShadow({ enabled: e.target.checked });
});

subjShadowAngle.addEventListener('input', (e) => {
  subjShadowAngleDisplay.innerText = `${e.target.value}°`;
  if (subjShadowRaf) cancelAnimationFrame(subjShadowRaf);
  subjShadowRaf = requestAnimationFrame(() => {
    updateSubjectSilhouetteShadow({ angle: parseInt(e.target.value, 10) });
  });
});

subjShadowDist.addEventListener('input', (e) => {
  subjShadowDistDisplay.innerText = `${e.target.value}px`;
  if (subjShadowRaf) cancelAnimationFrame(subjShadowRaf);
  subjShadowRaf = requestAnimationFrame(() => {
    updateSubjectSilhouetteShadow({ distance: parseInt(e.target.value, 10) });
  });
});

subjShadowColor.addEventListener('input', (e) => {
  if (subjShadowRaf) cancelAnimationFrame(subjShadowRaf);
  subjShadowRaf = requestAnimationFrame(() => {
    updateSubjectSilhouetteShadow({ color: e.target.value });
  });
});
// =========================================================
// 8. ŞABLONLAR & MANUEL PİKSEL MASKE
// =========================================================
document.querySelectorAll('.shape-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!hasImage()) return showWarning();
    const shapeKey = btn.dataset.shape;
    if (SHAPES[shapeKey]) {
      applyVectorShape(SHAPES[shapeKey]);
      btnInvertMask.classList.add('hidden');
      document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });
});

document.getElementById('maskInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !hasImage()) return showWarning();

  showLoading('Maske yükleniyor...');
  try {
    customMaskRawImg = await processImageFile(file);
    isMaskInverted = false;
    renderCustomMask();
  } finally {
    hideLoading();
  }
});

function renderCustomMask() {
  const maskCanvas = generatePixelMaskCanvas(customMaskRawImg, STAGE_WIDTH, STAGE_HEIGHT, isMaskInverted);
  applyPixelMaskNode(maskCanvas);
  btnInvertMask.classList.remove('hidden');
}

btnInvertMask.addEventListener('click', () => {
  if (!customMaskRawImg) return;
  isMaskInverted = !isMaskInverted;
  renderCustomMask();
});

// =========================================================
// 9. ZOOM, ŞEFFAFLIK, SIFIRLAMA VE 300 DPI ÇIKTI
// =========================================================
zoomRange.addEventListener('input', (e) => setZoom(parseFloat(e.target.value)));

document.getElementById('btnToggleBg').addEventListener('click', () => {
  const isTrans = toggleBackground();
  canvasContainer.classList.toggle('transparent-canvas', isTrans);
  document.getElementById('btnToggleBg').innerText = isTrans ? '📄 Kağıt' : '🏁 Şeffaf';
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!hasImage()) return;
  resetEngine();
  rawSegmentationResult = null;
  btnSegment.innerText = '✨ Özneyi Ayır';
  zoomRange.value = 1;
  btnInvertMask.classList.add('hidden');
  btnDeleteText.classList.add('hidden');
  chkSubjectShadow.checked = false;
  document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
  statusText.innerText = 'Sıfırlandı.';
});

document.getElementById('btnDownload').addEventListener('click', () => {
  if (!hasImage()) return showWarning();

  showLoading('300 DPI matbaa kalitesinde PNG üretiliyor...');

  setTimeout(() => {
    const dataURL = exportPNG();
    const link = document.createElement('a');
    link.download = `dergi-baski-300dpi-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hideLoading();
    statusText.innerText = '300 DPI A4 formatında kayıpsız PNG indirildi!';
  }, 100);
});

// Yatay Kaydırma Desteği
const shapeScroll = document.getElementById('shapeButtons');
if (shapeScroll) {
  shapeScroll.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      shapeScroll.scrollLeft += e.deltaY;
    }
  });
}

function showWarning() {
  statusText.innerText = 'Lütfen önce bir ana görsel yükleyin!';
}