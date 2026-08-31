# 🛡️ PureKick — Ultimate Kick.com Ad Blocker & Supercharged Toolkit

<div align="center">

![PureKick Logo](icons/icon128.png)

### Kick.com için Dünyanın En Gelişmiş Reklam Engelleyicisi, Canlı Çeviri & Dublaj Motoru, AI Asistanı ve Yayıncı/İzleyici Araç Seti

[![GitHub license](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Manifest Version](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](manifest.json)
[![PureKick Version](https://img.shields.io/badge/Version-10.18-orange.svg)](manifest.json)
[![Platform](https://img.shields.io/badge/Platform-Kick.com-53fc18.svg)](https://kick.com)

</div>

---

## 📖 Genel Bakış

**PureKick**, Kick.com canlı yayın platformu için özel olarak geliştirilmiş, tarayıcı tabanlı (Manifest V3) kapsamlı bir süper eklentidir. Yalnızca reklamları engellemekle kalmaz; canlı yayınları yapay zeka ile anında çevirip seslendirir, videoyu büyütüp kaydırmanızı sağlar, sohbetin nabzını (Hype) ölçer, yayıncıya gönderilen bağışları/Kicks'leri kaydeder ve profilinizi 25 farklı canlı animasyonla özelleştirir.

---

## 🌟 Mevcut Tüm Özellikler Kataloğu

### 🚫 1. Reklam Engelleme & Video Kalkanı (Zero Ad Blocker)
* **DNR (Declarative Net Request) + Main-World Script Hook:** Video öncesi (Preroll), yayın ortası (Midroll) ve arayüz içi banner reklamlarını sıfır gecikmeyle durdurur.
* **Akıllı Reklam Atlama:** Reklam başladığı milisaniyede algılanıp doğrudan canlı akışa bağlanır; yayında donma, siyah ekran veya ses kesintisi yaşanmaz.
* **Otomatik Oyuncu Kurtarma:** Kick video oynatıcısının kilitlenmesini önleyen otomatik re-init mekanizması.

### 🎙️ 2. Canlı Yayın Altyazı & Sesli AI Dublaj Motoru (Live Subtitles & TTS)
* **Yapay Zeka Ses Algılama:** Yayındaki konuşmaları Web Speech API ve ses işleme hattıyla anlık olarak metne döker.
* **25+ Dünya Dilinde Çeviri:** Algılanan metni anında seçtiğiniz hedef dile (Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, Rusça, Japonca, Arapça vb.) çevirir.
* **Video Üstü Altyazı Kutusu:** Video oynatıcı üzerinde şık, yarı saydam ve özelleştirilebilir canlı altyazı paneli.
* **Sesli AI Dublajı & Audio Ducking:** Çevrilen metin yapay zeka sesiyle seslendirilirken, yayıncının orijinal sesi arka planda otomatik olarak kısılır (%35) ve konuşma bitince eski seviyesine döner.
* **Özelleştirilebilir Görünüm:** Altyazı yazı boyutu, rengi, kalınlığı, arka plan opaklığı ve konumu (Üst/Alt) anlık ayarlanabilir.

### 🔍 3. Video İçi Dijital Büyüteç & Yakınlaştırma (Digital Zoom & Pan)
* **%100 - %500 Yakınlaştırma:** `Alt + Fare Tekerleği` veya video kontrol çubuğundaki `[🔍 Zoom]` butonu ile istenen bölgeye pürüzsüz büyüteç.
* **Pan & Sürükleme:** Büyütüldüğünde fareyle video içinde serbestçe gezinerek mini harita, skor tablosu veya küçük detayları inceleme.
* **Hızlı Sıfırlama:** `Çift Tık` veya sağ üstteki durum rozetine tıklayarak anında orijinal boyuta dönme.

### 📊 4. Canlı Sohbet Duygu & Hype Analizi (Chat Sentiment & Hype Meter)
* **Gerçek Zamanlı Duygu Taraması:** Sohbetteki mesajları ve emote'ları sürekli sınıflandırır:
  * 🔥 **Hype / Coşku:** `W`, `LETSGO`, `POG`, `HYPER`, `EZ`, `🔥`, `🏆`
  * 😂 **Kahkaha / Mizah:** `KEKW`, `LMAO`, `HAHA`, `LOL`, `😂`, `💀`
  * 😲 **Şaşkınlık / Şok:** `WTF`, `OMG`, `NANI`, `😱`, `🤯`
  * 💔 **Üzüntü / Saygı:** `L`, `F`, `RIP`, `AGAB`, `😭`, `💔`
* **Canlı Hype İbresi & Mesaj Hızı:** Sohbetin hemen üstünde anlık `msg/dk` hızı ve yüzdelik duygu dağılımı. Hype tavan yaptığında **🔥 MEGA HYPE** animasyonu aktifleşir.

### 📝 5. AI Yayın Özeti & Kaçırılanları Yakala ("Ne Kaçırdım?" / TL;DR)
* Yayına sonradan katılan izleyiciler için video kontrol çubuğundaki `[📝 Ne Kaçırdım?]` butonu.
* Yayının başlangıcından itibaren oynanan oyunları, kategori değişimlerini, kilit olayları ve sohbette en çok konuşulan trend konuları maddeler halinde sunan yapay zeka bülteni.

### 💰 6. Canlı Yayın Gelir & Bağış Takipçisi (Donations & Kicks Tracker)
* **Otomatik Yakalama:** Sohbetteki Hediye Abonelikleri (Gift Subs), Kicks Bağışlarını, Blerp / Sesli Uyarıları ve Raid katılımlarını anlık kaydeder.
* **4'lü Canlı Metrik Paneli:** Toplam Hediye Sub, Toplam Kicks, Blerp Sayısı ve Raid İzleyicisi.
* **🏆 Lider Tablosu (Top Donators):** En çok destek veren izleyicilerin puan sıralaması.
* **📜 Canlı Bağış Akışı:** Son gelen desteklerin saat, kullanıcı ve miktar bazında canlı listesi.
* **📥 CSV Dışa Aktarma:** Tüm bağış geçmişini tek tıkla Excel/CSV dosyası olarak indirme.

### 🎨 7. 25 Canlı Holo & Doğa/Element İsim Efekti & Profil Kartları
* **81 Hazır Koleksiyon Kartı:** Dahili Pokemon, Dragon Ball, One Piece vb. şablonlar.
* **Özel Görsel / GIF Desteği:** Bilgisayardan dosya seçme (PNG, JPG, animasyonlu GIF) veya harici URL yapıştırma.
* **25 Farklı Canlı Efekt:**
  1. 🚫 **Efektsiz (Orijinal / Varsayılan)**
  2. ⚡ **Pikachu Spark**
  3. 🔮 **Neon Cyber**
  4. 🌌 **Galaxy Cosmos**
  5. 🔥 **Ruby Fire**
  6. 💎 **Emerald Shine**
  7. ❄️ **Diamond Prism**
  8. 👑 **Golden Prestige**
  9. 🌑 **Dark Void**
  10. 🌈 **Rainbow Holo**
  11. 💧 **Liquid Glass**
  12. ⚡ **Elektrik Akımı (Lightning Spark)**
  13. 🌩️ **Fırtına Şimşek (Thunder Storm)**
  14. 🔥 **Cehennem Alevi (Inferno Flame)**
  15. 🌫️ **Gizemli Sis & Duman (Mystic Fog)**
  16. 🌊 **Okyanus Dalgası (Tsunami Wave)**
  17. 👤 **Karanlık Gölge (Shadow Phantom)**
  18. ☁️ **Gök Kubbe & Bulut (Heaven Cloud)**
  19. ❄️ **Kristal Donma (Glacier Frost)**
  20. 🩸 **Kan Aurası (Blood Moon)**
  21. 🌸 **Sakura Esintisi (Sakura Blossom)**
  22. 🪐 **Kozmik Karadelik (Supernova Void)**
  23. 💚 **Zehir & Asit (Venom Toxic)**
  24. ☀️ **Güneş Plazması (Solar Flare)**
  25. 💎 **Prizmatik Kırılma (Prism Shard)**
  26. 🔮 **Büyücü Rünü (Arcane Magic)**
* **Sohbette & Profil Kartında Görünürlük:** Seçilen efekt hem sohbet satırındaki adınızda hem de açılan profil pop-up kartınızda parıldar.

### 🛠️ 8. Gelişmiş Sohbet & Moderasyon Araçları
* **Özel Sohbet Sekmeleri:** Tümü, @Bahsedilmeler, Mod/Yayıncı Mesajları, Sorular.
* **Sohbet Dondurma:** Fare sohbetin üzerine geldiğinde akışı durdurma.
* **Sohbet Fontu & Boyutu:** Küçük, Orta, Büyük, Dev boyutlar ve Roboto, Inter, Fira Code fontları.
* **Hızlı Moderatör Barı:** `/subonly`, `/emoteonly`, `/slow 10`, `/clear` komut butonları.
* **Mesaj Çeviri Butonu:** Sohbet satırındaki her yabancı mesajın yanına `[🌐 Çevir]` butonu.

### 🎬 9. Video Oynatıcı & Görünüm Geliştirmeleri
* **Picture-in-Picture (PiP):** Yayını mini pencereye alıp diğer sekmelerde gezinme.
* **%300 Ses Yükseltici:** Web Audio API ile kısık sesli yayınları 3 katına çıkarma.
* **Görsel Filtreler:** Parlaklık (%50-%200), Kontrast (%50-%200), Doygunluk (%50-%200).
* **OLED Siyah Modu & Aydınlık Tema:** Saf siyah (#000) veya açık beyaz/gri arayüz teması.
* **Sadece Ses Modu:** Görüntüyü gizleyip arka planda yalnızca ses dinleyerek veri/CPU tasarrufu.
* **Videoya Tıkla Oynat/Durdur:** Video ekranına tıklayarak yayını duraklatıp başlatma.
* **Ana Sayfa Otomatik Durdurucu:** Kick ana sayfasındaki otomatik yayını durdurarak kota koruma.
* **Çevrimdışı Kanalları Gizle:** Sol kenar çubuğundaki çevrimdışı yayıncıları temizleme.

---

## 📜 Sürüm Geçmişi (Changelog)

Detaylı sürüm geçmişi ve versiyon bazlı değişiklikler için [CHANGELOG.md](CHANGELOG.md) dosyasını inceleyebilirsiniz.

* **v10.18 (Son Sürüm):**
  * 🎙️ Canlı Altyazı & Sesli AI Dublaj Motoru (Audio Ducking ve 25+ dil entegrasyonu).
  * 🔍 Video İçi Dijital Büyüteç & Yakınlaştırma (Digital Zoom & Pan).
  * 📊 Canlı Sohbet Duygu & Hype Analizi (Hype Meter & msg/dk sayacı).
  * 📝 AI Yayın Özeti & Kaçırılanları Yakala ("Ne Kaçırdım?" TL;DR bülteni).
  * 💰 Canlı Yayın Bağış, Kicks, Hediye Abonelik & Blerp İstatistik Takipçisi (CSV dışa aktarma).
  * 🎨 25 Farklı Doğa/Element/Büyü İsim Animasyon Efekti ve `🚫 Efektsiz (Varsayılan)` seçeneği.
  * ⚙️ Kalıcı ayar depolama ve senkronizasyon optimizasyonu.

* **v10.17:**
  * 🖼️ Picture-in-Picture (PiP) mini oynatıcı desteği.
  * 🔊 %300 Ses Yükseltici (Web Audio API GainNode).
  * 🎛️ Video Parlaklık, Kontrast ve Doygunluk filtre kaydırıcıları.
  * 🌑 Gerçek OLED Siyah Modu (#000000) ve Beyaz Aydınlık Tema.
  * 📑 Özel Sohbet Sekmeleri (Tümü, Mention, Mod, Sorular) ve Sohbet Dondurma.

* **v10.16:**
  * 🗣️ Sohbet TTS (Metin Okuma) sistemi.
  * ✂️ 30s / 60s Hızlı Klip Alma ve Anlık Ekran Görüntüsü Kısayolları.
  * 🛡️ Güvenli Link Kalkanı (Dolandırıcılık ve Phishing koruması).
  * 📊 Sohbet İstatistiklerini TXT/CSV olarak dışa aktarma.

* **v10.15 & Öncesi:**
  * 🚫 Gelişmiş DNR Reklam Engelleme Motoru ve Hook Kalkanı.
  * 🎴 81 Koleksiyon Kartı ve Özel Profil Kartı Şablonları.
  * 📌 Sol Kenar Çubuğu Sabitleme ve Kategori Gruplama.

---

## 🚀 Kurulum (Developer Mode)

1. Bu depoyu indirin veya klonlayın:
   ```bash
   git clone https://github.com/forrepid/purekick-adblock.git
   ```
2. Tarayıcınızda (Chrome, Brave, Edge, Opera) `chrome://extensions` adresine gidin.
3. Sağ üstteki **"Geliştirici modu" (Developer mode)** anahtarını açın.
4. **"Paketlenmemiş öğe yükle" (Load unpacked)** butonuna tıklayın.
5. Projedeki `10.15_0` klasörünü seçin.
6. [Kick.com](https://kick.com)'a girin ve PureKick ayrıcalıklarının tadını çıkarın! ⚡

---

## 📄 Lisans
Bu proje özel mülkiyet altındadır (Proprietary). Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
