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
 * worker-hook.js  —  MAIN dünya, document_start.
 *
 * ÇÖZÜM: Reklamı silmek/gizlemek yerine, oynatıcıyı REKLAMSIZ akışa yönlendirir.
 *
 * Kick videoyu Amazon IVS ile bir Web Worker içinde oynatır. Reklamlar (SSAI),
 * oynatıcının kullandığı playback token'ında `aws:ads-opt-out=false` olduğu için
 * sunucuda akışa dikilir. Oysa Kick'in genel API'si (/api/v2/channels/<slug>)
 * `aws:ads-opt-out=true` olan REKLAMSIZ bir playback_url verir (abonelerin
 * gördüğü akışın aynısı).
 *
 * Bu katman IVS worker'ını sarmalayıp içine bir fetch kancası koyar; worker
 * ana (master) manifest'i çektiğinde onu reklamsız master ile değiştirir.
 * Sonrasında tüm media playlist ve segmentler reklamsız kaynaktan gelir →
 * donma/overlay olmadan gerçek yayın reklamsız akar.
 *
 * Ayrıca: .wasm isteklerini doğru adrese yönlendirir (blob worker'da bozulan
 * WASM yolunu düzeltir, olmazsa oynatma bozulur).
 *
 * GÜVENLİK: sadece amazon-ivs worker'ına dokunur; herhangi bir hata olursa
 * orijinal akışa düşer (oynatma bozulmaz); localStorage['__kab_video']==='0'
 * ise hiç sarmalamaz.
 */
/* Hata ayiklama ciktisi. Yayinda SESSIZ. Acmak icin konsolda: window.__pkDebug = true */
function pkLog() {
  try { if (window.__pkDebug) console.log.apply(console, ['[KAB]'].concat([].slice.call(arguments))); } catch (e) {}
}

(function () {
  'use strict';
  if (window.__kab_worker_hook) return;
  window.__kab_worker_hook = true;

  var pageNonce = null;   // content.js'ten (ISOLATED) gelen oturum jetonu; köprü doğrulaması için
  var pageEnabled = true; // canlı yayın reklamı ayarı (kab-cfg)
  try { pageEnabled = localStorage.getItem('__kab_video') === '1'; } catch (e) {}
  /* GEÇMİŞ YAYIN (VOD) için AYRI bayrak: mekanizması canlıdan tamamen farklı
     (SSAI ile akışa dikilmiş reklam), bu yüzden panelde de ayrı anahtarı var.
     Varsayılan açık — anahtar hiç yazılmamışsa ('0' değilse) engelleme çalışır. */
  var pageVod = true;
  try { pageVod = localStorage.getItem('__kab_vod') !== '0'; } catch (e) {}

  /* ══════════════════════════════════════════════════════════════════════
   * GEÇMİŞ YAYIN (VOD) REKLAMI  —  canlıdakinden TAMAMEN farklı çalışır.
   *
   * VOD'da reklam Google'dan gelmez; Kick'in kendi sunucusunda videonun
   * İÇİNE dikilir (SSAI), bu yüzden script/istek engellemek işe yaramaz:
   *
   *   POST web.kick.com/api/v1/stream/<uuid>/playback
   *     → playback_url.vod = web.kick.com/api/v1/stream/manifest.m3u8?init=…
   *     → varyantlar …/production-kick-vod/… (AWS MediaTailor)
   *     → media playlist'in BAŞINDA ~7sn reklam segmenti + DISCONTINUITY
   *
   * Çözüm: Kick'in kendi genel API'si aynı VOD'un REKLAMSIZ ham kaynağını
   * zaten veriyor (aboneye giden akışın aynısı, aynı süre, 1080p60'a kadar):
   *   kick.com/api/v2/channels/<slug>/videos → [i].source
   *     = stream.kick.com/…/media/hls/master.m3u8   (reklam yok, doğrulandı)
   *
   * Playback yanıtındaki `vod` alanını bu temiz kaynakla değiştiriyoruz →
   * oynatıcı dikilmiş manifesti HİÇ görmüyor. Bu istek worker'dan değil
   * SAYFADAN atıldığı için kanca burada (MAIN dünya), worker içinde değil.
   *
   * Eşleme: video_session.video_duration (sn) ↔ listedeki duration (ms),
   * gerekirse başlıkla ayrıştırılır. Eşleşme bulunamazsa DOKUNMAYIZ →
   * reklamlı ama çalışan oynatma; asla bozmayız.
   * ══════════════════════════════════════════════════════════════════════ */
  /* Oynatıcının kullandığı VOD adresini ISOLATED tarafa (content.js) duyurur —
     "VOD İndir" bunu kullanır, böylece hangi yayın olursa olsun kaynağı bilinir. */
  function vodUrlBildir(u) {
    if (!u) return;
    try { window.__kab_vodUrl = u; } catch (e) {}
    try { window.postMessage({ source: 'kab', type: 'vodUrl', url: u, n: pageNonce }, '*'); } catch (e) {}
  }

  var PLAYBACK_PAGE_RE = /\/api\/v\d+\/stream\/[0-9a-f-]+\/playback(\?|$)/i;
  var STITCHED_RE      = /\/api\/v\d+\/stream\/manifest\.m3u8/i;
  var vodList = { slug: '', ts: 0, items: null };

  function slugNow() {
    try { return window.location.pathname.split('/').filter(Boolean)[0] || ''; } catch (e) { return ''; }
  }

  function jsonResponse(obj, resp) {
    try {
      var hh = new Headers();
      try { resp.headers.forEach(function (v, k) { if (k.toLowerCase() !== 'content-length') hh.append(k, v); }); } catch (e) {}
      return new Response(JSON.stringify(obj), { status: resp.status, statusText: resp.statusText, headers: hh });
    } catch (e) { return resp; }
  }

  /* İstemci tarafı reklam bayrakları (SSAI'yi durdurmaz ama SDK'ları uyandırmaz) */
  function neutralizeAds(json) {
    var changed = false;
    try {
      var vp = json && json.video_player;
      if (vp) ['google_ads_sdk', 'pal_sdk'].forEach(function (k) {
        var s = vp[k];
        if (s) { if (s.initiate_sdk) { s.initiate_sdk = false; changed = true; } if (s.sdk_available) { s.sdk_available = false; changed = true; } }
      });
      var vs = json && json.video_session;
      if (vs && vs.auto_ads_enabled) { vs.auto_ads_enabled = false; changed = true; }
    } catch (e) {}
    return changed;
  }

  function getVodList(slug, origFetch) {
    if (vodList.items && vodList.slug === slug && (Date.now() - vodList.ts) < 60000) return Promise.resolve(vodList.items);
    if (!slug) return Promise.resolve([]);
    return origFetch.call(window, 'https://kick.com/api/v2/channels/' + slug + '/videos')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var arr = Array.isArray(j) ? j : ((j && j.data) || []);
        vodList = { slug: slug, ts: Date.now(), items: arr };
        return arr;
      });
  }

  /* video_session → aynı VOD'un reklamsız master URL'i (bulunamazsa null) */
  function cleanVodSource(vs, slug, origFetch) {
    var want = Number(vs && vs.video_duration);
    if (!want || !slug) return Promise.resolve(null);
    return getVodList(slug, origFetch).then(function (arr) {
      var cands = arr.filter(function (x) {
        var d = Number(x && x.duration);
        return d && Math.abs(Math.round(d / 1000) - want) <= 1;   // liste ms, video_session sn
      });
      if (cands.length > 1 && vs.video_title) {                    // aynı süreli birden çok VOD → başlıkla ayır
        var t = cands.filter(function (x) { return String(x.session_title || '') === String(vs.video_title); });
        if (t.length) cands = t;
      }
      var src = cands[0] && cands[0].source;
      // yalnızca kick.com alt alanından gelen bir m3u8 kabul edilir
      return (typeof src === 'string' && /^https:\/\/[^/]+\.kick\.com\/.+\.m3u8/i.test(src)) ? src : null;
    }).catch(function () { return null; });
  }

  try {
    var origPageFetch = window.fetch;
    if (typeof origPageFetch === 'function') {
      window.fetch = function (input, init) {
        var url = '';
        try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
        var p = origPageFetch.apply(this, arguments);
        /* SAYFANIN REDDİNİ SAHİPLENME.
           Kick kendi isteklerinin bir kısmını yakalamıyor; istek başarısız
           olunca (ağ hatası ya da reklam engellememiz) tarayıcı
           "Uncaught (in promise) Failed to fetch" diyor ve YIĞIN İZİ BURADAN
           GEÇTİĞİ İÇİN hatayı eklentiye yazıyor — eklenti hata listesi
           bizim olmayan hatalarla doluyor.
           Boş yakalayıcı reddi "işlenmiş" sayıyor. DÖNDÜRDÜĞÜMÜZ söz hâlâ
           reddediyor: çağıranın davranışı hiç değişmiyor, yalnız sahipsiz
           red uyarısı kalkıyor. Kendi isteklerimiz bundan etkilenmiyor —
           onlar sarmalanmamış origPageFetch ile doğrudan gidiyor. */
        try { p.catch(function () {}); } catch (e) {}
        if (!pageVod || !url || !PLAYBACK_PAGE_RE.test(url)) return p;   // VOD kendi anahtarına uyar
        return p.then(function (resp) {
          try {
            return resp.clone().json().then(function (j) {
              var vs = j && j.video_session, pu = j && j.playback_url;
              var touched = neutralizeAds(j);
              var isVod = vs && String(vs.video_stream_status || '').toLowerCase() === 'vod';
              /* "VOD İndir" için adresi BURADAN veriyoruz. Sebebi ölçümle bulundu:
                 `api/v2/channels/<slug>/videos` yalnızca son ~13 yayını döndürüyor,
                 daha eski bir VOD'da süre eşlemesi hiçbir şey bulamıyor ve indirme
                 "kaynağı bulunamadı" diyordu. Oynatıcının fiilen kullandığı adres
                 zaten elimizden geçiyor — tahmin etmeye gerek yok. */
              if (isVod && pu && typeof pu.vod === 'string') vodUrlBildir(pu.vod);
              if (!isVod || !pu || typeof pu.vod !== 'string' || !STITCHED_RE.test(pu.vod)) {
                return touched ? jsonResponse(j, resp) : resp;     // canlı/bilinmeyen → karışma
              }
              return cleanVodSource(vs, slugNow(), origPageFetch).then(function (clean) {
                if (!clean) { pkLog('VOD temiz kaynak bulunamadi, dokunulmadi'); return touched ? jsonResponse(j, resp) : resp; }
                pu.vod = clean;                                    // dikilmiş manifest → reklamsız kaynak
                vodUrlBildir(clean);                               // indirme de reklamsız kaynağı kullansın
                /* ŞART: MediaTailor reklam oturumunu da kaldır. Yoksa oynatıcı
                   "burada reklam var" bilgisini bu oturumdan okuyup temiz akışta
                   olmayan reklamı bekler → "Ad 1 of 1" ekranında SONSUZA KADAR
                   takılır. (Testte kanıtlandı: yalnız URL takası yetmiyor.) */
                pu.vod_session = '';
                try { window.__kab_adsBlocked = (window.__kab_adsBlocked || 0) + 1; } catch (e) {}
                try { window.postMessage({ source: 'kab', type: 'adDetected', kind: 'video', n: pageNonce }, '*'); } catch (e) {}
                pkLog('VOD reklami atlandi (temiz kaynak kullanildi)');
                return jsonResponse(j, resp);
              }).catch(function () { return resp; });
            }).catch(function () { return resp; });                // JSON değil → dokunma
          } catch (e) { return resp; }
        });
      };
    }
  } catch (e) {}

  var OrigWorker = window.Worker;
  if (typeof OrigWorker !== 'function') return;

  function kabWorkerShim() {
    if (self.__kab_shim) return;
    self.__kab_shim = true;

    var KAB_BASE = "__KAB_BASE__";
    var KAB_SLUG = "__KAB_SLUG__";
    var KAB_NONCE = "__KAB_NONCE__";
    var PLAYBACK_RE = /\/api\/v\d+\/stream\/[0-9a-f-]+\/playback/i;
    // GEÇMİŞ YAYIN (VOD) master'ları: ne dikilmiş proxy'si ne de temiz kaynağı
    // CANLI akışla takas edilmemeli (yoksa VOD yerine canlı yayın oynar).
    // VOD'u sayfa katmanındaki kanca hallediyor (bkz. dosya başı).
    var VOD_MASTER_RE = /\/api\/v\d+\/stream\/manifest\.m3u8|stream\.kick\.com\//i;
    var enabled = true;

    var bc = null;
    try {
      bc = new BroadcastChannel('kab');
      bc.onmessage = function (e) {
        var d = e && e.data;
        if (!d) return;
        if (KAB_NONCE && d._n !== KAB_NONCE) return;   // jeton yoksa (fail-open) ya da doğruysa işle; sahte kanal mesajı reddedilir
        if (d.kabSettings) enabled = (d.kabSettings.enabled !== false) && (d.kabSettings.blockVideoAds !== false);
        if (d.kabSlug && d.kabSlug !== KAB_SLUG) { KAB_SLUG = d.kabSlug; adFree.url = null; adFree.ts = 0; adFree.slug = ''; masterCache.text = null; masterCache.slug = ''; prefetchMaster(); } // kanal değişti → önbellek sıfırla + yeni master'ı önden çek
      };
    } catch (e) {}

    function post(m) { try { if (bc) { m._n = KAB_NONCE; bc.postMessage(m); } } catch (e) {} }
    /* Hata ayiklama ciktisi. Yayinda SESSIZ: 17 bin kullanicinin konsoluna
       gurultu basmayalim. Acmak icin sayfa konsolunda: __pkDebug = true */
    function log() {
      try { if (self.__pkDebug) console.log.apply(console, ['[KAB]'].concat([].slice.call(arguments))); } catch (e) {}
    }

    var origFetch = self.fetch;

    function fixWasm(url) {
      try {
        if (!/\.wasm(\?|#|$)/i.test(url)) return null;
        var h = url.split('#')[0], q = '', qi = h.indexOf('?');
        if (qi >= 0) { q = h.slice(qi); h = h.slice(0, qi); }
        var name = h.split('/').pop();
        return name ? (KAB_BASE + name + q) : null;
      } catch (e) { return null; }
    }

    function rebuildHeaders(resp) {
      try {
        var hh = new Headers();
        resp.headers.forEach(function (v, k) { if (k.toLowerCase() !== 'content-length') hh.append(k, v); });
        return hh;
      } catch (e) { return undefined; }
    }

    /* Reklamsız playback_url'i Kick API'sinden al (60sn önbellekli) */
    var adFree = { url: null, ts: 0, slug: '' };
    function getAdFreeMaster() {
      var now = Date.now();
      // Önbellek yalnızca AYNI kanal (slug) için geçerli → kanal değişince eski akış verilmez.
      if (adFree.url && adFree.slug === KAB_SLUG && (now - adFree.ts) < 60000) return Promise.resolve(adFree.url);
      if (!KAB_SLUG) return Promise.resolve(null);
      var forSlug = KAB_SLUG;
      return origFetch.call(self, 'https://kick.com/api/v2/channels/' + forSlug, { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.playback_url) { adFree.url = j.playback_url; adFree.ts = now; adFree.slug = forSlug; return j.playback_url; }
          return null;
        }).catch(function () { return null; });
    }

    /* PREFETCH: reklamsız MASTER içeriğini önceden çekip slug bazında önbelleğe al.
       Kanal geçişinde player master'ı isteyince fetch zinciri beklenmez → donma yok. */
    var masterCache = { text: null, slug: '', ts: 0, ct: '' };
    function prefetchMaster() {
      var forSlug = KAB_SLUG;
      if (!forSlug || !enabled) return;
      if (masterCache.text && masterCache.slug === forSlug && (Date.now() - masterCache.ts) < 30000) return; // zaten taze
      getAdFreeMaster().then(function (af) {
        if (!af || KAB_SLUG !== forSlug) return;   // slug bu arada değiştiyse iptal
        return origFetch.call(self, af).then(function (afr) {
          return afr.text().then(function (aftxt) {
            if (aftxt.indexOf('#EXT-X-STREAM-INF') === -1 || KAB_SLUG !== forSlug) return;
            masterCache = { text: absolutize(aftxt, af), slug: forSlug, ts: Date.now(), ct: (afr.headers.get('content-type') || 'application/vnd.apple.mpegurl') };
          });
        });
      }).catch(function () {});
    }

    /* Master içindeki tüm URL'leri (varyantlar + URI="...") mutlak yap, ki
       oynatıcı orijinal (reklamlı) master URL'sini taban alsa bile reklamsız
       kaynağa gitsin. */
    function absolutize(text, baseUrl) {
      try {
        var base = new URL(baseUrl);
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var l = lines[i];
          if (!l) continue;
          if (l.charAt(0) === '#') {
            lines[i] = l.replace(/URI="([^"]+)"/g, function (m, u) { try { return 'URI="' + new URL(u, base).href + '"'; } catch (e) { return m; } });
          } else {
            try { lines[i] = new URL(l, base).href; } catch (e) {}
          }
        }
        return lines.join('\n');
      } catch (e) { return text; }
    }

    function neutralizePlayback(json) {
      if (!json || typeof json !== 'object') return false;
      var changed = false, vp = json.video_player;
      if (vp) ['google_ads_sdk', 'pal_sdk'].forEach(function (k) {
        var s = vp[k]; if (s) { if (s.initiate_sdk) { s.initiate_sdk = false; changed = true; } if (s.sdk_available) { s.sdk_available = false; changed = true; } }
      });
      var vs = json.video_session;
      if (vs && vs.auto_ads_enabled) { vs.auto_ads_enabled = false; changed = true; }
      return changed;
    }

    if (origFetch) {
      self.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var fw = fixWasm(url);
        if (fw) return origFetch.call(self, fw, init);

        var p = origFetch.apply(self, arguments);
        if (!enabled) return p;

        if (/\.m3u8/i.test(url)) {
          return p.then(function (resp) {
            return resp.clone().text().then(function (txt) {
              // MASTER manifest → reklamsız ile değiştir
              if (txt.indexOf('#EXT-X-STREAM-INF') !== -1) {
                // VOD master'ı → ASLA canlı akışla takas etme (sayfa katmanı hallediyor)
                if (VOD_MASTER_RE.test(url)) return resp;
                // Prefetch önbelleği hazırsa ANINDA dön → fetch zinciri yok, donma yok
                if (masterCache.text && masterCache.slug === KAB_SLUG && (Date.now() - masterCache.ts) < 30000) {
                  post({ kabSwapped: 1 });
                  log('master prefetch onbellekten (aninda)');
                  return new Response(masterCache.text, { status: 200, statusText: 'OK', headers: new Headers({ 'content-type': masterCache.ct || 'application/vnd.apple.mpegurl' }) });
                }
                return getAdFreeMaster().then(function (af) {
                  if (!af) return resp;
                  return origFetch.call(self, af).then(function (afr) {
                    return afr.text().then(function (aftxt) {
                      if (aftxt.indexOf('#EXT-X-STREAM-INF') === -1) return resp; // beklenmedik → dokunma
                      post({ kabSwapped: 1 });
                      log('master reklamsiz akisla degistirildi');
                      var absTxt = absolutize(aftxt, af);
                      masterCache = { text: absTxt, slug: KAB_SLUG, ts: Date.now(), ct: (afr.headers.get('content-type') || 'application/vnd.apple.mpegurl') }; // sonraki istekler için de önbellekle
                      return new Response(absTxt, { status: 200, statusText: 'OK', headers: rebuildHeaders(afr) });
                    });
                  }).catch(function () { return resp; });
                }).catch(function () { return resp; });
              }
              // MEDIA playlist → reklamsız kaynaktan geldiği için dokunma;
              // yine de reklam markörü sızmışsa bildir (teşhis).
              if (txt.indexOf('#EXT-X-CUE-OUT') !== -1 || txt.indexOf('stitched-ad') !== -1) {
                post({ kabAdLeak: 1 });
              }
              return resp;
            }).catch(function () { return resp; });
          });
        }

        if (PLAYBACK_RE.test(url)) {
          return p.then(function (resp) {
            return resp.clone().json().then(function (j) {
              if (!neutralizePlayback(j)) return resp;
              return new Response(JSON.stringify(j), { status: resp.status, statusText: resp.statusText, headers: rebuildHeaders(resp) });
            }).catch(function () { return resp; });
          });
        }
        return p;
      };
    }

    /* XHR: sadece WASM yol düzeltmesi (manifestler fetch ile geliyor) */
    try {
      var origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        try { var fw2 = fixWasm(String(url)); if (fw2) { url = fw2; arguments[1] = fw2; } } catch (e) {}
        return origOpen.apply(this, arguments);
      };
    } catch (e) {}

    post({ kabHookReady: 1 });
    log('worker kancasi kuruldu (slug=' + KAB_SLUG + ')');
    prefetchMaster();   // kurulur kurulmaz reklamsız master'ı önden çek → ilk yük + kanal geçişi hızlı, donma yok
  }

  var SHIM_TEMPLATE = '(' + kabWorkerShim.toString() + ')();\n;\n';

  function readSync(u) {
    try { var x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); if (x.status === 200 || x.status === 0) return x.responseText || null; } catch (e) {}
    return null;
  }
  function baseOf(u) {
    try { var abs = new URL(u, window.location.href).href; return abs.slice(0, abs.lastIndexOf('/') + 1); } catch (e) { return window.location.origin + '/'; }
  }
  function currentSlug() {
    try { return (window.location.pathname.split('/').filter(Boolean)[0] || ''); } catch (e) { return ''; }
  }

  function KabWorker(scriptURL, options) {
    try {
      var url = String(scriptURL);
      var videoOn = false; // yalnızca onay sonrası (content.js '1' yazınca) sarmala
      try { videoOn = localStorage.getItem('__kab_video') === '1'; } catch (e) {}
      var isModule = options && options.type === 'module';
      if (videoOn && !isModule && /amazon-ivs|\/ivs\//i.test(url)) {
        var src = readSync(url);
        if (src) {
          var base = baseOf(url);
          var shim = SHIM_TEMPLATE
            .replace('"__KAB_BASE__"', JSON.stringify(base))
            .replace('"__KAB_SLUG__"', JSON.stringify(currentSlug()))
            .replace('"__KAB_NONCE__"', JSON.stringify(pageNonce || ''));
          var blob = new Blob([shim + src], { type: 'text/javascript' });
          window.__kab_wrapCount = (window.__kab_wrapCount || 0) + 1;
          window.__kab_lastBase = base;
          pkLog('IVS worker sarmalandi, slug=' + currentSlug());
          return new OrigWorker(URL.createObjectURL(blob), options);
        }
      }
    } catch (e) {
      pkLog('wrap hatasi, passthrough:', String(e).slice(0, 100));
    }
    return new OrigWorker(scriptURL, options);
  }
  try { KabWorker.prototype = OrigWorker.prototype; } catch (e) {}
  try { Object.setPrototypeOf(KabWorker, OrigWorker); } catch (e) {}
  try { Object.defineProperty(window, 'Worker', { value: KabWorker, writable: true, configurable: true }); }
  catch (e) { try { window.Worker = KabWorker; } catch (e2) {} }

  /* Köprü + slug yayını */
  try {
    var bc = new BroadcastChannel('kab');
    bc.onmessage = function (e) {
      var d = e && e.data;
      if (d && d.kabHookReady) window.__kab_shimReady = true;
      if (d && d.kabSwapped && (!pageNonce || d._n === pageNonce)) {   // sahte kabSwapped ile stat şişirilemez
        window.__kab_adsBlocked = (window.__kab_adsBlocked || 0) + 1;
        window.postMessage({ source: 'kab', type: 'adDetected', kind: 'video', n: pageNonce }, '*');
      }
      if (d && d.kabAdLeak) window.__kab_adLeak = (window.__kab_adLeak || 0) + 1;
    };
    window.addEventListener('message', function (e) {
      if (e.source !== window) return;
      var d = e.data;
      if (d && d.source === 'kab-cfg' && d.settings && d.n) {   // jeton ZORUNLU — jetonsuz/sahte config reddedilir
        if (!pageNonce) pageNonce = d.n;                        // ilk jetonu öğren (content.js document_start'ta yollar, sayfa scriptlerinden önce)
        else if (d.n !== pageNonce) return;                    // sonra doğrula
        pageEnabled = (d.settings.enabled !== false) && (d.settings.blockVideoAds !== false);
        pageVod     = (d.settings.enabled !== false) && (d.settings.blockVodAds   !== false);   // geçmiş yayın ayrı anahtar
        try { bc.postMessage({ kabSettings: d.settings, _n: pageNonce }); } catch (er) {}
      }
    });
    // slug'ı yayınla (SPA gezinmesinde worker güncel kalsın)
    var lastSlug = '';
    function pushSlug() {
      try { var s = (window.location.pathname.split('/').filter(Boolean)[0] || ''); if (s && s !== lastSlug) { lastSlug = s; bc.postMessage({ kabSlug: s, _n: pageNonce }); } } catch (er) {}
    }
    pushSlug();
    setInterval(pushSlug, 2000);
    // SPA gezinmesinde ANINDA güncelle (2sn beklemeden) → kanal değişince yayın F5 olmadan yüklenir.
    try {
      ['pushState', 'replaceState'].forEach(function (m) {
        var orig = history[m];
        if (typeof orig === 'function') { history[m] = function () { var r = orig.apply(this, arguments); try { pushSlug(); } catch (e) {} return r; }; }
      });
      window.addEventListener('popstate', pushSlug);
    } catch (e) {}
  } catch (e) {}

  /* ══════════════════════════════════════════════════════════════════════
   * 10.5 — SOHBET OLAYLARI (Kick'in kendi Pusher bağlantısı dinlenir)
   *
   * Kick sohbeti Pusher üzerinden alıyor ve sayfada zaten açık bir bağlantısı
   * var. Kendi soketimizi açmak yerine ona bağlanıyoruz:
   *   · ikinci bir WebSocket / abonelik yok
   *   · heartbeat, yeniden bağlanma, kimlik doğrulama derdi yok
   *   · Kick'in sunucusuna fazladan yük binmiyor
   * Sadece DİNLENİR; hiçbir şey gönderilmez. Olaylar izole tarafa jetonlu
   * postMessage ile iletilir (sahte olay üretilemesin diye).
   * ══════════════════════════════════════════════════════════════════════ */
  (function pusherDinle() {
    if (window.__kab_pusher_hook) return;
    var deneme = 0;

    function ilgiliMi(ad) {
      return ad === 'ChatMessageEvent' || ad === 'MessageDeletedEvent' ||
             ad === 'ChatMessageSentEvent' ||
             ad === 'UserBannedEvent' || ad === 'UserUnbannedEvent' ||
             ad === 'ChatroomClearEvent' ||
             ad === 'GiftedSubscriptionsEvent' || ad === 'SubscriptionEvent' ||
             ad === 'LuckyUsersWhoGotGiftSubscriptionsEvent' || ad === 'LivestreamReactionEvent' ||
             ad === 'StreamHostEvent' ||
             /* Yayın bitti: toplanan sohbet verisi bu olayda silinir.
                Kick bunu kanal kanalında yayınlıyor; `connection.bind`
                bağlantıdaki TÜM mesajları gördüğü için buraya da düşüyor. */
             ad === 'StopStreamBroadcast';
    }

    /* Rol sırası — büyükten küçüğe. Bir kişide birden çok rozet olabilir
       (mod + abone gibi); vurgulama için tek bir rol lazım, en üstteki kazanır. */
    var ROL_SIRA = ['broadcaster', 'staff', 'moderator', 'verified', 'vip', 'founder', 'og',
                    'sub_gifter', 'subscriber', 'bot'];
    function enYuksekRol(rozetler) {
      if (!rozetler || !rozetler.length) return '';
      var en = '';
      for (var i = 0; i < rozetler.length; i++) {
        var t = String((rozetler[i] && rozetler[i].type) || '').toLowerCase();
        var s = ROL_SIRA.indexOf(t);
        if (s < 0) continue;
        if (!en || s < ROL_SIRA.indexOf(en)) en = t;
      }
      return en;
    }

    function bagla() {
      var P = window.Pusher;
      var p = P && P.instances && P.instances[0];
      if (!p || !p.connection || !p.connection.bind) {
        if (++deneme < 60) setTimeout(bagla, 1000);     // sohbet geç kuruluyor olabilir
        return;
      }
      window.__kab_pusher_hook = true;
      p.connection.bind('message', function (m) {
        try {
          var ad = String((m && m.event) || '').split('\\').pop();
          if (!ilgiliMi(ad)) return;
          var d = m.data;
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
          if (!d) return;
          /* Yalnızca ihtiyacımız olan alanları geçiriyoruz — ham gövdeyi
             taşımıyoruz ki gereksiz veri izole tarafa sızmasın. */
          var y = { source: 'kab', type: 'chatEvent', ad: ad, n: pageNonce };
          if (ad === 'ChatMessageEvent') {
            y.id = d.id;
            y.kim = (d.sender && d.sender.username) || '';
            y.metin = String(d.content || '').slice(0, 300);
            y.ts = Date.parse(d.created_at) || Date.now();
            y.rol = enYuksekRol(d.sender && d.sender.identity && d.sender.identity.badges);
            y.renk = (d.sender && d.sender.identity && d.sender.identity.color) || '';
            y.yanit = !!(d.metadata && (d.metadata.original_message || d.metadata.original_sender));
            y.kicks = (d.metadata && d.metadata.kicks) || d.kicks || 0;
            y.tip = d.type || '';
          } else if (ad === 'GiftedSubscriptionsEvent') {
            y.kim = d.gifter_username || (d.gifter && d.gifter.username) || 'Topluluk Üyesi';
            var alicilar = Array.isArray(d.gifted_usernames) ? d.gifted_usernames : [];
            y.adet = alicilar.length || parseInt(d.count || 1, 10);
            y.alicilar = alicilar.slice(0, 10);
            y.ts = Date.parse(d.created_at) || Date.now();
          } else if (ad === 'SubscriptionEvent') {
            y.kim = d.username || (d.user && d.user.username) || 'Abone';
            y.ay = d.months || d.duration || 1;
            y.ts = Date.parse(d.created_at) || Date.now();
          } else if (ad === 'LivestreamReactionEvent') {
            y.kim = d.username || 'İzleyici';
            y.reaksiyon = d.reaction || '';
            y.kicks = parseInt(d.kicks || d.amount || 0, 10);
            y.ts = Date.now();
          } else if (ad === 'MessageDeletedEvent') {
            y.id = (d.message && d.message.id) || d.id || '';
            var om = (d.aiModerated != null) ? d.aiModerated : d.ai_moderated;
            y.otoMod = (om == null) ? null : !!om;
            var kr = d.violatedRules || d.violated_rules;
            y.kural = Array.isArray(kr)
              ? kr.filter(function (x) { return typeof x === 'string' && x; }).slice(0, 4)
              : [];
          } else if (ad === 'UserBannedEvent' || ad === 'UserUnbannedEvent') {
            y.kim = (d.user && d.user.username) || '';
            y.yapan = (d.banned_by && d.banned_by.username) ||
                      (d.unbanned_by && d.unbanned_by.username) || '';
            y.kalici = !!d.permanent;
            y.bitis = d.expires_at || '';
            y.sebep = String(d.reason || (d.ban && d.ban.reason) || '').slice(0, 200);
            y.itiraz = !!(d.unban_request || d.has_unban_request);
            y.ts = Date.now();
          } else {
            y.ts = Date.now();
          }
          window.postMessage(y, '*');
        } catch (e) {}
      });
    }
    bagla();
  })();


  /* ══════════════════════════════════════════════════════════════════════
   * MESAJ KİMLİĞİ DAMGALAYICI
   * Sohbet satırlarına `data-pk-mid` yazar; izole taraf silinen mesajı
   * ekranda yerinde işaretleyebilsin diye.
   * ══════════════════════════════════════════════════════════════════════ */
  (function () {
    var UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    var gozlemci = null, izlenen = null;

    function fiberKimlik(el) {
      try {
        var ad = Object.getOwnPropertyNames(el);
        for (var i = 0; i < ad.length; i++) {
          if (ad[i].indexOf('__reactFiber') !== 0) continue;
          var f = el[ad[i]];
          var k = f && f.key;
          if (!k) return '';
          var m = String(k).match(UUID);
          return m ? m[0] : '';
        }
      } catch (e) {}
      return '';
    }

    function damgala(el) {
      if (!el || el.nodeType !== 1) return;
      if (!el.hasAttribute('data-index')) return;
      /* SATIR GERİ DÖNÜŞÜMÜ: sohbet sanallaştırılmış liste, Kick satır
         kaplarını yeniden kullanıyor ve `data-index` değişiyor. Damga
         eskiden bir kez yazılıyordu; geri dönüşen kap ESKİ mesaj kimliğini
         taşımaya devam ediyordu. Silinen mesaj işaretlemesi o kimliğe
         bakıyor — yanlış satır "silinmiş" sanılıyordu. Artık indeks
         değişince damga tazeleniyor. */
      var ix = el.getAttribute('data-index') || '';
      if (el.getAttribute('data-pk-mid') && el.getAttribute('data-pk-mid-ix') === ix) return;
      var id = fiberKimlik(el);
      if (id) { el.setAttribute('data-pk-mid', id); el.setAttribute('data-pk-mid-ix', ix); }
    }

    /* Görünür sohbet kabı. Kick masaüstü+mobil iki kopya çiziyor, biri 0×0. */
    function sohbetKabi() {
      var l = document.querySelectorAll('#chatroom-messages');
      for (var i = 0; i < l.length; i++) {
        var r = l[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return l[i];
      }
      return null;
    }

    function hepsiniDamgala(kap) {
      var l = kap.querySelectorAll('[data-index]');
      for (var i = 0; i < l.length; i++) damgala(l[i]);
    }

    function kur() {
      var kap = sohbetKabi();
      if (!kap) return;
      if (kap === izlenen && gozlemci) { hepsiniDamgala(kap); return; }
      if (gozlemci) { gozlemci.disconnect(); gozlemci = null; }
      izlenen = kap;
      hepsiniDamgala(kap);
      gozlemci = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var ek = muts[i].addedNodes;
          for (var j = 0; j < ek.length; j++) {
            var n = ek[j];
            if (!n || n.nodeType !== 1) continue;
            damgala(n);
            /* Satır bir sarmalayıcı içinde gelebilir. */
            if (n.querySelectorAll) {
              var ic = n.querySelectorAll('[data-index]');
              for (var q = 0; q < ic.length; q++) damgala(ic[q]);
            }
          }
        }
      });
      /* subtree: sanallaştırılmış liste satırları ara kapta oluşabiliyor. */
      try { gozlemci.observe(kap, { childList: true, subtree: true }); } catch (e) {}
    }

    /* Kanal değişince React kabı değiştiriyor — periyodik kontrol ucuz ve
       kaçırmıyor. Sekme görünmezken de çalışsın: damgalama DOM'a bakıyor,
       maliyeti yok denecek kadar az. */
    setInterval(kur, 2000);
    kur();
  })();


  /* ══════════════════════════════════════════════════════════════════════
   * KICK'İN PROFİL KARTINI PROGRAMLA AÇ
   * ══════════════════════════════════════════════════════════════════════ */
  (function () {
    /* Bir isim düğmesinden yukarı çıkıp React'in `sender` nesnesini bulur. */
    function senderBul(el) {
      try {
        var ad = Object.getOwnPropertyNames(el);
        var f = null;
        for (var i = 0; i < ad.length; i++) {
          if (ad[i].indexOf('__reactFiber') === 0) { f = el[ad[i]]; break; }
        }
        var k = 0;
        while (f && k < 8) {
          if (f.memoizedProps && f.memoizedProps.sender) return f.memoizedProps.sender;
          f = f.return; k++;
        }
      } catch (e) {}
      return null;
    }

    function gorunurSohbet() {
      var l = document.querySelectorAll('#chatroom-messages');
      for (var i = 0; i < l.length; i++) {
        var r = l[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return l[i];
      }
      return null;
    }

    /* Ekrandaki herhangi bir mesaj satırını taşıyıcı olarak kullanır. */
    function kartAc(kimlik, ad, slug) {
      var kap = gorunurSohbet(); if (!kap) return false;
      var btn = kap.querySelectorAll('button.inline.font-bold');
      for (var i = btn.length - 1; i >= 0; i--) {
        var s2 = senderBul(btn[i]);
        if (!s2) continue;
        var yedek = { id: s2.id, username: s2.username, slug: s2.slug };
        try {
          if (kimlik) s2.id = kimlik;
          if (ad) s2.username = ad;
          s2.slug = slug || String(ad || '').toLowerCase();
          btn[i].click();
          return true;
        } catch (e) {
          return false;
        } finally {
          /* ANINDA geri al — tıklama işleyicisi eşzamanlı çalıştı. */
          s2.id = yedek.id; s2.username = yedek.username; s2.slug = yedek.slug;
        }
      }
      return false;
    }

    /* KANAL GEZİNMESİ. Kenar çubuğunda kendi bastığımız satır tıklanınca
       kullanılıyor: o satır Kick'in kendi düğümü olmadığı için Next'in
       bağlantı işleyicisi üzerinde yok ve düz bağlantı tam sayfa yeniler.
       Yönlendirici yalnız sayfa dünyasında erişilebilir.

       Yol KATI doğrulanıyor: doğrulamasız bırakırsak sayfaya sızan bir
       mesaj kullanıcıyı istediği adrese götürebilirdi. */
    /* Sayfayı kaydıran kabı bul. Belge kaymıyor (ölçüldü), <main> kaydırıyor.
       Sınıf adına güvenmiyoruz; gerçekten kayabilen ilk kabı arıyoruz.
       SOHBET kabı hariç: onu sıfırlamak sohbeti en başa fırlatır. */
    function sayfaKabi() {
      var m = document.querySelector('main');
      if (m && m.scrollHeight > m.clientHeight + 8) return m;
      var hepsi = document.querySelectorAll('main, main *');
      for (var i = 0; i < hepsi.length; i++) {
        var e2 = hepsi[i];
        if (e2.id === 'chatroom-messages' || e2.closest('#chatroom-messages')) continue;
        if (e2.scrollHeight > e2.clientHeight + 8) {
          var ov = getComputedStyle(e2).overflowY;
          if (ov === 'auto' || ov === 'scroll') return e2;
        }
      }
      return null;
    }

    /* Gezinme takvimi canlıda ölçüldü (router.push sonrası):
         118-225 ms : yol hâlâ ESKİ, <main> eski düğüm, scrollTop korunuyor
         446 ms     : yol yeni ama <main> boş (clientHeight 0)
         830 ms     : <main> DEĞİŞMİŞ (yeni düğüm)
       Kısa bir pencere (ör. 350 ms) hedef sayfa daha ortada yokken kapanıyor:
       sıfır ESKİ <main>'e yazılıyor, sayfa "yarı kaymış" kalıyordu. Onun için
       hedef yola VARILANA KADAR bekliyor, vardıktan sonra da içerik otursun
       diye bir süre izlemeye devam ediyoruz. */
    /* NEXT'İN GEZİNME KAYDIRMASINI BASTIRMA.
       `handlePotentialScroll` sayfanın aşağısındaki bir div'i
       `scrollIntoView()` ile görünür alana getiriyor ve kanal sayfası orada
       açılıyor. Sonradan sıfırlamak işe yaramıyor: Next bizden SONRA yazıyor
       (ölçüldü: biz 12396, Next 12910). Onun için çağrıyı hiç yaptırmıyoruz.

       Bastırma yalnız kendi başlattığımız gezinmenin penceresinde geçerli ve
       `basaAl`ın kullanıcı-bıraktı bayrağından BAĞIMSIZ: araya giren bir fare
       olayı yüzünden kapanırsa hata geri gelirdi. */
    var kilitBitis = 0;
    (function () {
      var asil = Element.prototype.scrollIntoView;
      if (!asil) return;
      Element.prototype.scrollIntoView = function () {
        try {
          if (Date.now() < kilitBitis) {
            var m = document.querySelector('main');
            /* SOHBET HARİÇ: sohbet kendini dibe almak için bunu kullanıyor,
               yutarsak sohbet donar. */
            if (m && m.contains(this) &&
                !(this.closest && this.closest('#chatroom-messages'))) return;
          }
        } catch (e) {}
        return asil.apply(this, arguments);
      };
    })();

    var BASA_TAVAN = 6000;   // en fazla bu kadar izle (gezinme takılırsa bırak)
    var BASA_OTUR  = 600;    // son düzeltmeden sonra beklenen sükûnet
    var BASA_BEKLE = 2500;   // hedefe vardıktan sonra pencerenin açık kaldığı süre
    var BASA_ARA   = 16;     // tur aralığı (ms)

    function basaAl(hedefYol) {
      var birak = false, vardi = 0, t0 = Date.now(), sonDuzeltme = t0;
      /* Next'in gezinme kaydırmasını bu pencerede yutuyoruz. Sıfırlama
         döngüsü yedekte kalıyor: Next'in kendi `scrollTop = 0`'ı gelmezse
         ya da başka bir şey kaydırırsa o toparlıyor. */
      kilitBitis = t0 + BASA_BEKLE;
      /* `mousedown` de dinleniyor: kaydırma çubuğunu SÜRÜKLEMEK wheel/touch/
         keydown üretmiyor, onsuz kullanıcıyı geri çekerdik. */
      var olaylar = ['wheel', 'touchmove', 'keydown', 'mousedown'];
      function dur() { birak = true; kapat(); }
      function kapat() {
        for (var i = 0; i < olaylar.length; i++) window.removeEventListener(olaylar[i], dur, true);
      }
      for (var i = 0; i < olaylar.length; i++) window.addEventListener(olaylar[i], dur, true);

      (function tur() {
        if (birak) return;
        var simdi = Date.now();
        /* <main> gezinmede DEĞİŞİYOR; her turda yeniden sorguluyoruz, tutulan
           referans kopuk kalırdı. */
        var k = sayfaKabi();
        if (k && k.scrollTop) { k.scrollTop = 0; sonDuzeltme = simdi; }
        /* Yol değişmeden iş bitmiş sayılmaz. */
        if (!vardi && location.pathname === hedefYol) vardi = simdi;
        /* Teşhiste gezinmeyle gelen YENİ <main> doğrudan 610'da doğmuştu ve
           JS onu yazmıyordu — yani düzeltilecek an, düğümün geldiği an. O
           düğüm yol değişiminden 914 ms sonra geliyordu (benim ölçtüğüm hafif
           sayfada 384 ms). Bu yüzden pencere varıştan sonra cömert tutuluyor;
           "düğüm yenilendi mi" diye ölçüp erken kapatmak, tam da kaçırmaya
           sebep oluyordu. */
        var bitti = vardi
          ? (simdi - vardi > BASA_BEKLE) && (simdi - sonDuzeltme > BASA_OTUR)
          : (simdi - t0 > BASA_TAVAN);   // gezinme hiç tamamlanmadı
        /* rAF DEĞİL: sekme arka plandayken tarayıcı rAF'i askıya alıyor
           (ölçüldü: 1 sn'de rAF 1 tik, setTimeout 57 tik). Kullanıcı kanala
           tıklayıp sekme değiştirirse döngü ölür ve sayfa yarı kaymış kalırdı. */
        if (bitti) kapat(); else setTimeout(tur, BASA_ARA);
      })();
    }

    window.addEventListener('message', function (e) {
      if (e.source !== window) return;
      var d = e.data;
      if (!d || d.source !== 'kab-git' || !d.n) return;   // gezinme köprüsü
      if (pageNonce && d.n !== pageNonce) return;
      var yol = String(d.yol || '');
      if (!/^\/[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/.test(yol)) return;
      try {
        var r = window.next && window.next.router;
        if (r && typeof r.push === 'function') { r.push(yol); basaAl(yol); return; }
      } catch (x) {}
      try { location.href = yol; } catch (x) {}          // yönlendirici yoksa düz gezinme (zaten baştan açılır)
    });

    window.addEventListener('message', function (e) {
      if (e.source !== window) return;
      var d = e.data;
      if (!d || d.source !== 'kab-kart' || !d.n) return;
      if (pageNonce && d.n !== pageNonce) return;      // jeton doğrulaması
      var ok = false;
      try { ok = kartAc(d.kimlik || 0, d.ad || '', d.slug || ''); } catch (x) {}
      try { window.postMessage({ source: 'kab', type: 'kartSonuc', ok: !!ok, n: pageNonce }, '*'); } catch (x) {}
    });
  })();

})();
