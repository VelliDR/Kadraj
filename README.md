# Kadraj | AI Destekli Sanatsal Mizanpaj Atölyesi

> Görsellerinizi sanatsal şekillerle kırpın, yapay zeka ile 3D Pop-Out efektleri ekleyin ve matbaa kalitesinde (300 DPI) mizanpajlar oluşturun.

**Kadraj**, özellikle kültür-sanat, edebi dergiler ve bağımsız yayıncılar için tasarlanmış, tarayıcı üzerinden çalışan, yapay zeka destekli sanatsal bir mizanpaj PWA'sıdır (Progressive Web App). Sıradan dikdörtgen kırpmaların ötesine geçerek, görsellerinizi şiirsel ve sanatsal birer öğeye dönüştürür.

---

## 📌 Hakkında

Kadraj, mizanpaj sürecini dijital bir atölyeye dönüştürür. Geleneksel maskeleme yöntemlerinin karmaşıklığını, modern bir UI ve AI gücüyle birleştirerek, profesyonel tasarımcılardan amatör yayıncılara kadar herkesin estetik ve baskıya hazır içerikler üretmesini sağlar.

Kadraj'ın kalbinde, **Kayıpsız 300 DPI Çıktı Motoru** ve **MediaPipe Selfie Segmentation** tabanlı AI motoru yatar. Bu iki güç, görsellerinizi sanatsal birer enstalasyona dönüştürür.

---

## ✨ Özellikler

### 🧠 Yapay Zeka (AI) ve 3D Derinlik

* **✨ Akıllı Özne Ayrıştırma:** MediaPipe Selfie Segmentation kullanarak fotoğraftaki özneyi (büst, model, nesne) tek tıkla arka planından ayırır.
* **↩️ 3D Pop-Out & Derinlik:** Arka plan sanatsal şeklin içinde kalırken, AI ile ayrıştırılan öznenin (örneğin heykelin başı, terazisi) şeklin dışına taşmasını sağlar.

### 📐 Sanatsal Kırpma ve Şablonlar

* **Sanatsal Şekil Kütüphanesi:** Antik Kemer, Akışkan Leke (Blob), Puzzle, Yırtık Kağıt, Posta Pulu, Karşıt Köşeler gibi 20'den fazla özel Canvas tabanlı şablon.
* **📁 Resimden Özel Maske:** Kullanıcının yüklediği herhangi bir iki renkli görseli (siyah-beyaz vb.) anında bir alfa maskesine dönüştürür. **"🔄 Ters Çevir"** özelliğiyle maskenin kullanılacak alanını seçebilirsiniz.
* **🔍 Dinamik Zoom:** Görseli maske içinde ölçekleyin ve sürükleyin.

### 🎭 Gelişmiş Gölge Motoru

* **📐 Şekil Gölgesi:** Kırpma şeklinin (Örn: Antik Kemer) dergi kağıdı üzerine gerçekçi bir derinlik gölgesi düşürmesini sağlar. $360^\circ$ açı, mesafe ve bulanıklık ayarı.
* **👤 Özne Silüet Gölgesi (YENİ):** AI ile ayrıştırılan öznenin tam silüetini çıkarır, istenen mat pastel renge boyar ve öznenin arkasına $360^\circ$ açıyla yerleştirir. Edebi bir derinlik sağlar.

### ✍️ Tipografi ve Katmanlama

* **Zarif Font Kütüphanesi:** Kültür-sanat dergileri için seçilmiş fontlar: Cormorant (Şiirsel), Caveat (El Yazısı), Lora (Edebi), Cinzel (Antik) vb.
* **🔄 360° Metin Döndürme:** Metinleri kendi merkezleri etrafında $360^\circ$ açı ile döndürün (dial-pill sürgüsü).
* **Katman Hiyerarşisi:** Metinler, AI ile ayrıştırılan öznenin arkasında, genel magazine sheet'in içinde kalacak şekilde mükemmel mizanpaj hiyerarşisiyle yerleştirilir.

### 🖨️ Profesyonel Çıktı ve Formatlar

* **💎 Kayıpsız 300 DPI PNG Çıktı:** Önizlemedeki gölge ve metin oranlarını, baskı ölçeğine (A4 @ 300 DPI: $2480 \times 3508\text{ px}$) matematiksel olarak uyarlar. Renkler çamurlaşmaz.
* **📷 HEIC/HEIF Desteği:** iPhone'dan gelen `.heic` dosyalarını tarayıcıda doğrudan açar ve %100 kalitede işler (`heic2any` entegrasyonu).
* **🏁 Şeffaflık Modu:** Arka planı dama tahtası yaparak şeffaf kırpmalar oluşturun.

### 🎨 Material 3 ve Mat Pastel Arayüz

* **Split Navigation Dock:** Sol sütunda dikey menü (Katman, Yazı, Gölge, Şablon), sağ sütunda ızgara şeklinde düzenlenen nizami kontroller. Ekranı taşırmaz.
* **Muted Pastel Paleti:** Göz yormayan, 'Muted' (mat ve tozlu) pastel tonlar (Sage, Lavender, Sand, Terracotta, Graphite).

---

## 🛠️ Kullanılan Teknolojiler

Kadraj'ın kalbinde yatan teknolojiler:

* [Konva.js](https://konvajs.org/) - Gelişmiş Canvas manipülasyonu ve katmanlama motoru.
* [MediaPipe Selfie Segmentation](https://www.google.com/search?q=https://developers.google.com/mediapipe/solutions/vision/selfie_segmentation) - Yapay zeka ile özne ayrıştırma (WASM/WebGL).
* [heic2any](https://alexcorvi.github.io/heic2any/) - HEIC/HEIF formatlarını tarayıcıda kayıpsız dönüştürme.
* [M3 (Material 3)](https://m3.material.io/) - Modern, esnek ve estetik arayüz tasarım dili.
* JavaScript (ES6+), HTML5, CSS3.

---

## 🚀 Başlangıç (Geliştiriciler İçin)

Projenin yerel kopyasını çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler

Kurulumdan önce bilgisayarınızda şunların yüklü olması gerekir:

* [Node.js v18+](https://nodejs.org/)
* Git

### Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/kullaniciadi/kadraj.git
cd kadraj

```


2. Gerekli paketleri kurun:
```bash
npm install
# veya
yarn install

```


3. Vite geliştirme sunucusunu başlatın:
```bash
npm run dev
# veya
yarn dev

```


4. Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresine gidin.

---

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır. Detaylar için [LICENSE](https://www.google.com/search?q=LICENSE) dosyasına bakınız.
