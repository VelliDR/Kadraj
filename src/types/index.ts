// src/types/index.ts

export type ShapeFunction = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface ShapeShadowConfig {
  angle: number;
  distance: number;
  blur: number;
  color: string;
}

export interface SubjectShadowConfig {
  angle: number;
  distance: number;
  blur: number;
  color: string;
  opacity: number;
  enabled: boolean;
}

export interface TextNodeOptions {
  text?: string;
  fontFamily?: string;
  fill?: string;
  fontSize?: number;
  rotation?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  fontStyle?: string; // 'normal', 'italic', 'bold', 'bold italic'
}

export interface SerializedTextNode {
  id: string;
  text: string;
  fontFamily: string;
  fill: string;
  fontSize: number;
  rotation: number;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  fontStyle: string;
}

export interface DialOptions {
  id: string;
  displayId: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  isLoop?: boolean;
  format?: (val: number) => string;
  onChange: (val: number) => void;
  label?: string;
}

export type SegmentationModelName = 'isnet_quint8' | 'isnet_fp16' | 'isnet';

export type CanvasPreset = 'auto' | 'a4_p' | 'a4_l' | 'a5_p' | 'sq_1_1' | 'story_9_16' | 'book_4_5';

export type ExportFormat = 'png' | 'pdf' | 'webp' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  withCropMarks?: boolean;
  quality?: number;
}

export type TextureType = 'none' | 'parchment' | 'newsprint' | 'coated' | 'grain' | 'linen';

export type TextureBlendMode = 'multiply' | 'overlay' | 'screen' | 'soft-light';

export interface TextureConfig {
  type: TextureType;
  opacity: number;
  blendMode: TextureBlendMode;
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  sepia: boolean;
  noise: number;      // 0 to 100
  grayscale: boolean;
}

export interface EdgeRefineConfig {
  overlapPercent: number;
  erodePixels: number;
  featherBlur: number;
}

export type LensTint = 'none' | 'emerald' | 'sky' | 'storm' | 'amber' | 'rose';

export interface LensConfig {
  enabled: boolean;
  zoom: number;         // 1.0 to 3.0
  bulge: number;        // 0 to 100 (balıkgözü / küresel bombe)
  aberration: number;   // 0 to 10 (kromatik aberasyon / RGB kırılması)
  tint: LensTint;       // Minami tarzı renkli cam filtresi
  glassReflect: boolean;// Cam parıltısı ve kenar yansıması
}

export interface ProjectSnapshot {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  isTransparent: boolean;
  shapeKey: string | null;
  hasCustomMask: boolean;
  isMaskInverted: boolean;
  shapeShadow: ShapeShadowConfig;
  subjectShadow: SubjectShadowConfig;
  edgeOverlap: number;
  edgeRefine?: EdgeRefineConfig;
  preset: CanvasPreset;
  texts: SerializedTextNode[];
  imagePosition: { x: number; y: number; width: number; height: number } | null;
  hasSubjectCutout: boolean;
  texture?: TextureConfig;
  adjustments?: ImageAdjustments;
  lens?: LensConfig;
}

export interface StoredProject {
  snapshot: ProjectSnapshot;
  mainImageBlob?: Blob;
  customMaskBlob?: Blob;
  cutoutBlob?: Blob;
  updatedAt: number;
}

export interface LayerItem {
  id: string;
  type: 'image' | 'subject' | 'text' | 'shape' | 'texture' | 'lens';
  name: string;
  visible: boolean;
  selected?: boolean;
}
