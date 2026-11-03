// src/core/canvasEngine.ts
import Konva from 'konva';
import { calculateOffsetFromAngle, createTintedSilhouette } from './shadowEngine';
import { refineSegmentationMask } from './edgeRefineEngine';
import { generateTextureCanvas, getDefaultBlendModeForTexture } from './textureEngine';
import { exportHighResolutionPNG, exportProject } from './exportEngine';
import { SHAPES } from './shapes';
import type {
  ShapeFunction,
  ShapeShadowConfig,
  SubjectShadowConfig,
  TextNodeOptions,
  ProjectSnapshot,
  SerializedTextNode,
  LayerItem,
  CanvasPreset,
  ExportOptions,
  TextureConfig,
  ImageAdjustments,
  EdgeRefineConfig,
} from '../types';

export let STAGE_WIDTH = 360;
export let STAGE_HEIGHT = 509;

let stage: Konva.Stage | null = null;
let bgLayer: Konva.Layer | null = null;
let photoLayer: Konva.Layer | null = null;
let subjectShadowLayer: Konva.Layer | null = null;
let textLayer: Konva.Layer | null = null;
let fgLayer: Konva.Layer | null = null;
let textureLayer: Konva.Layer | null = null;
let guideLayer: Konva.Layer | null = null;

let bgRect: Konva.Rect | null = null;
let maskGroup: Konva.Group | null = null;
let shapeShadowNode: Konva.Shape | null = null;

let currentImageNode: Konva.Image | null = null;
let foregroundImageNode: Konva.Image | null = null;
let subjectShadowNode: Konva.Image | null = null;
let customMaskImageNode: Konva.Image | null = null;
let textureNode: Konva.Image | null = null;

let originalImageObj: HTMLImageElement | null = null;
let rawSegmentationMask: HTMLCanvasElement | null = null;
let cachedCutImageSource: CanvasImageSource | null = null;
let cachedSilhouetteCanvas: HTMLCanvasElement | null = null;
let lastSilhouetteColor = '';

let currentVectorShapeFunc: ShapeFunction | null = null;
let currentShapeKey: string | null = null;
let currentMaskInverted = false;
let currentZoomFactor = 1.0;
let currentPreset: CanvasPreset = 'auto';
let baseScale = 1;
let isTransparent = false;

let selectedTextNode: Konva.Text | null = null;
let onTextSelectCallback: ((node: Konva.Text | null) => void) | null = null;
let onCanvasChangeCallback: (() => void) | null = null;

const shapeShadowConfig: ShapeShadowConfig = {
  angle: 45,
  distance: 0,
  blur: 0,
  color: 'rgba(0,0,0,0.5)',
};

const subjectShadowConfig: SubjectShadowConfig = {
  angle: 135,
  distance: 14,
  blur: 15,
  color: '#1a1a1a',
  opacity: 0.5,
  enabled: false,
};

let currentEdgeOverlap = 0.8;
let edgeOverlapRafId: number | null = null;

const currentTextureConfig: TextureConfig = {
  type: 'none',
  opacity: 0.25,
  blendMode: 'multiply',
};

const currentImageAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sepia: false,
  noise: 0,
  grayscale: false,
};

const currentEdgeRefineConfig: EdgeRefineConfig = {
  overlapPercent: 0.8,
  erodePixels: 0,
  featherBlur: 0,
};

export function initCanvas(
  containerId: string,
  onTextSelect?: (node: Konva.Text | null) => void,
  onCanvasChange?: () => void
): void {
  onTextSelectCallback = onTextSelect || null;
  onCanvasChangeCallback = onCanvasChange || null;

  const container = document.getElementById(containerId);
  if (container) {
    STAGE_WIDTH = container.clientWidth || 360;
  }

  stage = new Konva.Stage({
    container: containerId,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
  });

  bgLayer = new Konva.Layer();
  photoLayer = new Konva.Layer();
  subjectShadowLayer = new Konva.Layer();
  textLayer = new Konva.Layer();
  fgLayer = new Konva.Layer();
  textureLayer = new Konva.Layer({ listening: false });
  guideLayer = new Konva.Layer({ listening: false });

  stage.add(bgLayer, photoLayer, subjectShadowLayer, textLayer, fgLayer, textureLayer, guideLayer);

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

  shapeShadowNode = new Konva.Shape({
    sceneFunc: (ctx, shape) => {
      const rawCtx =
        (ctx as unknown as { _context: CanvasRenderingContext2D })._context ||
        (ctx as unknown as CanvasRenderingContext2D);
      rawCtx.beginPath();
      if (currentVectorShapeFunc) {
        currentVectorShapeFunc(rawCtx, STAGE_WIDTH, STAGE_HEIGHT);
      } else {
        const pad = (shapeShadowConfig.distance > 0 || shapeShadowConfig.blur > 0) ? 14 : 0;
        rawCtx.rect(pad, pad, STAGE_WIDTH - pad * 2, STAGE_HEIGHT - pad * 2);
      }
      ctx.fillShape(shape);
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

function notifyChange(): void {
  if (onCanvasChangeCallback) {
    onCanvasChangeCallback();
  }
}

// =========================================================
// FAZ 3: AKILLI MANYETİK HİZALAMA KILAVUZLARI (SNAP GUIDES)
// =========================================================
function handleSnapping(node: Konva.Node): void {
  if (!guideLayer) return;
  guideLayer.destroyChildren();

  const centerX = STAGE_WIDTH / 2;
  const centerY = STAGE_HEIGHT / 2;
  const snapThreshold = 7;

  let snapped = false;

  // X ekseni merkez hizalama
  if (Math.abs(node.x() - centerX) < snapThreshold) {
    node.x(centerX);
    snapped = true;
    const vLine = new Konva.Line({
      points: [centerX, 0, centerX, STAGE_HEIGHT],
      stroke: '#ffaa00',
      strokeWidth: 1.5,
      dash: [4, 4],
      listening: false,
    });
    guideLayer.add(vLine);
  }

  // Y ekseni merkez hizalama
  if (Math.abs(node.y() - centerY) < snapThreshold) {
    node.y(centerY);
    snapped = true;
    const hLine = new Konva.Line({
      points: [0, centerY, STAGE_WIDTH, centerY],
      stroke: '#ffaa00',
      strokeWidth: 1.5,
      dash: [4, 4],
      listening: false,
    });
    guideLayer.add(hLine);
  }

  if (snapped) {
    guideLayer.batchDraw();
  } else {
    guideLayer.destroyChildren();
    guideLayer.batchDraw();
  }
}

function clearSnapGuides(): void {
  if (guideLayer) {
    guideLayer.destroyChildren();
    guideLayer.batchDraw();
  }
}

export function applyCanvasPreset(preset: CanvasPreset): void {
  currentPreset = preset;

  let aspectRatio = 360 / 509;
  if (preset === 'auto') {
    if (originalImageObj) {
      aspectRatio = originalImageObj.width / originalImageObj.height;
    }
  } else if (preset === 'a4_p' || preset === 'a5_p') {
    aspectRatio = 1 / 1.4142; // A4/A5 Dikey ~0.707
  } else if (preset === 'a4_l') {
    aspectRatio = 1.4142 / 1; // A4 Yatay ~1.414
  } else if (preset === 'sq_1_1') {
    aspectRatio = 1.0; // Kare 1:1
  } else if (preset === 'story_9_16') {
    aspectRatio = 9 / 16; // Hikaye 9:16
  } else if (preset === 'book_4_5') {
    aspectRatio = 4 / 5; // Kitap 4:5
  }

  STAGE_HEIGHT = Math.round(STAGE_WIDTH / aspectRatio);

  if (stage && bgRect && maskGroup) {
    stage.height(STAGE_HEIGHT);
    bgRect.height(STAGE_HEIGHT);
    maskGroup.width(STAGE_WIDTH);
    maskGroup.height(STAGE_HEIGHT);

    if (currentVectorShapeFunc) {
      maskGroup.clipFunc((ctx) => {
        const rawCtx =
          (ctx as unknown as { _context: CanvasRenderingContext2D })._context ||
          (ctx as unknown as CanvasRenderingContext2D);
        currentVectorShapeFunc!(rawCtx, STAGE_WIDTH, STAGE_HEIGHT);
      });
      updateShapeShadow({});
    }

    if (currentImageNode && originalImageObj) {
      baseScale = Math.max(STAGE_WIDTH / originalImageObj.width, STAGE_HEIGHT / originalImageObj.height);
      setZoom(currentZoomFactor);
    }

    if (currentTextureConfig.type !== 'none') {
      applyTexture({});
    }

    stage.batchDraw();
  }

  notifyChange();
}

export function getCanvasPreset(): CanvasPreset {
  return currentPreset;
}

export function loadMainImage(imgObj: HTMLImageElement): void {
  resetEngine();
  originalImageObj = imgObj;
  currentZoomFactor = 1.0;
  currentPreset = 'auto';

  applyCanvasPreset('auto');
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
    if (!currentImageNode) return;
    handleSnapping(currentImageNode);
    const pos = currentImageNode.position();

    if (foregroundImageNode) {
      foregroundImageNode.position(pos);
      fgLayer?.batchDraw();
    }
    if (subjectShadowNode) {
      const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);
      subjectShadowNode.position({
        x: pos.x + offset.x,
        y: pos.y + offset.y,
      });
      subjectShadowLayer?.batchDraw();
    }
  });

  currentImageNode.on('dragend', () => {
    clearSnapGuides();
    notifyChange();
  });

  maskGroup?.add(currentImageNode);
  applyFiltersToNode(currentImageNode);
  photoLayer?.batchDraw();
  notifyChange();
}

// =========================================================
// FAZ 3: ZENGİN TİPOGRAFİ (ALIGN, SPACING, LINE-HEIGHT, STYLE)
// =========================================================

export function addTextNode(opts: TextNodeOptions): void {
  const textNode = new Konva.Text({
    id: `txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: opts.text || '',
    x: STAGE_WIDTH / 2,
    y: STAGE_HEIGHT / 2,
    fontSize: opts.fontSize || 32,
    fontFamily: opts.fontFamily || 'Cormorant Garamond',
    fill: opts.fill || '#1a1a1a',
    align: opts.align || 'center',
    lineHeight: opts.lineHeight || 1.2,
    letterSpacing: opts.letterSpacing || 0,
    fontStyle: opts.fontStyle || 'normal',
    draggable: true,
    rotation: opts.rotation || 0,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowBlur: 3,
  });

  textNode.offsetX(textNode.width() / 2);
  textNode.offsetY(textNode.height() / 2);

  textNode.on('click tap dragstart', () => selectText(textNode));
  textNode.on('dragmove', () => handleSnapping(textNode));
  textNode.on('dragend', () => {
    clearSnapGuides();
    notifyChange();
  });

  textLayer?.add(textNode);
  textLayer?.batchDraw();
  selectText(textNode);
  notifyChange();
}

export function updateSelectedText(opts: TextNodeOptions): void {
  if (!selectedTextNode) return;
  if (opts.text !== undefined) selectedTextNode.text(opts.text);
  if (opts.fontFamily !== undefined) selectedTextNode.fontFamily(opts.fontFamily);
  if (opts.fill !== undefined) selectedTextNode.fill(opts.fill);
  if (opts.fontSize !== undefined) selectedTextNode.fontSize(opts.fontSize);
  if (opts.rotation !== undefined) selectedTextNode.rotation(opts.rotation);
  if (opts.align !== undefined) selectedTextNode.align(opts.align);
  if (opts.lineHeight !== undefined) selectedTextNode.lineHeight(opts.lineHeight);
  if (opts.letterSpacing !== undefined) selectedTextNode.letterSpacing(opts.letterSpacing);
  if (opts.fontStyle !== undefined) selectedTextNode.fontStyle(opts.fontStyle);

  selectedTextNode.offsetX(selectedTextNode.width() / 2);
  selectedTextNode.offsetY(selectedTextNode.height() / 2);
  textLayer?.batchDraw();
  notifyChange();
}

function selectText(node: Konva.Text): void {
  selectedTextNode = node;
  if (onTextSelectCallback) onTextSelectCallback(node);
}

export function deselectText(): void {
  selectedTextNode = null;
  if (onTextSelectCallback) onTextSelectCallback(null);
}

export function deleteSelectedText(): void {
  if (selectedTextNode) {
    selectedTextNode.destroy();
    selectedTextNode = null;
    textLayer?.batchDraw();
    deselectText();
    notifyChange();
  }
}

export function getSelectedTextNode(): Konva.Text | null {
  return selectedTextNode;
}

// =========================================================
// FAZ 3: KATMAN YÖNETİMİ (LAYER STACK)
// =========================================================

export function getLayersList(): LayerItem[] {
  const list: LayerItem[] = [];

  // 1. Doku Katmanı (En üstte varsa)
  if (currentTextureConfig.type !== 'none' && textureNode) {
    list.push({
      id: 'layer_texture',
      type: 'texture',
      name: `📜 Doku (${currentTextureConfig.type})`,
      visible: textureNode.visible(),
      selected: false,
    });
  }

  // 2. Özne katmanı (3D Pop-Out)
  if (foregroundImageNode) {
    list.push({
      id: 'layer_subject',
      type: 'subject',
      name: '👤 Özne (3D Pop-Out)',
      visible: foregroundImageNode.visible(),
      selected: false,
    });
  }

  // 3. Metin Katmanları (En üstte olan en başta görünecek şekilde)
  if (textLayer) {
    const textNodes = textLayer.find('Text') as unknown as Konva.Text[];
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const t = textNodes[i];
      const preview = t.text().trim();
      list.push({
        id: t.id(),
        type: 'text',
        name: preview ? `✍️ "${preview.length > 14 ? preview.slice(0, 14) + '…' : preview}"` : '✍️ Metin',
        visible: t.visible(),
        selected: t === selectedTextNode,
      });
    }
  }

  // 4. Şekil / Maske Katmanı
  if (currentVectorShapeFunc || customMaskImageNode) {
    list.push({
      id: 'layer_shape',
      type: 'shape',
      name: '📐 Şablon / Maske',
      visible: maskGroup ? maskGroup.visible() : true,
      selected: false,
    });
  }

  // 5. Ana Görsel Katmanı
  if (currentImageNode) {
    list.push({
      id: 'layer_image',
      type: 'image',
      name: '🖼️ Ana Görsel',
      visible: currentImageNode.visible(),
      selected: false,
    });
  }

  return list;
}

export function toggleLayerVisibility(id: string): void {
  if (id === 'layer_texture') {
    if (textureNode) {
      textureNode.visible(!textureNode.visible());
      textureLayer?.batchDraw();
    }
  } else if (id === 'layer_subject') {
    if (foregroundImageNode) {
      const v = !foregroundImageNode.visible();
      foregroundImageNode.visible(v);
      if (subjectShadowNode) subjectShadowNode.visible(v && subjectShadowConfig.enabled);
      fgLayer?.batchDraw();
      subjectShadowLayer?.batchDraw();
    }
  } else if (id === 'layer_shape') {
    if (maskGroup) {
      maskGroup.visible(!maskGroup.visible());
      photoLayer?.batchDraw();
    }
  } else if (id === 'layer_image') {
    if (currentImageNode) {
      currentImageNode.visible(!currentImageNode.visible());
      photoLayer?.batchDraw();
    }
  } else {
    if (textLayer) {
      const t = textLayer.findOne(`#${id}`) as Konva.Text | null;
      if (t) {
        t.visible(!t.visible());
        textLayer.batchDraw();
      }
    }
  }
  notifyChange();
}

export function moveTextLayerOrder(id: string, direction: 'up' | 'down'): void {
  if (!textLayer) return;
  const t = textLayer.findOne(`#${id}`) as Konva.Node | null;
  if (t) {
    if (direction === 'up') {
      t.moveUp();
    } else {
      t.moveDown();
    }
    textLayer.batchDraw();
    notifyChange();
  }
}

export function selectTextById(id: string): void {
  if (!textLayer) return;
  const t = textLayer.findOne(`#${id}`) as Konva.Text | null;
  if (t) {
    selectText(t);
  }
}

// =========================================================
// FAZ 5: FOTOĞRAF FİLTRELERİ VE AYARLARI (IMAGE ADJUSTMENTS)
// =========================================================

function applyFiltersToNode(node: Konva.Image | null): void {
  if (!node) return;
  // Konva filtrelerini dynamic olarak derle
  const filters: Array<any> = [];

  if (currentImageAdjustments.brightness !== 0) {
    filters.push(Konva.Filters.Brighten);
    node.brightness(currentImageAdjustments.brightness / 100);
  }
  if (currentImageAdjustments.contrast !== 0) {
    filters.push(Konva.Filters.Contrast);
    node.contrast(currentImageAdjustments.contrast);
  }
  if (currentImageAdjustments.saturation !== 0) {
    filters.push(Konva.Filters.HSV);
    const sat = currentImageAdjustments.saturation;
    // sat: -100 ile +100 arasında
    // sat = 0 -> 0 (2^0 = 1, normal)
    // sat = -100 -> -10 (2^-10 = ~0.001, kusursuz siyah-beyaz desatürasyon)
    // sat = +100 -> +2 (2^2 = 4, canlı renkler)
    const konvaSat = sat < 0 ? sat / 10 : sat / 50;
    node.saturation(konvaSat);
  }
  if (currentImageAdjustments.grayscale) {
    filters.push(Konva.Filters.Grayscale);
  }
  if (currentImageAdjustments.sepia) {
    filters.push(Konva.Filters.Sepia);
  }
  if (currentImageAdjustments.noise > 0) {
    filters.push(Konva.Filters.Noise);
    node.noise(currentImageAdjustments.noise / 100);
  }

  node.clearCache();
  if (filters.length > 0) {
    node.filters(filters);
    try {
      node.cache();
    } catch (e) {
      console.warn('Filtre önbellekleme hatası:', e);
    }
  } else {
    node.filters([]);
  }
  node.getLayer()?.batchDraw();
}

function reapplyCacheIfFiltered(node: Konva.Image | null): void {
  if (!node) return;
  const filters = node.filters();
  if (filters && filters.length > 0) {
    node.clearCache();
    try {
      node.cache();
    } catch {
      // Ignored
    }
  }
}

export function setImageAdjustments(adj: Partial<ImageAdjustments>): void {
  if (adj.brightness !== undefined) currentImageAdjustments.brightness = adj.brightness;
  if (adj.contrast !== undefined) currentImageAdjustments.contrast = adj.contrast;
  if (adj.saturation !== undefined) currentImageAdjustments.saturation = adj.saturation;
  if (adj.sepia !== undefined) currentImageAdjustments.sepia = adj.sepia;
  if (adj.noise !== undefined) currentImageAdjustments.noise = adj.noise;
  if (adj.grayscale !== undefined) currentImageAdjustments.grayscale = adj.grayscale;

  applyFiltersToNode(currentImageNode);
  applyFiltersToNode(foregroundImageNode);
  photoLayer?.batchDraw();
  fgLayer?.batchDraw();
  notifyChange();
}

export function getImageAdjustments(): ImageAdjustments {
  return { ...currentImageAdjustments };
}

// =========================================================
// FAZ 5: SANATSAL KAĞIT DOKULARI (PAPER TEXTURES)
// =========================================================

export function applyTexture(config: Partial<TextureConfig>): void {
  if (config.type !== undefined) {
    currentTextureConfig.type = config.type;
    if (config.blendMode === undefined) {
      currentTextureConfig.blendMode = getDefaultBlendModeForTexture(config.type);
    }
  }
  if (config.opacity !== undefined) currentTextureConfig.opacity = config.opacity;
  if (config.blendMode !== undefined) currentTextureConfig.blendMode = config.blendMode;

  if (!textureLayer) return;

  const canvasEl = (textureLayer.getCanvas() as unknown as { _canvas?: HTMLCanvasElement })?._canvas;

  if (currentTextureConfig.type === 'none') {
    if (textureNode) {
      textureNode.destroy();
      textureNode = null;
    }
    if (canvasEl) {
      canvasEl.style.mixBlendMode = 'normal';
    }
    textureLayer.batchDraw();
    notifyChange();
    return;
  }

  if (canvasEl) {
    canvasEl.style.mixBlendMode = currentTextureConfig.blendMode;
  }

  const textureCanvas = generateTextureCanvas(
    currentTextureConfig.type,
    STAGE_WIDTH,
    STAGE_HEIGHT
  );

  if (!textureCanvas) return;

  if (textureNode) {
    textureNode.image(textureCanvas);
    textureNode.width(STAGE_WIDTH);
    textureNode.height(STAGE_HEIGHT);
    textureNode.opacity(currentTextureConfig.opacity);
    textureNode.globalCompositeOperation(currentTextureConfig.blendMode);
  } else {
    textureNode = new Konva.Image({
      image: textureCanvas,
      x: 0,
      y: 0,
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      opacity: currentTextureConfig.opacity,
      globalCompositeOperation: currentTextureConfig.blendMode,
      listening: false,
    });
    textureLayer.add(textureNode);
  }

  textureLayer.batchDraw();
  notifyChange();
}

export function getTextureConfig(): TextureConfig {
  return { ...currentTextureConfig };
}

// =========================================================
// ÖZNE, GELİŞMİŞ KENAR İNCELTME VE GÖLGE MOTORU
// =========================================================

export function processRawSegmentation(rawMask: HTMLCanvasElement): void {
  rawSegmentationMask = rawMask;
  rebuildSubjectWithRefinedEdges();
}

export function setEdgeOverlap(percent: number): void {
  setEdgeRefine({ overlapPercent: percent });
}

export function setEdgeRefine(cfg: Partial<EdgeRefineConfig>): void {
  if (cfg.overlapPercent !== undefined) {
    currentEdgeRefineConfig.overlapPercent = cfg.overlapPercent;
    currentEdgeOverlap = cfg.overlapPercent;
  }
  if (cfg.erodePixels !== undefined) currentEdgeRefineConfig.erodePixels = cfg.erodePixels;
  if (cfg.featherBlur !== undefined) currentEdgeRefineConfig.featherBlur = cfg.featherBlur;

  if (rawSegmentationMask) {
    if (edgeOverlapRafId) cancelAnimationFrame(edgeOverlapRafId);
    edgeOverlapRafId = requestAnimationFrame(() => {
      rebuildSubjectWithRefinedEdges();
      edgeOverlapRafId = null;
      notifyChange();
    });
  }
}

export function getEdgeRefineConfig(): EdgeRefineConfig {
  return { ...currentEdgeRefineConfig };
}

function rebuildSubjectWithRefinedEdges(): void {
  if (!originalImageObj || !rawSegmentationMask) return;

  const refinedMask = refineSegmentationMask(
    rawSegmentationMask,
    originalImageObj.width,
    originalImageObj.height,
    currentEdgeRefineConfig
  );

  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = originalImageObj.width;
  cutCanvas.height = originalImageObj.height;
  const cutCtx = cutCanvas.getContext('2d');
  if (!cutCtx) return;

  cutCtx.drawImage(refinedMask, 0, 0);
  cutCtx.globalCompositeOperation = 'source-in';
  cutCtx.drawImage(originalImageObj, 0, 0);

  cachedCutImageSource = cutCanvas;
  cachedSilhouetteCanvas = null;
  applyForegroundSubject(cutCanvas);
}

export function applyForegroundSubject(cutSource: CanvasImageSource): void {
  if (!currentImageNode || !fgLayer) return;

  if (foregroundImageNode) foregroundImageNode.destroy();

  foregroundImageNode = new Konva.Image({
    image: cutSource,
    x: currentImageNode.x(),
    y: currentImageNode.y(),
    width: currentImageNode.width(),
    height: currentImageNode.height(),
    draggable: false,
    listening: false,
  });

  fgLayer.add(foregroundImageNode);
  applyFiltersToNode(foregroundImageNode);
  fgLayer.batchDraw();
  renderSubjectShadow();
  notifyChange();
}

export function removeForegroundSubject(): void {
  if (foregroundImageNode) {
    foregroundImageNode.destroy();
    foregroundImageNode = null;
    fgLayer?.batchDraw();
  }
  if (subjectShadowNode) {
    subjectShadowNode.destroy();
    subjectShadowNode = null;
    subjectShadowLayer?.batchDraw();
  }
  cachedCutImageSource = null;
  cachedSilhouetteCanvas = null;
  notifyChange();
}

export function updateShapeShadow(opts: Partial<ShapeShadowConfig>): void {
  if (opts.angle !== undefined) shapeShadowConfig.angle = opts.angle;
  if (opts.distance !== undefined) shapeShadowConfig.distance = opts.distance;
  if (opts.blur !== undefined) shapeShadowConfig.blur = opts.blur;
  if (opts.color !== undefined) shapeShadowConfig.color = opts.color;

  const offset = calculateOffsetFromAngle(shapeShadowConfig.angle, shapeShadowConfig.distance);

  if (shapeShadowNode) {
    const hasShadow = shapeShadowConfig.distance > 0 || shapeShadowConfig.blur > 0;
    shapeShadowNode.visible(hasShadow);
    shapeShadowNode.shadowColor(shapeShadowConfig.color);
    shapeShadowNode.shadowBlur(shapeShadowConfig.blur);
    shapeShadowNode.shadowOffset(offset);
    shapeShadowNode.shadowOpacity(hasShadow ? 0.75 : 0);

    // Şablon seçilmemişse görselin de kart çerçevesine oturması için maskGroup'u senkronize et
    if (!currentVectorShapeFunc && !customMaskImageNode && maskGroup) {
      if (hasShadow) {
        const pad = 14;
        maskGroup.clipFunc((ctx) => {
          const rawCtx =
            (ctx as unknown as { _context: CanvasRenderingContext2D })._context ||
            (ctx as unknown as CanvasRenderingContext2D);
          rawCtx.beginPath();
          rawCtx.rect(pad, pad, STAGE_WIDTH - pad * 2, STAGE_HEIGHT - pad * 2);
        });
      } else {
        maskGroup.clipFunc(null as unknown as () => void);
      }
    }
  }

  photoLayer?.batchDraw();
  notifyChange();
}

export function updateSubjectSilhouetteShadow(opts: Partial<SubjectShadowConfig>): void {
  if (opts.angle !== undefined) subjectShadowConfig.angle = opts.angle;
  if (opts.distance !== undefined) subjectShadowConfig.distance = opts.distance;
  if (opts.blur !== undefined) subjectShadowConfig.blur = opts.blur;
  if (opts.color !== undefined) {
    if (subjectShadowConfig.color !== opts.color) {
      cachedSilhouetteCanvas = null;
    }
    subjectShadowConfig.color = opts.color;
  }
  if (opts.opacity !== undefined) subjectShadowConfig.opacity = opts.opacity;
  if (opts.enabled !== undefined) subjectShadowConfig.enabled = opts.enabled;

  renderSubjectShadow();
  notifyChange();
}

function renderSubjectShadow(): void {
  if (!cachedCutImageSource || !subjectShadowConfig.enabled || !foregroundImageNode || !currentImageNode) {
    if (subjectShadowNode) {
      subjectShadowNode.destroy();
      subjectShadowNode = null;
      subjectShadowLayer?.batchDraw();
    }
    return;
  }

  const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);

  if (!cachedSilhouetteCanvas || lastSilhouetteColor !== subjectShadowConfig.color) {
    cachedSilhouetteCanvas = createTintedSilhouette(cachedCutImageSource, subjectShadowConfig.color);
    lastSilhouetteColor = subjectShadowConfig.color;
  }

  if (subjectShadowNode) {
    subjectShadowNode.image(cachedSilhouetteCanvas);
    subjectShadowNode.position({
      x: currentImageNode.x() + offset.x,
      y: currentImageNode.y() + offset.y,
    });
    subjectShadowNode.width(currentImageNode.width());
    subjectShadowNode.height(currentImageNode.height());
    subjectShadowNode.opacity(subjectShadowConfig.opacity);
    subjectShadowNode.shadowColor(subjectShadowConfig.color);
    subjectShadowNode.shadowBlur(subjectShadowConfig.blur);
  } else {
    subjectShadowNode = new Konva.Image({
      image: cachedSilhouetteCanvas,
      x: currentImageNode.x() + offset.x,
      y: currentImageNode.y() + offset.y,
      width: currentImageNode.width(),
      height: currentImageNode.height(),
      opacity: subjectShadowConfig.opacity,
      shadowColor: subjectShadowConfig.color,
      shadowBlur: subjectShadowConfig.blur,
      listening: false,
    });
    subjectShadowLayer?.add(subjectShadowNode);
  }

  subjectShadowLayer?.batchDraw();
}

export function applyVectorShape(shapeFunction: ShapeFunction, shapeKey?: string): void {
  clearCustomPixelMask();
  currentVectorShapeFunc = shapeFunction;
  currentShapeKey = shapeKey || null;

  maskGroup?.clipFunc((ctx) => {
    const rawCtx =
      (ctx as unknown as { _context: CanvasRenderingContext2D })._context ||
      (ctx as unknown as CanvasRenderingContext2D);
    shapeFunction(rawCtx, STAGE_WIDTH, STAGE_HEIGHT);
  });

  updateShapeShadow({});
  photoLayer?.batchDraw();
  notifyChange();
}

export function applyPixelMaskNode(maskCanvas: HTMLCanvasElement, isInverted = false): void {
  if (!currentImageNode || !maskGroup) return;

  if (customMaskImageNode) customMaskImageNode.destroy();
  if (shapeShadowNode) shapeShadowNode.visible(false);
  currentVectorShapeFunc = null;
  currentShapeKey = null;
  currentMaskInverted = isInverted;
  maskGroup.clipFunc(null as unknown as () => void);

  customMaskImageNode = new Konva.Image({
    image: maskCanvas,
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    listening: false,
  });

  currentImageNode.globalCompositeOperation('source-in');
  maskGroup.destroyChildren();
  maskGroup.add(customMaskImageNode, currentImageNode);
  photoLayer?.batchDraw();
  notifyChange();
}

export function setZoom(zoomFactor: number): void {
  if (!currentImageNode || !originalImageObj) return;
  currentZoomFactor = zoomFactor;

  const w = originalImageObj.width * baseScale * zoomFactor;
  const h = originalImageObj.height * baseScale * zoomFactor;

  const x = (STAGE_WIDTH - w) / 2;
  const y = (STAGE_HEIGHT - h) / 2;

  currentImageNode.width(w);
  currentImageNode.height(h);
  currentImageNode.x(x);
  currentImageNode.y(y);
  reapplyCacheIfFiltered(currentImageNode);

  if (foregroundImageNode) {
    foregroundImageNode.width(w);
    foregroundImageNode.height(h);
    foregroundImageNode.position(currentImageNode.position());
    reapplyCacheIfFiltered(foregroundImageNode);
    fgLayer?.batchDraw();
  }

  if (subjectShadowNode) {
    const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);
    subjectShadowNode.width(w);
    subjectShadowNode.height(h);
    subjectShadowNode.position({
      x: currentImageNode.x() + offset.x,
      y: currentImageNode.y() + offset.y,
    });
    subjectShadowLayer?.batchDraw();
  }

  photoLayer?.batchDraw();
  notifyChange();
}

export function toggleBackground(forceState?: boolean): boolean {
  if (!bgRect || !bgLayer) return isTransparent;
  isTransparent = forceState !== undefined ? forceState : !isTransparent;
  bgRect.visible(!isTransparent);
  bgLayer.batchDraw();
  notifyChange();
  return isTransparent;
}

export function exportPNG(): string {
  deselectText();
  if (!stage) throw new Error('Stage henüz başlatılmadı.');
  return exportHighResolutionPNG(stage, STAGE_WIDTH, STAGE_HEIGHT);
}

export async function exportMultiFormat(
  options: ExportOptions
): Promise<{ dataUrl?: string; blob?: Blob; extension: string }> {
  deselectText();
  if (!stage) throw new Error('Stage henüz başlatılmadı.');
  return exportProject(stage, STAGE_WIDTH, currentPreset, options);
}

export function hasImage(): boolean {
  return currentImageNode !== null;
}

export function getOriginalImage(): HTMLImageElement | null {
  return originalImageObj;
}

export function hasForegroundSubject(): boolean {
  return foregroundImageNode !== null;
}

export function getCurrentShapeKey(): string | null {
  return currentShapeKey;
}

export function getCurrentZoom(): number {
  return currentZoomFactor;
}

export function getCurrentEdgeOverlap(): number {
  return currentEdgeOverlap;
}

export function getShapeShadowConfig(): ShapeShadowConfig {
  return { ...shapeShadowConfig };
}

export function getSubjectShadowConfig(): SubjectShadowConfig {
  return { ...subjectShadowConfig };
}

export function getRawSegmentationMask(): HTMLCanvasElement | null {
  return rawSegmentationMask;
}

export function getCutoutCanvas(): HTMLCanvasElement | null {
  return cachedCutImageSource instanceof HTMLCanvasElement ? cachedCutImageSource : null;
}

function clearCustomPixelMask(): void {
  if (customMaskImageNode && maskGroup) {
    customMaskImageNode.destroy();
    customMaskImageNode = null;
    currentMaskInverted = false;
    if (currentImageNode) {
      currentImageNode.globalCompositeOperation('source-over');
      maskGroup.destroyChildren();
      maskGroup.add(currentImageNode);
    }
  }
}

export function getProjectSnapshot(): ProjectSnapshot {
  const texts: SerializedTextNode[] = [];
  if (textLayer) {
    const textNodes = textLayer.find('Text');
    textNodes.forEach((node) => {
      const t = node as Konva.Text;
      texts.push({
        id: t.id() || Math.random().toString(36).substring(2, 9),
        text: t.text(),
        fontFamily: t.fontFamily(),
        fill: String(t.fill()),
        fontSize: t.fontSize(),
        rotation: t.rotation(),
        x: t.x(),
        y: t.y(),
        align: (t.align() as 'left' | 'center' | 'right') || 'center',
        lineHeight: t.lineHeight() || 1.2,
        letterSpacing: t.letterSpacing() || 0,
        fontStyle: t.fontStyle() || 'normal',
      });
    });
  }

  return {
    canvasWidth: STAGE_WIDTH,
    canvasHeight: STAGE_HEIGHT,
    zoom: currentZoomFactor,
    isTransparent,
    shapeKey: currentShapeKey,
    hasCustomMask: customMaskImageNode !== null,
    isMaskInverted: currentMaskInverted,
    shapeShadow: { ...shapeShadowConfig },
    subjectShadow: { ...subjectShadowConfig },
    edgeOverlap: currentEdgeOverlap,
    edgeRefine: { ...currentEdgeRefineConfig },
    preset: currentPreset,
    texts,
    imagePosition: currentImageNode
      ? {
          x: currentImageNode.x(),
          y: currentImageNode.y(),
          width: currentImageNode.width(),
          height: currentImageNode.height(),
        }
      : null,
    hasSubjectCutout: foregroundImageNode !== null,
    texture: { ...currentTextureConfig },
    adjustments: { ...currentImageAdjustments },
  };
}

export function restoreProjectSnapshot(snapshot: ProjectSnapshot): void {
  // 1. Sayfa Boyutu / Preset
  if (snapshot.preset) {
    applyCanvasPreset(snapshot.preset);
  }

  // 2. Şeffaflık
  isTransparent = snapshot.isTransparent;
  if (bgRect) bgRect.visible(!isTransparent);
  bgLayer?.batchDraw();

  // 3. Zoom & Konum
  currentZoomFactor = snapshot.zoom;
  if (currentImageNode && snapshot.imagePosition) {
    currentImageNode.position({ x: snapshot.imagePosition.x, y: snapshot.imagePosition.y });
    currentImageNode.size({ width: snapshot.imagePosition.width, height: snapshot.imagePosition.height });
  }

  // 4. Şekil / Maske
  currentShapeKey = snapshot.shapeKey;
  if (snapshot.shapeKey && SHAPES[snapshot.shapeKey]) {
    applyVectorShape(SHAPES[snapshot.shapeKey], snapshot.shapeKey);
  } else if (!snapshot.hasCustomMask) {
    clearCustomPixelMask();
    currentVectorShapeFunc = null;
    if (maskGroup) maskGroup.clipFunc(null as unknown as () => void);
    if (shapeShadowNode) shapeShadowNode.visible(false);
  }

  // 5. Gölgeler
  updateShapeShadow(snapshot.shapeShadow);
  updateSubjectSilhouetteShadow(snapshot.subjectShadow);

  // 6. Kenar İnceltme
  if (snapshot.edgeRefine) {
    currentEdgeRefineConfig.overlapPercent = snapshot.edgeRefine.overlapPercent;
    currentEdgeRefineConfig.erodePixels = snapshot.edgeRefine.erodePixels;
    currentEdgeRefineConfig.featherBlur = snapshot.edgeRefine.featherBlur;
    currentEdgeOverlap = snapshot.edgeRefine.overlapPercent;
  } else if (snapshot.edgeOverlap !== undefined) {
    currentEdgeOverlap = snapshot.edgeOverlap;
    currentEdgeRefineConfig.overlapPercent = snapshot.edgeOverlap;
  }

  // 7. Filtreler & Ayarlar
  if (snapshot.adjustments) {
    setImageAdjustments(snapshot.adjustments);
  }

  // 8. Doku Katmanı
  if (snapshot.texture) {
    applyTexture(snapshot.texture);
  }

  // 9. Ön Plan ve Silüet Konumları
  if (currentImageNode) {
    const pos = currentImageNode.position();
    const size = { width: currentImageNode.width(), height: currentImageNode.height() };
    if (foregroundImageNode) {
      foregroundImageNode.position(pos);
      foregroundImageNode.size(size);
      applyFiltersToNode(foregroundImageNode);
      fgLayer?.batchDraw();
    }
    if (subjectShadowNode) {
      const offset = calculateOffsetFromAngle(subjectShadowConfig.angle, subjectShadowConfig.distance);
      subjectShadowNode.position({ x: pos.x + offset.x, y: pos.y + offset.y });
      subjectShadowNode.size(size);
      subjectShadowLayer?.batchDraw();
    }
  }

  // 10. Metin Katmanları (Zengin Tipografi İle)
  if (textLayer) {
    textLayer.destroyChildren();
    snapshot.texts.forEach((item) => {
      const tNode = new Konva.Text({
        id: item.id,
        text: item.text,
        x: item.x,
        y: item.y,
        fontSize: item.fontSize,
        fontFamily: item.fontFamily,
        fill: item.fill,
        align: item.align || 'center',
        lineHeight: item.lineHeight || 1.2,
        letterSpacing: item.letterSpacing || 0,
        fontStyle: item.fontStyle || 'normal',
        draggable: true,
        rotation: item.rotation,
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowBlur: 3,
      });
      tNode.offsetX(tNode.width() / 2);
      tNode.offsetY(tNode.height() / 2);
      tNode.on('click tap dragstart', () => selectText(tNode));
      tNode.on('dragmove', () => handleSnapping(tNode));
      tNode.on('dragend', () => {
        clearSnapGuides();
        notifyChange();
      });
      textLayer?.add(tNode);
    });
    textLayer.batchDraw();
  }

  photoLayer?.batchDraw();
  subjectShadowLayer?.batchDraw();
  fgLayer?.batchDraw();
}

export function resetEngine(): void {
  if (currentImageNode) currentImageNode.destroy();
  if (foregroundImageNode) foregroundImageNode.destroy();
  if (subjectShadowNode) subjectShadowNode.destroy();
  if (textureNode) {
    textureNode.destroy();
    textureNode = null;
  }
  clearCustomPixelMask();

  textLayer?.destroyChildren();
  textLayer?.batchDraw();
  textureLayer?.destroyChildren();
  textureLayer?.batchDraw();

  currentImageNode = null;
  foregroundImageNode = null;
  subjectShadowNode = null;
  originalImageObj = null;
  rawSegmentationMask = null;
  cachedCutImageSource = null;
  cachedSilhouetteCanvas = null;
  currentVectorShapeFunc = null;
  currentShapeKey = null;
  currentZoomFactor = 1.0;

  currentTextureConfig.type = 'none';
  currentImageAdjustments.brightness = 0;
  currentImageAdjustments.contrast = 0;
  currentImageAdjustments.saturation = 0;
  currentImageAdjustments.sepia = false;
  currentImageAdjustments.noise = 0;
  currentImageAdjustments.grayscale = false;

  if (maskGroup) {
    maskGroup.clipFunc(null as unknown as () => void);
  }
  if (shapeShadowNode) {
    shapeShadowNode.visible(false);
    shapeShadowNode.shadowOpacity(0);
  }

  photoLayer?.batchDraw();
  subjectShadowLayer?.batchDraw();
  fgLayer?.batchDraw();
  notifyChange();
}

/**
 * Pencere boyutu veya oryantasyon değiştiğinde tuvali yeniden ölçekler.
 */
export function handleCanvasResize(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container || !stage) return;
  const newWidth = container.clientWidth;
  if (newWidth > 0 && Math.abs(newWidth - STAGE_WIDTH) > 5) {
    STAGE_WIDTH = newWidth;
    applyCanvasPreset(currentPreset);
  }
}