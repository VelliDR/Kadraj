// src/main.js
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

// DOM
const statusText = document.getElementById('statusText');
const canvasContainer = document.getElementById('canvas-container');
const zoomRange = document.getElementById('zoomRange');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const btnInvertMask = document.getElementById('btnInvertMask');
const btnSegment = document.getElementById('btnSegment');

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

// 1. Sol Sütun Dikey Menü Geçişi (Split Navigation)
document.querySelectorAll('.dock-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// 2. Sahneyi Başlat
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

    // Metin seçildiğinde sol menüden otomatik Yazı sekmesine geç
    document.querySelector('[data-tab="tab-typography"]').click();
  } else {
    btnDeleteText.classList.add('hidden');
  }
});

// 3. Görsel Yükleme (HEIC / PNG / JPG %100 Kalite)
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  loadingOverlay.classList.remove('hidden');
  loadingText.innerText = 'Görsel %100 kalitede işleniyor...';

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
    loadingOverlay.classList.add('hidden');
  }
});

// 4. Akıllı Özne Ayrıştırma (AI)
btnSegment.addEventListener('click', async () => {
  if (!hasImage()) return showWarning();

  if (hasForegroundSubject()) {
    removeForegroundSubject();
    btnSegment.innerText = '✨ Özneyi Ayır';
    statusText.innerText = 'Genel moda dönüldü.';
    return;
  }

  if (rawSegmentationResult) {
    processRawSegmentation(rawSegmentationResult);
    btnSegment.innerText = '↩️ Özneyi Birleştir';
    statusText.innerText = 'Özne geri yüklendi.';
    return;
  }

  loadingOverlay.classList.remove('hidden');
  loadingText.innerText = 'Özne ayrıştırılıyor...';

  try {
    const segmentMask = await extractSubject(getOriginalImage());
    rawSegmentationResult = segmentMask;
    processRawSegmentation(rawSegmentationResult);

    btnSegment.innerText = '↩️ Özneyi Birleştir';
    statusText.innerText = 'Özne ayrıştırıldı! Kenar yumuşatmayı Gölge menüsünden ayarlayabilirsiniz.';
  } catch (err) {
    statusText.innerText = 'Ayrıştırma hatası.';
    console.error(err);
  } finally {
    loadingOverlay.classList.add('hidden');
  }
});

// 5. Kenar Bindirme & Yumuşatma Sürgüsü (%0.5 - %5.0)
edgeOverlapRange.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  edgeOverlapDisplay.innerText = `%${val.toFixed(1)}`;
  setEdgeOverlap(val);
});

// 6. Tipografi Olayları
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

// 7. Gölgeler
shapeShadowAngle.addEventListener('input', (e) => {
  shapeShadowAngleDisplay.innerText = `${e.target.value}°`;
  updateShapeShadow({ angle: parseInt(e.target.value, 10) });
});
shapeShadowDist.addEventListener('input', (e) => {
  shapeShadowDistDisplay.innerText = `${e.target.value}px`;
  updateShapeShadow({ distance: parseInt(e.target.value, 10) });
});
shapeShadowBlur.addEventListener('input', (e) => updateShapeShadow({ blur: parseInt(e.target.value, 10) }));

chkSubjectShadow.addEventListener('change', (e) => updateSubjectSilhouetteShadow({ enabled: e.target.checked }));
subjShadowAngle.addEventListener('input', (e) => {
  subjShadowAngleDisplay.innerText = `${e.target.value}°`;
  updateSubjectSilhouetteShadow({ angle: parseInt(e.target.value, 10) });
});
subjShadowDist.addEventListener('input', (e) => {
  subjShadowDistDisplay.innerText = `${e.target.value}px`;
  updateSubjectSilhouetteShadow({ distance: parseInt(e.target.value, 10) });
});
subjShadowColor.addEventListener('input', (e) => updateSubjectSilhouetteShadow({ color: e.target.value }));

// 8. Şablonlar & Özel Maske
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

  loadingOverlay.classList.remove('hidden');
  loadingText.innerText = 'Maske yükleniyor...';

  try {
    customMaskRawImg = await processImageFile(file);
    isMaskInverted = false;
    renderCustomMask();
  } finally {
    loadingOverlay.classList.add('hidden');
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

// 9. Zoom, Arka Plan, Sıfırlama ve 300 DPI Çıktı
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

  loadingOverlay.classList.remove('hidden');
  loadingText.innerText = '300 DPI matbaa kalitesinde PNG üretiliyor...';

  setTimeout(() => {
    const dataURL = exportPNG();
    const link = document.createElement('a');
    link.download = `dergi-baski-300dpi-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    loadingOverlay.classList.add('hidden');
    statusText.innerText = '300 DPI A4 formatında kayıpsız PNG indirildi!';
  }, 100);
});

// Yatay Kaydırma
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