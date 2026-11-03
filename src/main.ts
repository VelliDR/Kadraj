// src/main.ts
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Yeni sürüm mevcut!');
  },
  onOfflineReady() {
    console.log('Çevrimdışı hazır!');
  },
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
  setEdgeRefine,
  getProjectSnapshot,
  restoreProjectSnapshot,
  applyForegroundSubject,
  getCutoutCanvas,
  getLayersList,
  toggleLayerVisibility,
  moveTextLayerOrder,
  selectTextById,
  getSelectedTextNode,
  applyCanvasPreset,
  exportMultiFormat,
  applyTexture,
  setImageAdjustments,
  getTextureConfig,
  getRawSegmentationMask,
  handleCanvasResize,
  setLensConfig,
  getCurrentShapeKey,
} from './core/canvasEngine';

import { processImageFile } from './core/imageLoader';
import { SHAPES } from './core/shapes';
import { generatePixelMaskCanvas } from './core/pixelMask';
import { extractSubject } from './core/segmentation';
import { HistoryManager } from './core/historyManager';
import {
  saveDraftToStorage,
  loadDraftFromStorage,
  clearDraftFromStorage,
  imageElementToBlob,
  canvasElementToBlob,
  blobToImageElement,
} from './storage/projectStorage';
import type {
  DialOptions,
  SegmentationModelName,
  ProjectSnapshot,
  StoredProject,
  CanvasPreset,
  ExportFormat,
  TextureType,
  TextureBlendMode,
  LensTint,
} from './types';

// DOM Elemanları
const statusText = document.getElementById('statusText') as HTMLParagraphElement | null;
const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement | null;
const loadingOverlay = document.getElementById('loadingOverlay') as HTMLDivElement | null;
const loadingText = document.getElementById('loadingText') as HTMLParagraphElement | null;
const btnInvertMask = document.getElementById('btnInvertMask') as HTMLButtonElement | null;
const btnSegment = document.getElementById('btnSegment') as HTMLButtonElement | null;
const aiEngineSelect = document.getElementById('aiEngineSelect') as HTMLSelectElement | null;

const textInput = document.getElementById('textInput') as HTMLInputElement | null;
const fontSelect = document.getElementById('fontSelect') as HTMLSelectElement | null;
const textColor = document.getElementById('textColor') as HTMLInputElement | null;
const btnAddText = document.getElementById('btnAddText') as HTMLButtonElement | null;
const btnDeleteText = document.getElementById('btnDeleteText') as HTMLButtonElement | null;

const chkSubjectShadow = document.getElementById('chkSubjectShadow') as HTMLInputElement | null;
const subjShadowColor = document.getElementById('subjShadowColor') as HTMLInputElement | null;
const shapeShadowColor = document.getElementById('shapeShadowColor') as HTMLInputElement | null;

// Faz 2: Geri Al / İleri Al ve Taslak Elemanları
const btnUndo = document.getElementById('btnUndo') as HTMLButtonElement | null;
const btnRedo = document.getElementById('btnRedo') as HTMLButtonElement | null;
const draftBanner = document.getElementById('draftBanner') as HTMLDivElement | null;
const btnRestoreDraft = document.getElementById('btnRestoreDraft') as HTMLButtonElement | null;
const btnDismissDraft = document.getElementById('btnDismissDraft') as HTMLButtonElement | null;

// Faz 3: Zengin Tipografi & Katman Elemanları
const btnAlignLeft = document.getElementById('btnAlignLeft') as HTMLButtonElement | null;
const btnAlignCenter = document.getElementById('btnAlignCenter') as HTMLButtonElement | null;
const btnAlignRight = document.getElementById('btnAlignRight') as HTMLButtonElement | null;
const btnBold = document.getElementById('btnBold') as HTMLButtonElement | null;
const btnItalic = document.getElementById('btnItalic') as HTMLButtonElement | null;

// Faz 4: Boyut Presetleri & Dışa Aktarma Modalı
const presetSelect = document.getElementById('presetSelect') as HTMLSelectElement | null;
const exportModal = document.getElementById('exportModal') as HTMLDivElement | null;
const btnCloseModal = document.getElementById('btnCloseModal') as HTMLButtonElement | null;
const btnCancelExport = document.getElementById('btnCancelExport') as HTMLButtonElement | null;
const btnConfirmExport = document.getElementById('btnConfirmExport') as HTMLButtonElement | null;
const chkCropMarks = document.getElementById('chkCropMarks') as HTMLInputElement | null;

// Faz 5: Efektler, Kağıt Dokuları & Filtreler
const textureSelect = document.getElementById('textureSelect') as HTMLSelectElement | null;
const textureBlendSelect = document.getElementById('textureBlendSelect') as HTMLSelectElement | null;
const btnFilterReset = document.getElementById('btnFilterReset') as HTMLButtonElement | null;
const btnFilterSepia = document.getElementById('btnFilterSepia') as HTMLButtonElement | null;
const btnFilterMono = document.getElementById('btnFilterMono') as HTMLButtonElement | null;

// Faz 6: Mercek Portalı (Lens FX) Elemanları
const chkLensEnabled = document.getElementById('chkLensEnabled') as HTMLInputElement | null;
const chkLensReflect = document.getElementById('chkLensReflect') as HTMLInputElement | null;
const lensMaskInput = document.getElementById('lensMaskInput') as HTMLInputElement | null;
const btnInvertLensMask = document.getElementById('btnInvertLensMask') as HTMLButtonElement | null;

// Durum değişkenleri
let customMaskRawImg: HTMLImageElement | null = null;
let isMaskInverted = false;
let autosaveTimer: number | null = null;
let currentAlign: 'left' | 'center' | 'right' = 'center';
let isBold = false;
let isItalic = false;

// =========================================================
// FAZ 2: TARİHÇE (UNDO / REDO) YÖNETİCİSİ
// =========================================================
const historyManager = new HistoryManager((canUndo, canRedo) => {
  if (btnUndo) btnUndo.disabled = !canUndo;
  if (btnRedo) btnRedo.disabled = !canRedo;
});

// =========================================================
// YENİ MİMARİ: YATAY SİLİNDİR KADRAN MOTORU (Interactive Dial)
// + Erişilebilirlik + Programatik Güncelleme
// =========================================================
interface DialController {
  setValue: (val: number, triggerChange?: boolean) => void;
  getValue: () => number;
}

const dials: Record<string, DialController> = {};

function setupDial(options: DialOptions): DialController {
  const { id, displayId, min, max, step, initialValue, isLoop = false, format = (v) => String(v), onChange, label } = options;
  const track = document.getElementById(id) as HTMLElement | null;
  const display = document.getElementById(displayId) as HTMLElement | null;

  let currentValue = initialValue;
  let isDragging = false;
  let startX = 0;
  let accumulatedDelta = 0;

  if (track) {
    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-valuemin', String(min));
    track.setAttribute('aria-valuemax', String(max));
    track.setAttribute('aria-valuenow', String(currentValue));
    if (label) track.setAttribute('aria-label', label);
  }

  const updateUI = (val: number) => {
    if (display) display.innerText = format(val);
    if (track) {
      track.setAttribute('aria-valuenow', String(val));
      const pixelsPerUnit = 10 / step;
      track.style.backgroundPosition = `calc(50% + ${-val * pixelsPerUnit}px) bottom, calc(50% + ${-val * pixelsPerUnit}px) bottom`;
    }
  };

  const applyNewValue = (val: number, trigger = true) => {
    let next = val;
    if (isLoop) {
      const range = max - min;
      next = (((next - min) % range) + range) % range + min;
    } else {
      if (next > max) next = max;
      if (next < min) next = min;
    }

    if (next !== currentValue || !trigger) {
      currentValue = next;
      requestAnimationFrame(() => updateUI(currentValue));
      if (trigger) {
        onChange(currentValue);
        scheduleAutosave();
      }
    }
  };

  updateUI(currentValue);

  if (track) {
    let totalDragDist = 0;

    track.addEventListener('pointerdown', (e: PointerEvent) => {
      isDragging = true;
      startX = e.clientX;
      totalDragDist = 0;
      accumulatedDelta = 0;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      startX = e.clientX;

      totalDragDist += Math.abs(deltaX);
      accumulatedDelta += deltaX;
      const stepShift = Math.trunc(accumulatedDelta / 2);

      if (stepShift !== 0) {
        applyNewValue(currentValue + stepShift * step);
        accumulatedDelta -= stepShift * 2;
      }
    });

    const stopDrag = (e: PointerEvent) => {
      if (isDragging) {
        isDragging = false;
        try {
          track.releasePointerCapture(e.pointerId);
        } catch {
          // Ignored
        }

        // Kullanıcı sürüklemeden sadece tıkladıysa (tap / click):
        if (totalDragDist < 4) {
          const rect = track.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const centerX = rect.width / 2;
          const diff = clickX - centerX;
          if (Math.abs(diff) > 4) {
            const dir = diff > 0 ? 1 : -1;
            applyNewValue(currentValue + dir * step);
          }
        }

        pushHistorySnapshot();
      }
    };

    track.addEventListener('pointerup', stopDrag);
    track.addEventListener('pointercancel', stopDrag);

    track.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -step : step;
        applyNewValue(currentValue + delta);
        pushHistorySnapshot();
      },
      { passive: false }
    );

    track.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        applyNewValue(currentValue + step);
        pushHistorySnapshot();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        applyNewValue(currentValue - step);
        pushHistorySnapshot();
      } else if (e.key === 'Home') {
        e.preventDefault();
        applyNewValue(min);
        pushHistorySnapshot();
      } else if (e.key === 'End') {
        e.preventDefault();
        applyNewValue(max);
        pushHistorySnapshot();
      }
    });
  }

  display?.addEventListener('dblclick', () => {
    const input = prompt(`Yeni değer girin (${min} - ${max}):`, String(currentValue));
    if (input !== null) {
      const parsed = parseFloat(input);
      if (!isNaN(parsed)) {
        applyNewValue(parsed);
        pushHistorySnapshot();
      }
    }
  });

  const controller: DialController = {
    setValue: (val: number, trigger = false) => {
      applyNewValue(val, trigger);
    },
    getValue: () => currentValue,
  };

  dials[id] = controller;
  return controller;
}

// =========================================================
// BÜTÜN DÜĞMELERİ YATAY KADRANA BAĞLAMA
// =========================================================

setupDial({
  id: 'zoomRange',
  displayId: 'zoomDisplay',
  min: 0.3,
  max: 3.0,
  step: 0.05,
  initialValue: 1.0,
  label: 'Ölçek',
  format: (v) => v.toFixed(2) + 'x',
  onChange: (val) => setZoom(val),
});

setupDial({
  id: 'fontSizeRange',
  displayId: 'fontSizeDisplay',
  min: 14,
  max: 120,
  step: 1,
  initialValue: 32,
  label: 'Yazı Boyutu',
  format: (v) => v + 'px',
  onChange: (val) => updateSelectedText({ fontSize: val }),
});

setupDial({
  id: 'textRotationRange',
  displayId: 'textRotationDisplay',
  min: 0,
  max: 360,
  step: 1,
  initialValue: 0,
  isLoop: true,
  label: 'Metin Döndürme',
  format: (v) => Math.round(v) + '°',
  onChange: (val) => updateSelectedText({ rotation: val }),
});

// Faz 3: Harf Aralığı Kadranı
setupDial({
  id: 'letterSpacingRange',
  displayId: 'letterSpacingDisplay',
  min: -2,
  max: 20,
  step: 0.5,
  initialValue: 0,
  label: 'Harf Aralığı',
  format: (v) => v + 'px',
  onChange: (val) => updateSelectedText({ letterSpacing: val }),
});

setupDial({
  id: 'edgeOverlapRange',
  displayId: 'edgeOverlapDisplay',
  min: 0.5,
  max: 5.0,
  step: 0.1,
  initialValue: 0.8,
  label: 'Kenar Yumuşatma',
  format: (v) => '%' + v.toFixed(1),
  onChange: (val) => setEdgeOverlap(val),
});

setupDial({
  id: 'shapeShadowAngle',
  displayId: 'shapeShadowAngleDisplay',
  min: 0,
  max: 360,
  step: 1,
  initialValue: 45,
  isLoop: true,
  label: 'Şekil Gölge Açısı',
  format: (v) => Math.round(v) + '°',
  onChange: (val) => updateShapeShadow({ angle: val }),
});

setupDial({
  id: 'shapeShadowDist',
  displayId: 'shapeShadowDistDisplay',
  min: 0,
  max: 40,
  step: 1,
  initialValue: 0,
  label: 'Şekil Gölge Mesafesi',
  format: (v) => v + 'px',
  onChange: (val) => updateShapeShadow({ distance: val }),
});

setupDial({
  id: 'shapeShadowBlur',
  displayId: 'shapeShadowBlurDisplay',
  min: 0,
  max: 30,
  step: 1,
  initialValue: 0,
  label: 'Şekil Gölge Bulanıklığı',
  format: (v) => v + 'px',
  onChange: (val) => updateShapeShadow({ blur: val }),
});

setupDial({
  id: 'subjShadowAngle',
  displayId: 'subjShadowAngleDisplay',
  min: 0,
  max: 360,
  step: 1,
  initialValue: 135,
  isLoop: true,
  label: 'Silüet Gölge Açısı',
  format: (v) => Math.round(v) + '°',
  onChange: (val) => updateSubjectSilhouetteShadow({ angle: val }),
});

setupDial({
  id: 'subjShadowDist',
  displayId: 'subjShadowDistDisplay',
  min: 0,
  max: 50,
  step: 1,
  initialValue: 14,
  label: 'Silüet Gölge Mesafesi',
  format: (v) => v + 'px',
  onChange: (val) => updateSubjectSilhouetteShadow({ distance: val }),
});

// =========================================================
// FAZ 5: DOKU, FOTOĞRAF AYARLARI VE KENAR MATTİNG KADRANLARI
// =========================================================

setupDial({
  id: 'textureOpacityRange',
  displayId: 'textureOpacityDisplay',
  min: 0,
  max: 100,
  step: 1,
  initialValue: 25,
  label: 'Doku Opaklığı',
  format: (v) => '%' + Math.round(v),
  onChange: (val) => {
    const currentCfg = getTextureConfig();
    let type = currentCfg.type;
    if (type === 'none') {
      type = 'parchment';
      if (textureSelect) textureSelect.value = 'parchment';
    }
    applyTexture({ type, opacity: val / 100 });
  },
});

setupDial({
  id: 'brightnessRange',
  displayId: 'brightnessDisplay',
  min: -100,
  max: 100,
  step: 1,
  initialValue: 0,
  label: 'Parlaklık',
  format: (v) => String(Math.round(v)),
  onChange: (val) => setImageAdjustments({ brightness: val }),
});

setupDial({
  id: 'contrastRange',
  displayId: 'contrastDisplay',
  min: -100,
  max: 100,
  step: 1,
  initialValue: 0,
  label: 'Kontrast',
  format: (v) => String(Math.round(v)),
  onChange: (val) => setImageAdjustments({ contrast: val }),
});

setupDial({
  id: 'saturationRange',
  displayId: 'saturationDisplay',
  min: -100,
  max: 100,
  step: 1,
  initialValue: 0,
  label: 'Doygunluk',
  format: (v) => String(Math.round(v)),
  onChange: (val) => setImageAdjustments({ saturation: val }),
});

setupDial({
  id: 'noiseRange',
  displayId: 'noiseDisplay',
  min: 0,
  max: 50,
  step: 1,
  initialValue: 0,
  label: 'Gren',
  format: (v) => String(Math.round(v)),
  onChange: (val) => setImageAdjustments({ noise: val }),
});

setupDial({
  id: 'erodePixelsRange',
  displayId: 'erodePixelsDisplay',
  min: 0,
  max: 4,
  step: 1,
  initialValue: 0,
  label: 'Halo Silme',
  format: (v) => Math.round(v) + 'px',
  onChange: (val) => {
    setEdgeRefine({ erodePixels: val });
    if (!getRawSegmentationMask() && statusText) {
      statusText.innerText = 'ℹ️ Halo silme için önce "✨ Özneyi Ayır" ile özneyi ayrıştırın.';
    }
  },
});

setupDial({
  id: 'featherBlurRange',
  displayId: 'featherBlurDisplay',
  min: 0,
  max: 8,
  step: 0.5,
  initialValue: 0,
  label: 'Feather Blur',
  format: (v) => v.toFixed(1) + 'px',
  onChange: (val) => {
    setEdgeRefine({ featherBlur: val });
    if (!getRawSegmentationMask() && statusText) {
      statusText.innerText = 'ℹ️ Feather blur için önce "✨ Özneyi Ayır" ile özneyi ayrıştırın.';
    }
  },
});

// =========================================================
// FAZ 6: MERCEK PORTALI (LENS FX) KADRANLARI
// =========================================================

setupDial({
  id: 'lensZoomRange',
  displayId: 'lensZoomDisplay',
  min: 1.0,
  max: 3.0,
  step: 0.05,
  initialValue: 1.6,
  label: 'Mercek Büyütmesi',
  format: (v) => v.toFixed(2) + 'x',
  onChange: (val) => setLensConfig({ zoom: val }),
});

setupDial({
  id: 'lensBulgeRange',
  displayId: 'lensBulgeDisplay',
  min: 0,
  max: 100,
  step: 1,
  initialValue: 35,
  label: 'Balıkgözü / Bombe',
  format: (v) => '%' + Math.round(v),
  onChange: (val) => setLensConfig({ bulge: val }),
});

setupDial({
  id: 'lensAberrationRange',
  displayId: 'lensAberrationDisplay',
  min: 0,
  max: 10,
  step: 0.5,
  initialValue: 3,
  label: 'Prizmatik Aberasyon',
  format: (v) => v.toFixed(1) + 'px',
  onChange: (val) => setLensConfig({ aberration: val }),
});

// =========================================================
// FAZ 3: KATMAN LİSTESİ RENDER MOTORU (LAYER STACK)
// =========================================================

function renderLayerList(): void {
  const layerListEl = document.getElementById('layerList');
  const layerCountEl = document.getElementById('layerCount');
  if (!layerListEl) return;

  const layers = getLayersList();
  if (layerCountEl) {
    layerCountEl.innerText = `${layers.length} Katman`;
  }

  if (layers.length === 0) {
    layerListEl.innerHTML = '<p class="layer-empty">Görsel veya metin ekleyin.</p>';
    return;
  }

  layerListEl.innerHTML = '';
  layers.forEach((layer) => {
    const row = document.createElement('div');
    row.className = `layer-row ${layer.selected ? 'active' : ''}`;

    const titleWrap = document.createElement('div');
    titleWrap.className = 'layer-row-title';
    titleWrap.innerText = layer.name;
    titleWrap.addEventListener('click', () => {
      if (layer.type === 'text') {
        selectTextById(layer.id);
        const typoTab = document.querySelector<HTMLButtonElement>('[data-tab="tab-typography"]');
        if (typoTab) typoTab.click();
      }
    });

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'layer-row-actions';

    // Sıralama butonları (Metinler için)
    if (layer.type === 'text') {
      const btnUp = document.createElement('button');
      btnUp.className = 'layer-btn';
      btnUp.innerText = '▲';
      btnUp.title = 'Yukarı Taşı';
      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        moveTextLayerOrder(layer.id, 'up');
        renderLayerList();
        pushHistorySnapshot();
      });

      const btnDown = document.createElement('button');
      btnDown.className = 'layer-btn';
      btnDown.innerText = '▼';
      btnDown.title = 'Aşağı Taşı';
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        moveTextLayerOrder(layer.id, 'down');
        renderLayerList();
        pushHistorySnapshot();
      });

      actionsWrap.appendChild(btnUp);
      actionsWrap.appendChild(btnDown);
    }

    // Görünürlük butonu (👁️ / 🕶️)
    const btnVis = document.createElement('button');
    btnVis.className = 'layer-btn';
    btnVis.innerText = layer.visible ? '👁️' : '🕶️';
    btnVis.title = layer.visible ? 'Gizle' : 'Göster';
    btnVis.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLayerVisibility(layer.id);
      renderLayerList();
      pushHistorySnapshot();
    });

    actionsWrap.appendChild(btnVis);
    row.appendChild(titleWrap);
    row.appendChild(actionsWrap);
    layerListEl.appendChild(row);
  });
}

// =========================================================
// FAZ 3: ZENGİN TİPOGRAFİ SENKRONİZASYONU
// =========================================================

function syncTypographyUI(): void {
  const selected = getSelectedTextNode();
  if (selected) {
    currentAlign = (selected.align() as 'left' | 'center' | 'right') || 'center';
    const fontStyle = selected.fontStyle() || 'normal';
    isBold = fontStyle.includes('bold');
    isItalic = fontStyle.includes('italic');
    dials['letterSpacingRange']?.setValue(selected.letterSpacing() || 0, false);
  }

  btnAlignLeft?.classList.toggle('active', currentAlign === 'left');
  btnAlignCenter?.classList.toggle('active', currentAlign === 'center');
  btnAlignRight?.classList.toggle('active', currentAlign === 'right');
  btnBold?.classList.toggle('active', isBold);
  btnItalic?.classList.toggle('active', isItalic);
}

function updateFontStyle(): void {
  let style = 'normal';
  if (isBold && isItalic) style = 'bold italic';
  else if (isBold) style = 'bold';
  else if (isItalic) style = 'italic';

  updateSelectedText({ fontStyle: style });
  syncTypographyUI();
  pushHistorySnapshot();
}

btnAlignLeft?.addEventListener('click', () => {
  currentAlign = 'left';
  updateSelectedText({ align: 'left' });
  syncTypographyUI();
  pushHistorySnapshot();
});

btnAlignCenter?.addEventListener('click', () => {
  currentAlign = 'center';
  updateSelectedText({ align: 'center' });
  syncTypographyUI();
  pushHistorySnapshot();
});

btnAlignRight?.addEventListener('click', () => {
  currentAlign = 'right';
  updateSelectedText({ align: 'right' });
  syncTypographyUI();
  pushHistorySnapshot();
});

btnBold?.addEventListener('click', () => {
  isBold = !isBold;
  updateFontStyle();
});

btnItalic?.addEventListener('click', () => {
  isItalic = !isItalic;
  updateFontStyle();
});

// =========================================================
// TARİHÇE (SNAPSHOT) VE ARAYÜZ SENKRONİZASYONU
// =========================================================

function pushHistorySnapshot(): void {
  if (!hasImage() || historyManager.isRestoring) return;
  const snapshot = getProjectSnapshot();
  historyManager.push(snapshot);
  scheduleAutosave();
  renderLayerList();
}

function syncUIFromSnapshot(s: ProjectSnapshot): void {
  dials['zoomRange']?.setValue(s.zoom, false);
  dials['edgeOverlapRange']?.setValue(s.edgeOverlap, false);
  dials['shapeShadowAngle']?.setValue(s.shapeShadow.angle, false);
  dials['shapeShadowDist']?.setValue(s.shapeShadow.distance, false);
  dials['shapeShadowBlur']?.setValue(s.shapeShadow.blur, false);
  dials['subjShadowAngle']?.setValue(s.subjectShadow.angle, false);
  dials['subjShadowDist']?.setValue(s.subjectShadow.distance, false);

  if (chkSubjectShadow) chkSubjectShadow.checked = s.subjectShadow.enabled;
  if (subjShadowColor) subjShadowColor.value = s.subjectShadow.color;
  if (shapeShadowColor && s.shapeShadow?.color) shapeShadowColor.value = s.shapeShadow.color;
  if (btnToggleBg) btnToggleBg.innerText = s.isTransparent ? '📄 Zemin' : '🏁 Şeffaf';
  if (canvasContainer) canvasContainer.classList.toggle('transparent-canvas', s.isTransparent);
  if (btnSegment) btnSegment.innerText = s.hasSubjectCutout ? '🗑️ Özneyi Kaldır' : '✨ Özneyi Ayır';

  document.querySelectorAll<HTMLButtonElement>('.shape-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.shape === s.shapeKey);
  });

  if (presetSelect && s.preset) {
    presetSelect.value = s.preset;
  }

  // Faz 5: Doku, Görsel Ayarları ve Kenar İnceltme Senkronizasyonu
  if (s.texture) {
    if (textureSelect) textureSelect.value = s.texture.type;
    if (textureBlendSelect) textureBlendSelect.value = s.texture.blendMode;
    dials['textureOpacityRange']?.setValue(Math.round(s.texture.opacity * 100), false);
  }

  if (s.adjustments) {
    dials['brightnessRange']?.setValue(s.adjustments.brightness, false);
    dials['contrastRange']?.setValue(s.adjustments.contrast, false);
    dials['saturationRange']?.setValue(s.adjustments.saturation, false);
    dials['noiseRange']?.setValue(s.adjustments.noise, false);
  }

  if (s.edgeRefine) {
    dials['erodePixelsRange']?.setValue(s.edgeRefine.erodePixels, false);
    dials['featherBlurRange']?.setValue(s.edgeRefine.featherBlur, false);
  }

  // Faz 6: Mercek Portalı (Lens FX) Senkronizasyonu
  if (s.lens) {
    if (chkLensEnabled) chkLensEnabled.checked = s.lens.enabled;
    if (chkLensReflect) chkLensReflect.checked = s.lens.glassReflect;
    dials['lensZoomRange']?.setValue(s.lens.zoom, false);
    dials['lensBulgeRange']?.setValue(s.lens.bulge, false);
    dials['lensAberrationRange']?.setValue(s.lens.aberration, false);

    document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tint === s.lens?.tint);
    });
  }

  syncTypographyUI();
  renderLayerList();
}

// =========================================================
// OTOMATİK TASLAK SAKLAMA (INDEXEDDB AUTOSAVE)
// =========================================================

function scheduleAutosave(): void {
  if (!hasImage()) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = window.setTimeout(async () => {
    try {
      const origImg = getOriginalImage();
      if (!origImg) return;

      const snapshot = getProjectSnapshot();
      const mainImageBlob = await imageElementToBlob(origImg);
      const cutoutCanvas = getCutoutCanvas();
      const cutoutBlob = cutoutCanvas ? await canvasElementToBlob(cutoutCanvas) : undefined;

      const stored: StoredProject = {
        snapshot,
        mainImageBlob,
        cutoutBlob,
        updatedAt: Date.now(),
      };

      await saveDraftToStorage(stored);
      console.log('Taslak IndexedDB üzerine otomatik kaydedildi.');
    } catch (err) {
      console.warn('Otomatik taslak kaydı sırasında hata:', err);
    }
  }, 1000);
}

// =========================================================
// YARDIMCI FONKSİYONLAR VE EVENT LİSTENER'LAR
// =========================================================

function showLoading(msg?: string): void {
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  if (loadingText) loadingText.innerText = msg || 'İşleniyor...';
}

function hideLoading(): void {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showWarning(): void {
  if (statusText) statusText.innerText = 'Lütfen önce bir ana görsel yükleyin!';
}

document.querySelectorAll<HTMLButtonElement>('.dock-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const targetId = tab.dataset.tab;
    if (targetId) {
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    }
    if (targetId === 'tab-layers') {
      renderLayerList();
    }
  });
});

initCanvas(
  'canvas-container',
  (selectedNode) => {
    if (selectedNode) {
      btnDeleteText?.classList.remove('hidden');
      if (textInput) textInput.value = selectedNode.text();
      if (fontSelect) fontSelect.value = selectedNode.fontFamily();
      if (textColor) textColor.value = String(selectedNode.fill());

      const rot = Math.round((((selectedNode.rotation() % 360) + 360) % 360));
      dials['textRotationRange']?.setValue(rot, false);
      dials['fontSizeRange']?.setValue(selectedNode.fontSize(), false);

      syncTypographyUI();
      renderLayerList();

      const typoTab = document.querySelector<HTMLButtonElement>('[data-tab="tab-typography"]');
      if (typoTab) typoTab.click();
    } else {
      btnDeleteText?.classList.add('hidden');
      renderLayerList();
    }
  },
  () => {
    scheduleAutosave();
    renderLayerList();
  }
);

// Geri Al (Undo) & İleri Al (Redo) Butonları
btnUndo?.addEventListener('click', () => {
  const current = getProjectSnapshot();
  const prev = historyManager.undo(current);
  if (prev) {
    restoreProjectSnapshot(prev);
    syncUIFromSnapshot(prev);
    if (statusText) statusText.innerText = 'Geri alındı.';
  }
});

btnRedo?.addEventListener('click', () => {
  const current = getProjectSnapshot();
  const next = historyManager.redo(current);
  if (next) {
    restoreProjectSnapshot(next);
    syncUIFromSnapshot(next);
    if (statusText) statusText.innerText = 'İleri alındı.';
  }
});

// Klavye Kısayolları (Ctrl+Z / Ctrl+Y)
window.addEventListener('keydown', (e: KeyboardEvent) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    return;
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? e.metaKey : e.ctrlKey;

  if (modifier && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      btnRedo?.click();
    } else {
      btnUndo?.click();
    }
  } else if (modifier && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    btnRedo?.click();
  }
});

fontSelect?.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  updateSelectedText({ fontFamily: target.value });
  pushHistorySnapshot();
});

textColor?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  updateSelectedText({ fill: target.value });
  pushHistorySnapshot();
});

textInput?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  updateSelectedText({ text: target.value });
  renderLayerList();
});

btnAddText?.addEventListener('click', () => {
  const text = textInput?.value.trim();
  if (!text) return;
  addTextNode({
    text,
    fontFamily: fontSelect?.value || 'Cormorant Garamond',
    fill: textColor?.value || '#1a1a1a',
    fontSize: 32,
    rotation: 0,
    align: currentAlign,
    lineHeight: 1.2,
    letterSpacing: dials['letterSpacingRange']?.getValue() || 0,
    fontStyle: isBold && isItalic ? 'bold italic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal',
  });
  pushHistorySnapshot();
  renderLayerList();
});

btnDeleteText?.addEventListener('click', () => {
  deleteSelectedText();
  pushHistorySnapshot();
  renderLayerList();
});

const imageInputElement = document.getElementById('imageInput') as HTMLInputElement | null;
imageInputElement?.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  showLoading('Görsel kalitesi analiz ediliyor...');
  try {
    const imgObj = await processImageFile(file, (msg) => {
      if (loadingText) loadingText.innerText = msg;
    });
    loadMainImage(imgObj);
    historyManager.clear();
    pushHistorySnapshot();
    renderLayerList();

    if (btnSegment) btnSegment.innerText = '✨ Özneyi Ayır';
    btnInvertMask?.classList.add('hidden');
    document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
    if (statusText) statusText.innerText = 'Görsel tuvale organik oranlarıyla yerleştirildi.';
  } catch (err) {
    if (statusText) statusText.innerText = 'Görsel yüklenirken hata oluştu.';
    console.error(err);
  } finally {
    hideLoading();
  }
});

btnSegment?.addEventListener('click', async () => {
  if (!hasImage()) return showWarning();
  if (hasForegroundSubject()) {
    removeForegroundSubject();
    if (btnSegment) btnSegment.innerText = '✨ Özneyi Ayır';
    if (chkSubjectShadow) chkSubjectShadow.checked = false;
    if (statusText) statusText.innerText = 'Özne katmanı kaldırıldı.';
    pushHistorySnapshot();
    renderLayerList();
    return;
  }

  const origImg = getOriginalImage();
  if (!origImg) return showWarning();

  const selectedModel = (aiEngineSelect ? aiEngineSelect.value : 'isnet_quint8') as SegmentationModelName;
  showLoading('Yapay zeka modeli hazırlanıyor...');

  try {
    const maskCanvas = await extractSubject(origImg, selectedModel, (progressText) => {
      if (loadingText) loadingText.innerText = progressText;
    });
    processRawSegmentation(maskCanvas);
    if (btnSegment) btnSegment.innerText = '🗑️ Özneyi Kaldır';
    if (statusText) statusText.innerText = 'Özne başarıyla ayrıştırıldı (3D Pop-Out aktif).';
    pushHistorySnapshot();
    renderLayerList();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Model indirilemedi veya bellek yetersiz.';
    if (statusText) statusText.innerText = `Özne ayrıştırılamadı: ${errorMsg}`;
    console.error('AI Ayrıştırma Hatası:', error);
  } finally {
    hideLoading();
  }
});

chkSubjectShadow?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  updateSubjectSilhouetteShadow({ enabled: target.checked });
  pushHistorySnapshot();
});

subjShadowColor?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  updateSubjectSilhouetteShadow({ color: target.value });
  pushHistorySnapshot();
});

shapeShadowColor?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  updateShapeShadow({ color: target.value });
  pushHistorySnapshot();
});

document.querySelectorAll<HTMLButtonElement>('.shape-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!hasImage()) return showWarning();
    const shapeKey = btn.dataset.shape;
    if (shapeKey && SHAPES[shapeKey]) {
      applyVectorShape(SHAPES[shapeKey], shapeKey);
      btnInvertMask?.classList.add('hidden');
      document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      pushHistorySnapshot();
      renderLayerList();
    }
  });
});

const maskInputElement = document.getElementById('maskInput') as HTMLInputElement | null;
maskInputElement?.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !hasImage()) return showWarning();

  showLoading('Maske yükleniyor...');
  try {
    customMaskRawImg = await processImageFile(file);
    isMaskInverted = false;
    if (customMaskRawImg) {
      const maskCanvas = generatePixelMaskCanvas(
        customMaskRawImg,
        customMaskRawImg.width,
        customMaskRawImg.height,
        isMaskInverted
      );
      applyPixelMaskNode(maskCanvas, isMaskInverted);
      btnInvertMask?.classList.remove('hidden');
      pushHistorySnapshot();
      renderLayerList();
    }
  } finally {
    hideLoading();
  }
});

btnInvertMask?.addEventListener('click', () => {
  if (!customMaskRawImg) return;
  isMaskInverted = !isMaskInverted;
  const maskCanvas = generatePixelMaskCanvas(
    customMaskRawImg,
    customMaskRawImg.width,
    customMaskRawImg.height,
    isMaskInverted
  );
  applyPixelMaskNode(maskCanvas, isMaskInverted);
  pushHistorySnapshot();
});

const btnToggleBg = document.getElementById('btnToggleBg') as HTMLButtonElement | null;
btnToggleBg?.addEventListener('click', () => {
  const isTrans = toggleBackground();
  canvasContainer?.classList.toggle('transparent-canvas', isTrans);
  if (btnToggleBg) btnToggleBg.innerText = isTrans ? '📄 Zemin' : '🏁 Şeffaf';
  pushHistorySnapshot();
});

const btnReset = document.getElementById('btnReset') as HTMLButtonElement | null;
btnReset?.addEventListener('click', async () => {
  if (!hasImage()) return;
  resetEngine();
  customMaskRawImg = null;
  historyManager.clear();
  await clearDraftFromStorage();

  if (btnSegment) btnSegment.innerText = '✨ Özneyi Ayır';
  btnInvertMask?.classList.add('hidden');
  btnDeleteText?.classList.add('hidden');
  if (chkSubjectShadow) chkSubjectShadow.checked = false;
  document.querySelectorAll('.shape-pill').forEach((b) => b.classList.remove('active'));

  if (textureSelect) textureSelect.value = 'none';
  if (textureBlendSelect) textureBlendSelect.value = 'multiply';
  dials['textureOpacityRange']?.setValue(25, false);
  dials['brightnessRange']?.setValue(0, false);
  dials['contrastRange']?.setValue(0, false);
  dials['saturationRange']?.setValue(0, false);
  dials['noiseRange']?.setValue(0, false);
  dials['erodePixelsRange']?.setValue(0, false);
  dials['featherBlurRange']?.setValue(0, false);
  dials['shapeShadowDist']?.setValue(0, false);
  dials['shapeShadowBlur']?.setValue(0, false);
  dials['shapeShadowAngle']?.setValue(45, false);
  dials['subjShadowDist']?.setValue(14, false);
  dials['subjShadowAngle']?.setValue(135, false);
  if (shapeShadowColor) shapeShadowColor.value = '#000000';
  if (subjShadowColor) subjShadowColor.value = '#1a1a1a';

  setLensConfig({ enabled: false, tint: 'none', glassReflect: true, zoom: 1.6, bulge: 35, aberration: 3 });
  if (chkLensEnabled) chkLensEnabled.checked = false;
  if (chkLensReflect) chkLensReflect.checked = true;
  btnInvertLensMask?.classList.add('hidden');
  dials['lensZoomRange']?.setValue(1.6, false);
  dials['lensBulgeRange']?.setValue(35, false);
  dials['lensAberrationRange']?.setValue(3, false);
  document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach((b) => {
    b.classList.toggle('active', b.dataset.tint === 'none');
  });

  renderLayerList();
  if (statusText) statusText.innerText = 'Sıfırlandı ve taslak temizlendi.';
});

// Faz 5: Doku ve Filtre Event Listener'ları
textureSelect?.addEventListener('change', (e) => {
  const type = (e.target as HTMLSelectElement).value as TextureType;
  applyTexture({ type });
  const cfg = getTextureConfig();
  if (textureBlendSelect) textureBlendSelect.value = cfg.blendMode;
  pushHistorySnapshot();
  renderLayerList();
});

textureBlendSelect?.addEventListener('change', (e) => {
  const blendMode = (e.target as HTMLSelectElement).value as TextureBlendMode;
  applyTexture({ blendMode });
  pushHistorySnapshot();
});

btnFilterReset?.addEventListener('click', () => {
  setImageAdjustments({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sepia: false,
    grayscale: false,
    noise: 0,
  });
  dials['brightnessRange']?.setValue(0, false);
  dials['contrastRange']?.setValue(0, false);
  dials['saturationRange']?.setValue(0, false);
  dials['noiseRange']?.setValue(0, false);
  pushHistorySnapshot();
});

btnFilterSepia?.addEventListener('click', () => {
  setImageAdjustments({
    brightness: -5,
    contrast: 15,
    saturation: -20,
    sepia: true,
    grayscale: false,
    noise: 8,
  });
  dials['brightnessRange']?.setValue(-5, false);
  dials['contrastRange']?.setValue(15, false);
  dials['saturationRange']?.setValue(-20, false);
  dials['noiseRange']?.setValue(8, false);
  pushHistorySnapshot();
});

btnFilterMono?.addEventListener('click', () => {
  setImageAdjustments({
    brightness: 0,
    contrast: 20,
    saturation: -100,
    sepia: false,
    grayscale: true,
    noise: 10,
  });
  dials['brightnessRange']?.setValue(0, false);
  dials['contrastRange']?.setValue(20, false);
  dials['saturationRange']?.setValue(-100, false);
  dials['noiseRange']?.setValue(10, false);
  pushHistorySnapshot();
});

// =========================================================
// FAZ 6: OPTİK MERCEK VE CAM PORTALLARI (LENS FX) LİSTENER'LARI
// =========================================================

chkLensEnabled?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (!hasImage()) {
    target.checked = false;
    return showWarning();
  }

  const enabled = target.checked;

  if (enabled) {
    const currentShape = getCurrentShapeKey();
    if (!currentShape && !customMaskRawImg) {
      applyVectorShape(SHAPES.diamond, 'diamond');
      document.querySelectorAll<HTMLButtonElement>('.shape-pill').forEach((b) => {
        b.classList.toggle('active', b.dataset.shape === 'diamond');
      });
    }
    setLensConfig({ enabled: true });
    if (statusText) statusText.innerText = '🔍 Mercek Portalı aktif edildi (Optik distorsiyon devrede).';
  } else {
    setLensConfig({ enabled: false });
    if (statusText) statusText.innerText = 'Mercek Portalı kapatıldı.';
  }

  pushHistorySnapshot();
  renderLayerList();
});

chkLensReflect?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  setLensConfig({ glassReflect: target.checked });
  pushHistorySnapshot();
});

document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tint = (btn.dataset.tint || 'none') as LensTint;
    setLensConfig({ tint });
    document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    pushHistorySnapshot();
  });
});

// Kendi Şeklini / Maskesini Yükleme (Custom Shape Upload)
lensMaskInput?.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !hasImage()) return showWarning();

  showLoading('Özel şekil taranıyor (%100 kontrast analizi)...');
  try {
    customMaskRawImg = await processImageFile(file);
    isMaskInverted = false;
    if (customMaskRawImg) {
      const maskCanvas = generatePixelMaskCanvas(
        customMaskRawImg,
        customMaskRawImg.width,
        customMaskRawImg.height,
        isMaskInverted
      );
      applyPixelMaskNode(maskCanvas, isMaskInverted);
      setLensConfig({ enabled: true });
      if (chkLensEnabled) chkLensEnabled.checked = true;
      btnInvertLensMask?.classList.remove('hidden');
      btnInvertMask?.classList.remove('hidden');
      if (statusText) statusText.innerText = '✨ Özel şekil maskesi yüklendi ve Mercek Portalı uygulandı!';
      pushHistorySnapshot();
      renderLayerList();
    }
  } catch (err) {
    console.error('Özel maske yüklenemedi:', err);
    if (statusText) statusText.innerText = 'Maske yüklenirken hata oluştu.';
  } finally {
    hideLoading();
  }
});

btnInvertLensMask?.addEventListener('click', () => {
  if (!customMaskRawImg) return;
  isMaskInverted = !isMaskInverted;
  const maskCanvas = generatePixelMaskCanvas(
    customMaskRawImg,
    customMaskRawImg.width,
    customMaskRawImg.height,
    isMaskInverted
  );
  applyPixelMaskNode(maskCanvas, isMaskInverted);
  setLensConfig({ enabled: true });
  pushHistorySnapshot();
});

presetSelect?.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  applyCanvasPreset(target.value as CanvasPreset);
  pushHistorySnapshot();
});

const btnDownload = document.getElementById('btnDownload') as HTMLButtonElement | null;
btnDownload?.addEventListener('click', () => {
  if (!hasImage()) return showWarning();
  exportModal?.classList.remove('hidden');
});

document.querySelectorAll<HTMLLabelElement>('.format-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.format-card').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector<HTMLInputElement>('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

btnCloseModal?.addEventListener('click', () => exportModal?.classList.add('hidden'));
btnCancelExport?.addEventListener('click', () => exportModal?.classList.add('hidden'));
exportModal?.addEventListener('click', (e) => {
  if (e.target === exportModal) exportModal.classList.add('hidden');
});

btnConfirmExport?.addEventListener('click', async () => {
  if (!hasImage()) return showWarning();

  const selectedRadio = document.querySelector<HTMLInputElement>('input[name="exportFormat"]:checked');
  const format = (selectedRadio?.value || 'png') as ExportFormat;
  const withCropMarks = chkCropMarks?.checked || false;

  exportModal?.classList.add('hidden');
  showLoading(`${format.toUpperCase()} formatında hazırlanıyor...`);

  setTimeout(async () => {
    try {
      const result = await exportMultiFormat({
        format,
        withCropMarks,
        quality: 0.95,
      });

      const filename = `kadraj-export-${Date.now()}.${result.extension}`;
      const link = document.createElement('a');
      link.download = filename;

      if (result.dataUrl) {
        link.href = result.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (result.blob) {
        const objectUrl = URL.createObjectURL(result.blob);
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      }

      if (statusText) statusText.innerText = `${format.toUpperCase()} belgesi başarıyla indirildi!`;
    } catch (err) {
      console.error(err);
      if (statusText) statusText.innerText = 'Dışa aktarma sırasında hata oluştu.';
    } finally {
      hideLoading();
    }
  }, 100);
});

const shapeScroll = document.getElementById('shapeButtons');
if (shapeScroll) {
  shapeScroll.addEventListener('wheel', (e: WheelEvent) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      shapeScroll.scrollLeft += e.deltaY;
    }
  });
}

// =========================================================
// BAŞLANGIÇTA KAYITLI TASLAK KONTROLÜ
// =========================================================

async function checkForSavedDraft(): Promise<void> {
  try {
    const saved = await loadDraftFromStorage();
    if (saved && saved.mainImageBlob) {
      draftBanner?.classList.remove('hidden');

      btnRestoreDraft?.addEventListener(
        'click',
        async () => {
          showLoading('Kayıtlı taslak geri yükleniyor...');
          try {
            const mainImg = await blobToImageElement(saved.mainImageBlob!);
            loadMainImage(mainImg);

            if (saved.cutoutBlob) {
              const cutoutImg = await blobToImageElement(saved.cutoutBlob);
              applyForegroundSubject(cutoutImg);
            }

            restoreProjectSnapshot(saved.snapshot);
            syncUIFromSnapshot(saved.snapshot);
            historyManager.clear();
            historyManager.push(saved.snapshot);

            draftBanner?.classList.add('hidden');
            if (statusText) statusText.innerText = 'Kayıtlı taslak başarıyla geri yüklendi!';
          } catch (err) {
            console.error('Taslak geri yüklenemedi:', err);
            if (statusText) statusText.innerText = 'Taslak yüklenirken hata oluştu.';
          } finally {
            hideLoading();
          }
        },
        { once: true }
      );

      btnDismissDraft?.addEventListener(
        'click',
        () => {
          draftBanner?.classList.add('hidden');
        },
        { once: true }
      );
    }
  } catch (err) {
    console.warn('Taslak denetimi yapılamadı:', err);
  }
}

checkForSavedDraft();
renderLayerList();

// Responsive pencere ve oryantasyon değişimi
let resizeDebounceTimer: number | null = null;
window.addEventListener('resize', () => {
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = window.setTimeout(() => {
    handleCanvasResize('canvas-container');
  }, 200);
});