# Kadraj | AI Destekli Sanatsal Mizanpaj Atölyesi

[![Deploy Kadraj PWA to GitHub Pages](https://github.com/VelliDR/dergi-pwa/actions/workflows/deploy.yml/badge.svg)](https://github.com/VelliDR/dergi-pwa/actions/workflows/deploy.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-4285F4?logo=pwa&logoColor=white)](https://vellidr.github.io/dergi-pwa/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> Görsellerinizi sanatsal şekillerle kırpın, yapay zeka ile 3D Pop-Out efektleri ekleyin, dergi kağıdı dokuları uygulayın ve matbaa kalitesinde (300 DPI / PDF) mizanpajlar oluşturun.

🔗 **Canlı Demo:** [https://vellidr.github.io/dergi-pwa/](https://vellidr.github.io/dergi-pwa/)

---

## 📌 Kadraj Nedir?

**Kadraj**, özellikle kültür-sanat, edebiyat dergileri ve bağımsız yayıncılar için tasarlanmış, tarayıcı üzerinden istemci taraflı çalışan, yapay zeka destekli sanatsal bir mizanpaj PWA'sıdır (Progressive Web App). Sıradan dikdörtgen kırpmaların ötesine geçerek, fotoğraflarınızı şiirsel ve sanatsal birer dergi sayfasına dönüştürür.

---

## ✨ 5 Fazlı İleri Düzey Mimari & Yetenekler

### 🟢 Faz 1: Kod Hijyeni, Bellek Optimizasyonu & Lazy Loading
- **Dinamik Modül Yükleme (Code Splitting):** `@imgly/background-removal`, `heic2any` ve `jspdf` dinamik `import()` ile sadece ihtiyaç duyulduğunda yüklenir; ilk sayfa JS boyutu 1.65 MB'tan 81 KB'a düşürülmüştür.
- **OOM (Bellek Şişmesi) Koruması:** `toDataURL` Base64 zincirleri yerine doğrudan Canvas bitmap aktarımı kullanılarak mobil cihazlarda bellek sızıntıları önlenmiştir.
- **Silüet Canvas Önbelleği:** Renk değişmedikçe gölge silüetleri önbellekten okunur; gereksiz canvas re-render maliyeti sıfırlanmıştır.

### 🟡 Faz 2: Durum Yönetimi, Undo/Redo & Taslak Kurtarma
- **30 Adımlık Geri/İleri Al (Undo/Redo):** Tuvaldeki her değişiklik için anlık durum snapshot'ı alınır. Üst bar butonları veya `Ctrl+Z` / `Ctrl+Y` kısayolları ile geçmişte gezinebilirsiniz.
- **IndexedDB Otomatik Taslak Saklama:** `idb-keyval` ile görsel binary Blob ve tüm mizanpaj durumu arka planda kaydedilir. Tarayıcı kapansa dahi başlangıçta "Kayıtlı taslağınız bulundu" bildirimiyle oturum kurtarılır.

### 🔵 Faz 3: Katman Hiyerarşisi, Tipografi & Akıllı Kılavuzlar
- **Katman Paneli (Layer Stack):** Özne (3D Pop-out), Metinler, Şekil/Maske, Kağıt Dokusu ve Ana Görsel hiyerarşik sıralanır. Katmanlar tek tıkla gizlenebilir (`👁️/🕶️`), metin katmanları yukarı/aşağı (`▲/▼`) taşınabilir.
- **Zengin Tipografi Kontrolleri:** Sola, ortaya, sağa hizalama; Kalın (**B**), İtalik (*I*) ve Harf Aralığı (`letter-spacing`) yatay silindir kadranı.
- **Akıllı Manyetik Kılavuzlar (Snap Guides):** Nesneler taşınırken tuvalin tam merkezine (X/Y ekseni $\pm 7\text{ px}$) snap olunca kehribar sarısı kesikli manyetik hizalama çizgileri belirir.

### 🟣 Faz 4: Baskı Standartları, Boyut Presetleri & Çoklu Export
- **Sayfa Boyut Presetleri:**
  - *Baskı:* A4 Dikey, A4 Yatay, A5 Dikey, Kitap Kapağı (4:5).
  - *Dijital & Sosyal Medya:* Instagram Post (Kare 1:1), Hikaye / Reels (9:16), Doğal Otomatik Oran.
- **Çoklu Dışa Aktarma Formatları:**
  - **💎 300 DPI PNG:** Matbaaya uygun kayıpsız yüksek çözünürlüklü raster çıktı.
  - **📕 Baskıya Hazır PDF:** `jsPDF` motoruyla gerçek A4/A5 milimetrik ölçüde vektörel belge.
  - **🌐 Yüksek Kalite WebP:** Dijital bültenler ve web için hafif sıkıştırılmış çıktı.
  - **📐 Vektör Maske (SVG):** Adobe Illustrator / InDesign aktarımı için vektörel yol.
- **Taşma Payı ve Kesim Çizgileri (Crop Marks & Bleed):** Matbaa baskısı için isteğe bağlı kesim payı kılavuzları.

### 🔴 Faz 5: Sanatsal Kağıt Dokuları, Filtreler & Çevrimdışı AI Önbelleği
- **Prosedürel Kağıt Dokuları (Paper Textures):** 0 KB ek ağ yüküyle çalışan kod tabanlı doku motoru:
  - 📜 *Parşömen:* Sıcak, lifli antik edebiyat kağıdı.
  - 📰 *Saman Kağıdı / Gazete:* Mat gri-bej nostaljik benekli doku.
  - ✨ *Kuşe Kağıt:* Mikro grenli pürüzsüz çağdaş dergi yüzeyi.
  - 🎞️ *35mm Film Greni:* Sinematik analog fotoğraf greni.
  - 🧶 *Keten Tuval:* Sanatsal mikro örgü kumaş dokusu.
  - *Karışım Modları:* Çarpma (`multiply`), Kaplama (`overlay`), Yumuşak Işık (`soft-light`), Açıklaştır (`screen`) ve opaklık kadranı.
- **Görsel Ayarları & Renk Filtreleri:** Parlaklık, kontrast, doygunluk, analog film greni ve hızlı tonlar (Doğal, Nostaljik Sepya, Siyah-Beyaz). Hem arka plan görseline hem de 3D özneye senkron uygulanır.
- **Gelişmiş AI Kenar Matting (Erosion & Feathering):** Morfolojik aşındırma ile saç ve ten kenarlarındaki arka plan renk halolarını (fringe) piksel düzeyinde traşlama ve kadifemsi kenar yumuşatma.
- **Çevrimdışı ONNX & WASM Önbelleği:** Workbox Service Worker `runtimeCaching` ile indirilen AI model ağırlıkları 30 gün boyunca yerel cihazda saklanır ve çevrimdışı çalışır.

---

## 🛠️ Teknoloji Yığını

* **Çekirdek:** TypeScript, Vite 5, Konva.js (Canvas 2D), Workbox (PWA Service Worker)
* **Yapay Zeka & Görüntü İşleme:** `@imgly/background-removal` (ISNet ONNX / WASM), `heic2any`
* **Dışa Aktarma & Saklama:** `jspdf`, `idb-keyval` (IndexedDB)
* **Tasarım Dili:** Google Material 3 (M3) Muted Pastel Paleti
* **CI/CD & Dağıtım:** GitHub Actions, GitHub Pages

---

## 🚀 Yerel Geliştirme

```bash
# Depoyu klonlayın
git clone https://github.com/VelliDR/dergi-pwa.git
cd dergi-pwa

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# TypeScript kontrolü ve üretim derlemesi
npm run build
```

---

## 🌐 GitHub Pages ile Yayınlama (CI/CD)

Projede otomatik yayınlama için [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) iş akışı tanımlıdır.

### GitHub Pages Kurulumu (1 Seferlik):
1. GitHub reponuzda **Settings (Ayarlar)** sekmesine gidin.
2. Sol menüden **Pages** seçeneğine tıklayın.
3. **Build and deployment > Source** kısmını **"GitHub Actions"** olarak seçin.
4. `master` dalına her `git push` yaptığınızda GitHub Actions otomatik olarak:
   - TypeScript tip denetimini çalıştırır (`tsc`)
   - Vite ile optimize edilmiş PWA bundle'ını derler (`vite build`)
   - Sonucu anında **GitHub Pages** üzerine yayına alır.

---

## 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
