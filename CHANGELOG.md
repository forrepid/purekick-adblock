# 📜 PureKick — Sürüm Geçmişi (Changelog)

Bu doküman, PureKick eklentisinin tüm sürümlerindeki yenilikleri, hata düzeltmelerini ve geliştirmeleri kronolojik olarak listeler.

---

## 🚀 [10.19.15] - 2026-10-10 (Klip Oynatma, İzinler & Dil Desteği)

### 🎬 Klip bağlantıları
- Sohbette tıklanan Kick klip kimliği Kick API'sinden çözülerek klibin gerçek HLS video akışı ayrı oynatıcıda oynatılır; canlı kanal sayfasına düşme önlendi.
- HLS.js yerel olarak eklendi; pencere kapanınca akış durdurulur. API veya oynatma hatasında canlı yayına geçmek yerine açıklayıcı hata görünür.
- Gömülemeyen KickBot klip bağlantıları boş iframe yerine kaynak sayfada yeni sekmede açılır.

### 🔐 Bağlantı izinleri ve dil
- Link önizlemeleri için ayarlara tüm HTTP/HTTPS sitelerine isteğe bağlı erişim düğmesi eklendi; erişim verildiğinde bekleyen önizlemeler yenilenir.
- 15 arayüz dili ve GitHub destek bildirimi akışı güncellendi.
- Klip kimliği, akış kaynağı ve izin davranışları için regresyon testleri eklendi.

### Doğrulama
- Otomatik testler: 26/26 başarılı.
- Ekran görüntüsündeki klip kimliğinde API yanıtı ve HLS listesi doğrulandı; video parçası Range isteği `206 Partial Content` ve CORS izni döndürdü.

---

## 🚀 [10.19.14] - 2026-10-07 (Sohbet, Kenar Çubuğu & Klip Araçları)

### 💬 Sohbet ve kenar çubuğu
- Sohbet arşivi kanal bazında ayrıldı; günlük tarih damgalı log indirme, silinen mesaj metnini koruma ve arşive yalnız yeni mesaj ekleme davranışı iyileştirildi.
- Takip listesindeki çevrimiçi/çevrimdışı gizleme ve kişi sınırı düzenlendi; çevrimdışı satırlar gizleme açıkken ilk çizimden itibaren saklanır.
- Çevrimiçi kanal hover başlıkları, bağlantı önizleme kartları ve sayfa içi bağlantı açma akışları düzeltildi; profil kartı davranışı kategori ve Drops sayfalarından ayrıldı.
- Abone rol vurgusu ve hediye KICKS destekçi kayıtları için olay ayrıştırması genişletildi.

### 🎥 Klip ve kayıt
- Sohbet klip komutu algılaması ve kullanıcıya durum bildirimi güçlendirildi.
- Sesli klip komutuna 15 dil seçeneği, mikrofon ses ölçeri ve oynatıcıda görünür açık/dinliyor rozeti eklendi.
- Klip kısayollarına bağımsız aç/kapat ayarı eklendi; codec ve bitrate seçimleri kayıt başlatılırken uygulanır, desteklenmeyen codec için tarayıcı uyumlu geri dönüş yapılır.
- Sessiz video ve klip kayıtları dosya adına tarayıcı diline göre sessiz etiketi ekler.

### 🧰 Diğer düzeltmeler
- Video renk modu, sohbet bağlantı durumu ve yayın oynatıcı geçiş kararlılığı düzenlendi.
- Test kapsamı çevrimdışı oynatıcı ve arayüz regresyon senaryolarıyla genişletildi.

---

## 🚀 [10.19.13] - 2026-10-06 (Renk Modu, Profil Kartları & Destekçi Kayıtları)

- Video renk körü filtresindeki SVG matrisleri kaldırılarak yerel CSS filtrelerine geçildi; aynı değer için gereksiz video stil yazımı engellendi.
- Profil kartı koleksiyonu ilk beş kart ve korunmuş yedi kartla toplam 12 karta indirildi; seçici ve paket listesi eşitlendi.
- Destekçi event köprüsü Kick'in `channel.subscription.gifts`, `channel.subscription.new`, `channel.subscription.renewal` ve `kicks.gifted` payload alanlarını destekleyecek şekilde genişletildi.
- KickBot'un “just gifted 1 KICKS” bildirimi ve Kicks ayrıştırması iyileştirildi.

---

## 🚀 [10.19.12] - 2026-10-06 (Kick sayfası içi PureKick Mod simgesi)

- Yeşil böcek rozeti sayfa içindeki üst çubuk düğmesine, sohbet ayarları düğmesine, yönetim paneline ve profil kartı önizlemesine eklendi; küçük boyutlarda görünmesi için logo alanı büyütüldü.
- Sayfa içi erişilebilir adlar ve profil kartı örnek etiketi “PureKick Mod” olarak güncellendi.

---

## 🚀 [10.19.11] - 2026-10-06 (PureKick Mod, Oynatıcı Kararlılığı & Gizlilik)

### 🪲 PureKick Mod kimliği
- Eklenti adı ve tüm araç çubuğu simgeleri yeşil böcek rozetiyle güncellendi.

### 🛠️ Düzeltmeler ve güvenlik
- IVS worker betiği ana iş parçacığında senkron XHR ile indirilmek yerine worker bağlamında yükleniyor; başlangıç başarısız olursa orijinal worker'a geri dönülüyor.
- Kanal başlığı için eşzamanlı hover istekleri birleştirilip tüm bekleyen görünümlere yanıt veriliyor.
- Reklam playlist filtresi süreli CUE/DATERANGE aralıklarını ve tekil stitched-ad segmentlerini işler; eksik/açık reklam aralığında playlist'i kesmez.
- DNR reklam kuralları yalnız Kick kaynaklı sayfa isteklerinde etkin.
- Tüm sitelere zorunlu erişim izni kaldırıldı; genel link önizlemeleri yalnız kullanıcı ilgili site için isteğe bağlı izin verdiyse çalışır.
- Sohbet arşivi saklama kapsamı ve Kick sayfasının IndexedDB erişimi güvenlik belgesinde açıklandı.
- Eksik 12 çeviri anahtarı beş dil kataloğuna eklendi.
- Node yerleşik test altyapısı; manifest, ikonlar, yerelleştirme, DNR kapsamı ve HLS filtre senaryolarını doğrular.

---

## 🚀 [10.19.10] - 2026-10-05 (Sohbet Arşivi, Medya Önizlemeleri & Oynatıcı Kararlılığı)

### 🖼️ Bağlantı Önizlemeleri
- Instagram gönderi ve Reels görselleri, Instagram'ın herkese açık embed sayfasından çıkarılır; ücretli veya Google tabanlı thumbnail servisi eklenmedi.
- X/Twitter, Kick, TikTok, Streamable ve genel web bağlantılarında platform metadata/API görselleri kullanılır; Lightshot için gerçek ekran görüntüsü varsa pencere içinde gösterilir.
- Görsel kaynağı yüklenemezse boş kutu yerine site ikonu veya açıklayıcı durum gösterilir.

### 💬 Sohbet ve Kayıtlar
- Sohbet arşivi kalıcı IndexedDB deposuna alınır; moderasyon, silinen mesajlar ve sohbet kayıtlarının gösterimi iyileştirilir.
- İzleyici örnekleri ve sohbet bağlantı durumu takibi eklendi.

### 🎥 Oynatıcı ve VOD
- VOD/kanal geçişlerinde eski oynatma isteklerinin yeni yayına karışması önlenir; HLS reklam işaretleri ve çevrimdışı oynatıcı durumu iyileştirilir.

---

## 🚀 [10.19.5] - 2026-09-05 (Anında Canlı Efekt Uygulama, Arkaplan Maskeleme & Arayüz Çakışma Düzeltmesi)

### 🎨 Kritik Görsel & Canlı Tetikleme Düzeltmeleri
- **⚡ Sayfa Yenilemesiz (F5 Olmadan) Canlı Uygulama:** Ayarlar panelinde Koleksiyon Kartı, Yerel Arkaplan, Özel URL veya Holo İsim Efekti seçildiğinde veya değiştirildiğinde sayfa yenileme zorunluluğu ortadan kaldırıldı; canlı sohbetteki isimler ve açık profil kartı anında güncelleniyor.
- **🎴 Profil Kartı Arkaplan Maskeleme Onarımı:** Dış taşıyıcı kabın (`kap`) ve Kick'in ara sarmalayıcılarının opak `rgb(23,26,28)` rengiyle temayı örtmesi engellendi; şeffaflık ve cam parlaklığı dinamik olarak sağlandı.
- **📺 Üst Üste Binme & Video Başlık Çakışması Giderildi:** Aydınlık mod veya stil güncellemelerinde kanal sekme menüsünün ("Ana Sayfa", "Hakkımda", "Videolar") yayın oynatıcı üzerine taşması ve metin çakışması önlendi; oynatıcı ve kanal başlığı z-index ve container korumasına alındı.
- **💬 Sohbet Arama & Sekme Çubukları Stabilizasyonu:** Sohbet üst çubuğundaki filtre ve sekme panellerinin `sticky` çakışması `relative flex` akışına dönüştürülerek mesaj alanını kapatmaları engellendi.

---

## 🚀 [10.19.4] - 2026-09-05 (Canlı Profil Kartı Koleksiyon Arkaplanı & Holo Efekti Düzeltmesi)

### 🎨 Kritik Görsel & Tema Onarımı
- **🎴 Koleksiyon & Özel Kart Arkaplanı Canlı Karta Doğrudan Bağlandı:** Ayarlarda seçilen koleksiyon kartının canlı Kick profil kartında görünmemesi sorunu çözüldü.
  - Arka plan görseli (`background-image`) dış taşıyıcı yerine doğrudan kullanıcının tıkladığı asıl Kick profil kartına (`card`) uygulandı.
  - Kick'in kartın üst yarısını örten varsayılan banner görseli gizlendi ve içteki tüm opak gri/siyah alt bloklar şeffaflaştırılarak arkadaki kart illüstrasyonunun baştan aşağı net görünmesi sağlandı.
  - Modüller (bilgi, kullanıcı notları, mesajlar) yarı saydam koyu cam efekti (`backdrop-filter: blur`) ile tasarlanarak hem okunabilirlik hem de kart görselinin güzelliği korundu.
- **⚡ Canlı Holo Efekti & Çerçeve Parıltısı:** Seçilen holo efekti (`⚡ Pikachu Spark` vb.) doğrudan kartın kendi gövdesine eklenerek kartın etrafındaki altın sarısı neon parıltısı ve animasyon aktif hale getirildi.

---

## 🚀 [10.19.3] - 2026-09-05 (Profil Kartı: Bilgi, Sohbet & Kullanıcı Notları Onarımı)

### 🛠️ Kritik Düzeltmeler
- **👤 Profil Kartı Algılama & Seçici Genişletmesi:** Kick'in güncellenen kullanıcı kartı DOM yapısı (`div.bg-surface-highest, div[data-chat-user-card], div[data-testid="user-profile-card"], div.bg-surface-base, div[role="dialog"]`) ve kullanıcı adı seçicileri genişletilerek kartın eksiksiz yakalanması sağlandı.
- **ℹ️ Kart Bilgisi (Katılma & Takip Tarihi):** VOD, video ve popout sohbet sayfalarında kanal adının boş kalmasından kaynaklanan bilgi çekememe hatası giderildi (`sayfaSlug() || scMevcutKanal() || scKanal`). Kanal API'sine ek olarak doğrudan kullanıcı API fallback'i eklendi.
- **💬 Kart Sohbeti (Son Mesajlar):** Profil kartı açıldığında kullanıcının sohbete attığı son mesajlar ve ona yazılan yanıtlar sekmesi stabil hale getirildi.
- **📝 Kullanıcı Notları:** Not kutusunun `undefined` / `false` kontrolü onarıldı, karttaki yerleşimi sekme bloğunun hemen üstüne sabitlendi ve ayar açılıp kapandığında anında canlı karta yansıtılması sağlandı.

---

## 🚀 [10.19.2] - 2026-09-05 (Eklenti Menüsü & Panel Arkaplan Düzeltmesi)

### 🎨 Kritik Arayüz & Görünüm Düzeltmeleri
- **🛡️ Eklenti Yönetim Paneli Arkaplanı Düzeltildi:** PureKick yönetim panelinin (`#pk-panel`) ve sohbet içi ayar panelinin (`#pk-ayar-panel`) arkaplanının şeffaflaşması, sol menü ve içerik kartlarının arkasındaki yayının görünmesi sorunu giderildi.
  - Panellere garantili koyu tema zemini (`#0e1012 !important` ve `#171a1c !important`), opak kart zeminleri ve belirgin derinlik gölgeleri eklendi.
- **🛡️ Aydınlık Tema & OLED Mod İzolasyonu:** Aydınlık tema (`pkAydinlikTemaUygula`) ve OLED mod stillerinin PureKick'in kendi yönetim panellerindeki metinleri ve butonları beyaza/şeffafa boyayarak menüyü bozması engellendi; PureKick panelleri bu global kurallardan tamamen muaf tutuldu.

---

## 🚀 [10.19.1] - 2026-09-05 (Susturmalar, Moderatör İkonları & Canlı Bağış/Kicks Düzeltmesi)

### 🛠️ Kritik Düzeltmeler & Geliştirmeler
- **🚫 Susturmalar Sekmesi Kullanıcı İsmi:** Susturulan kullanıcı ismi soluk metinden kurtarılıp canlı kırmızı ceza rozeti (`MOD_RENK_CEZA`), büyük kalın yazı ve `🚫 Susturuldu` etiketiyle belirginleştirildi.
- **🛡️👑🤖 Moderasyon Yapan Kişi İkonları:** Moderasyon ve silinen mesajlar listesinde işlemi yapan kişinin kimliğine göre özel rol simgesi eklendi:
  - Moderatör ise: `🛡️` simgesi
  - Kanal yayıncısı ise: `👑` simgesi
  - Bot / AiMod ise: `🤖` simgesi
- **💰 Bağış & Kicks İstatistik Motoru Tamamen Onarıldı:**
  - **Pusher WebSocket Entegrasyonu:** `GiftedSubscriptionsEvent`, `SubscriptionEvent`, `LuckyUsersWhoGotGiftSubscriptionsEvent` ve `LivestreamReactionEvent` (Kicks) olayları doğrudan Kick'in yerel soketinden dinlenerek izole dünyaya anlık aktarılmaya başlandı.
  - **Kapsam Çakışması Giderildi:** Dosya içinde closure içinde kalarak ezilen ve listenin boş kalmasına neden olan mükerrer `pkBagisVeri` bloğu temizlendi; veriler küresel alana taşındı.
  - **Zengin DOM Algılama:** Kick sohbetinde Kicks rozetleri, hediye kartları ve sistem mesajları doğrudan DOM element semantiği taranarak eksiksiz listeleniyor.

---

## 🚀 [10.19.0] - 2026-09-01 (Mega Fonksiyonel Güncelleme)

### ✨ Yeni Fonksiyonel Özellikler
- **💰 Canlı Bağış, Kicks & Abonelik Takipçisi (Donation & Subs Audit):**
  - Yayında gerçekleşen tüm bireysel abonelikler (`Abone`), hediye abonelikler (`Gift Sub`), `Kicks` bağışları, doğrudan para bağışları (`$ / € / ₺`) ve sesli uyarıları (`Blerp`) anlık algılama.
  - **Tarih & Zaman Damgalı Liste:** Kim abone oldu, ne kadar bağış/kicks attı `YYYY-MM-DD HH:MM:SS` formatında canlı akış tablosunda listelenir.
  - **Lider Tablosu:** En çok destek olan ilk 15 izleyici destek rozetleriyle (`🎁 hediye`, `🪙 kicks`, `💵 bağış`) sıralanır.
  - **Kanal Bazlı Dışa Aktarma:** Tek tıkla ilgili kanal adına özel `CSV` ve `TXT` detaylı rapor indirme (`kick_{kanal}_bagis_kicks_{tarih}.csv / .txt`).
- **⏱️ Akıllı Zaman Damgası & Yer İmi Sistemi (Stream Bookmarks):**
  - Yayın sırasında ilginç anları `Alt + B` kısayolu veya video kontrol çubuğundaki `[⏱️ Yer İmi]` butonuyla anında not alarak işaretleyebilme.
  - Açılır panelde tüm yer imlerini listeleme, VOD izlerken tek tıkla o saniyeye zıplama (`⏩ Git`) ve yer imlerini `CSV` olarak dışa aktarma.
- **📊 Canlı Sohbet Aktivite Grafiği (Real-Time Chat Activity Graph):**
  - İstatistik panelinde son 20 dakikalık sohbet mesaj yoğunluğunu (`msg/dk`) çizen SVG canlı çizgi grafiği.
  - Zirve anları (`🔥 Peak: 140 msg/dk`) otomatik algılanarak parlak sarı ibreyle işaretlenir.
- **🤖 Akıllı Sohbet Kuralları & Kişisel Oto-Yanıt (Chat Auto-Responder):**
  - Sohbette belirlenen tetikleyicilere (`!dc`, `!setup`, `!sosyal`) 45 saniyelik anti-spam korumasıyla otomatik hazır yanıt gönderme.

### 🛠️ Kritik Düzeltmeler & İyileştirmeler
- **🎙️ Canlı Altyazı Konumlandırma Düzeltildi:** Altyazı kutusunun video oynatıcı konteynerinde kaybolması engellendi, `position: relative` ve `bottom: 60px` ile oynatıcı üzerinde net şekilde görünmesi sağlandı.
- **💰 Bağış & Kicks İstatistikleri İzolasyonu:** Bağış ve hediye abonelikler sekmesi `mesajlar` sekmesinden tamamen ayrı bağımsız bir bloğa dönüştürüldü.
- **🔍 Sohbet Arama & Filtre Barı Odaklanması:** Filtre çubuğu genel sayfadan alınıp tam olarak aktif chatbox (`#chatroom-messages`) üzerine yapışkan (`sticky`) olarak entegre edildi.
- **🛡️ Moderasyon Olayları & Kullanıcı Renklendirmesi:** Ban, susturma (Mute), link/mesaj silme olaylarında hedef kullanıcı isimleri (`pk-mod-hedef-user`) kırmızı/sarı etiketle, işlemi yapan moderatör isimleri ise mor/yeşil parıltılı rozetle (`pk-mod-actor-badge`) renklendirildi.

---

## 🔧 [10.18.1] - 2026-08-31 (Hotfix — Bellek Sızıntısı & Performans)

### 🚨 Kritik Düzeltmeler (Memory Leak Fix)
- **`window.addEventListener` Sızıntısı Giderildi:** `mousemove` ve `mouseup` dinleyicileri her 2 saniyede bir tekrar eklenerek binlerce mükerrer dinleyici birikiyordu. Singleton bayrak (`__pkZoomWindowBound`) ile yalnızca **1 kez** bağlanması garanti altına alındı.
- **MutationObserver DOM Referans Sızıntısı Giderildi:** Sohbet mesajlarını analiz eden `pkHypeObs` gözlemcisi `node` DOM referanslarını bellekte tutarak Garbage Collector'ün çalışmasını engelliyordu. DOM referansı kaldırıldı, yalnızca `string` (max 300 karakter) alınıyor.
- **`pkSohbetIsimEfektleriUygula` Optimize Edildi:** Her 2 saniyede tüm sohbet DOM'unu baştan tarayan fonksiyon, `:not([data-pk-efekt-scanned])` seçicisiyle **yalnızca yeni mesajları** tarayacak şekilde hafifletildi.
- **`pkSohbetCeviriButonlariKur` Optimize Edildi:** Çeviri butonları da aynı mantıkla `:not([data-pk-cevrildi])` seçicisiyle sadece işlenmemiş satırlara ekleniyor.
- **Dizi & Nesne Boyut Limitleri:** `pkBagisVeri.gecmis` limiti 100→50'ye düşürüldü, `bagiscilar` nesnesi max 30 kişiyle sınırlandırıldı.

### ⚡ Performans İyileştirmeleri
- **Periyodik Döngü İkiye Bölündü:**
  - **Hafif döngü (2s):** Yalnızca CSS/stil güncellemeleri (filtre, OLED, tema, font).
  - **Ağır döngü (5s):** DOM tarama gerektiren kurulum işleri (çeviri butonları, efektler, zoom, hype, altyazı).
- **Otomatik Bellek Temizleyici (3 dk):** Her 3 dakikada bir eski ve kullanılmayan veri nesnelerini budayan periyodik çöp toplayıcı eklendi.

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
