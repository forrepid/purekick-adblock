# 📜 PureKick — Sürüm Geçmişi (Changelog)

Bu doküman, PureKick eklentisinin tüm sürümlerindeki yenilikleri, hata düzeltmelerini ve geliştirmeleri kronolojik olarak listeler.

---

## 🚀 [10.18.0] - 2026-08-31

### ✨ Yeni Özellikler (Mega İnovasyonlar)
- **🎙️ Canlı Altyazı & Sesli AI Dublaj Motoru:**
  - Yabancı yayıncının konuşmasını otomatik algılayan ve 25+ dilde video üstünde şık altyazı olarak gösteren motor.
  - Yapay zeka sesli dublajı sırasında yayının orijinal sesini otomatik kısan (**Audio Ducking**) ve konuşma bitince geri açan sistem.
  - Video kontrol barına `[CC / 🌐]` hızlı ayar menüsü (font boyutu, renk, arka plan opaklığı, konum ve 25 dil seçici).
- **🔍 Video İçi Dijital Büyüteç & Yakınlaştırma (Digital Zoom & Pan):**
  - `Alt + Fare Tekerleği` veya `[🔍 Zoom]` butonu ile görüntüyü `%100` ile `%500` arasında akıcı büyütme.
  - Büyütüldüğünde fareyle sürükleyerek (Pan) küçük haritalara, skorlara veya detaylara odaklanma.
  - `Çift Tıklama` veya sağ üstteki durum rozetiyle anında sıfırlama.
- **📊 Sohbet Duygu & Canlı Hype Analizi (Chat Sentiment & Hype Meter):**
  - Sohbet mesaj ve emote'larını 4 kategoride (🔥 Hype, 😂 Kahkaha/Mizah, 😲 Şaşkınlık, 💔 Üzüntü/F) sürekli sınıflandıran canlı analiz.
  - Sohbet üstünde anlık mesaj hızı (`msg/dk`) ve coşku ibresi (**🔥 MEGA HYPE** parıltısı).
- **📝 AI Yayın Özeti & Kaçırılanları Yakala ("Ne Kaçırdım?" / TL;DR):**
  - Yayına sonradan katılan izleyiciler için oynanan oyunları, kategori geçişlerini ve sohbet trendlerini maddeler halinde özetleyen yapay zeka bülteni.
- **💰 Canlı Yayın Gelir & Bağış Takipçisi (Donations & Kicks Tracker):**
  - Hediye Abonelikleri (Gift Subs), Kicks Bağışlarını, Blerp / Sesli Uyarıları ve Raid'leri anlık yakalama.
  - İstatistik panelinde 4'lü Özet Kartları, En Çok Destek Verenler Lider Tablosu ve Canlı Bağış Akışı.
  - Tüm bağış kayıtlarını tek tıkla Excel/CSV formatında indirme.
- **🎨 25 Canlı Holo & Doğa/Element İsim Efekti:**
  - 15 yeni doğa/element efekti: *Elektrik, Şimşek, Alev, Sis, Su, Gölge, Bulut, Buz, Kan, Sakura, Karadelik, Zehir, Güneş, Prizma, Rün*.
  - Efekt iptal seçeneği: `🚫 Efektsiz (Orijinal / Varsayılan)`.
  - Seçilen efektin hem sohbetteki kullanıcı adında hem de açılan Profil Pop-up Kartında canlı gösterilmesi.

### 🛠️ Düzeltmeler & İyileştirmeler
- `background.js` ve `content.js` arasındaki tüm ayar anahtarları eşitlendi, ayarların kalıcı kaydedilmesi garantiye alındı.
- Altyazı kutusunun tam ekran ve tiyatro modlarında en üstte (`z-index: 2147483647`) net görünmesi sağlandı.
- JavaScript parantez ve sözdizimi hataları derleyici ile taranıp sıfırlandı.

---

## 🎨 [10.17.0] - 2026-08-30

### ✨ Yeni Özellikler
- **🖼️ Picture-in-Picture (PiP):** Yayını bağımsız mini oynatıcıya taşıma.
- **🔊 %300 Ses Yükseltici:** Kısık sesli yayınlar için Web Audio API kazanç artırıcı.
- **🎛️ Video Görsel Filtreleri:** Parlaklık, Kontrast ve Doygunluk ayar kaydırıcıları.
- **🌑 Gerçek OLED Siyah Modu:** Saf siyah (#000) zemin teması.
- **☀️ Aydınlık Tema:** Beyaz ve açık gri modern gündüz teması.
- **📑 Özel Sohbet Sekmeleri:** Tümü, @Mentions, Mod/Yayıncı, Sorular sekmeleri.
- **⏸️ Sohbet Dondurma:** Fare sohbetin üzerine geldiğinde akışı sabitleme.
- **🔤 Sohbet Font & Boyut Ayarları:** Farklı font aileleri ve boyut seçenekleri.
- **🎧 Sadece Ses Modu:** Görüntüyü gizleyip arka planda ses dinleme (Kota & CPU tasarrufu).
- **🖱️ Videoya Tıkla Oynat/Durdur:** YouTube tarzı video tıklama kontrolü.
- **🛑 Ana Sayfa Otomatik Yayın Durdurucu:** Kick ana sayfasındaki yayını otomatik durdurma.
- **👁️ Çevrimdışı Kanalları Gizle:** Kenar çubuğunu temizleme.

---

## 🛡️ [10.16.0] - 2026-08-28

### ✨ Yeni Özellikler
- **🗣️ Sohbet TTS:** Seçilen mesajları sesli okuyan metin okuma motoru.
- **✂️ Hızlı Klip & Ekran Görüntüsü:** `Alt + S` ve `Alt + K` kısayolları ile anında yakalama.
- **🛡️ Güvenli Link Kalkanı:** Sohbetteki şüpheli linkleri uyaran güvenlik katmanı.
- **📊 Sohbet Kaydını Dışa Aktar:** TXT ve CSV formatında mesaj indirme.
- **🧹 Emote & Harf Spam Filtresi:** Sohbet akışını temizleyen anti-spam motoru.

---

## 🚀 [10.15.0 ve Öncesi] - 2026-08-25

### ✨ Temel Özellikler
- **🚫 Gelişmiş DNR Reklam Engelleyici:** Preroll ve Midroll video reklamlarını sıfır takılmayla atlatma.
- **🎴 81 Hazır Koleksiyon Kartı:** Dahili popüler profil kartı şablonları.
- **📁 Yerel Görsel & Özel URL Profil Kartı:** Kendi GIF/resimlerini yükleme.
- **📌 Sol Kenar Çubuğu Sabitleme & Gruplama:** Takip edilen kanalları düzenleme.
- **🌐 7 Dilde Yerelleştirme:** Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, Portekizce, Rusça.
