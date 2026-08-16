// src/core/canvasEngine.js
import Konva from 'konva';
import { calculateOffsetFromAngle, createTintedSilhouette } from './shadowEngine.js';
import { refineSegmentationMask } from './edgeRefineEngine.js';
import { exportHighResolutionPNG } from './exportEngine.js';

// Sabit STAGE yükseklik sınırını kaldırdık. 
// Sadece genişlik sabit (mobil ekran genişliğine göre), yükseklik akışkan olacak.
export let STAGE_WIDTH = 360; 
export let STAGE_HEIGHT = 509; // Bu değer artık fotoğraf yüklendiğinde dinamik değişecek.

let stage, bgLayer, photoLayer, subjectShadowLayer, textLayer, fgLayer;
let bgRect, maskGroup, shapeShadowNode;
let currentImageNode = null;
let foregroundImageNode = null;
let subjectShadowNode = null;
let customMaskImageNode = null;
let originalImageObj = null;
let rawSegmentationMask = null;
let cachedCutImageObj = null;
let currentVectorShapeFunc = null;
let baseScale = 1;
let isTransparent = false;

let selectedTextNode = null;
let onTextSelectCallback = null;

let shapeShadowConfig = { angle: 45, distance: 0, blur: 0, color: 'rgba(0,0,0,0.5)' };
let subjectShadowConfig = { angle: 135, distance: 14, blur: 15, color: '#1a1a1a', opacity: 0.5, enabled: false };
let currentEdgeOverlap = 0.8;

export function initCanvas(containerId, onTextSelect) {
  onTextSelectCallback = onTextSelect;

  // Konteynerin genişliğini alarak STAGE_WIDTH'i otomatik uyarla
  const container = document.getElementById(containerId);
  if (container) {
    STAGE_WIDTH = container.clientWidth || 360;
  }

  stage = new Konva.Stage({
    container: containerId,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT, // Başlangıçta default, resim yüklenince değişecek
  });

  bgLayer = new Konva.Layer();
  photoLayer = new Konva.Layer();
  subjectShadowLayer = new Konva.Layer();
  textLayer = new Konva.Layer();
  fgLayer = new Konva.Layer();

  stage.add(bgLayer, photoLayer, subjectShadowLayer, textLayer, fgLayer);

  bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    fill: '#fbf9f5',
    listening: false,
  });
  bgLayer.add(bgRect);
  bgLayer.batchDraw();

  // Şekil Gölgesi Taşıyıcı Düğümü
  shapeShadowNode = new Konva.Shape({
    sceneFunc: (ctx, shape) => {
      if (currentVectorShapeFunc) {
        // Vektör çizimini ekranın yeni boyutlarına göre ortalaması için
        currentVectorShapeFunc(ctx._context || ctx, STAGE_WIDTH, STAGE_HEIGHT);
        ctx.fillShape(shape);
      }
    },
    fill: '#000000',
    visible: false,
    listening: false,
  });
  photoLayer.add(shapeShadowNode);

  maskGroup = new Konva.Group({ x: 0, y: 0, draggable: false });
  photoLayer.add(maskGroup);

  stage.on('click tap', (e) => {
    if (e.target === stage || e.target === bgRect) deselectText();
  });
}

// --- AKIŞKAN (FLUID) TUVAL GÜNCELLEMESİ ---
function updateStageDimensions(imageObj) {
  if (!imageObj) return;
  
  // Resmin orijinal aspect ratio'sunu bul
  const aspectRatio = imageObj.width / imageObj.height;
  
  // Tuvalin yüksekliğini resmin oranına göre akışkan olarak hesapla
  STAGE_HEIGHT = STAGE_WIDTH / aspectRatio;
  
  // Tuvali, Arka planı ve Container'ı yeni boyuta uyarla
  stage.height(STAGE_HEIGHT);
  bgRect.height(STAGE_HEIGHT);
  
  // Maske Grubu ve Gölge taşıyıcılarını merkezle
  maskGroup.width(STAGE_WIDTH);
  maskGroup.height(STAGE_HEIGHT);
  
  stage.batchDraw();
}

// --- GÖRSEL YÜKLEME ---
export function loadMainImage(imgObj) {
  resetEngine();
  originalImageObj = imgObj;

  // 1. Yeni Mimaride Tuvali Resmin Oranına Göre Esnet!
  updateStageDimensions(imgObj);

  // 2. Resmi Tuvale Tam (Fit) Oturt
  baseScale = STAGE_WIDTH / imgObj.width;

  currentImageNode = new Konva.Image({
    image: imgObj,
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    draggable: true,
  });

  currentImageNode.on('dragmove', () => {
    if (foregroundImageNode) {
      foregroundImageNode.position(currentImageNode.position());
      fgLayer.batchDraw();
    }
    if (subjectShadowNode) {
      const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);
      subjectShadowNode.position({
        x: currentImageNode.x() + offset.x,
        y: currentImageNode.y() + offset.y,
      });
      subjectShadowLayer.batchDraw();
    }
  });

  maskGroup.add(currentImageNode);
  photoLayer.batchDraw();
}

// --- TİPOGRAFİ ---
export function addTextNode({ text, fontFamily, fill, fontSize, rotation }) {
  const textNode = new Konva.Text({
    text,
    x: STAGE_WIDTH / 2, // Hep merkeze ekle
    y: STAGE_HEIGHT / 2,
    fontSize: fontSize || 32,
    fontFamily,
    fill,
    draggable: true,
    rotation: rotation || 0,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowBlur: 3,
  });

  textNode.offsetX(textNode.width() / 2);
  textNode.offsetY(textNode.height() / 2);

  textNode.on('click tap dragstart', () => selectText(textNode));

  textLayer.add(textNode);
  textLayer.batchDraw();
  selectText(textNode);
}

export function updateSelectedText({ text, fontFamily, fill, fontSize, rotation }) {
  if (!selectedTextNode) return;
  if (text !== undefined) selectedTextNode.text(text);
  if (fontFamily !== undefined) selectedTextNode.fontFamily(fontFamily);
  if (fill !== undefined) selectedTextNode.fill(fill);
  if (fontSize !== undefined) selectedTextNode.fontSize(fontSize);
  if (rotation !== undefined) selectedTextNode.rotation(rotation);

  selectedTextNode.offsetX(selectedTextNode.width() / 2);
  selectedTextNode.offsetY(selectedTextNode.height() / 2);
  textLayer.batchDraw();
}

function selectText(node) {
  selectedTextNode = node;
  if (onTextSelectCallback) onTextSelectCallback(node);
}

export function deselectText() {
  selectedTextNode = null;
  if (onTextSelectCallback) onTextSelectCallback(null);
}

export function deleteSelectedText() {
  if (selectedTextNode) {
    selectedTextNode.destroy();
    selectedTextNode = null;
    textLayer.batchDraw();
    deselectText();
  }
}

// --- ÖZNE, KENAR BİNDİRME VE GÖLGE MOTORU ---
export function processRawSegmentation(rawMask) {
  rawSegmentationMask = rawMask;
  rebuildSubjectWithRefinedEdges();
}

export function setEdgeOverlap(percent) {
  currentEdgeOverlap = percent;
  if (rawSegmentationMask) {
    rebuildSubjectWithRefinedEdges();
  }
}

function rebuildSubjectWithRefinedEdges() {
  if (!originalImageObj || !rawSegmentationMask) return;

  const refinedMask = refineSegmentationMask(
    rawSegmentationMask,
    originalImageObj.width,
    originalImageObj.height,
    currentEdgeOverlap
  );

  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = originalImageObj.width;
  cutCanvas.height = originalImageObj.height;
  const cutCtx = cutCanvas.getContext('2d');

  cutCtx.drawImage(refinedMask, 0, 0);
  cutCtx.globalCompositeOperation = 'source-in';
  cutCtx.drawImage(originalImageObj, 0, 0);

  const cutImg = new Image();
  cutImg.onload = () => {
    cachedCutImageObj = cutImg;
    applyForegroundSubject(cutImg);
  };
  cutImg.src = cutCanvas.toDataURL();
}

export function applyForegroundSubject(cutImgObj) {
  if (foregroundImageNode) foregroundImageNode.destroy();

  foregroundImageNode = new Konva.Image({
    image: cutImgObj,
    x: currentImageNode.x(),
    y: currentImageNode.y(),
    width: currentImageNode.width(), // Tuval değil, resmin güncel zoom/scale boyutu!
    height: currentImageNode.height(),
    draggable: false,
    listening: false,
  });

  fgLayer.add(foregroundImageNode);
  fgLayer.batchDraw();
  renderSubjectShadow();
}

export function removeForegroundSubject() {
  if (foregroundImageNode) {
    foregroundImageNode.destroy();
    foregroundImageNode = null;
    fgLayer.batchDraw();
  }
  if (subjectShadowNode) {
    subjectShadowNode.destroy();
    subjectShadowNode = null;
    subjectShadowLayer.batchDraw();
  }
}

export function updateShapeShadow({ angle, distance, blur, color }) {
  if (angle !== undefined) shapeShadowConfig.angle = angle;
  if (distance !== undefined) shapeShadowConfig.distance = distance;
  if (blur !== undefined) shapeShadowConfig.blur = blur;
  if (color !== undefined) shapeShadowConfig.color = color;

  const offset = calculateOffsetFromAngle(shapeShadowConfig.angle, shapeShadowConfig.distance);

  if (shapeShadowNode && currentVectorShapeFunc) {
    const hasShadow = shapeShadowConfig.distance > 0 || shapeShadowConfig.blur > 0;
    shapeShadowNode.visible(hasShadow);
    shapeShadowNode.shadowColor(shapeShadowConfig.color);
    shapeShadowNode.shadowBlur(shapeShadowConfig.blur);
    shapeShadowNode.shadowOffset(offset);
    shapeShadowNode.shadowOpacity(hasShadow ? 0.7 : 0);
  }

  photoLayer.batchDraw();
}

export function updateSubjectSilhouetteShadow({ angle, distance, blur, color, opacity, enabled }) {
  if (angle !== undefined) subjectShadowConfig.angle = angle;
  if (distance !== undefined) subjectShadowConfig.distance = distance;
  if (blur !== undefined) subjectShadowConfig.blur = blur;
  if (color !== undefined) subjectShadowConfig.color = color;
  if (opacity !== undefined) subjectShadowConfig.opacity = opacity;
  if (enabled !== undefined) subjectShadowConfig.enabled = enabled;

  renderSubjectShadow();
}

function renderSubjectShadow() {
  if (!cachedCutImageObj || !subjectShadowConfig.enabled || !foregroundImageNode) {
    if (subjectShadowNode) {
      subjectShadowNode.destroy();
      subjectShadowNode = null;
      subjectShadowLayer.batchDraw();
    }
    return;
  }

  const silhouetteCanvas = createTintedSilhouette(cachedCutImageObj, subjectShadowConfig.color);
  const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);

  if (subjectShadowNode) subjectShadowNode.destroy();

  subjectShadowNode = new Konva.Image({
    image: silhouetteCanvas,
    x: currentImageNode.x() + offset.x,
    y: currentImageNode.y() + offset.y,
    width: currentImageNode.width(),
    height: currentImageNode.height(),
    opacity: subjectShadowConfig.opacity,
    shadowColor: subjectShadowConfig.color,
    shadowBlur: subjectShadowConfig.blur,
    listening: false,
  });

  subjectShadowLayer.add(subjectShadowNode);
  subjectShadowLayer.batchDraw();
}

// --- ŞABLON & MASKE ---
export function applyVectorShape(shapeFunction) {
  clearCustomPixelMask();
  currentVectorShapeFunc = shapeFunction;
  
  // Şekli çizerken güncel STAGE boyutlarını da yolla ki tam otursun
  maskGroup.clipFunc((ctx) => shapeFunction(ctx, STAGE_WIDTH, STAGE_HEIGHT));
  updateShapeShadow({});
  photoLayer.batchDraw();
}

export function applyPixelMaskNode(maskCanvas) {
  if (customMaskImageNode) customMaskImageNode.destroy();
  if (shapeShadowNode) shapeShadowNode.visible(false);
  currentVectorShapeFunc = null;
  maskGroup.clipFunc(null);

  customMaskImageNode = new Konva.Image({
    image: maskCanvas,
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT, // Artık resmin dinamik yüksekliğine göre oturacak
    listening: false,
  });

  currentImageNode.globalCompositeOperation('source-in');
  maskGroup.destroyChildren();
  maskGroup.add(customMaskImageNode, currentImageNode);
  photoLayer.batchDraw();
}

export function setZoom(zoomFactor) {
  if (!currentImageNode || !originalImageObj) return;

  const w = originalImageObj.width * baseScale * zoomFactor;
  const h = originalImageObj.height * baseScale * zoomFactor;

  // Zoom yaparken resmi her zaman merkezde tut
  const x = (STAGE_WIDTH - w) / 2;
  const y = (STAGE_HEIGHT - h) / 2;

  currentImageNode.width(w);
  currentImageNode.height(h);
  currentImageNode.x(x);
  currentImageNode.y(y);

  if (foregroundImageNode) {
    foregroundImageNode.width(w);
    foregroundImageNode.height(h);
    foregroundImageNode.position(currentImageNode.position());
    fgLayer.batchDraw();
  }

  if (subjectShadowNode) {
    const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);
    subjectShadowNode.width(w);
    subjectShadowNode.height(h);
    subjectShadowNode.position({
      x: currentImageNode.x() + offset.x,
      y: currentImageNode.y() + offset.y,
    });
    subjectShadowLayer.batchDraw();
  }

  photoLayer.batchDraw();
}

export function toggleBackground() {
  isTransparent = !isTransparent;
  bgRect.visible(!isTransparent);
  bgLayer.batchDraw();
  return isTransparent;
}

export function exportPNG() {
  deselectText();
  // Artık dışa aktarırken de organik (esnek) yükseklik referans alınıyor
  return exportHighResolutionPNG(stage, STAGE_WIDTH, STAGE_HEIGHT); 
}

export function hasImage() { return currentImageNode !== null; }
export function getOriginalImage() { return originalImageObj; }
export function hasForegroundSubject() { return foregroundImageNode !== null; }

function clearCustomPixelMask() {
  if (customMaskImageNode) {
    customMaskImageNode.destroy();
    customMaskImageNode = null;
    if (currentImageNode) {
      currentImageNode.globalCompositeOperation('source-over');
      maskGroup.destroyChildren();
      maskGroup.add(currentImageNode);
    }
  }
}

export function resetEngine() {
  if (currentImageNode) currentImageNode.destroy();
  if (foregroundImageNode) foregroundImageNode.destroy();
  if (subjectShadowNode) subjectShadowNode.destroy();
  clearCustomPixelMask();

  textLayer.destroyChildren();
  textLayer.batchDraw();

  currentImageNode = null;
  foregroundImageNode = null;
  subjectShadowNode = null;
  originalImageObj = null;
  rawSegmentationMask = null;
  cachedCutImageObj = null;
  currentVectorShapeFunc = null;

  maskGroup.clipFunc(null);
  if (shapeShadowNode) {
    shapeShadowNode.visible(false);
    shapeShadowNode.shadowOpacity(0);
  }

  photoLayer.batchDraw();
  subjectShadowLayer.batchDraw();
  fgLayer.batchDraw();
}