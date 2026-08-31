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
 * googletag-stub.js  —  MAIN (sayfa) dünyasında çalışır.
 *
 * Kick'in reklam kodu, Google'ın "googletag" (GPT) ve "google.ima" (IMA SDK)
 * kütüphanelerini bekler. Bu dosya, o kütüphanelerin yerine hiçbir şey yapmayan
 * (no-op) sahte nesneler koyar. Böylece:
 *   - Reklam isteği hiç oluşturulmaz,
 *   - Reklam kodu hata vermeden "reklam yok" gibi davranır,
 *   - Video oynatıcı reklam beklemeden yayına devam eder.
 *
 * Hiçbir ağ isteği yapmaz, hiçbir veri toplamaz. Sadece window.googletag ve
 * window.google.ima nesnelerini sahte sürümleriyle kilitler.
 */
(function () {
  'use strict';

  if (window.__kab_stubbed) return;
  window.__kab_stubbed = true;

  var noop = function () {};
  var ret = function (v) { return function () { return v; }; };
  var self = function () { return this; };

  /* ---- googletag (Google Publisher Tag) sahtesi ---- */

  var slot = {
    addService: self, clearCategoryExclusions: self, clearTargeting: self,
    defineSizeMapping: self, get: ret(null), getAdUnitPath: ret(''),
    getAttributeKeys: ret([]), getCategoryExclusions: ret([]), getDomId: ret(''),
    getName: ret(''), getResponseInformation: ret(null), getSlotElementId: ret(''),
    getTargeting: ret([]), getTargetingKeys: ret([]), set: self,
    setCategoryExclusion: self, setClickUrl: self, setCollapseEmptyDiv: self,
    setForceSafeFrame: self, setSafeFrameConfig: self, setTargeting: self,
    updateTargetingFromMap: self
  };

  var pubads = {
    addEventListener: noop, clearCategoryExclusions: self, clearTargeting: self,
    collapseEmptyDivs: noop, disableInitialLoad: noop, display: noop,
    enableAsyncRendering: noop, enableLazyLoad: noop, enableSingleRequest: noop,
    enableVideoAds: noop, get: ret(null), getAttributeKeys: ret([]),
    getSlots: ret([]), getTargeting: ret([]), getTargetingKeys: ret([]),
    isInitialLoadDisabled: ret(false), refresh: noop, set: self,
    setCategoryExclusion: self, setCentering: noop, setForceSafeFrame: noop,
    setLocation: noop, setPrivacySettings: self, setPublisherProvidedId: noop,
    setRequestNonPersonalizedAds: noop, setSafeFrameConfig: noop,
    setTargeting: self, setVideoContent: noop, updateCorrelator: noop
  };

  var companionAds = { addEventListener: noop, enableSyncLoading: noop, setRefreshUnfilledSlots: noop };
  var sizeMappingBuilder = { addSize: self, build: ret(null) };

  var googletag = {
    apiReady: true,
    pubadsReady: true,
    cmd: [],
    companionAds: ret(companionAds),
    content: ret({}),
    defineOutOfPageSlot: ret(slot),
    defineSlot: ret(slot),
    destroySlots: noop,
    disablePublisherConsole: noop,
    display: noop,
    enableServices: noop,
    getVersion: ret(''),
    openConsole: noop,
    pubads: ret(pubads),
    setAdIframeTitle: noop,
    setConfig: noop,
    sizeMapping: ret(sizeMappingBuilder)
  };

  // Kick, reklam kodunu genelde `googletag.cmd.push(fn)` ile kuyruğa alır.
  // cmd dizisine bir fonksiyon eklendiği anda onu hemen (zararsızca) çalıştırıp
  // atarız; içindeki reklam çağrıları yukarıdaki no-op'lara düştüğü için hiçbir
  // reklam yüklenmez.
  googletag.cmd = new Proxy(googletag.cmd, {
    set: function (target, prop, value) {
      if (prop === 'length') { target.length = value; return true; }
      target[prop] = value;
      if (typeof value === 'function') { try { value(); } catch (e) { /* yut */ } }
      return true;
    }
  });

  Object.defineProperty(window, 'googletag', { value: googletag, writable: false, configurable: false });

  /* ---- google.ima (Interactive Media Ads / video reklam SDK'sı) sahtesi ---- */

  var ima = {
    AdDisplayContainer: function () { this.initialize = noop; this.destroy = noop; },
    AdError: function () {},
    AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
    AdEvent: { Type: {
      AD_BREAK_READY: 'adBreakReady', ALL_ADS_COMPLETED: 'allAdsCompleted',
      CLICK: 'click', COMPLETE: 'complete',
      CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
      CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
      FIRST_QUARTILE: 'firstQuartile', IMPRESSION: 'impression',
      LOADED: 'loaded', LOG: 'log', MIDPOINT: 'midpoint',
      PAUSED: 'paused', RESUMED: 'resumed', SKIPPED: 'skipped',
      STARTED: 'started', THIRD_QUARTILE: 'thirdQuartile',
      VOLUME_CHANGED: 'volumeChanged'
    } },
    AdsLoader: function () {
      this.addEventListener = noop; this.removeEventListener = noop;
      this.requestAds = noop; this.destroy = noop;
      this.getSettings = ret({}); this.contentComplete = noop;
    },
    AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
    AdsRenderingSettings: function () {},
    AdsRequest: function () {},
    ImaSdkSettings: function () {
      this.setAutoPlayAdBreaks = noop; this.setCompanionBackfill = noop;
      this.setLocale = noop; this.setNumRedirects = noop;
      this.setPlayerType = noop; this.setPlayerVersion = noop;
      this.setVpaidMode = noop;
    },
    ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
    VERSION: '0.0.0-kadblock-stub'
  };

  var g = window.google || {};
  g.ima = ima;
  Object.defineProperty(window, 'google', { value: g, writable: false, configurable: false });

  window.dispatchEvent(new CustomEvent('kab-stub-ready'));
})();
