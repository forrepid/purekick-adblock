const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function extractFunction(source, name, endMarker) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${name} end marker exists`);
  const close = endMarker.indexOf('\n\n');
  assert.ok(close > 0, 'end marker includes a function closing brace');
  return source.slice(start, end + close);
}

test('all extension JavaScript parses', () => {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
    }
  }
  walk(root);
  assert.ok(files.length >= 6, `expected extension JS files, found ${files.length}`);
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${path.relative(root, file)}: ${result.stderr}`);
  }
});

test('manifest references existing icons and avoids required all-sites access', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.version, '10.19.14');
  assert.equal(manifest.short_name, 'PureKick Mod');
  for (const size of [16, 32, 48, 128]) {
    const icon = `icons/icon${size}.png`;
    assert.ok(fs.existsSync(path.join(root, icon)), `${icon} exists`);
    const bytes = fs.readFileSync(path.join(root, icon));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${icon} is PNG`);
  }
  assert.ok(!manifest.host_permissions.some((origin) => origin.includes('*://*/*')));
  assert.ok(manifest.optional_host_permissions.includes('https://*/*'));
  assert.ok(manifest.optional_host_permissions.includes('http://*/*'));
  const content = read('content.js');
  assert.match(content, /var SHIELD = .*#53fc18/);
  assert.match(content, /SHIELD\.replace/);
  assert.match(content, /#btn svg\{width:22px;height:22px\}/);
});

test('15-language voice clip commands parse representative spoken durations', () => {
  const content = read('content.js');
  const languageBlock = content.match(/var PK_KLIP_DILLERI = \[([\s\S]*?)\n  \];/);
  assert.ok(languageBlock, 'voice command language list exists');
  assert.equal([...languageBlock[1].matchAll(/\['[^']+',\s*'[^']+'\]/g)].length, 15);
  const parseFunction = extractFunction(content, 'pkVidSesliSure', '\n  }\n\n  function pkKlipSesOlcerOlustur');
  const parseDuration = vm.runInNewContext(`(${parseFunction})`);
  const examples = [
    ['klip on beş saniye', 15], ['clip fifteen seconds', 15], ['clip fünfzehn Sekunden', 15],
    ['clip quinze secondes', 15], ['clip quince segundos', 15], ['clip quindici secondi', 15],
    ['clip quinze segundos', 15], ['clip пятнадцать секунд', 15], ['clip 十五秒', 15],
    ['clip 십오초', 15], ['clip 十五秒', 15], ['clip خمسة عشر ثانية', 15],
    ['clip vijftien seconden', 15], ['clip piętnaście sekund', 15], ['clip पंद्रह सेकंड', 15]
  ];
  for (const [command, duration] of examples) assert.equal(parseDuration(command), duration, command);
  assert.equal(parseDuration('clip 180 seconds'), 180);
  assert.equal(parseDuration('clip 181 seconds'), 181, 'range validation remains in the command handler');
  assert.equal(parseDuration('please clip this'), 0);
});

test('selected recorder codec/bitrate are applied with codec fallback and silent filename label', () => {
  const content = read('content.js');
  const recorderStart = content.indexOf('var PK_VID_CODECS = [');
  const recorderEnd = content.indexOf('\n  function pkVidSessizEtiketi()', recorderStart);
  assert.ok(recorderStart >= 0 && recorderEnd > recorderStart);
  const recorderCode = content.slice(recorderStart, recorderEnd);
  class MockMediaRecorder {
    static isTypeSupported(mime) { return /vp8/.test(mime); }
    constructor(stream, options) {
      this.stream = stream;
      this.options = options || {};
      this.mimeType = this.options.mimeType || 'video/webm;codecs=vp8,opus';
      this.videoBitsPerSecond = this.options.videoBitsPerSecond || 0;
    }
  }
  const context = { settings: { vidCodec: 'h264', vidKalite: 'ultra', vidSes: true }, MediaRecorder: MockMediaRecorder };
  vm.runInNewContext(recorderCode, context);
  const ops = context.pkVidRecOpsiyonlar();
  assert.equal(ops.mimeType, 'video/webm;codecs=vp8,opus');
  assert.equal(ops.videoBitsPerSecond, 8000000);
  assert.equal(ops.audioBitsPerSecond, 128000);
  const created = context.pkVidRecOlustur({ id: 'stream' });
  assert.equal(created.codecYedek, true);
  assert.equal(created.kaydedici.options.mimeType, 'video/webm;codecs=vp8,opus');

  const namingStart = content.indexOf('function pkVidSessizEtiketi()');
  const namingEnd = content.indexOf('\n  function pkVidBoyutYazi(', namingStart);
  const namingContext = {
    settings: { vidDosyaSablon: '{kanal}-{tarih}-{saat}', vidKalite: 'ultra' },
    scMevcutKanal: () => 'testkanal', Date,
    chrome: { i18n: { getUILanguage: () => 'fr-FR' } }, navigator: { language: 'fr-FR' }
  };
  vm.runInNewContext(content.slice(namingStart, namingEnd), namingContext);
  assert.match(namingContext.pkVidDosyaAdi('video/webm', 'video', new Date(2026, 0, 2, 3, 4, 5).getTime(), true), /-muet\.webm$/);
  assert.match(namingContext.pkVidDosyaAdi('video/webm', 'video', Date.now(), false), /\.webm$/);
  assert.match(content, /data-pk-voice-active-badge/);
  assert.match(content, /SESLİ KLİP (?:AÇIK|DİNLİYOR)/);
});

test('every locale has the same message keys as English', () => {
  const base = Object.keys(JSON.parse(read('_locales/en/messages.json'))).sort();
  for (const lang of ['tr', 'de', 'es', 'fr', 'pt_BR', 'ru']) {
    const keys = Object.keys(JSON.parse(read(`_locales/${lang}/messages.json`))).sort();
    assert.deepEqual(keys, base, `${lang} locale key parity`);
  }
});

test('settings labels, link preview visibility, sizing, and recap match actual behavior', () => {
  const content = read('content.js');
  for (const lang of ['tr', 'en', 'de', 'es', 'fr', 'pt_BR', 'ru']) {
    const messages = JSON.parse(read('_locales/' + lang + '/messages.json'));
    assert.ok(messages.pkAcik && messages.pkKapali, lang + ' has translated on/off labels');
    assert.doesNotMatch(messages.pkAcik.message + messages.pkKapali.message, /pkAcik|pkKapali/);
  }
  const previewSettings = content.slice(content.indexOf('function bolumSekmeIciBaglanti'), content.indexOf('function bolumBahsetAyari'));
  assert.match(previewSettings, /Thumbnail kartları[\s\S]*?pkLinkOnizleme/);
  const inPageOnly = previewSettings.indexOf('if (settings.sekmeIci === true)');
  const inPageBlockEnd = previewSettings.indexOf('\n    }', inPageOnly);
  assert.ok(previewSettings.indexOf("t('pkLinkOnizleme')") > inPageBlockEnd, 'link preview remains visible when in-page open is disabled');
  assert.match(content, /embedRatio = Number\(bilgi\.oran\)/);
  const recap = content.slice(content.indexOf('function pkAiYayinOzetModalAc'), content.indexOf('function pkAiYayinOzetKur'));
  assert.match(recap, /sohbetSatirlari\(\)/);
  assert.match(recap, /mesajMetniAl\(/);
  assert.doesNotMatch(recap, /Yayıncı şu an[\s\S]*?kesintisiz devam ediyor|İzleyiciler yoğun olarak/);
});

test('chat archive sorts newest-first with stable ties and exposes a dated daily log', () => {
  const content = read('content.js');
  const orderFn = content.match(/function arOrderAnahtari\(ts\) \{[\s\S]*?\n  \}/);
  assert.ok(orderFn, 'stable archive order key exists');
  const getOrder = vm.runInNewContext('(function(){var arSonOrderTs=0, arSonOrderTie=0;' + orderFn[0] + ';return arOrderAnahtari;})()');
  const first = getOrder(100000), second = getOrder(100000), older = getOrder(99999);
  assert.ok(second > first, 'same-time events preserve arrival order');
  assert.ok(older < second, 'older event timestamps remain below newer ones');
  const pageFn = content.slice(content.indexOf('function arSayfa('), content.indexOf('function arBugunLog('));
  assert.match(pageFn, /index\('slugOrder'\)[\s\S]*?openCursor[\s\S]*?'prev'/);
  assert.match(pageFn, /orderTs > once\.orderTs/);
  assert.match(content, /createIndex\('dayOrder', \['day', 'orderTs'\]/);
  assert.match(content, /function arBugunLog\([\s\S]*?index\('dayOrder'\)/);
  const settings = content.slice(content.indexOf('function arGunlukLogKart'), content.indexOf('function bolumSohbetGorunum'));
  assert.match(settings, /Bu kanalın logunu indir/);
  assert.match(settings, /a\.download = 'PureKick-' \+ kanalDosyaAdi\(slug\)/);
  assert.match(settings, /kendiliğinden kurulum klasöründeki \/log dizinine yazamaz/);
});

test('all static ad rules are limited to Kick-origin requests', () => {
  const rules = JSON.parse(read('rules/ad-domains.json'));
  assert.ok(rules.length > 0);
  for (const rule of rules) assert.deepEqual(rule.condition.initiatorDomains, ['kick.com']);
});

test('HLS ad marker parser removes closed CUE and duration-bounded DATERANGE ads safely', () => {
  const source = read('page/worker-hook.js');
  const fn = extractFunction(source, 'stripAdSegments', '\n    }\n\n    if (origFetch)');
  const stripAdSegments = vm.runInNewContext(`(${fn})`);
  const cue = [
    '#EXTM3U', '#EXTINF:5,', 'before.ts', '#EXT-X-CUE-OUT:10',
    '#EXTINF:5,', 'ad1.ts', '#EXTINF:5,', 'ad2.ts', '#EXT-X-CUE-IN',
    '#EXTINF:5,', 'after.ts', ''
  ].join('\n');
  const cueResult = stripAdSegments(cue);
  assert.match(cueResult, /before\.ts/);
  assert.match(cueResult, /after\.ts/);
  assert.doesNotMatch(cueResult, /ad[12]\.ts|CUE-OUT|CUE-IN/);

  const daterange = [
    '#EXTM3U', '#EXTINF:6,', 'before.ts',
    '#EXT-X-DATERANGE:ID="ad-1",CLASS="ad",SCTE35-OUT=0x1234,DURATION=6.0',
    '#EXTINF:6,', 'stitched-ad-1.ts', '#EXTINF:6,', 'after.ts', ''
  ].join('\n');
  const dateResult = stripAdSegments(daterange);
  assert.match(dateResult, /before\.ts/);
  assert.match(dateResult, /after\.ts/);
  assert.doesNotMatch(dateResult, /stitched-ad-1|DATERANGE/);

  const open = '#EXTM3U\n#EXT-X-CUE-OUT\n#EXTINF:6,\nad.ts\n';
  assert.equal(stripAdSegments(open), null, 'open ad window leaves original playlist intact');
});

test('overlapping online-channel title requests share one fetch and notify every hover', async () => {
  const source = read('content.js');
  const normalize = extractFunction(source, 'sablonNormalle', '\n  }\n\n  /* Önbellekteki kalıbı diriltir');
  assert.match(normalize, /vurguKaldir\(btn\)/);
  assert.match(normalize, /vurguKaldir\(a\)/);
  assert.match(normalize, /querySelectorAll\('\.' \+ PK_VURGU_SINIF\)/);
  assert.match(normalize, /removeProperty\('background-color'\)/);
  assert.match(normalize, /\[data-state="active"\], \[aria-current="page"\]/);
  const hover = extractFunction(source, 'onizBizimBagla', '\n  }\n\n  /* KICK\'İN KENDİ KENAR ÇUBUĞU SATIRLARI');
  assert.match(hover, /onizBaslikCek\(slug/);
  assert.match(hover, /satir\.title = baslik/);
  const preview = extractFunction(source, 'onizBizimAc', '\n  }\n\n  function onizBizimGecikmeliKapat');
  assert.ok(preview.indexOf('onizKutu = kutu; onizSatir = satir;') < preview.indexOf('onizBaslikCek(k.slug'), 'cached title callback sees active preview before returning synchronously');
  const fn = extractFunction(source, 'onizBaslikCek', '\n  }\n\n  function onizBizimKapat');
  assert.match(fn, /var tazeSure = v && v\.baslik \? ONIZ_BASLIK_TAZE : 15000/);
  let fetchCount = 0;
  let resolveFetch;
  const context = {
    onizBaslikVeri: Object.create(null),
    ONIZ_BASLIK_TAZE: 120000,
    fetch: () => { fetchCount++; return new Promise((resolve) => { resolveFetch = resolve; }); },
    Date,
    encodeURIComponent,
    AbortController,
    setTimeout,
    clearTimeout,
    String,
    Object,
    Array
  };
  const getTitle = vm.runInNewContext(`(${fn})`, context);
  const results = [];
  getTitle('channel', (title) => results.push(`first:${title}`));
  getTitle('channel', (title) => results.push(`second:${title}`));
  assert.equal(fetchCount, 1);
  resolveFetch({ ok: true, json: () => Promise.resolve({ livestream: { session_title: 'Live now' } }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(results, ['first:Live now', 'second:Live now']);
});

test('IVS worker bootstrap no longer performs synchronous XHR on the page thread', () => {
  const source = read('page/worker-hook.js');
  assert.doesNotMatch(source, /\.open\(['"]GET['"],\s*u,\s*false\)/);
  assert.match(source, /importScripts\(/);
  assert.match(source, /__pkBootstrap:"failed"/);
});

const donationSource = read('content.js');
const start = donationSource.indexOf('function pkBagisAnalizEt(');
const end = donationSource.indexOf('\n  function pkTtsOku(', start);
const fn = donationSource.slice(start, end);
test('KickBot gifted KICKS alerts are attributed to the gifter', () => {
  const saved = [];
  const ctx = { pkBagisKaydet: (...args) => saved.push(args), pkBagisSayi: (v) => Number(String(v).replace(/,/g, '')) || 0, parseInt, Date, String, Array, Object, RegExp };
  vm.runInNewContext(fn + '\npkBagisAnalizEt("KickBot: @ozanpekkan just gifted 1 KICKS!");', ctx);
  assert.equal(saved.length, 1);
  assert.equal(saved[0][0], 'ozanpekkan');
  assert.equal(saved[0][1], 'Kicks');
  assert.equal(saved[0][3], 1);
  assert.match(saved[0][4], /1 Kicks gönderdi/);
});
test('profile card gallery matches exactly the 12 bundled cards', () => {
  const files = JSON.parse(read('profil-kartlari/list.json'));
  assert.equal(files.length, 12);
  assert.deepEqual(files.slice(0, 5), ['card_1.jpg', 'card_2.jpg', 'card_3.jpg', 'card_4.jpg', 'card_5.webp']);
  for (const file of files) assert.ok(fs.existsSync(path.join(root, 'profil-kartlari', file)), file + ' is bundled');
  const content = read('content.js');
  assert.match(content, /Koleksiyon Kartı Seçin \(12 Hazır Şablon/);
  assert.doesNotMatch(content, /ki <= 81/);
});
test('video color-vision modes avoid SVG filter resources and keep writes idempotent', () => {
  const content = read('content.js');
  const fn = content.slice(content.indexOf('function pkVideoFiltreleriUygula('), content.indexOf('/* Video Kontrol Çubuğu Filtre Paneli', content.indexOf('function pkVideoFiltreleriUygula(')));
  assert.doesNotMatch(fn, /data:image\/svg\+xml|feColorMatrix/);
  assert.match(fn, /hue-rotate/);
  assert.match(fn, /mevcutFiltre === oncekiUygulama\.yazilan/);
});
test('official subscription webhook event names and giftee payload are normalized', () => {
  const worker = read('page/worker-hook.js');
  assert.match(worker, /channel\.subscription\.gifts/);
  assert.match(worker, /channel\.subscription\.new/);
  assert.match(worker, /channel\.subscription\.renewal/);
  assert.match(worker, /Array\.isArray\(d\.giftees\)/);
  assert.match(worker, /broadcaster\.channel_slug/);
});
test('click-to-open and automatic link cards are independently controlled', () => {
  const content = read('content.js');
  const gates = content.slice(content.indexOf('var PK_TUR_AYAR = {'), content.indexOf('};', content.indexOf('var PK_TUR_AYAR = {')));
  assert.match(gates, /lpTum:\s*\['linkOnizleme'\]/);
  assert.doesNotMatch(gates, /lpTum:\s*\[[^\]]*sekmeIci/);
  const click = content.slice(content.indexOf('function sekmeIciTikla('), content.indexOf('/* ══════════════════════════════════════════════════════════════════════\n   * 10.5 — YAYIN KARTLARINDA', content.indexOf('function sekmeIciTikla(')));
  assert.match(click, /if \(!bilgi\)\s*\{\s*var web = lpEmbed\(a\.href\)/);
  assert.doesNotMatch(click, /linkOnizleme !== false/);
  const settings = content.slice(content.indexOf('function bolumSekmeIciBaglanti('), content.indexOf('/* ════════ SOHBET › AD TAKİBİ', content.indexOf('function bolumSekmeIciBaglanti(')));
  const clickSetting = settings.slice(0, settings.indexOf("satir(t('pkLinkOnizleme')"));
  assert.doesNotMatch(clickSetting, /lpKartlariTemizle/);
  assert.match(settings, /if \(!v\) \{ lpKartlariTemizle\(\); \}/);
  assert.match(content, /attributeFilter: \['href'\]/);
  assert.match(content, /function lpKartTikla\(b, e\)/);
});
test('X status links have an automatic preview card route independent of click setting', () => {
  const content = read('content.js');
  const start = content.indexOf('function lpEmbed(');
  const end = content.indexOf('/* ---- Önizleme penceresi ---- */', start);
  const fn = content.slice(start, end);
  const map = vm.runInNewContext('(' + fn + ')', { URL, NON_CHANNEL: {}, location: { hostname: 'kick.com' } });
  const result = map('https://x.com/SaadetPartisi/status/210773945589738307');
  assert.equal(result.ad, 'Tweet');
  assert.equal(result.metaPreview, true);
  assert.equal(result.domain, 'x.com');
});
test('Kick channel and clip links open the Kick player at responsive player size', () => {
  const content = read('content.js');
  const start = content.indexOf('function lpEmbed(');
  const end = content.indexOf('/* ---- Önizleme penceresi ---- */', start);
  const fn = content.slice(start, end);
  const map = vm.runInNewContext('(' + fn + ')', { URL, NON_CHANNEL: {}, location: { hostname: 'kick.com' } });
  const clip = map('https://kick.com/swagybarK/clips/abc123');
  assert.equal(clip.url, 'https://player.kick.com/swagybarK?clip=abc123');
  assert.equal(clip.klip, true);
  assert.equal(clip.kaynak, 'https://kick.com/swagybarK/clips/abc123');
  assert.equal(map('https://kick.com/swagybarK/clip/abc123').klipId, 'abc123');
  assert.equal(map('https://kick.com/swagybarK').url, 'https://player.kick.com/swagybarK');
  assert.match(content, /var maxW = Math\.max\(280, Math\.min\(window\.innerWidth - 24, 1280\)\)/);
  assert.match(content, /var embedOrani = Number\(bilgi\.oran\) > 0/);
  assert.match(content, /aspect-ratio:' \+ embedEnBoy/);
});
test('profile card processing excludes home category and navigation menus', () => {
  const content = read('content.js');
  const profile = content.slice(content.indexOf('function gercekProfilKartiMi('), content.indexOf('/* 13. GELİŞMİŞ PROFİL KARTI', content.indexOf('function gercekProfilKartiMi(')));
  assert.match(profile, /\[role="menu"\], \[role="listbox"\], nav, \[data-testid\*="category" i\], \[data-category-menu\]/);
  assert.match(profile, /document\.querySelector\('#chatroom-messages'\)/);
  assert.match(profile, /categories\?\|browse\|following\|followed-channels\|search/);
  assert.match(profile, /location\.pathname \|\| '\/'\)\) return false/);
  const dropCleanup = content.slice(content.indexOf('function pkClaimDiyalogTemizle('), content.indexOf('/* Yalnızca gerçek Kick sohbet kullanıcı profil kartını doğrular */'));
  assert.match(dropCleanup, /location\.pathname \|\| '\/'\)\) return/);
  assert.match(dropCleanup, /querySelectorAll\('\[role="dialog"\], \[data-testid\*="claim" i\]/);
  assert.doesNotMatch(dropCleanup, /div\.bg-surface-(?:highest|base)/);
  assert.doesNotMatch(content, /div\[class\*="cursor-\(--cursor-user-identity\)"\]\{/);
});
test('subscriber roles are normalized and collected from all sender payloads', () => {
  const worker = read('page/worker-hook.js');
  assert.match(worker, /function rolNormallestir/);
  assert.match(worker, /subscriber\|subscription\|sub/);
  assert.match(worker, /\[d\.sender, d\.user, chatMesaj\.sender, chatMesaj\.user\]/);
  assert.match(worker, /aday\.subscriber_badges/);
  assert.match(worker, /y\.roller = tumRoller\(chatRozetler\)/);
});
test('chat archive live refresh appends only newer records without redrawing the panel', () => {
  const content = read('content.js');
  const newRows = content.slice(content.indexOf('function arYeniKayitlar('), content.indexOf('/* Bugünün yerel günlük logu', content.indexOf('function arYeniKayitlar(')));
  const fn = newRows.slice(0, newRows.indexOf('\n  /*'));
  const queued = {
    old: { key: 'x|1', slug: 'x', orderTs: 100, ad: 'A', p: [{ a: 'older' }] },
    a: { key: 'x|2', slug: 'x', orderTs: 200, ad: 'B', p: [{ a: 'new link' }] },
    b: { key: 'x|3', slug: 'x', orderTs: 300, ad: 'C', p: [{ a: 'new message' }] }
  };
  const context = {
    arKuyruk: queued,
    arMetin: (parts) => (parts || []).map((part) => part.a || '').join(' '),
    arAc: (callback) => callback(null),
    Object, String, Number, Array
  };
  const run = vm.runInNewContext(`(function(){${fn}; return arYeniKayitlar;})()`, context);
  let found;
  run('x', 100, 'new', 500, (rows) => { found = rows.map((row) => row.key); });
  assert.deepEqual(JSON.parse(JSON.stringify(found)), ['x|3', 'x|2']);
  const refresh = content.slice(content.indexOf('function modPanelTazele('), content.indexOf('/* Sütuna `position:relative`', content.indexOf('function modPanelTazele(')));
  assert.match(refresh, /sonucListe\.__pkYeniKayitlariEkle\(\)/);
  assert.match(refresh, /else\s*\{[\s\S]*?modGovdeDoldur\(govde\)/);
  assert.ok(refresh.indexOf("if (modSekme === 'sohbet')") < refresh.indexOf('modGovdeDoldur(govde)'), 'chat tab skips full panel redraw');
});
test('deleted chat text falls back to archive and is rendered red with strike-through', () => {
  const content = read('content.js');
  assert.match(content, /function arKayitYakinBul\(slug, kim, ts, bitince\)/);
  assert.ok(content.includes("String(k.ad || '').trim().replace(/^@/, '').toLowerCase()"));
  assert.match(content, /var fark = Math\.abs\(\(Number\(k\.ts\) \|\| 0\) - hedefTs\)/);
  assert.match(content, /if \(\(!m \|\| !m\.metin\) && id && scKanal\)/);
  assert.match(content, /\[data-pk-silindi\] \.pk-sil-metin\{[\s\S]*?text-decoration:line-through[\s\S]*?text-decoration-color:#ef4444/);
  const worker = read('page/worker-hook.js');
  assert.match(worker, /deletedMessage = d\.message \|\| d\.deleted_message/);
  assert.match(worker, /typeof deletedMessage === 'string' \? deletedMessage/);
});
