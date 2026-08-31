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
 * react-kalkan.js  —  MAIN dünya, document_start.
 *
 * SORUN
 * Kick'in sohbeti zaman zaman "We are sorry, but something went wrong" ile
 * çöküyordu. Konsoldaki iz her seferinde aynı:
 *
 *   NotFoundError: Failed to execute 'removeChild' on 'Node':
 *   The node to be removed is not a child of this node.
 *       at i7 … i9 … ur … ua     ← React'in silme özyinelemesi
 *
 * NEDEN
 * React sildiği düğümün ebeveynini kendi ağacında tutar. Bir eklenti (biz ya
 * da başka biri) o ağacın altına düğüm ekler, sıra değiştirir ya da bir düğümü
 * başka yere alırsa, React sonradan `parent.removeChild(child)` çağırırken
 * `child` artık o `parent`ın çocuğu olmayabiliyor. Tarayıcı `NotFoundError`
 * atıyor, React'in hata sınırı devreye giriyor ve BÜTÜN sohbet bileşeni
 * çöküyor — kullanıcının gördüğü tek şey o gri hata kutusu.
 *
 * Sanallaştırılmış sohbet listesi bunu sıklaştırıyor: satırlar sürekli
 * geri dönüştürülüp yeniden bağlanıyor, yani yarış aralığı büyük.
 *
 * BU DOSYA NE YAPIYOR
 * Kaynaktaki uyumsuzluğu düzeltmiyor — ONU YAPMAYA ÇALIŞMAK BEYHUDE, çünkü
 * sayfada başka eklentiler de var ve hepsi aynı ağaca dokunuyor. Bunun yerine
 * ölümcül olmayan iki DOM hatasını ZARARSIZ HÂLE getiriyor:
 *
 *   removeChild  → düğüm zaten o ebeveynin altında değilse, silinecek bir şey
 *                  yoktur; istenen sonuç (düğüm orada olmasın) zaten sağlanmış.
 *                  Düğümü döndürüp sessizce geçiyoruz.
 *   insertBefore → referans düğüm o ebeveynin çocuğu değilse React'in niyeti
 *                  yine "bu düğüm bu ebeveynin altında olsun"; sona ekliyoruz.
 *
 * Başka hiçbir hata yutulmuyor; `NotFoundError` dışındaki her şey aynen
 * yukarı fırlatılıyor. Yani gerçek programlama hataları gizlenmiyor.
 *
 * TAKAS — bilerek yapılıyor
 * Prototip yaması sayfadaki HERKESİ etkiler (Kick'in kendi kodu dahil). Yani
 * Kick'in kendi bir hatası da sessizleşebilir. Buna karşılık kazanılan şey,
 * kullanıcının sohbetini tamamen kaybetmemesi. Sohbetin çökmesi kullanıcı için
 * çok daha ağır; bu yüzden kalkan açık geliyor.
 *
 * NEDEN MAIN DÜNYA
 * `Node.prototype` sayfanın kendi gerçekleşimi. ISOLATED dünyadan yamalamak
 * Kick'in React'ini etkilemez — bu yüzden bu dosya MAIN dünyada ve
 * `document_start`'ta, React'in ilk commit'inden ÖNCE çalışıyor.
 */
(function () {
  'use strict';

  /* Aynı sekmede iki kez yüklenirse (SPA gezinme, yeniden enjeksiyon)
     yamayı üst üste sarma — her sarma bir çağrı katmanı ekler. */
  if (window.__pkReactKalkan) return;
  window.__pkReactKalkan = true;

  /* 10.10 — YÜKLEME HIZI: yamayı ilk ağır render'dan SONRAYA ertele.
     Prototip yaması Kick'in KENDİ render'ının her removeChild/insertBefore
     işlemine maliyet bindiriyor; ilk yüklemede on binlerce DOM işlemi olduğu
     için bu, yükleme fazını uzatıyordu. Çökme (removeChild NotFoundError)
     sohbetin sanallaştırılmış listesi geri dönüşürken — yani ETKİLEŞİM
     anında — oluşuyor, ilk render'da değil. Bu yüzden yamayı 'load'a
     erteliyoruz: ilk render Kick'in kendi hızında akar, koruma etkileşim
     fazında devreye girer. */
  function pkKalkanKur() {
  var Dugum = window.Node;
  if (!Dugum || !Dugum.prototype) return;

  var izle = function (mesaj, ebeveyn, cocuk) {
    /* Sessiz çalışır; ayıklama gerekirse konsoldan `window.__pkDebug = true`. */
    if (!window.__pkDebug) return;
    try { console.warn('[PK] ' + mesaj, ebeveyn, cocuk); } catch (e) {}
  };

  var asilSil = Dugum.prototype.removeChild;
  Dugum.prototype.removeChild = function (cocuk) {
    /* Düğüm bu ebeveynin altında değil. ÖNCEKİ SÜRÜM burada hiçbir şey
       yapmadan dönüyordu — ama çağıranın niyeti "bu düğüm artık ekranda
       olmasın"dı. Düğüm gerçek ebeveyninin altında kaldığı için EKRANDA
       ASILI KALIYORDU; Kick'in arama açılır listesinin bazen kapanmaması
       tam olarak buydu (React listeyi kaldırmak istiyor, biz sessizce
       yutuyoruz, liste ekranda kalıyor).

       Şimdi niyeti yerine getiriyoruz: düğümü GERÇEK ebeveyninden
       kaldırıyoruz. Sonuç React'in istediğiyle aynı (düğüm belgeden çıkar),
       çökme de olmuyor. */
    if (cocuk && cocuk.parentNode !== this) {
      izle('removeChild: dugum baska ebeveynde, oradan kaldirildi', this, cocuk);
      if (cocuk.parentNode) {
        try { asilSil.call(cocuk.parentNode, cocuk); } catch (e) {}
      }
      return cocuk;
    }
    try {
      return asilSil.call(this, cocuk);
    } catch (e) {
      if (e && e.name === 'NotFoundError') {
        izle('removeChild NotFoundError yutuldu', this, cocuk);
        return cocuk;
      }
      throw e;                                  // baska her hata aynen gecsin
    }
  };

  var asilEkle = Dugum.prototype.insertBefore;
  Dugum.prototype.insertBefore = function (yeni, referans) {
    try {
      return asilEkle.call(this, yeni, referans);
    } catch (e) {
      /* Referans düğüm artık bu ebeveynin çocuğu değil. Çağıranın niyeti
         "yeni düğüm bu ebeveynin altında olsun" — sona ekleyerek onu
         karşılıyoruz. Sıra bozulabilir ama bileşen ayakta kalır. */
      if (e && e.name === 'NotFoundError' && yeni) {
        izle('insertBefore NotFoundError -> sona eklendi', this, yeni);
        try { return Dugum.prototype.appendChild.call(this, yeni); } catch (e2) {}
        return yeni;
      }
      throw e;
    }
  };
  }
  /* Ertelenmiş kurulum: ilk ağır render bittikten sonra yamayı tak. */
  if (document.readyState === 'complete') pkKalkanKur();
  else window.addEventListener('load', pkKalkanKur, { once: true });
})();
