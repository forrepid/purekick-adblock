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
 * recolor.js — PureKick "Tema Rengi" motoru.
 * Kick'in markasal yeşilini (ve tüm yeşil tonlarını) menüden seçilen renge çevirir;
 * her tonun doygunluk/parlaklığını korur → tek renk, temiz tema.
 *
 * Renk chrome.storage.local'daki `theme:{color,logo}` anahtarından okunur.
 * color === Kick yeşili (#53fc18) veya boş ise motor devre dışı (revert).
 *
 * PureKick'in kendi arayüzü Shadow DOM'da (izole) → walk/:root override oraya
 * ulaşmaz; yalnızca Kick sayfası yeniden renklenir, PureKick yeşili sabit kalır.
 */
(() => {
  // İşaretçiler PureKick'in kendi `pk-` önekini kullanır; eklentideki diğer tüm
  // yüzeylerle (pk-badge, pk-tip, data-pk-hiz…) aynı adlandırma düzeni.
  const STYLE_ID = 'pk-tema-style';
  const MARK = 'data-pk-tema';
  const SRC_MARK = 'data-pk-tema-kaynak';
  const COLOR_MARK = 'data-pk-tema-renk';
  const KICK_GREEN = '#53fc18';
  const DEFAULTS = { color: KICK_GREEN, recolorLogo: true };

  // ---------------- color utils ----------------
  function parseColor(v) {
    if (!v) return null;
    v = String(v).trim().toLowerCase();
    let m = v.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
    }
    m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3 && p.slice(0, 3).every((n) => !Number.isNaN(n))) {
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
      }
    }
    return null;
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      switch (mx) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }
  const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
  function fmt(r, g, b, a) {
    if (a >= 1) return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`;
  }
  function isGreen(rgb) {
    if (!rgb) return false;
    const [r, g, b] = rgb;
    return g > 128 && g - r > 45 && g - b > 38;
  }
  const isGreenStr = (v) => isGreen(parseColor(v));

  // ---------------- current color + mapper ----------------
  let current = { ...DEFAULTS };
  let mapColor = () => null;

  function rebuildMapper() {
    const t = parseColor(current.color) || parseColor(KICK_GREEN);
    const ref = parseColor(KICK_GREEN);
    const [tH, tS, tL] = rgbToHsl(t[0], t[1], t[2]);
    const dL = tL - rgbToHsl(ref[0], ref[1], ref[2])[2];
    mapColor = (value) => {
      const rgb = parseColor(value);
      if (!isGreen(rgb)) return null;
      const l = rgbToHsl(rgb[0], rgb[1], rgb[2])[2];
      const [nr, ng, nb] = hslToRgb(tH, tS, clamp(l + dL));
      return fmt(nr, ng, nb, rgb[3]);
    };
  }
  const recolorInStr = (s) => s.replace(/rgba?\([^)]*\)/g, (m) => mapColor(m) || m);
  const strHasGreen = (s) => { const mm = s.match(/rgba?\([^)]*\)/g); return !!mm && mm.some(isGreenStr); };

  // ---------------- per-element inline recolor ----------------
  const SIMPLE = {
    color: 'color', backgroundColor: 'background-color',
    borderTopColor: 'border-top-color', borderRightColor: 'border-right-color',
    borderBottomColor: 'border-bottom-color', borderLeftColor: 'border-left-color',
    outlineColor: 'outline-color', fill: 'fill', stroke: 'stroke',
    textDecorationColor: 'text-decoration-color', caretColor: 'caret-color',
    stopColor: 'stop-color',
  };
  function recolorEl(el) {
    if (!el || el.nodeType !== 1 || el.id === STYLE_ID) return;
    if (el.id === 'purekick-widget') return; // PureKick'in kendi host'una dokunma
    const prev = el.getAttribute(MARK);
    if (prev) {
      for (const p of prev.split(' ')) if (p) el.style.removeProperty(p);
      el.removeAttribute(MARK);
    }
    const cs = getComputedStyle(el);
    const done = [];
    for (const jp in SIMPLE) {
      const nv = mapColor(cs[jp]);
      if (nv) { el.style.setProperty(SIMPLE[jp], nv, 'important'); done.push(SIMPLE[jp]); }
    }
    const bs = cs.boxShadow;
    if (bs && bs !== 'none' && strHasGreen(bs)) { el.style.setProperty('box-shadow', recolorInStr(bs), 'important'); done.push('box-shadow'); }
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none' && strHasGreen(bi)) { el.style.setProperty('background-image', recolorInStr(bi), 'important'); done.push('background-image'); }
    if (done.length) {
      // Kick kullandığı `transition: all` yüzünden yeşil→hedef değişimi HER React
      // re-render'ında yeşilden geçerek animasyona giriyor → sık render olan kontrollerde
      // (örn. sohbet "Gönder" butonu) kalıcı yeşil flaş. Geçişi kapatıp recolor'u anlık
      // ve sabit yapıyoruz (renk geçiş animasyonu görsel olarak zaten fark edilmez).
      el.style.setProperty('transition-property', 'none', 'important'); done.push('transition-property');
      el.setAttribute(MARK, done.join(' '));
    }
  }

  // ---------------- SVG <img> logos ----------------
  const SVG_SRC = /\.svg(\?|$)/i;
  const svgCache = new Map();
  const recolorSvgText = (txt) => txt
    .replace(/#[0-9a-fA-F]{6}\b/g, (m) => mapColor(m) || m)
    .replace(/#[0-9a-fA-F]{3}\b/g, (m) => mapColor(m) || m)
    .replace(/rgba?\([^)]*\)/g, (m) => mapColor(m) || m);
  async function recolorSvgImg(img) {
    if (isNoop() || current.recolorLogo === false) return;
    const orig = img.getAttribute(SRC_MARK) || img.src;
    if (!orig || orig.startsWith('data:') || !SVG_SRC.test(orig)) return;
    if (img.getAttribute(COLOR_MARK) === current.color) return;
    const target = current.color; // await sırasında renk değişebilir → stale swap'ı önlemek için sabitle
    // Bu renk için hazır boyalı data-URI cache'te varsa fetch'siz ANINDA uygula → logo flaşı yok.
    const cachedUri = cachedLogos[orig];
    if (cachedUri) {
      if (!img.hasAttribute(SRC_MARK)) img.setAttribute(SRC_MARK, orig);
      img.setAttribute(COLOR_MARK, target);
      img.src = cachedUri;
      return;
    }
    try {
      let txt = svgCache.get(orig);
      if (txt == null) { txt = await (await fetch(orig)).text(); svgCache.set(orig, txt); }
      if (current.color !== target) return; // fetch beklerken renk değişti → bu boyamayı iptal et (hızlı geçişte doğru renk kazanır)
      if (!/<svg/i.test(txt)) return;
      const rec = recolorSvgText(txt);
      if (rec === txt) return;
      const uri = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(rec);
      if (!img.hasAttribute(SRC_MARK)) img.setAttribute(SRC_MARK, orig);
      img.setAttribute(COLOR_MARK, target);
      img.src = uri;
      cachedLogos[orig] = uri; // sonraki açılışta anında uygulanır
      try { chrome.storage.local.set({ themeLogo: { color: target, map: cachedLogos } }); } catch (e) { /* storage yok */ }
    } catch { /* cross-origin / fetch blocked */ }
  }

  function walk(root) {
    if (root.nodeType === 1) { recolorEl(root); if (root.tagName === 'IMG') void recolorSvgImg(root); }
    if (root.querySelectorAll) {
      for (const el of root.querySelectorAll('*')) {
        recolorEl(el);
        if (el.tagName === 'IMG') void recolorSvgImg(el);
      }
    }
  }

  // ---------------- :root token override ----------------
  let ORIGINAL_TOKENS = null;
  function captureTokens() {
    const map = {};
    const rs = getComputedStyle(document.documentElement);
    for (let i = 0; i < rs.length; i++) {
      const p = rs[i];
      if (p.charCodeAt(0) !== 45 || p.charCodeAt(1) !== 45) continue;
      const val = rs.getPropertyValue(p).trim();
      if (isGreen(parseColor(val))) map[p] = val;
    }
    return map;
  }
  // ---------------- class-based overrides (STABLE path) ----------------
  const PROBE_PROPS = {
    backgroundColor: 'background-color', color: 'color', borderTopColor: 'border-color',
    outlineColor: 'outline-color', fill: 'fill', stroke: 'stroke',
    textDecorationColor: 'text-decoration-color', caretColor: 'caret-color',
  };
  const COLOR_UTIL = /^(bg|text|border|fill|stroke|outline|ring|decoration|accent|caret|divide|from|via|to)-/;
  const VARIANT = {
    hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible',
    'focus-within': ':focus-within', active: ':active', disabled: ':disabled', visited: ':visited',
  };
  function parseVariant(v) {
    // `group-*` varyantları `.group` sınıflı bir ATA elemente göre uygulanır; diğerleri
    // elemanın kendisine. scope alanı buildClassRules'ın seçiciyi doğru kurmasını sağlar.
    let scope = 'self';
    if (v.slice(0, 6) === 'group-') { scope = 'group'; v = v.slice(6); }
    let out = null;
    if (VARIANT[v]) out = { sel: VARIANT[v] };
    else {
      let m = v.match(/^(data|aria)-\[([a-z-]+)=([^\]]+)\]$/i);
      if (m) { const a = m[1].toLowerCase() + '-' + m[2].toLowerCase(); out = { sel: `[${a}="${m[3]}"]`, attr: a, val: m[3] }; }
      else if ((m = v.match(/^aria-([a-z-]+)$/i))) { const a = 'aria-' + m[1].toLowerCase(); out = { sel: `[${a}="true"]`, attr: a, val: 'true' }; }
      else if ((m = v.match(/^data-([a-z-]+)$/i))) { const a = 'data-' + m[1].toLowerCase(); out = { sel: `[${a}]`, attr: a, val: '' }; }
    }
    if (out) out.scope = scope;
    return out;
  }
  // Tailwind'in `!` (important) önekini ayıklayıp segmentin renk-utility'si olup olmadığına bak
  // (ör. Kick'in aktif emote sekmesi: `group-data-[active=true]:!bg-green-500`).
  const isColorUtil = (seg) => COLOR_UTIL.test(seg.charAt(0) === '!' ? seg.slice(1) : seg);
  /* ── Sınıf kuralları: ARTIMLI üretim ───────────────────────────────────
   * ESKİ HATA: kurallar yalnızca applyStyle() anında DOM'da bulunan sınıflar
   * için üretiliyordu. Kick bir SPA — ayarlar/kategori sayfasına geçince ya da
   * "Abone Ol" penceresi açılınca O ANA KADAR HİÇ GÖRÜLMEMİŞ sınıflar basılıyor
   * (ör. `text-surface-onSurfacePrimary`). Onlara kural üretilmediği için
   * o öğeler Kick'in yeşilinde kalıyordu.
   * ÇÖZÜM: yeni sınıf göründüğü an ölçülüp kuralı eklenir; bir kez ölçülen
   * sınıf (isabet etsin etmesin) `seenClasses`e girer, bir daha ölçülmez. */
  let seenClasses = new Set();   // ölçülmüş sınıf adları
  let classRules = [];           // üretilmiş CSS kuralları
  let rootCSS = '';              // :root{...} bloğu

  function collectInto(el, out) {
    const cl = typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class'));
    if (!cl) return;
    for (const c of String(cl).split(/\s+/)) {
      if (!c || seenClasses.has(c)) continue;
      if (isColorUtil(c.slice(c.lastIndexOf(':') + 1))) out.add(c);
    }
  }
  function collectTree(root, out) {
    if (!root || root.nodeType !== 1) return;
    collectInto(root, out);
    if (root.querySelectorAll) for (const el of root.querySelectorAll('[class]')) collectInto(el, out);
  }

  function probeClasses(classes) {
    const child = document.createElement('span');
    child.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none';
    const group = document.createElement('div'); // group-* varyantları için yeniden kullanılan `.group` atası
    group.className = 'group';
    const readAll = () => { const cs = getComputedStyle(child); const o = {}; for (const k in PROBE_PROPS) o[k] = cs[k]; return o; };
    // Bir sınıfı doğru bağlamda dener. groupConds !== null ise child'ı `.group[...]` atasının
    // içine koyar (group-* varyant kuralları eşleşsin); selfConds child'ın kendi attribute'ları.
    const probeCtx = (fullClass, selfConds, groupConds) => {
      const useGroup = groupConds !== null;
      if (useGroup) { for (const c of groupConds) group.setAttribute(c.attr, c.val); group.appendChild(child); document.documentElement.appendChild(group); }
      else document.documentElement.appendChild(child);
      child.className = '';
      for (const c of selfConds) child.setAttribute(c.attr, c.val);
      const before = readAll();
      child.className = fullClass;
      const after = readAll();
      for (const c of selfConds) child.removeAttribute(c.attr);
      const hits = [];
      for (const k in PROBE_PROPS) {
        if (after[k] !== before[k] && isGreenStr(after[k])) { const nv = mapColor(after[k]); if (nv) hits.push([PROBE_PROPS[k], nv]); }
      }
      child.remove();
      if (useGroup) { for (const c of groupConds) group.removeAttribute(c.attr); group.remove(); }
      return hits;
    };
    const rules = [];
    for (const cls of classes) {
      seenClasses.add(cls);          // isabet etmese de bir daha ölçme
      const segs = cls.split(':');
      const base = segs.pop();
      let selfSel = '', groupSel = '', skip = false, hasGroup = false;
      const selfConds = [], groupConds = [];
      for (const v of segs) {
        const pv = parseVariant(v);
        if (!pv) { skip = true; break; }
        if (pv.scope === 'group') { hasGroup = true; groupSel += pv.sel; if (pv.attr !== undefined) groupConds.push(pv); }
        else { selfSel += pv.sel; if (pv.attr !== undefined) selfConds.push(pv); }
      }
      if (skip) continue;
      let hits = probeCtx(cls, selfConds, hasGroup ? groupConds : null);
      // Pseudo-only self varyantları (:hover/:focus/:active) probe'da tetiklenemez; tam sınıf
      // bir şey vermezse BASE utility'yi tek başına dene (gerçek tespit, tahmin yok).
      if (!hits.length && selfSel && selfConds.length === 0 && !hasGroup) hits = probeCtx(base, [], null);
      if (!hits.length) continue;
      const prefix = hasGroup ? '.group' + groupSel + ' ' : '';
      // `transition:none` — bkz. recolorEl: Kick'in geçiş animasyonu yeşil flaşa yol açıyor;
      // stylesheet kuralı React re-render'larına dayanıklı olduğundan asıl kalıcı çözüm bu.
      rules.push(prefix + '.' + CSS.escape(cls) + selfSel + '{' + hits.map(([p, v]) => `${p}:${v} !important`).join(';') + ';transition:none !important}');
    }
    child.remove();
    return rules;
  }

  /* Üretilmiş parçaları tek stylesheet'e yazar ve bir sonraki açılış için cache'ler. */
  function writeStyle() {
    const parts = [];
    if (rootCSS) parts.push(rootCSS);
    if (classRules.length) parts.push(classRules.join('\n'));
    const css = parts.join('\n');
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; (document.head || document.documentElement).appendChild(st); }
    st.textContent = css;
    st.disabled = false; // güncel içerikle tekrar etkinleştir
    // Bir sonraki sayfa açılışında renkler ANINDA gelsin diye üretilen CSS'i cache'le;
    // seedFromCache() bunu Kick daha yeşili basmadan enjekte eder → açılış flaşı yok.
    if (css) {
      cachedCSS = { color: current.color, css: css };
      try { chrome.storage.local.set({ themeCSS: cachedCSS }); } catch (e) { /* storage yok */ }
    }
  }

  function applyStyle() {
    // KRİTİK: Ölçüm sırasında KENDİ stylesheet'imizi devre dışı bırak ki captureTokens ve
    // probeClasses Kick'in ORİJİNAL yeşilini okusun — bizim önceki uyguladığımız rengi
    // değil. Aksi halde (renk değişimi ya da seedFromCache tohumu aktifken) probe, örn.
    // bg-primary-base'i mor/mavi görür → "yeşil değil" → kural üretilmez → buton eski yeşilde
    // kalır (renge göre bozulma). Senkron toggle olduğu için ekranda flaş oluşmaz.
    const st = document.getElementById(STYLE_ID);
    if (st) st.disabled = true;
    if (!ORIGINAL_TOKENS || Object.keys(ORIGINAL_TOKENS).length === 0) ORIGINAL_TOKENS = captureTokens();
    const decls = [];
    for (const p in ORIGINAL_TOKENS) {
      const nv = mapColor(ORIGINAL_TOKENS[p]);
      if (nv) decls.push(`${p}:${nv} !important`);
    }
    rootCSS = decls.length ? `:root{${decls.join(';')}}` : '';
    // Renk değişmiş olabilir → sınıf kuralları sıfırdan üretilir.
    seenClasses = new Set(); classRules = []; pendingClasses = new Set();
    const hepsi = new Set();
    collectTree(document.documentElement, hepsi);
    classRules = probeClasses(hepsi);
    writeStyle();
  }

  /* ── Yeni sınıf tarayıcı ────────────────────────────────────────────────
   * Gözlemci yeni düğüm/sınıf gördüğünde adları burada birikir; kısa bir
   * gecikmeyle TEK seferde ölçülür (mutation başına ölçüm pahalı olurdu).
   * Yalnızca DAHA ÖNCE GÖRÜLMEMİŞ renk-utility sınıfları ölçülür. */
  let pendingClasses = new Set();
  let scanTimer = 0;
  function noteTree(root) { if (!isNoop()) collectTree(root, pendingClasses); }
  function scheduleScan() {
    if (scanTimer || !pendingClasses.size) return;
    scanTimer = setTimeout(() => { scanTimer = 0; flushScan(); }, 120);
  }
  function flushScan() {
    if (isNoop() || !pendingClasses.size) return;
    const batch = pendingClasses; pendingClasses = new Set();
    const st = document.getElementById(STYLE_ID);
    if (st) st.disabled = true;      // Kick'in orijinal yeşilini oku (bkz. applyStyle)
    let yeni = [];
    try { yeni = probeClasses(batch); } finally { if (st) st.disabled = false; }
    if (yeni.length) { classRules.push(...yeni); writeStyle(); }
  }

  // ---------------- revert ----------------
  function revert() {
    document.getElementById(STYLE_ID)?.remove();
    for (const el of document.querySelectorAll(`[${MARK}]`)) {
      for (const p of (el.getAttribute(MARK) || '').split(' ')) if (p) el.style.removeProperty(p);
      el.removeAttribute(MARK);
    }
    for (const img of document.querySelectorAll(`[${SRC_MARK}]`)) {
      img.src = img.getAttribute(SRC_MARK);
      img.removeAttribute(SRC_MARK);
      img.removeAttribute(COLOR_MARK);
    }
  }

  const isNoop = () => !current.color || current.color.toLowerCase() === KICK_GREEN;

  // ---------------- observer ----------------
  let observer = null;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((muts) => {
      if (isNoop()) return;
      const added = new Set();
      const touched = new Set();
      for (const m of muts) {
        if (m.type === 'childList') { for (const n of m.addedNodes) if (n.nodeType === 1) added.add(n); }
        else if (m.target.nodeType === 1) touched.add(m.target);
      }
      for (const n of added) if (n.isConnected) { walk(n); noteTree(n); }
      for (const n of touched) {
        if (!n.isConnected || added.has(n)) continue;
        recolorEl(n);
        if (n.tagName === 'IMG') void recolorSvgImg(n);
        collectInto(n, pendingClasses);   // sınıfı değişen öğe yeni bir utility getirmiş olabilir
      }
      scheduleScan();   // yeni sınıf varsa kuralları artımlı üret
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'data-state', 'aria-selected', 'aria-current', 'data-active', 'disabled'],
    });
  }
  function stopObserver() { observer?.disconnect(); observer = null; }

  // ---------------- instant paint: geçen oturumun cache'i (CSS + logolar) ----------------
  let cachedCSS = null;                     // { color, css } — bir önceki oturumda üretilmiş stil
  const cachedLogos = Object.create(null);  // origSrc -> mevcut renk için boyalı data-URI
  function seedFromCache() {
    if (isNoop() || !cachedCSS || cachedCSS.color !== current.color || !cachedCSS.css) return;
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; (document.head || document.documentElement).appendChild(st); }
    if (!st.textContent) st.textContent = cachedCSS.css; // yalnızca boşsa tohumla; dinamik geçiş sonra tazeler
  }

  // ---------------- apply / boot ----------------
  function applyAll() {
    if (isNoop()) { revert(); stopObserver(); return; }  // devre dışı / Kick yeşili → tam geri al
    rebuildMapper();
    applyStyle();          // <style>'ı YERİNDE oluşturur/günceller — kaldır-ekle flaşı yok
    walk(document.body);   // recolorEl her elemanı yeniden okuyup işaretler (renk değişimi dahil)
    startObserver();
  }

  function applyTheme(th) {
    th = th || {};
    const newColor = th.color || KICK_GREEN;
    if (newColor !== current.color) for (const k in cachedLogos) delete cachedLogos[k]; // eski rengin logoları geçersiz
    current = { color: newColor, recolorLogo: th.logo !== false };
    applyAll();
  }

  function whenBody(fn) { if (document.body) fn(); else requestAnimationFrame(() => whenBody(fn)); }

  function loadAndApply() {
    try {
      chrome.storage.local.get({ theme: null, themeCSS: null, themeLogo: null }, (s) => {
        const th = (s && s.theme) || {};
        current = { color: th.color || KICK_GREEN, recolorLogo: th.logo !== false };
        cachedCSS = (s && s.themeCSS) || null;
        const tl = s && s.themeLogo;
        if (tl && tl.color === current.color && tl.map) for (const k in tl.map) cachedLogos[k] = tl.map[k];
        seedFromCache();     // ANINDA boya (geçen seferki CSS ile), <body> beklemeden
        whenBody(() => {
          applyAll();        // tam dinamik geçiş (yeniden üret + cache'i tazele)
          [500, 1200, 2500, 5000].forEach((ms) => setTimeout(resettle, ms));
        });
      });
    } catch { whenBody(applyAll); }
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.theme) applyTheme(changes.theme.newValue);
    });
  } catch { /* storage unavailable */ }

  function resettle() {
    if (isNoop() || document.hidden) return;
    if (!document.getElementById(STYLE_ID) || !ORIGINAL_TOKENS || !Object.keys(ORIGINAL_TOKENS).length) applyStyle();
    walk(document.body);
    noteTree(document.body); scheduleScan();
  }

  /* SPA sayfa geçişi — Kick tam sayfa yenilemiyor. Düğümler yeniden kullanılırsa
   * gözlemci hiç tetiklenmeyebilir; rota değişince gövdeyi bir kez daha tara.
   * Yalnızca görülmemiş sınıflar ölçüldüğü için maliyeti ihmal edilebilir. */
  function onRoute() {
    if (isNoop()) return;
    [80, 400, 1200].forEach((ms) => setTimeout(() => {
      if (isNoop() || !document.body) return;
      noteTree(document.body); scheduleScan(); walk(document.body);
    }, ms));
  }
  try {
    for (const m of ['pushState', 'replaceState']) {
      const orij = history[m];
      history[m] = function () { const r = orij.apply(this, arguments); try { onRoute(); } catch (e) {} return r; };
    }
    addEventListener('popstate', onRoute);
  } catch (e) { /* history erişilemiyor */ }
  function boot() {
    // document_start'ta çalışır: documentElement hazır olur olmaz cache'i tohumla; tam geçiş <body>'yi bekler.
    if (!document.documentElement) { requestAnimationFrame(boot); return; }
    loadAndApply();
  }
  boot();
})();
