# Kadraj | Sanatsal Mizanpaj Atölyesi

[![Deploy Kadraj PWA to GitHub Pages](https://github.com/VelliDR/dergi-pwa/actions/workflows/deploy.yml/badge.svg)](https://github.com/VelliDR/dergi-pwa/actions/workflows/deploy.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-4285F4?logo=pwa&logoColor=white)](https://vellidr.github.io/dergi-pwa/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> Fotoğraflarınızı sanatsal şekillerle kırpın, öne çıkan konuyu sayfadan taşıyormuş gibi gösterin, dergi kağıdı dokuları ekleyin ve baskıya hazır sayfalar oluşturun.

🔗 **Canlı Demo:** [https://vellidr.github.io/dergi-pwa/](https://vellidr.github.io/dergi-pwa/)

---

## 📌 Kadraj Nedir?

**Kadraj**, kültür-sanat ve edebiyat dergileri ile bağımsız yayıncılar için hazırlanmış bir mizanpaj aracıdır. Tarayıcıda çalışır, kurulum gerektirmez ve telefona uygulama gibi eklenebilir. Fotoğraflarınız cihazınızdan ayrılmaz.

Sıradan dikdörtgen kırpmaların yerine, görsellerinizi şiirsel ve sanatsal dergi sayfalarına dönüştürmenizi sağlar.

---

## ✨ Neler Yapabilirsiniz?

### 🖼️ Görseli Sanatsal Kırpın
- Fotoğrafınızı farklı şekillerde kırpın.
- Sayfa boyutunu seçin: A4, A5, kitap kapağı, Instagram gönderisi, hikaye/reels ya da fotoğrafın kendi oranı.

### 🪄 Öne Çıkan Konuyu Sayfadan Taşırın
- Fotoğraftaki kişiyi ya da nesneyi otomatik olarak ayırın.
- Konunun çerçeveden dışarı taşıdığı üç boyutlu bir görünüm elde edin.
- Saç ve kenar çevresindeki istenmeyen renk halelerini temizleyin.
- Konuya gölge ekleyin.

### 📜 Kağıt Dokuları ve Renk Ayarları
- **Matematiksel Doku Fiziği (0 KB Ağ Yükü):** Parşömen (kılcal lifler & teğetsel ışıklandırma), gazete kağıdı (lignin & tramlama), kuşe kağıt (saten yansıma), 35mm film greni (Nutting yasası & Poisson kümelenmesi), keten tuval (harmonik çözgü/atkı dokuması), sulu boya kağıdı (pütürlü hücresel çukurlar) ve katlanmış sahaf dergisi (stres hatları).
- Dokunun yoğunluğunu ve görsele karışma biçimini (`multiply`, `overlay`, `screen`, `soft-light`) ayarlayın.
- Parlaklık, kontrast ve doygunluğu değiştirin.
- Nostaljik sepya ya da siyah-beyaz tonları uygulayın.

### ✍️ Yazı, Katmanlar & Tasarımcı Kısayolları
- Sayfaya metin ekleyin; tuval üzerinden doğrudan köşelerinden tutarak boyutlandırın ve döndürün (`Konva.Transformer`).
- Hizalama, kalın, italik, harf aralığı ve döndürme kadranları.
- Hızlı kısayollar: `Delete`/`Backspace` ile silme, yön tuşlarıyla piksel hassasiyetinde öteleme (`Shift` ile 10px), `Escape` ile seçimi kaldırma, `Ctrl+S` ile dışa aktarma.
- Katmanları sıralayın, gizleyin ya da gösterin. Katmana tıklandığında ilgili araca otomatik geçiş.
- Nesneleri taşırken kılavuz çizgileri sayesinde tam ortaya hizalayın.

### 💾 Çalışmanızı Güvenle Sürdürün
- Hatalarınızı geri alın, yeniden uygulayın (`Ctrl+Z` / `Ctrl+Y`).
- Çalışmanız otomatik kaydedilir. Tarayıcıyı kapatsanız bile kaldığınız yerden devam edebilirsiniz.
- İnternet bağlantısı olmadan da çalışır. İlk kullanımdan sonra gerekli bileşenler cihazda saklanır.

### 🖨️ Baskıya Hazır Çıktılar
- **PNG:** Matbaa kalitesinde yüksek çözünürlük.
- **PDF:** Gerçek sayfa ölçülerinde belge.
- **WebP:** Web ve dijital bültenler için hafif görsel.
- **SVG:** Tasarım programlarında kullanabileceğiniz şekil maskesi.
- İsteğe bağlı taşma payı ve kesim çizgileri.

---

## 🚀 Nasıl Kullanılır?

1. [Canlı demoyu](https://vellidr.github.io/dergi-pwa/) açın.
2. Bir fotoğraf yükleyin.
3. Sayfa boyutunu ve şekli seçin.
4. İsterseniz konuyu ayırın, doku, renk ve yazı ekleyin.
5. Çalışmanızı istediğiniz formatta dışa aktarın.

---

## 🛠️ Geliştiriciler İçin

```bash
git clone https://github.com/VelliDR/dergi-pwa.git
cd dergi-pwa
npm install
npm run dev
```

`master` dalına yapılan her güncelleme GitHub Actions ile otomatik olarak yayınlanır.

---

## 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
