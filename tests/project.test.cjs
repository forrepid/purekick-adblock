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
  assert.equal(manifest.version, '10.19.13');
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
  const fn = extractFunction(source, 'onizBaslikCek', '\n  }\n\n  function onizBizimKapat');
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
