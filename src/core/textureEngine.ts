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
  maxResolution = 1600
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
  // 1. Temel Doğal Selüloz Tonu (Sıcak krem-kum rengi)
  ctx.fillStyle = '#f6f0dd';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Yüzey rölyefi için yükseklik matrisi (Bump Map)
  const scale = 0.006;
  const lightDx = 0.577; // 45 derece teğetsel ışık açısı
  const lightDy = 0.577;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // 4 Oktavlı fBm ile kağıt hamuru yoğunluk dalgalanması
      const nPulp = fbm2D(x * scale, y * scale, 4, 0.55, 2.0);

      // Yüzey eğimi / gradyanı hesaplama (Normal Vektörü)
      const nRight = fbm2D((x + 1) * scale, y * scale, 3);
      const nBottom = fbm2D(x * scale, (y + 1) * scale, 3);
      const diffX = (nRight - nPulp) * 28.0;
      const diffY = (nBottom - nPulp) * 28.0;

      // Teğetsel ışıklandırma şiddeti (Diffuse Shading)
      const bumpLight = (diffX * lightDx + diffY * lightDy) * 35.0;

      // Yaşlanma / Oksidasyon çay lekesi tonları (Düşük frekanslı büyük gölgeler)
      const agingStain = perlin2D(x * 0.0015, y * 0.0015) * 14.0;

      // Mikro lif greni
      const microJitter = (Math.random() - 0.5) * 10;

      const totalMod = nPulp * 20.0 + bumpLight + agingStain + microJitter;

      // Sıcak Parşömen RGB Dengelemesi
      data[idx]     = Math.min(255, Math.max(0, 246 + totalMod));
      data[idx + 1] = Math.min(255, Math.max(0, 240 + totalMod * 0.92));
      data[idx + 2] = Math.min(255, Math.max(0, 221 + totalMod * 0.72));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 2. Parametrik Bezier Eğrileriyle Kılcal Selüloz Lifleri (Cellulose Microfibrils)
  const fiberCount = Math.round(w * 0.05);
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < fiberCount; i++) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    const len = 12 + Math.random() * 32;
    const angle = Math.random() * Math.PI * 2;
    const curve = (Math.random() - 0.5) * 22;

    const endX = startX + Math.cos(angle) * len;
    const endY = startY + Math.sin(angle) * len;
    const cpX = (startX + endX) / 2 + Math.sin(angle) * curve;
    const cpY = (startY + endY) / 2 - Math.cos(angle) * curve;

    // Lif çeperinde doğal koyu kehribar kılcallık
    const alpha = 0.06 + Math.random() * 0.12;
    ctx.strokeStyle = `rgba(105, 78, 48, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.5 + Math.random() * 0.9;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  // 3. Kenar Oksidasyon Vignette'i (Eski Sahaf Parşömeni Kenar Kararması)
  const vignetteGrad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45,
    w / 2, h / 2, Math.hypot(w / 2, h / 2)
  );
  vignetteGrad.addColorStop(0, 'rgba(120, 85, 45, 0)');
  vignetteGrad.addColorStop(0.8, 'rgba(120, 85, 45, 0.04)');
  vignetteGrad.addColorStop(1, 'rgba(95, 65, 30, 0.12)');

  ctx.fillStyle = vignetteGrad;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// =========================================================================
// 2. GERİ DÖNÜŞTÜRÜLMÜŞ SAMAN KAĞIDI & GAZETE (RECYCLED NEWSPRINT)
// =========================================================================
function renderAdvancedNewsprint(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Mat saman zemin
  ctx.fillStyle = '#eae3d1';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Kağıt üretim yönüne göre (Machine Direction) hizalanmış lignin lifleri
  const machineAngle = 0.12; // Hafif eğimli rulo akış açısı
  const cosA = Math.cos(machineAngle);
  const sinA = Math.sin(machineAngle);

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // Akış ekseninde esnetilmiş anizotropik gürültü
      const rotX = (x * cosA + y * sinA) * 0.04;
      const rotY = (-x * sinA + y * cosA) * 0.008;
      const flowNoise = perlin2D(rotX, rotY) * 16.0;

      // Gazete matbaa tramlama (Rotated Halftone Dot Simulation - 45 derece)
      const dotX = (x + y) * 0.28;
      const dotY = (x - y) * 0.28;
      const halftone = (Math.sin(dotX) * Math.sin(dotY)) * 7.0;

      // Yüksek kontrastlı lif benekleri
      const speckJitter = (Math.random() - 0.5) * 18;

      const totalVal = flowNoise + halftone + speckJitter;

      data[idx]     = Math.min(255, Math.max(0, 234 + totalVal));
      data[idx + 1] = Math.min(255, Math.max(0, 227 + totalVal));
      data[idx + 2] = Math.min(255, Math.max(0, 209 + totalVal * 0.88));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Ayrışmamış Koyu Odun Parçacıkları (Lignin Shives & Specks)
  ctx.save();
  const speckCount = Math.round(w * 0.15);
  ctx.fillStyle = 'rgba(68, 52, 36, 0.22)';

  for (let i = 0; i < speckCount; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const radiusX = 0.6 + Math.random() * 2.2;
    const radiusY = 0.3 + Math.random() * 0.8;
    // Lignin parçacıkları makine akış yönüne göre hizalanır
    const speckRot = machineAngle + (Math.random() - 0.5) * 0.35;

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
  // Ultra pürüzsüz nötr parlak beyaz
  ctx.fillStyle = '#faf9f6';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // Kaolin kili pürüzsüzlük mikro-varyansı (Çok yüksek frekans, çok düşük genlik)
      const microSheen = perlin2D(x * 0.12, y * 0.12) * 5.0;
      const fineNoise = (Math.random() - 0.5) * 6;

      const val = Math.min(255, Math.max(0, 250 + microSheen + fineNoise));
      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Saten Işık Parıltısı (Çapraz Işık Yansıması Gradyanı)
  ctx.save();
  const glareGrad = ctx.createLinearGradient(0, 0, w, h);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  glareGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.02)');
  glareGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.06)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

  ctx.fillStyle = glareGrad;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// =========================================================================
// 4. 35MM ANALOG FİLM GRENİ (SILVER HALIDE GRAIN CLUMPING)
// =========================================================================
function renderAdvancedFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // 128 Nötr Gri (Overlay/Soft-light için ideal temel)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Poisson/Gauss kümelenme tabanlı gümüş kristalleri (Nutting Modeli)
  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // 1. Kristal Çekirdek Kümelenmesi (Clump Noise)
      const clump = perlin2D(x * 0.45, y * 0.45) * 28.0;

      // 2. Yüksek Frekanslı İnce Gren
      const r1 = Math.random();
      const r2 = Math.random();
      // Box-Muller Dönüşümü ile Gauss Dağılımlı Beyaz Gürültü
      const gauss = Math.sqrt(-2.0 * Math.log(r1 || 0.0001)) * Math.cos(2.0 * Math.PI * r2) * 26.0;

      // 3. Hafif Kromatik Ayrışma (3 Renk Katmanı Emülsiyon Bulutu)
      const chromaJitter = (Math.random() - 0.5) * 5.0;

      const totalVal = 128 + clump + gauss;

      data[idx]     = Math.min(255, Math.max(0, totalVal + chromaJitter));
      data[idx + 1] = Math.min(255, Math.max(0, totalVal));
      data[idx + 2] = Math.min(255, Math.max(0, totalVal - chromaJitter));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 5. KETEN KUMAŞ & SANATSAL TUVAL (WARP & WEFT WOVEN LINEN)
// =========================================================================
function renderAdvancedLinen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#f1ece1';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // İplik adımı (Pitch) ve çözgü-atkı periyotları
  const pitchX = 5.0;
  const pitchY = 5.0;
  const twoPi = Math.PI * 2;

  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    // İplik kalınlaşması / eğrilik varyasyonu (Slub Yarn Model)
    const slubY = perlin2D(0, y * 0.03) * 0.8;

    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;
      const slubX = perlin2D(x * 0.03, 0) * 0.8;

      // Harmonik Çözgü (Warp) ve Atkı (Weft) Yüzey Yüksekliği Denklemi
      const phaseX = ((x + slubX) % pitchX) / pitchX;
      const phaseY = ((y + slubY) % pitchY) / pitchY;

      // İplik kesişim tepe ve çukurları
      const warp = Math.sin(phaseX * twoPi);
      const weft = Math.cos(phaseY * twoPi);
      const weaveHeight = (warp - weft) * 22.0;

      // Mikro lif dokuma pürüzü
      const fiberFuzz = (Math.random() - 0.5) * 12.0;

      const totalVal = weaveHeight + fiberFuzz;

      data[idx]     = Math.min(255, Math.max(0, 241 + totalVal));
      data[idx + 1] = Math.min(255, Math.max(0, 236 + totalVal * 0.95));
      data[idx + 2] = Math.min(255, Math.max(0, 225 + totalVal * 0.85));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 6. SULU BOYA / PÜRÜZLÜ SANAT KAĞIDI (ROUGH COLD-PRESS WATERCOLOR)
// =========================================================================
function renderAdvancedWatercolor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#f5efe3';
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Pütürlü keçe dokusu için hücresel Voronoi + 3 Oktav fBm
  for (let y = 0; y < h; y++) {
    const yOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = yOffset + x * 4;

      // Su emme çukurları (Worley gözenekleri)
      const pits = worleyNoise(x * 0.06, y * 0.06);

      // Yüzey kabartısı (fBm)
      const bump = fbm2D(x * 0.02, y * 0.02, 3, 0.6) * 25.0;

      // Çukurlarda pigment birikmesi ve gölge (Sedimentation)
      const depthShading = (pits - 0.5) * 32.0;
      const microGrain = (Math.random() - 0.5) * 12.0;

      const totalMod = bump + depthShading + microGrain;

      data[idx]     = Math.min(255, Math.max(0, 245 + totalMod));
      data[idx + 1] = Math.min(255, Math.max(0, 239 + totalMod * 0.96));
      data[idx + 2] = Math.min(255, Math.max(0, 227 + totalMod * 0.82));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// =========================================================================
// 7. KATLANMIŞ / NOSTALJİK SAHAF DERGİSİ (CREASED & FOLDED PAPER)
// =========================================================================
function renderAdvancedFolded(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Temel Parşömen Dokusunu Üret
  renderAdvancedParchment(ctx, w, h);

  // Ortadan İki Katlanma Çizgisi (Yatay ve Dikey Kırışıklık Stres Hatları)
  ctx.save();
  const centerX = w / 2;
  const centerY = h / 2;

  // 1. Dikey Kat İzi (Ridge & Trough)
  const vFoldLight = ctx.createLinearGradient(centerX - 4, 0, centerX + 4, 0);
  vFoldLight.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  vFoldLight.addColorStop(0.48, 'rgba(0, 0, 0, 0.02)');
  vFoldLight.addColorStop(0.52, 'rgba(255, 255, 255, 0.28)'); // Katlanma ışık tepe noktası
  vFoldLight.addColorStop(1, 'rgba(0, 0, 0, 0.12)');

  ctx.fillStyle = vFoldLight;
  ctx.fillRect(centerX - 4, 0, 8, h);

  // 2. Yatay Kat İzi
  const hFoldLight = ctx.createLinearGradient(0, centerY - 4, 0, centerY + 4);
  hFoldLight.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
  hFoldLight.addColorStop(0.48, 'rgba(0, 0, 0, 0.02)');
  hFoldLight.addColorStop(0.52, 'rgba(255, 255, 255, 0.25)');
  hFoldLight.addColorStop(1, 'rgba(0, 0, 0, 0.10)');

  ctx.fillStyle = hFoldLight;
  ctx.fillRect(0, centerY - 4, w, 8);

  // 3. Kat Kesişim Noktası Yıpranması (Central Stress Point)
  const centerStress = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 16);
  centerStress.addColorStop(0, 'rgba(70, 50, 30, 0.22)');
  centerStress.addColorStop(0.6, 'rgba(70, 50, 30, 0.06)');
  centerStress.addColorStop(1, 'rgba(70, 50, 30, 0)');

  ctx.fillStyle = centerStress;
  ctx.fillRect(centerX - 16, centerY - 16, 32, 32);

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
