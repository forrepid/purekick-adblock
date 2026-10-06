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
  assert.equal(manifest.version, '10.19.11');
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
});

test('every locale has the same message keys as English', () => {
  const base = Object.keys(JSON.parse(read('_locales/en/messages.json'))).sort();
  for (const lang of ['tr', 'de', 'es', 'fr', 'pt_BR', 'ru']) {
    const keys = Object.keys(JSON.parse(read(`_locales/${lang}/messages.json`))).sort();
    assert.deepEqual(keys, base, `${lang} locale key parity`);
  }
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
