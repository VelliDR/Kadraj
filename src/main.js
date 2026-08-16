// src/main.js
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() { console.log('Yeni sürüm mevcut!'); },
  onOfflineReady() { console.log('Çevrimdışı hazır!'); }
});

import { 
  initCanvas, loadMainImage, applyVectorShape, applyPixelMaskNode, 
  removeForegroundSubject, hasForegroundSubject, setZoom, toggleBackground, 
  exportPNG, hasImage, getOriginalImage, resetEngine, addTextNode, 
  updateSelectedText, deleteSelectedText, updateShapeShadow, 
  updateSubjectSilhouetteShadow, processRawSegmentation, setEdgeOverlap
} from './core/canvasEngine.js';

import { processImageFile } from './core/imageLoader.js';
import { SHAPES } from './core/shapes.js';
import { generatePixelMaskCanvas } from './core/pixelMask.js';
import { extractSubject } from './core/segmentation.js';

// DOM Elemanları (Aynı kalıyor)
const statusText = document.getElementById('statusText');
const canvasContainer = document.getElementById('canvas-container');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const btnInvertMask = document.getElementById('btnInvertMask');
const btnSegment = document.getElementById('btnSegment');
const aiEngineSelect = document.getElementById('aiEngineSelect');

const textInput = document.getElementById('textInput');
const fontSelect = document.getElementById('fontSelect');
const textColor = document.getElementById('textColor');
const btnAddText = document.getElementById('btnAddText');
const btnDeleteText = document.getElementById('btnDeleteText');

const chkSubjectShadow = document.getElementById('chkSubjectShadow');
const subjShadowColor = document.getElementById('subjShadowColor');

// =========================================================
// YENİ MİMARİ: YATAY SİLİNDİR KADRAN MOTORU (Interactive Dial)
// =========================================================
function setupDial(options) {
  const { id, displayId, min, max, step, initialValue, isLoop = false, format = v => v, onChange } = options;
  const track = document.getElementById(id);
  const display = document.getElementById(displayId);
  if (!track) return;

  let currentValue = initialValue;
  let isDragging = false;
  let startX = 0;
  let accumulatedDelta = 0;

  // Arayüzü ve CSS İllüzyonunu Güncelle
  const updateUI = (val) => {
    if (display) display.innerText = format(val);
    
    // SIFIR DOM İLLÜZYONU: Değer değiştikçe arkaplanı zıt yöne kaydırıyoruz
    // 1 adım (step) için arka planı 10 piksel (çizgi aralığı) kaydırır
    const pixelsPerUnit = 10 / step; 
    track.style.backgroundPosition = `calc(50% + ${-val * pixelsPerUnit}px) bottom, calc(50% + ${-val * pixelsPerUnit}px) bottom`;
  };

  // Başlangıç değeriyle UI'ı çiz
  updateUI(currentValue);

  // Sürükleme Başlangıcı
  track.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    accumulatedDelta = 0;
    track.setPointerCapture(e.pointerId); // Farenin ekrandan çıkmasını tolere eder
  });

  // Dokunsal Sürükleme (Hassas Matematik)
  track.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    startX = e.clientX;

    // React'taki algoritman: Her 3px yatay sürükleme = 1 step
    accumulatedDelta += deltaX;
    const stepShift = Math.trunc(accumulatedDelta / 3);

    if (stepShift !== 0) {
      // Sağa çekince değer artar, arka plan sola kayar (Fiziksel his)
      let newValue = currentValue + (stepShift * step);

      if (isLoop) {
        // Sonsuz Döngü (Açılar için negatif modulo düzeltmesi)
        const range = max - min;
        newValue = ((newValue - min) % range + range) % range + min;
      } else {
        // Fiziksel Kenar (Hard-Stop)
        if (newValue > max) newValue = max;
        if (newValue < min) newValue = min;
      }

      if (newValue !== currentValue) {
        currentValue = newValue;
        requestAnimationFrame(() => updateUI(currentValue));
        onChange(currentValue);
      }
      
      // İşlenen kadarı deltan düş
      accumulatedDelta -= stepShift * 3;
    }
  });

  // Sürüklemeyi Bırakma (Atalet Yok, Zınk Diye Durur)
  const stopDrag = (e) => {
    isDragging = false;
    try { track.releasePointerCapture(e.pointerId); } catch(err) {}
  };

  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);

  // Fare Tekerleği Desteği
  track.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -step : step;
    let newValue = currentValue + delta;

    if (isLoop) {
      const range = max - min;
      newValue = ((newValue - min) % range + range) % range + min;
    } else {
      if (newValue > max) newValue = max;
      if (newValue < min) newValue = min;
    }

    if (newValue !== currentValue) {
      currentValue = newValue;
      requestAnimationFrame(() => updateUI(currentValue));
      onChange(currentValue);
    }
  }, { passive: false });
}

// =========================================================
// BÜTÜN DÜĞMELERİ YATAY KADRANA BAĞLAMA
// =========================================================

// 1. Zoom (Üst Bar)
setupDial({
  id: 'zoomRange', displayId: 'zoomDisplay', min: 0.3, max: 3.0, step: 0.05, initialValue: 1.0,
  format: (v) => v.toFixed(2) + 'x', onChange: (val) => setZoom(val)
});

// 2. Tipografi: Yazı Boyutu
setupDial({
  id: 'fontSizeRange', displayId: 'fontSizeDisplay', min: 14, max: 120, step: 1, initialValue: 32,
  format: (v) => v + 'px', onChange: (val) => updateSelectedText({ fontSize: val })
});

// 3. Tipografi: Metin Rotasyonu (Sonsuz Döngü)
setupDial({
  id: 'textRotationRange', displayId: 'textRotationDisplay', min: 0, max: 360, step: 1, initialValue: 0, isLoop: true,
  format: (v) => Math.round(v) + '°', onChange: (val) => updateSelectedText({ rotation: val })
});

// 4. Gölgeler: Kenar Yumuşatma
setupDial({
  id: 'edgeOverlapRange', displayId: 'edgeOverlapDisplay', min: 0.5, max: 5.0, step: 0.1, initialValue: 0.8,
  format: (v) => '%' + v.toFixed(1), onChange: (val) => setEdgeOverlap(val)
});

// 5. Gölgeler: Şekil Gölge Açısı
setupDial({
  id: 'shapeShadowAngle', displayId: 'shapeShadowAngleDisplay', min: 0, max: 360, step: 1, initialValue: 45, isLoop: true,
  format: (v) => Math.round(v) + '°', onChange: (val) => updateShapeShadow({ angle: val })
});

// 6. Gölgeler: Şekil Gölge Mesafesi
setupDial({
  id: 'shapeShadowDist', displayId: 'shapeShadowDistDisplay', min: 0, max: 40, step: 1, initialValue: 0,
  format: (v) => v + 'px', onChange: (val) => updateShapeShadow({ distance: val })
});

// 7. Gölgeler: Şekil Gölge Bulanıklığı
setupDial({
  id: 'shapeShadowBlur', displayId: 'shapeShadowBlurDisplay', min: 0, max: 30, step: 1, initialValue: 0,
  format: (v) => v + 'px', onChange: (val) => updateShapeShadow({ blur: val })
});

// 8. Gölgeler: Silüet Açısı
setupDial({
  id: 'subjShadowAngle', displayId: 'subjShadowAngleDisplay', min: 0, max: 360, step: 1, initialValue: 135, isLoop: true,
  format: (v) => Math.round(v) + '°', onChange: (val) => updateSubjectSilhouetteShadow({ angle: val })
});

// 9. Gölgeler: Silüet Mesafesi
setupDial({
  id: 'subjShadowDist', displayId: 'subjShadowDistDisplay', min: 0, max: 50, step: 1, initialValue: 14,
  format: (v) => v + 'px', onChange: (val) => updateSubjectSilhouetteShadow({ distance: val })
});

// =========================================================
// YARDIMCI FONKSİYONLAR VE EVENT LİSTENER'LAR (Aynı Kalıyor)
// =========================================================

function showLoading(msg) {
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  if (loadingText) loadingText.innerText = msg || 'İşleniyor...';
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}
function showWarning() {
  if (statusText) statusText.innerText = 'Lütfen önce bir ana görsel yükleyin!';
}

document.querySelectorAll('.dock-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const targetPanel = document.getElementById(tab.dataset.tab);
    if (targetPanel) targetPanel.classList.add('active');
  });
});

initCanvas('canvas-container', (selectedNode) => {
  if (selectedNode) {
    btnDeleteText.classList.remove('hidden');
    textInput.value = selectedNode.text();
    fontSelect.value = selectedNode.fontFamily();
    textColor.value = selectedNode.fill();
    
    // Canvas'tan text seçildiğinde kadranı senkronize etme hilesi
    const rot = Math.round((selectedNode.rotation() % 360 + 360) % 360);
    const display = document.getElementById('textRotationDisplay');
    const track = document.getElementById('textRotationRange');
    if (display) display.innerText = rot + '°';
    if (track) {
      // Pikseli tersine mühendislikle manuel kaydır (Senkronizasyon)
      const pixelsPerUnit = 10 / 1; 
      track.style.backgroundPosition = `calc(50% + ${-rot * pixelsPerUnit}px) bottom, calc(50% + ${-rot * pixelsPerUnit}px) bottom`;
    }

    const typoTab = document.querySelector('[data-tab="tab-typography"]');
    if (typoTab) typoTab.click();
  } else {
    btnDeleteText.classList.add('hidden');
  }
});

fontSelect.addEventListener('change', (e) => updateSelectedText({ fontFamily: e.target.value }));
textColor.addEventListener('input', (e) => updateSelectedText({ fill: e.target.value }));
textInput.addEventListener('input', (e) => updateSelectedText({ text: e.target.value }));

btnAddText.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) return;
  addTextNode({ text, fontFamily: fontSelect.value, fill: textColor.value, fontSize: 32, rotation: 0 });
});

btnDeleteText.addEventListener('click', () => deleteSelectedText());

document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showLoading('Görsel kalitesi analiz ediliyor...');
  try {
    const imgObj = await processImageFile(file, (msg) => { loadingText.innerText = msg; });
    loadMainImage(imgObj);
    rawSegmentationResult = null;
    btnSegment.innerText = '✨ Özneyi Ayır';
    btnInvertMask.classList.add('hidden');
    document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
    statusText.innerText = 'Görsel tuvale organik oranlarıyla yerleştirildi.';
  } catch (err) {
    statusText.innerText = 'Görsel yüklenirken hata oluştu.';
    console.error(err);
  } finally {
    hideLoading();
  }
});

btnSegment.addEventListener('click', async () => {
  if (!hasImage()) return showWarning();
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
  const selectedModel = aiEngineSelect ? aiEngineSelect.value : 'isnet_quint8';
  showLoading('Yapay zeka modeli hazırlanıyor...');
  try {
    const maskCanvas = await extractSubject(origImg, selectedModel, (progressText) => { loadingText.innerText = progressText; });
    rawSegmentationResult = maskCanvas;
    processRawSegmentation(rawSegmentationResult);
    btnSegment.innerText = '🗑️ Özneyi Kaldır';
    statusText.innerText = 'Özne başarıyla ayrıştırıldı (3D Pop-Out aktif).';
  } catch (error) {
    statusText.innerText = 'Özne ayrıştırılamadı.';
  } finally { hideLoading(); }
});

chkSubjectShadow.addEventListener('change', (e) => { updateSubjectSilhouetteShadow({ enabled: e.target.checked }); });
subjShadowColor.addEventListener('input', (e) => { updateSubjectSilhouetteShadow({ color: e.target.value }); });

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
    if (customMaskRawImg) {
      const maskCanvas = generatePixelMaskCanvas(customMaskRawImg, customMaskRawImg.width, customMaskRawImg.height, isMaskInverted);
      applyPixelMaskNode(maskCanvas);
      btnInvertMask.classList.remove('hidden');
    }
  } finally { hideLoading(); }
});

btnInvertMask.addEventListener('click', () => {
  if (!customMaskRawImg) return;
  isMaskInverted = !isMaskInverted;
  const maskCanvas = generatePixelMaskCanvas(customMaskRawImg, customMaskRawImg.width, customMaskRawImg.height, isMaskInverted);
  applyPixelMaskNode(maskCanvas);
});

document.getElementById('btnToggleBg').addEventListener('click', () => {
  const isTrans = toggleBackground();
  canvasContainer.classList.toggle('transparent-canvas', isTrans);
  document.getElementById('btnToggleBg').innerText = isTrans ? '📄 Zemin' : '🏁 Şeffaf';
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!hasImage()) return;
  resetEngine();
  rawSegmentationResult = null;
  btnSegment.innerText = '✨ Özneyi Ayır';
  btnInvertMask.classList.add('hidden');
  btnDeleteText.classList.add('hidden');
  chkSubjectShadow.checked = false;
  document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
  statusText.innerText = 'Sıfırlandı.';
});

document.getElementById('btnDownload').addEventListener('click', () => {
  if (!hasImage()) return showWarning();
  showLoading('Kayıpsız PNG üretiliyor...');
  setTimeout(() => {
    const dataURL = exportPNG();
    const link = document.createElement('a');
    link.download = `kadraj-export-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hideLoading();
    statusText.innerText = 'Görsel organik boyutlarıyla indirildi!';
  }, 100);
});

const shapeScroll = document.getElementById('shapeButtons');
if (shapeScroll) {
  shapeScroll.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) { e.preventDefault(); shapeScroll.scrollLeft += e.deltaY; }
  });
}