/*!
 * PureKick — ad blocker and chat toolkit for Kick.com
 * Copyright (c) 2026 CodeBB. All rights reserved.
 *
 * SPDX-License-Identifier: LicenseRef-PureKick-Proprietary
 *
 * Proprietary software. Copying, modification, distribution, reverse
 * engineering and republication are prohibited without written permission.
 * See LICENSE. Removing this notice is a separate violation under
 * 17 U.S.C. § 1202.
 *
 * Contact: info@codebb.co
 */
/*
 * background.js — MV3 service worker.
 * Ayarlar + istatistik yönetimi. Eklenti kurulur kurulmaz OTOMATİK aktif çalışır
 * (consented:true varsayılan) — ayrı onay ekranı yok. Veri toplanmaz; her şey yerel.
 */

/* 10.5: sohbet özellikleri de buraya eklendi — content.js'teki DEFAULTS ile
   birebir aynı olmalı, yoksa `getState` eksik anahtar döner ve panel ilk
   açılışta yanlış durum gösterir. */
var DEFAULT_SETTINGS = {
  aiMod: true, baglantiDurum: true, bahsedilme: true, bahsetRozet: true,
  bahsetSes: false, bahsetSesTon: 'cinlama', bahsetSesSeviye: 60,
  bahsetTikla: true, banDetay: true,
  banSablon: false, bindir: false, bindirBoy: 55, bindirKonum: 'sol-alt', bindirSaydam: 90,
  blockDom: true, blockVideoAds: true, blockVodAds: true, botYoksay: true, consented: true,
  /* KAPALI BAŞLIYOR (opt-in): hesabın adına Kick'e istek atan tek özellik bu.
     Kullanıcı bilmeden ödül talep etmek sürpriz olurdu; açan bilerek açsın. */
  otoClaim: false,
  kartGenis: true,
  crossBan: false,
  topluTo: false,
  topluSil: false,
  otoMesaj: false,
  ekranGoruntusu: true, emoteOniz: true, enabled: true, gizleIkonu: false, gorselBuyut: true,
  hizliMod: false, istatistik: true, kartBilgi: true, kartSagTik: false,
  kartTakipci: true, kartMesajlar: true, kategoriGizle: true, kisiGizle: true,
  mentionAd: '', mesajEylem: true, modGunluk: true, modSerit: true, modSohbette: true, notlar: true,
  kelimeVurgu: true, oncelik: true, onizleme: true, otoKalite: '1080', otoSes: 'oto', otoTiyatro: false, rolVurgu: true,
  hakkindaEk: true, kenarGrup: true, kuralKabul: false, sabitKanal: true, sagTik: false, scEtiket: true, scFiltreCubugu: true, scSayac: true, sekmeIci: true, showBadge: true, silinenGoster: true, ssBirincil: 'indir',
  ssIkincil: 'pano', tamEkranSon: true, temizlemeKoru: false, tiyatroNav: false, uyarHiz: true,
  videoIstat: true, yanSohbet: true,
  /* 10.16 Yenilikleri */
  yayinBildirim: true, sohbetFiltre: true, klipSure: 30, klipFormat: 'webm',
  sohbetTts: false, ttsSes: 'oto', ttsHiz: 1, ttsSesSeviye: 80, ttsYalnizcaBahsetme: true,
  emoteSpamFiltre: true, izlemeSureTakip: true, kanalNotlari: true, hizliModGoster: true,
  cokluYayin: true,
  /* 10.17 Gelişmiş Özellikler */
  pipMod: true, sesYukseltici: 100, videoParlaklik: 100, videoKontrast: 100, videoDoygunluk: 100,
  oledMod: false, sohbetSekmeler: true, sohbetDondur: true, guvenliLinkKalkan: true,
  sohbetFontBoyut: 'orta', sohbetFontFamily: 'varsayilan',
  sohbetCeviri: true, ceviriDili: 'tr', otomatikCevir: false, kaynakDil: 'auto', ceviriModu: 'oto',
  /* 10.18 Mega Yenilikler */
  anaSayfaOtoDurdur: false, kenarCevrimdisiGizle: false, videoTiklaDurdur: true,
  ssKisakol: 'Alt+S', klipKisakol: 'Alt+K', sadeceSesModu: false,
  canliAltyazi: false, sesliDublaj: false,
  altyaziKaynakDil: 'auto', altyaziHedefDil: 'tr',
  altyaziFontBoyut: 16, altyaziRenk: '#facc15', altyaziKalinlik: '700', altyaziBgOpaklik: 75, altyaziKonum: 'alt',
  holoKartEfekt: 'pikachu', kartTipi: 'koleksiyon', koleksiyonKartDosya: 'card_1.jpg', ozelKartUrl: '', profilKartBase64: '',
  aydinlikTema: false, emoteBoyut: 36,
  videoZoom: true, hypeOlcer: true, aiYayinOzet: true
};
var DEFAULT_STATS = { domHidden: 0, videoAdsBlocked: 0 };

function getLocal(key, fallback) {
  return chrome.storage.local.get(key).then(function (res) { return Object.assign({}, fallback, res[key] || {}); });
}
function getSettings() {
  return chrome.storage.local.get('settings').then(function (res) {
    var loc = res && res.settings;
    if (loc && Object.keys(loc).length > 0) return Object.assign({}, DEFAULT_SETTINGS, loc);
    // Local boşsa online / cloud sync'ten oku
    return chrome.storage.sync.get('settings').then(function (sRes) {
      var syn = sRes && sRes.settings;
      return Object.assign({}, DEFAULT_SETTINGS, syn || {});
    }).catch(function () { return Object.assign({}, DEFAULT_SETTINGS); });
  });
}
function getStats() { return getLocal('stats', DEFAULT_STATS); }

// DNR reklam kuralları yalnızca onay + etkin durumda açık kalır.
function syncRuleset() {
  return getSettings().then(function (s) {
    var on = s.consented && s.enabled;
    try {
      return chrome.declarativeNetRequest.updateEnabledRulesets(
        on ? { enableRulesetIds: ['ad_rules'] } : { disableRulesetIds: ['ad_rules'] }
      );
    } catch (e) {}
  }).catch(function () {});
}

function updateBadge() { chrome.action.setBadgeText({ text: '' }); }

/* ==================== Kick Drops — aktif kampanyalar ====================
 * Kick'in kendi herkese açık uç noktası. Çerez/oturum GÖNDERİLMEZ
 * (credentials:'omit') — giriş gerektirmiyor, kullanıcı kimliği paylaşılmaz.
 * Sonuç yerelde önbelleklenir; API gereksiz yorulmaz.
 */
var DROPS_API = 'https://web.kick.com/api/v1/drops/campaigns';
var DROPS_TTL = 30 * 60 * 1000; // 30 dk
var EMPTY_DROPS = { active: [], fetchedAt: 0 };

// Kampanya görseli: önce oyun (kategori) görseli, sonra ödül görseli, sonra
// organizasyon logosu. Hiçbiri yoksa boş → arayüz 🎁 emoji rozetine düşer.
function dropImg(c) {
  if (c.category && c.category.image_url) return c.category.image_url;
  var rw = c.rewards && c.rewards[0];
  if (rw && rw.image_url) return 'https://ext.cdn.kick.com/' + rw.image_url + '?width=128,format=webp,quality=75';
  if (c.organization && c.organization.logo_url) return c.organization.logo_url;
  return '';
}

function fetchDrops() {
  return fetch(DROPS_API, { credentials: 'omit', cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var now = Date.now();
      var active = ((j && j.data) || [])
        .filter(function (c) {
          if (!c || c.status !== 'active') return false;
          var end = Date.parse(c.ends_at);
          return !isFinite(end) || end > now;
        })
        .map(function (c) {
          return {
            id: c.id,
            name: c.name || '',
            category: (c.category && c.category.name) || '',
            endsAt: c.ends_at || '',
            rewards: (c.rewards || []).length,
            channel: (c.channels && c.channels[0] && c.channels[0].slug) || '',
            image: dropImg(c)
          };
        })
        .sort(function (a, b) { return Date.parse(a.endsAt) - Date.parse(b.endsAt); }); // en yakın biten önce
      var payload = { active: active, fetchedAt: now };
      chrome.storage.local.set({ drops: payload });
      return payload;
    })
    .catch(function () { return null; });
}

function getDrops(force) {
  return chrome.storage.local.get('drops').then(function (res) {
    var c = res.drops;
    if (!force && c && (Date.now() - c.fetchedAt) < DROPS_TTL) return c;
    return fetchDrops().then(function (fresh) { return fresh || c || EMPTY_DROPS; });
  }).catch(function () { return EMPTY_DROPS; });
}

/* ==================== Chat rozetleri — uzaktan yönetilen liste ====================
 * Liste artık PureKick web panelinden (purekick.pumpzera.cc) çekilir. Admin panelden
 * badge ekle/çıkar/ata → tüm kullanıcılarda ~TTL içinde otomatik yansır.
 * Kullanıcı verisi GÖNDERİLMEZ — sadece bir liste İNDİRİLİR (config, kod değil).
 * API CORS '*' verdiği için host izni gerekmez.
 */
var BADGES_URL = 'https://purekick.pumpzera.cc/api/badges.php';
/* 10.5: 6 SAAT. Sunucuya giden tek veri isteği bu. İçerik scripti de 6 saatte
   bir soruyor, service worker önbelleği 6 saat tutuyor, tarayıcının kendi HTTP
   önbelleği de sunucunun `max-age`'i kadar. Üç katman üst üste bindiği için
   tarayıcı başına günde birkaç denemeden fazlası ağa çıkmıyor. */
var BADGES_TTL = 6 * 60 * 60 * 1000;
var EMPTY_BADGES = { badges: {}, frames: {}, users: [], fetchedAt: 0 };

// Bir görseli data-URI'ye çevirir (PNG/GIF/WEBP…). Böylece içerik scriptine görsel
// gömülü gelir → sayfada ağ beklemeden ANLIK basılır, sonradan yüklenme olmaz.
// Çok büyükse (mesaj şişmesin) gömmeyiz; o durumda URL'den yüklenir + preload devreye girer.
function fetchAsDataURL(url) {
  return fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error('bad')); })
    .then(function (blob) {
      if (!blob || blob.size > 1500000) return null;
      return blob.arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf), bin = '', CH = 0x8000;
        for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        return 'data:' + (blob.type || 'image/png') + ';base64,' + btoa(bin);
      });
    })
    .catch(function () { return null; });
}

// TANIMLAR + TAM KULLANICI LİSTESİ tek istekte (10.2'de eski yapıya dönüldü).
// 'names' parametresi GÖNDERİLMEZ → server legacy yolu kullanır ve rozeti olan tüm
// kullanıcıları döner. Liste 5 dk önbelleklenir; böylece sohbette rozetler AĞ
// BEKLEMEDEN anında basılır (sorgu modunda her yeni ad için ~1sn'lik gecikme oluyordu).
// `cache: 'no-store'` idi → tarayıcının kendi HTTP önbelleği DEVRE DIŞI kalıyordu,
// sunucunun gönderdiği `Cache-Control: max-age` hiçbir işe yaramıyordu. 'default' ile
// aynı yanıt TTL boyunca diskten okunur; sunucuya çıkılmaz (429 yükünü düşürür).
function fetchBadges() {
  return fetch(BADGES_URL, { cache: 'default', credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || typeof j !== 'object') return null;
      var badges = (j.badges && typeof j.badges === 'object') ? j.badges : {};
      var keys = Object.keys(badges);
      // Tüm rozet görsellerini data-URI'ye göm (GIF dahil) → içerikte anlık, sonradan yüklenme yok.
      return Promise.all(keys.map(function (k) {
        var url = badges[k] && badges[k].image;
        if (!url) return Promise.resolve();
        return fetchAsDataURL(url).then(function (d) { if (d) badges[k].img = d; });
      })).then(function () {
        // `frames`: profil çerçevesi tanımları (sunucu vermezse boş → özellik kapalı)
        var payload = { badges: badges, frames: (j.frames && typeof j.frames === 'object') ? j.frames : {},
                        users: (Array.isArray(j.users) ? j.users : []), fetchedAt: Date.now() };
        chrome.storage.local.set({ badges: payload });
        return payload;
      });
    })
    .catch(function () { return null; });
}

function getBadges(force) {
  return chrome.storage.local.get('badges').then(function (res) {
    var c = res.badges;
    if (force) return fetchBadges().then(function (fresh) { return fresh || c || EMPTY_BADGES; });
    if (c && (Date.now() - c.fetchedAt) < BADGES_TTL) return c;   // taze → direkt
    if (c) { fetchBadges(); return c; }                          // bayat ama VAR → hemen döndür, arkada tazele (SWR): chate girince beklemesin
    return fetchBadges().then(function (fresh) { return fresh || EMPTY_BADGES; }); // hiç yok → çek
  }).catch(function () { return EMPTY_BADGES; });
}

// LOOKUP: yalnızca GÖRÜNEN kullanıcı adlarının badge'lerini sorar (mahremiyet: tam liste
// indirilmez). form-urlencoded POST → CORS "basit istek", preflight yok, ACAO:* ile çalışır.
// Eski server 'names'i yok sayıp tam liste dönse de sorun değil (yeni istemci onu da işler);
// yeni server + config bayrağı kapandığında yalnızca sorulan adlar döner.
function lookupBadges(names) {
  if (!Array.isArray(names) || !names.length) return Promise.resolve([]);
  var list = names.slice(0, 300).join(',');
  return fetch(BADGES_URL, {
    method: 'POST', cache: 'no-store', credentials: 'omit',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'names=' + encodeURIComponent(list)
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { return (j && Array.isArray(j.users)) ? j.users : []; })
    .catch(function () { return []; });
}

/* Menü CTA duyurusu KALDIRILDI (10.2.1): bildirim yalnızca Drops'a bağlı.
   Buradaki fetch `/api/announce.php` adresine gidiyordu — o uç sunucudan
   silindiği için kod dursa 404 üretecekti. Duyuruya ait tüm alanlar
   (announce/seenAnnounceVer) hem burada hem content.js'te temizlendi. */

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.storage.local.get(['settings', 'stats', 'pkYeni']).then(function (res) {
    var patch = {};
    if (!res.settings) patch.settings = DEFAULT_SETTINGS;
    else if (!res.settings.consented) patch.settings = Object.assign({}, res.settings, { consented: true }); // eski kullanıcıları da otomatik aktif et (onay ekranı kaldırıldı)
    if (!res.stats) patch.stats = DEFAULT_STATS;
    /* YENİLİK NOKTALARI — "ilk kurulum mu, güncelleme mi" burada belli oluyor.
       İçerik betiği bunu tek başına ayırt EDEMEZ: bu özellikten önceki
       sürümlerden gelen kullanıcıda da kayıt yok, yani ikisi de "kayıt yok"
       görünüyordu ve 17 binlik mevcut kitleye hiç nokta çıkmayacaktı.
       `details.reason` kesin cevabı veriyor: 'install' temiz kurulum,
       'update' güncelleme. Yalnız kayıt YOKSA yazıyoruz — güncelleme
       geçmişini ezmeyelim. */
    if (!res.pkYeni && details && details.reason === 'install') {
      patch.pkYeni = { sur: 'kurulum', gor: [], temiz: true };
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
    syncRuleset();
    updateBadge();
    // Yeniden yükleme/güncelleme sonrası rozet listesini TAZE çek (önbelleği atla) →
    // GitHub'daki değişiklik hemen görünür, test kolaylaşır.
    getSettings().then(function (s) { if (s.consented) { fetchBadges(); sendHeartbeat(); } });
  });
});

/* ARAÇ ÇUBUĞU SİMGESİ. Popup kaldırıldı (sürüm notları, yardım ve aç/kapa
   zaten yönetim panelinde). Tıklama sayfadaki paneli açıyor.

   URL'e BAKMIYORUZ, mesaj gönderip sonucuna bakıyoruz: URL denetimi iki
   yerde yanılır — içerik betiği henüz yüklenmemiş Kick sekmesinde, ve host
   izni olmayan sekmelerde `tab.url` zaten `undefined` gelir. */
chrome.action.onClicked.addListener(function (tab) {
  if (!tab || tab.id == null) return;
  function kickAc() {
    try { chrome.tabs.create({ url: 'https://kick.com/' }); } catch (e) {}
  }
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'pkPanelAc' }, function (cvp) {
      /* `lastError` okunmazsa konsola uyarı düşer; ayrıca alıcı yoksa
         cevap `undefined` gelir — ikisini de Kick'te değiliz sayıyoruz. */
      var yok = chrome.runtime.lastError || !cvp;
      if (yok) kickAc();
    });
  } catch (e) { kickAc(); }
});

/* ══════════════════════════════════════════════════════════════════════════
 * KICK GÜNLÜK ÖDÜLÜ — otomatik alma
 *
 * Uç noktalar (kullanıcının kendi betiğinde canlı doğrulanmış):
 *   GET  /api/v1/gamification/challenges          -> data[] {id,condition,status,recurrence}
 *   POST /api/v1/gamification/challenges/{id}/claim
 * İkisi de `web.kick.com` altında ve Bearer + `x-app-platform: web` istiyor.
 *
 * NEDEN ARKA PLANDA: `web.kick.com` içerik betiği için ÇAPRAZ KÖKEN; MV3'te
 * içerik betiği istekleri sayfanın CORS kurallarına tabi. Arka plan ise
 * `host_permissions` sayesinde doğrudan çağırabiliyor.
 * JETON içerik betiğinden geliyor: çerezi okumak `document.cookie` istiyor,
 * `cookies` izni eklemek mağazada yeni izin uyarısı çıkarırdı.
 * ══════════════════════════════════════════════════════════════════════════ */
var ODUL_UC = 'https://web.kick.com/api/v1/gamification/challenges';
var ODUL_ARA = 4 * 60 * 1000;               // aynı sekmeden daha sık sorma
var odulSon = 0;

function odulBaslik(jeton) {
  return { 'Accept': 'application/json', 'x-app-platform': 'web',
           'Authorization': 'Bearer ' + jeton };
}

function odulAl(jeton) {
  if (!jeton) return Promise.resolve({ durum: 'jetonyok' });
  return fetch(ODUL_UC, { credentials: 'include', cache: 'no-store', headers: odulBaslik(jeton) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var d = (j && j.data) || [];
      /* Yalnız GÜNLÜK + İZLEME SÜRESİ görevi. Diğer görevler (davet, abone
         olma vb.) kullanıcının kendi eylemini gerektiriyor; onlara
         dokunmuyoruz — sadece izleyerek hak edilmiş olanı alıyoruz. */
      var g = [];
      for (var i = 0; i < d.length; i++) {
        var c = d[i];
        if (c && c.recurrence === 'daily' && c.condition && c.condition.type === 'watch_time_minutes') g.push(c);
      }
      if (!g.length) return { durum: 'yok' };
      g.sort(function (a, b) {
        return (a.condition.threshold - a.condition.progress) - (b.condition.threshold - b.condition.progress);
      });
      var c0 = g[0], st = String(c0.status || '').toLowerCase();
      var ilerleme = parseInt(c0.condition.progress, 10) || 0;
      var hedef = parseInt(c0.condition.threshold, 10) || 0;
      if (st === 'claimed' || st === 'redeemed') return { durum: 'alindi', ilerleme: hedef, hedef: hedef };
      var hazir = (hedef > 0 && ilerleme >= hedef) ||
        ['claimable', 'ready', 'claim_available', 'completed'].indexOf(st) >= 0;
      if (!hazir) return { durum: 'bekliyor', ilerleme: ilerleme, hedef: hedef };
      return fetch(ODUL_UC + '/' + encodeURIComponent(c0.id) + '/claim', {
        method: 'POST', credentials: 'include',
        headers: Object.assign({ 'Content-Type': 'application/json' }, odulBaslik(jeton)),
        body: '{}'
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j2) {
          if (r.ok) return { durum: 'yeni', ilerleme: hedef, hedef: hedef };
          /* "already claimed" bir hata değil: başka bir sekme almış olabilir. */
          var ay = String((j2 && j2.data && j2.data.details) || '').toLowerCase();
          if (ay.indexOf('already') >= 0 || ay.indexOf('claimed') >= 0)
            return { durum: 'alindi', ilerleme: hedef, hedef: hedef };
          return { durum: 'bekliyor', ilerleme: ilerleme, hedef: hedef };
        });
      });
    })
    .catch(function () { return { durum: 'hata' }; });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) { sendResponse({}); return false; }

  if (msg.type === 'stat') {
    getStats().then(function (st) {
      if (msg.kind === 'dom') st.domHidden += msg.count || 0;
      else if (msg.kind === 'video') st.videoAdsBlocked += msg.count || 0;
      return chrome.storage.local.set({ stats: st });
    }).then(function () { sendResponse({ ok: true }); });
    return true;
  }

  /* Panelde Abonelik sayfası açıldı → durumu ŞİMDİ tazele. 6 saatlik heartbeat
     turunu beklersek elle verilen abonelik ya da yeni ödeme yarım gün boyunca
     "Abone Ol" olarak görünürdü. Yanıt storage'a yazılıyor, panel oradan okuyor. */
  if (msg.type === 'pk-abone-tazele') {
    sendHeartbeat(true);
    sendResponse({ ok: true });
    return false;
  }

  /* İçerik betiği jetonu getiriyor, biz sorup gerekiyorsa alıyoruz.
     `zorla` yalnız kullanıcı ayarı açtığında: o an sonucu görsün. */
  if (msg.type === 'pk-odul') {
    getSettings().then(function (s) {
      if (!s.consented || s.otoClaim !== true) { sendResponse({ durum: 'kapali' }); return null; }
      if (!msg.zorla && Date.now() - odulSon < ODUL_ARA) { sendResponse({ durum: 'erken' }); return null; }
      odulSon = Date.now();
      return odulAl(msg.jeton).then(function (o) {
        try { chrome.storage.local.set({ pkOdul: Object.assign({ ts: Date.now() }, o) }); } catch (e) {}
        sendResponse(o);
      });
    }).catch(function () { sendResponse({ durum: 'hata' }); });
    return true;
  }

  if (msg.type === 'getState') {
    Promise.all([getSettings(), getStats()]).then(function (arr) { sendResponse({ settings: arr[0], stats: arr[1] }); });
    return true;
  }

  if (msg.type === 'setSettings') {
    getSettings().then(function (s) {
      var next = Object.assign({}, s, msg.payload || {});
      // Online/Cloud Sync için büyük Base64'ü ayır
      var syncNext = Object.assign({}, next);
      if (syncNext.profilKartBase64 && syncNext.profilKartBase64.length > 8000) {
        delete syncNext.profilKartBase64; // sync kotasını koru
      }
      try { chrome.storage.sync.set({ settings: syncNext }).catch(function () {}); } catch (e) {}
      return chrome.storage.local.set({ settings: next }).then(function () { return next; });
    }).then(function (next) { syncRuleset(); sendResponse({ settings: next }); });
    return true;
  }

  // Tek-seferlik onay: Privacy & Terms kabul edildi → etkinleştir + DNR aç
  if (msg.type === 'acceptConsent') {
    getSettings().then(function (s) {
      var next = Object.assign({}, s, { consented: true, enabled: true });
      return chrome.storage.local.set({ settings: next }).then(function () { return next; });
    }).then(function (next) { syncRuleset(); sendResponse({ settings: next }); });
    return true;
  }

  // Aktif Drop kampanyaları — onaysız/pasifken hiç ağ isteği yapılmaz.
  if (msg.type === 'getDrops') {
    getSettings().then(function (s) {
      if (!(s.consented && s.enabled)) return EMPTY_DROPS;
      return getDrops(!!msg.force);
    }).then(function (d) { sendResponse(d || EMPTY_DROPS); });
    return true;
  }

  // Badge TANIMLARI (defs + görseller) — onay verilmeden çekilmez. Kullanıcı verisi içermez.
  if (msg.type === 'getBadges') {
    getSettings().then(function (s) {
      if (!s.consented) return EMPTY_BADGES;
      return getBadges(!!msg.force);
    }).then(function (d) { sendResponse(d || EMPTY_BADGES); });
    return true;
  }

  // Badge SORGUSU — yalnızca sayfada görünen kullanıcı adlarının rozetleri (mahremiyet).
  if (msg.type === 'lookupBadges') {
    getSettings().then(function (s) {
      if (!s.consented) return [];
      return lookupBadges(msg.names);
    }).then(function (u) { sendResponse(u || []); });
    return true;
  }

  if (msg.type === 'resetStats') {
    var fresh = Object.assign({}, DEFAULT_STATS);
    chrome.storage.local.set({ stats: fresh }).then(function () { sendResponse({ stats: fresh }); });
    return true;
  }

  sendResponse({});
  return false;
});

syncRuleset();
updateBadge();

/* ============ PureKick web bağlantısı: linking + heartbeat ============
 * Kullanıcı purekick.pumpzera.cc'de Kick ile giriş yapınca site eklentiye
 * {kick_id, token} yollar (externally_connectable). Eklenti bunu saklar ve
 * periyodik "buradayım" (heartbeat) atar → supporter (eklenti-varlığı) badge'i
 * aktif kalır; eklenti silinince heartbeat durur → badge düşer.
 */
var HEARTBEAT_URL = 'https://purekick.pumpzera.cc/api/heartbeat.php';

/* SUNUCU YÜKÜ DÜZELTMESİ (429): bu fonksiyon service worker HER UYANDIĞINDA
   çağrılıyordu (aşağıdaki düz `sendHeartbeat()` satırı). MV3'te SW herhangi bir
   mesajda uyanır, yani dakikada birkaç kez POST gidebiliyordu. Artık son
   gönderim zamanı saklanıyor ve 25 dakikadan sık gönderilmiyor.
   `zorla` yalnızca hesap yeni bağlandığında kullanılır (anında doğrulansın). */
/* 25 dk idi -> 6 SAAT. Rozet TTL'i sunucuda 3 GUN (heartbeat_ttl_days), yani
   "buradayim" demek icin saatte iki kez sinyal gondermenin hicbir faydasi yok;
   gunde 4 sinyal 3 gunluk pencereyi fazlasiyla acik tutar. Bagli kullanici
   basina gunluk istek 48'den 4'e iner — cache'lenemeyen (yazma) tek uc nokta
   burasi oldugu icin sunucuya kalan yukun buyuk kismi bu. */
var HEARTBEAT_ARA = 6 * 60 * 60 * 1000;

function sendHeartbeat(zorla) {
  Promise.all([getSettings(), chrome.storage.local.get(['pkLink', 'hbLast'])]).then(function (a) {
    var s = a[0], d = a[1] || {}, link = d.pkLink;
    if (!s.consented || !link || !link.token || !link.kick_id) return;
    var son = d.hbLast || 0;
    if (!zorla && (Date.now() - son) < HEARTBEAT_ARA) return;   // çok erken → gönderme
    chrome.storage.local.set({ hbLast: Date.now() });
    /* JSON gövde "basit istek" sayılmaz → tarayıcı önce OPTIONS (preflight) atar,
       yani her heartbeat sunucuya İKİ istek olur. form-urlencoded ile preflight
       kalkar, tek isteğe iner. Sunucu her iki biçimi de kabul ediyor. */
    fetch(HEARTBEAT_URL, {
      method: 'POST', credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'kick_id=' + encodeURIComponent(link.kick_id) + '&token=' + encodeURIComponent(link.token)
    })
      /* 10.15 — yanit artik KULLANICININ KENDI abonelik durumunu tasiyor
         (kimlik dogrulanmis uc nokta oldugu icin kisiye ozel veri donebiliyor).
         Panelde gostermek uzere sakliyoruz; okunamazsa eski deger kalir. */
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) return;
        chrome.storage.local.set({ pkAbone: {
          abone:  !!j.abone,
          ay:     parseInt(j.ay, 10) || 0,
          rozet:  String(j.rozet || ''),
          gecmis: !!j.gecmis,
          bitis:  String(j.bitis || ''),
          bas:    String(j.bas || ''),
          url:    String(j.patreon_url || j.url || ''),   // 10.15 sunucudan gelen katilma adresi
          ts:     Date.now()
        } });
      })
      .catch(function () {});
  }).catch(function () {});
}

// Site → eklenti: Kick hesabını eklentiye bağla (dashboard'dan gelir)
// NOT: Firefox externally_connectable/onMessageExternal desteklemez → orada tanımsız olur.
// Guard koymazsak Firefox'ta background çöker; bu yüzden varlığını kontrol ediyoruz.
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === 'pk-link' && msg.token && msg.kick_id) {
      chrome.storage.local.set({ pkLink: { kick_id: msg.kick_id, username: msg.username || '', token: msg.token } })
        .then(function () { sendHeartbeat(true); sendResponse({ ok: true }); });   // yeni bağlantı → hemen
      return true;                       // async yanıt
    }
    sendResponse({ ok: false });
    return false;
  });
}

/* ══════════════════════════════════════════════════════════════════════
 * OTOMATİK DUYURU — ZAMANLAYICI SERVICE WORKER'DA
 *
 * Duyuru zamanlayıcısı bot penceresinin (popout) içindeydi. Pencere arka
 * plana düşünce Chrome sayfa zamanlayıcısını kısıyor (gizli sayfada dakikada
 * bir), gerekirse sayfayı büsbütün donduruyor; kullanıcı 1 dakikaya ayarlı
 * duyurunun 7 dakika geciktiğini ölçtü. SW ALARMINA bu kısıt işlemiyor.
 *
 * İŞ BÖLÜMÜ:
 *   · Pencere (content.js) → "yaşıyorum" damgası + gönderim için gereken her
 *     şey: sohbet odası kimliği, oturum jetonu, metinler, aralık. `pkOmBot`
 *   · SW → sırayı ve son gönderim anını tutar, zamanı gelince gönderir.
 *     `pkOmDurum`  (AYRI ANAHTAR: pencere buraya hiç yazmıyor, yoksa iki
 *     yazar aynı alanı ezip duyuru iki kez giderdi.)
 *
 * SW belleği uçucu — boşta kalınca kapatılıyor, alarm uyandırıyor. Bu yüzden
 * bütün durum depoda; modül değişkeninde durum tutmak sessizce sıfırlanırdı.
 *
 * Pencere kapanınca kaydını siliyor (`pagehide`); silemeden kapanırsa damga
 * eskiyor ve burada düşürülüyor — bot ölü pencereye çalışmaya devam etmiyor.
 * ══════════════════════════════════════════════════════════════════════ */
const OM_BOT_OMUR = 300000;              // 5 dk; asıl sinyal pagehide, bu ağ

function omBotOku(anahtar) {
  return chrome.storage.local.get(anahtar)
    .then(function (r) { return (r && r[anahtar]) || {}; })
    .catch(function () { return {}; });
}

function omBotGonder(kayit, metin) {
  var bas = { accept: 'application/json', 'content-type': 'application/json' };
  if (kayit.jeton) bas.Authorization = 'Bearer ' + kayit.jeton;
  return fetch('https://kick.com/api/v2/messages/send/' + encodeURIComponent(kayit.oda),
               { method: 'POST', credentials: 'include', headers: bas,
                 body: JSON.stringify({ content: String(metin).slice(0, 500), type: 'message' }) })
    .catch(function () { return null; });
}

function omBotTur() {
  return Promise.all([omBotOku('pkOmBot'), omBotOku('pkOmDurum')]).then(function (ikili) {
    var bot = ikili[0], durum = ikili[1];
    var simdi = Date.now(), degisti = false;
    /* DURUM HEMEN SİLİNMİYOR. Kayıt bir an için kaybolabiliyor (depo yazma
       yarışı); hemen budayınca sayaç sıfırlanıp duyuru aralığı baştan
       başlıyordu — kullanıcı "başka sekmede gezinince bot duruyor" diye
       bildirdi. Bir saat dokunulmayan durum kaydı gerçekten ölüdür. */
    var OM_DURUM_OMUR = 3600000;
    Object.keys(durum).forEach(function (k) {
      if (bot[k]) return;
      if (simdi - ((durum[k] && durum[k].son) || 0) < OM_DURUM_OMUR) return;
      delete durum[k]; degisti = true;
    });
    Object.keys(bot).forEach(function (k) {
      var kayit = bot[k];
      if (!kayit || simdi - (kayit.beat || 0) > OM_BOT_OMUR) return;   // damga eskidi
      if (!kayit.oda || !kayit.metinler || !kayit.metinler.length) return;
      /* İLK GÖRÜŞTE GÖNDERİM YOK: ilk duyuru Kaydet'te zaten gitti, sayaç
         şimdiden işlemeye başlıyor. */
      if (!durum[k]) { durum[k] = { sira: 0, son: simdi }; degisti = true; return; }
      var st = durum[k];
      var ara = Math.max(1, kayit.dk || 10) * 60000;
      if (simdi - (st.son || 0) < ara) return;
      var metin = kayit.metinler[st.sira % kayit.metinler.length];
      st.sira = (st.sira + 1) % kayit.metinler.length;
      st.son = simdi;
      degisti = true;
      omBotGonder(kayit, metin);
    });
    if (!degisti) return null;
    return chrome.storage.local.set({ pkOmDurum: durum }).catch(function () {});
  }).catch(function () {});
}

try {
  /* En kısa alarm aralığı 1 dakika — en küçük duyuru aralığıyla aynı. */
  chrome.alarms.create('pk-om', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener(function (al) { if (al.name === 'pk-om') omBotTur(); });
} catch (e) {}

// Periyodik heartbeat (SW uyusa da alarm uyandırır)
try {
  chrome.alarms.create('pk-heartbeat', { periodInMinutes: 360 });   // 6 saat (bkz. HEARTBEAT_ARA)
  chrome.alarms.onAlarm.addListener(function (al) { if (al.name === 'pk-heartbeat') sendHeartbeat(); });
} catch (e) {}

/* ══════════════════════════════════════════════════════════════════════
 * CANLI YAYIN BİLDİRİMLERİ (Takip Edilen Kanallar)
 * ══════════════════════════════════════════════════════════════════════ */
var canliSonDurum = {}; // { slug: true/false }

function yayinlariKontrolEt() {
  getSettings().then(function (s) {
    if (!s.consented || !s.enabled || s.yayinBildirim === false) return;
    chrome.storage.local.get(['pkTakipKanallar', 'pkBildirimGecmis']).then(function (res) {
      var kanallar = res.pkTakipKanallar || [];
      if (!Array.isArray(kanallar) || !kanallar.length) return;
      
      kanallar.forEach(function (slug) {
        if (!slug || typeof slug !== 'string') return;
        slug = slug.toLowerCase().trim();
        fetch('https://kick.com/api/v2/channels/' + encodeURIComponent(slug), { credentials: 'omit', cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (ch) {
            if (!ch) return;
            var isLive = !!(ch.livestream && ch.livestream.is_live);
            var prevLive = canliSonDurum[slug];
            canliSonDurum[slug] = isLive;
            
            // Çevrimdışından canlıya geçtiyse bildirim gönder
            if (isLive && prevLive === false) {
              var baslik = (ch.user && ch.user.username) || slug;
              var kategori = (ch.livestream && ch.livestream.categories && ch.livestream.categories[0] && ch.livestream.categories[0].name) || '';
              var yayinBaslik = (ch.livestream && ch.livestream.session_title) || '';
              var mesaj = kategori ? (kategori + (yayinBaslik ? ' — ' + yayinBaslik : '')) : (yayinBaslik || 'Yayında!');
              
              var notifId = 'pk-live-' + slug + '-' + Date.now();
              try {
                chrome.notifications.create(notifId, {
                  type: 'basic',
                  iconUrl: (ch.user && ch.user.profile_pic) || 'icons/icon128.png',
                  title: baslik + ' şu anda canlı yayında! 🟢',
                  message: mesaj,
                  priority: 2
                });
              } catch (e) {}
            }
          })
          .catch(function () {});
      });
    });
  }).catch(function () {});
}

try {
  chrome.alarms.create('pk-yayin-kontrol', { periodInMinutes: 2 });
  chrome.alarms.onAlarm.addListener(function (al) {
    if (al.name === 'pk-yayin-kontrol') yayinlariKontrolEt();
  });
} catch (e) {}

if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener(function (notifId) {
    if (notifId.indexOf('pk-live-') === 0) {
      var parts = notifId.split('-');
      var slug = parts[2];
      if (slug) {
        try { chrome.tabs.create({ url: 'https://kick.com/' + encodeURIComponent(slug) }); } catch (e) {}
      }
    }
  });
}

chrome.runtime.onStartup.addListener(sendHeartbeat);
chrome.runtime.onStartup.addListener(yayinlariKontrolEt);
sendHeartbeat();                       // SW her uyandığında bir kez
