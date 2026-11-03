// src/core/textureEngine.ts
import type { TextureType, TextureBlendMode } from '../types';

/**
 * =========================================================================
 * İLERİ MATEMATİKSEL DOKU MOTORU (ADVANCED MATHEMATICAL TEXTURE ENGINE)
 * =========================================================================
 * 
 * Bu motor, harici görsel indirmeden (0 KB ağ maliyeti), tamamen analitik ve
 * prosedürel matematiksel modellerle çalışır:
 * 
 * 1. Gradyan & Simplex Değer Gürültüsü (2D Gradient Value Noise)
 * 2. Kesirli Brown Hareketi (Fractional Brownian Motion - fBm, Çoklu Oktav)
 * 3. Yüzey Rölyefi & Normal Haritası Işıklandırması (Bump Mapping / Phong)
 * 4. Kılcal Selüloz Lifleri (Brownian Random Walk & Bezier Microfibrils)
 * 5. Yönelimli Lignin Dağılımı ve Tramlama (Halftone Dot Rosette & Fiber Clumping)
 * 6. Kaolin Kil Kaplama ve Saten Parıltı Gradyanı (Specular Sheen Map)
 * 7. Gümüş Halojenür Kristal Kümelenmesi (Nutting Yasası & Poisson Clumps)
 * 8. Çözgü-Atkı Harmonik Dokuma Modeli (Orthogonal Warp/Weft Weave Physics)
 * 9. Pütürlü Sulu Boya Kağıdı (Worley/Voronoi Cellular Pits & Sedimentation)
 * 10. Kırışıklık & Katlanma Gerinim Hatları (Fold Ridge Stress Mechanics)
 */

// Bellek İçi Doku Önbelleği (Gereksiz CPU hesaplamalarını önler)
interface CachedTexture {
  canvas: HTMLCanvasElement;
  type: TextureType;
  width: number;
  height: number;
}
let cachedTextureEntry: CachedTexture | null = null;

// =========================================================================
// MATEMATİKSEL TEMELLER: PERMUTASYON TABLOSU VE GÜRÜLTÜ ÜRETECİ
// =========================================================================

// Sabit 256 elemanlı permütasyon tablosu (Öngörülebilir ve pürüzsüz gürültü)
const PERM = new Uint8Array(512);
const P = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];
for (let i = 0; i < 256; i++) {
  PERM[i] = P[i];
  PERM[256 + i] = P[i];
}

// 5. Dereceden Pürüzsüz İnterpolasyon Eğrisi (Quintic Hermite: 6t^5 - 15t^4 + 10t^3)
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Doğrusal İnterpolasyon
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// Gradyan Vektörü ile Skaler Çarpım
function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * 2D Klasik Perlin Gürültüsü [-1.0, 1.0]
 */
function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

/**
 * Kesirli Brown Hareketi (Fractional Brownian Motion - fBm)
 * Çoklu oktav katmanlama ile doğal fraktal yüzeyler üretir.
 */
function fbm2D(
  x: number,
  y: number,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2.0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += perlin2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * Hücresel (Worley / Voronoi) Mesafe Fonksiyonu [0.0, 1.0]
 * Kağıt hamuru lif kümeleri ve pütürlü su emme gözenekleri için.
 */
function worleyNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let minDist = 1.0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      // Deterministik sözde-rastgele hücre çekirdek noktası
      const hashX = (PERM[(cx & 255) + PERM[cy & 255]] / 255);
      const hashY = (PERM[(cy & 255) + PERM[cx & 255]] / 255);
      const px = cx + hashX;
      const py = cy + hashY;
      const dist = Math.hypot(x - px, y - py);
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }

  return Math.min(1.0, minDist);
}

// =========================================================================
// ANA DOKU ÜRETİCİ
// =========================================================================

export function generateTextureCanvas(
  type: TextureType,
  width: number,
  height: number,
  maxResolution = 800
): HTMLCanvasElement | null {
  if (type === 'none') return null;

  const targetW = Math.max(256, Math.min(Math.round(width), maxResolution));
  const targetH = Math.max(256, Math.min(Math.round(height), maxResolution));

  // Önbellek Kontrolü: Aynı doku ve çözünürlük için sıfır CPU maliyeti
  if (
    cachedTextureEntry &&
    cachedTextureEntry.type === type &&
    cachedTextureEntry.width === targetW &&
    cachedTextureEntry.height === targetH
  ) {
    return cachedTextureEntry.canvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  switch (type) {
    case 'parchment':
      renderAdvancedParchment(ctx, targetW, targetH);
      break;
    case 'newsprint':
      renderAdvancedNewsprint(ctx, targetW, targetH);
      break;
    case 'coated':
      renderAdvancedCoated(ctx, targetW, targetH);
      break;
    case 'grain':
      renderAdvancedFilmGrain(ctx, targetW, targetH);
      break;
    case 'linen':
      renderAdvancedLinen(ctx, targetW, targetH);
      break;
    case 'watercolor':
      renderAdvancedWatercolor(ctx, targetW, targetH);
      break;
    case 'folded':
      renderAdvancedFolded(ctx, targetW, targetH);
      break;
    default:
      return null;
  }

  cachedTextureEntry = {
    canvas,
    type,
    width: targetW,
    height: targetH,
  };

  return canvas;
}

// =========================================================================
// 1. EL YAPIMI ANTİK PARŞÖMEN (HANDMADE FIBROUS PARCHMENT)
// =========================================================================
function renderAdvancedParchment(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // 1. Doğal Ham Parşömen Temel Tonu
  ctx.fillStyle = '#e6dac0';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const scale = 0.007;
  const lightDx = 0.577; // 45 derece teğetsel ışık açısı
  const lightDy = 0.577;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // 3 Oktavlı optimize fBm kağıt hamuru dalgalanması
      const nPulp = fbm2D(x * scale, y * scale, 3, 0.55, 2.0);

      // Yüzey rölyefi / normal vektörü
      const nRight = fbm2D((x + 1) * scale, y * scale, 2);
      const nBottom = fbm2D(x * scale, (y + 1) * scale, 2);
      const diffX = (nRight - nPulp) * 35.0;
      const diffY = (nBottom - nPulp) * 35.0;

      // Teğetsel ışıklandırma
      const bumpLight = (diffX * lightDx + diffY * lightDy) * 42.0;

      // Yaşlanma / Oksidasyon lekeleri
      const agingStain = perlin2D(x * 0.002, y * 0.002) * 22.0;

      // Mikro lif greni
      const microJitter = (Math.random() - 0.5) * 14.0;

      const totalMod = nPulp * 30.0 + bumpLight + agingStain + microJitter;

      // Sıcak Parşömen RGB Dengelemesi
      data[idx]     = Math.min(255, Math.max(0, 230 + totalMod));
      data[idx + 1] = Math.min(255, Math.max(0, 218 + totalMod * 0.92));
      data[idx + 2] = Math.min(255, Math.max(0, 192 + totalMod * 0.70));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 2. Kılcal Selüloz Lifleri (Cellulose Microfibrils)
  const fiberCount = Math.round(w * 0.18);
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < fiberCount; i++) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    const len = 10 + Math.random() * 38;
    const angle = Math.random() * Math.PI * 2;
    const curve = (Math.random() - 0.5) * 26;

    const endX = startX + Math.cos(angle) * len;
    const endY = startY + Math.sin(angle) * len;
    const cpX = (startX + endX) / 2 + Math.sin(angle) * curve;
    const cpY = (startY + endY) / 2 - Math.cos(angle) * curve;

    const alpha = 0.10 + Math.random() * 0.22;
    ctx.strokeStyle = `rgba(95, 68, 38, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.4;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  // 3. Kenar Oksidasyon Vignette'i (Eski Sahaf Parşömeni Kenar Kararması)
  const vignetteGrad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.hypot(w / 2, h / 2)
  );
  vignetteGrad.addColorStop(0, 'rgba(100, 70, 35, 0)');
  vignetteGrad.addColorStop(0.7, 'rgba(100, 70, 35, 0.08)');
  vignetteGrad.addColorStop(1, 'rgba(75, 48, 20, 0.25)');

  ctx.fillStyle = vignetteGrad;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// =========================================================================
// 2. GERİ DÖNÜŞTÜRÜLMÜŞ SAMAN KAĞIDI & GAZETE (RECYCLED NEWSPRINT)
// =========================================================================
function renderAdvancedNewsprint(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#ddd2b9';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const machineAngle = 0.12;
  const cosA = Math.cos(machineAngle);
  const sinA = Math.sin(machineAngle);

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // Akış ekseninde esnetilmiş lignin anizotropik gürültüsü
      const rotX = (x * cosA + y * sinA) * 0.04;
      const rotY = (-x * sinA + y * cosA) * 0.01;
      const flowNoise = perlin2D(rotX, rotY) * 22.0;

      // 45 derece matbaa tramlama (Halftone Dot Rosette)
      const dotX = (x + y) * 0.28;
      const dotY = (x - y) * 0.28;
      const halftone = (Math.sin(dotX) * Math.sin(dotY)) * 14.0;

      const speckJitter = (Math.random() - 0.5) * 22.0;
      const totalVal = flowNoise + halftone + speckJitter;

      data[idx]     = Math.min(255, Math.max(0, 221 + totalVal));
      data[idx + 1] = Math.min(255, Math.max(0, 210 + totalVal));
      data[idx + 2] = Math.min(255, Math.max(0, 185 + totalVal * 0.85));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Ayrışmamış Koyu Odun Parçacıkları (Lignin Shives & Specks)
  ctx.save();
  const speckCount = Math.round(w * 0.20);
  ctx.fillStyle = 'rgba(55, 40, 25, 0.38)';

  for (let i = 0; i < speckCount; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const radiusX = 0.8 + Math.random() * 2.8;
    const radiusY = 0.4 + Math.random() * 1.0;
    const speckRot = machineAngle + (Math.random() - 0.5) * 0.4;

    ctx.beginPath();
    ctx.ellipse(sx, sy, radiusX, radiusY, speckRot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// =========================================================================
// 3. KUŞE KAĞIT & DERGİ KAPAĞI (COATED / GLOSSY ART PAPER)
// =========================================================================
function renderAdvancedCoated(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      const microSheen = perlin2D(x * 0.12, y * 0.12) * 8.0;
      const fineNoise = (Math.random() - 0.5) * 8.0;
      const val = Math.min(255, Math.max(0, 246 + microSheen + fineNoise));

      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = Math.min(255, Math.max(0, val - 2));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Saten Işık Parıltısı (Çapraz Stüdyo Işık Yansıması)
  ctx.save();
  const glareGrad = ctx.createLinearGradient(0, 0, w, h);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  glareGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
  glareGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.08)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.30)');

  ctx.fillStyle = glareGrad;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// =========================================================================
// 4. 35MM ANALOG FİLM GRENİ (SILVER HALIDE GRAIN CLUMPING)
// =========================================================================
function renderAdvancedFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // 128 Nötr Gri (Overlay için temel)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Poisson/Gauss gümüş halojenür kristal kümelenmesi (Nutting Modeli)
  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // 1. Kristal Çekirdek Kümelenmesi
      const clump = perlin2D(x * 0.45, y * 0.45) * 36.0;

      // 2. Box-Muller Gauss Dağılımlı Beyaz Gürültü
      const r1 = Math.random() || 0.0001;
      const r2 = Math.random();
      const gauss = Math.sqrt(-2.0 * Math.log(r1)) * Math.cos(2.0 * Math.PI * r2) * 52.0;

      // 3. 3 Renk Katmanı Emülsiyon Ayrışması (Kromatik Gren)
      const chromaJitter = (Math.random() - 0.5) * 12.0;
      const totalVal = 128 + clump + gauss;

      data[idx]     = Math.min(255, Math.max(0, totalVal + chromaJitter + clump * 0.15));
      data[idx + 1] = Math.min(255, Math.max(0, totalVal));
      data[idx + 2] = Math.min(255, Math.max(0, totalVal - chromaJitter - clump * 0.15));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 5. KETEN KUMAŞ & SANATSAL TUVAL (WARP & WEFT WOVEN LINEN)
// =========================================================================
function renderAdvancedLinen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#ded3bd';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const pitchX = 5.5;
  const pitchY = 5.5;
  const twoPi = Math.PI * 2;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    const slubY = perlin2D(0, y * 0.03) * 1.0;

    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;
      const slubX = perlin2D(x * 0.03, 0) * 1.0;

      // Harmonik Çözgü (Warp) ve Atkı (Weft) Yüzey Denklemi
      const phaseX = ((x + slubX) % pitchX) / pitchX;
      const phaseY = ((y + slubY) % pitchY) / pitchY;

      const warp = Math.sin(phaseX * twoPi);
      const weft = Math.cos(phaseY * twoPi);
      const weaveHeight = (warp - weft) * 36.0;

      const fiberFuzz = (Math.random() - 0.5) * 16.0;
      const totalVal = weaveHeight + fiberFuzz;

      data[idx]     = Math.min(255, Math.max(0, 222 + totalVal));
      data[idx + 1] = Math.min(255, Math.max(0, 211 + totalVal * 0.95));
      data[idx + 2] = Math.min(255, Math.max(0, 189 + totalVal * 0.85));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 6. SULU BOYA / PÜRÜZLÜ SANAT KAĞIDI (ROUGH COLD-PRESS WATERCOLOR)
// =========================================================================
function renderAdvancedWatercolor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#eae0cb';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // Su emme çukurları (Worley gözenekleri)
      const pits = worleyNoise(x * 0.05, y * 0.05);

      // Yüzey kabartısı (fBm)
      const bump = fbm2D(x * 0.02, y * 0.02, 2, 0.6) * 32.0;

      // Çukurlarda pigment birikmesi ve gölge (Sedimentation)
      const depthShading = (pits - 0.45) * 44.0;
      const microGrain = (Math.random() - 0.5) * 16.0;

      const totalMod = bump + depthShading + microGrain;

      data[idx]     = Math.min(255, Math.max(0, 234 + totalMod));
      data[idx + 1] = Math.min(255, Math.max(0, 224 + totalMod * 0.95));
      data[idx + 2] = Math.min(255, Math.max(0, 203 + totalMod * 0.80));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 7. KATLANMIŞ / NOSTALJİK SAHAF DERGİSİ (CREASED & FOLDED PAPER)
// =========================================================================
function renderAdvancedFolded(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  renderAdvancedParchment(ctx, w, h);

  ctx.save();
  const centerX = w / 2;
  const centerY = h / 2;

  // 1. Dikey Kat İzi (Ridge & Trough)
  const vFoldLight = ctx.createLinearGradient(centerX - 6, 0, centerX + 6, 0);
  vFoldLight.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  vFoldLight.addColorStop(0.46, 'rgba(0, 0, 0, 0.04)');
  vFoldLight.addColorStop(0.52, 'rgba(255, 255, 255, 0.48)'); // Katlanma ışık tepe noktası
  vFoldLight.addColorStop(1, 'rgba(0, 0, 0, 0.22)');

  ctx.fillStyle = vFoldLight;
  ctx.fillRect(centerX - 6, 0, 12, h);

  // 2. Yatay Kat İzi
  const hFoldLight = ctx.createLinearGradient(0, centerY - 6, 0, centerY + 6);
  hFoldLight.addColorStop(0, 'rgba(0, 0, 0, 0.30)');
  hFoldLight.addColorStop(0.46, 'rgba(0, 0, 0, 0.04)');
  hFoldLight.addColorStop(0.52, 'rgba(255, 255, 255, 0.42)');
  hFoldLight.addColorStop(1, 'rgba(0, 0, 0, 0.20)');

  ctx.fillStyle = hFoldLight;
  ctx.fillRect(0, centerY - 6, w, 12);

  // 3. Kat Kesişim Noktası Yıpranması (Central Stress Point)
  const centerStress = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 24);
  centerStress.addColorStop(0, 'rgba(65, 45, 20, 0.38)');
  centerStress.addColorStop(0.6, 'rgba(65, 45, 20, 0.12)');
  centerStress.addColorStop(1, 'rgba(65, 45, 20, 0)');

  ctx.fillStyle = centerStress;
  ctx.fillRect(centerX - 24, centerY - 24, 48, 48);

  ctx.restore();
}

/**
 * Doku tipi için varsayılan uygun karışım modunu döner
 */
export function getDefaultBlendModeForTexture(type: TextureType): TextureBlendMode {
  switch (type) {
    case 'grain':
      return 'overlay';
    case 'parchment':
    case 'newsprint':
    case 'linen':
    case 'watercolor':
    case 'folded':
      return 'multiply';
    case 'coated':
      return 'soft-light';
    default:
      return 'multiply';
  }
}
