/* =========================================================
 * store.js — ローカル保存層
 * 暗号化顧客DB（WebCrypto AES-GCM + PBKDF2）・予約・売上・
 * バックアップ入出力・設定（マイ流派）保存・命式JSON入出力
 * すべて localStorage / ファイルに保存。外部送信なし。
 * ========================================================= */
(function (global) {
  'use strict';

  var LS_CUSTOMERS = 'ssp.customers.v1';   // 暗号化ブロブ
  var LS_SETTINGS = 'ssp.settings.v1';     // 流派設定（平文でよい）
  var LS_SALT = 'ssp.salt.v1';
  var LS_CHECK = 'ssp.check.v1';           // パスワード検証用

  /* ---------- 暗号化ユーティリティ ---------- */
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    var s = atob(b64), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }

  function hasCrypto() {
    return typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.deriveKey === 'function';
  }

  function getSalt() {
    var s = localStorage.getItem(LS_SALT);
    if (s) return b64ToBuf(s);
    var salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(LS_SALT, bufToB64(salt.buffer));
    return salt.buffer;
  }

  function deriveKey(password) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: getSalt(), iterations: 200000, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false, ['encrypt', 'decrypt']
        );
      });
  }

  function encryptJSON(obj, key) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var data = new TextEncoder().encode(JSON.stringify(obj));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data)
      .then(function (ct) { return JSON.stringify({ iv: bufToB64(iv.buffer), ct: bufToB64(ct) }); });
  }

  function decryptJSON(blob, key) {
    var o = JSON.parse(blob);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(o.iv)) }, key, b64ToBuf(o.ct))
      .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  }

  /* ---------- 顧客DB ----------
   * unlock(password) でセッション内にキーを保持。
   * データ構造: { customers: [...], reservations: [...], sales: [...] } */
  var sessionKey = null;
  var cache = null;

  function isSetup() { return !!localStorage.getItem(LS_CHECK); }
  function isUnlocked() { return sessionKey !== null; }

  function setup(password) {
    if (!hasCrypto()) return Promise.reject(new Error('この環境ではWebCrypto（暗号化機能）が利用できません。'));
    return deriveKey(password).then(function (key) {
      sessionKey = key;
      cache = { customers: [], reservations: [], sales: [] };
      return encryptJSON({ ok: true }, key).then(function (blob) {
        localStorage.setItem(LS_CHECK, blob);
        return save();
      });
    });
  }

  function unlock(password) {
    if (!hasCrypto()) return Promise.reject(new Error('この環境ではWebCrypto（暗号化機能）が利用できません。'));
    return deriveKey(password).then(function (key) {
      var check = localStorage.getItem(LS_CHECK);
      return decryptJSON(check, key).then(function () {
        sessionKey = key;
        var blob = localStorage.getItem(LS_CUSTOMERS);
        if (!blob) { cache = { customers: [], reservations: [], sales: [] }; return cache; }
        return decryptJSON(blob, key).then(function (data) { cache = data; return cache; });
      }).catch(function () { throw new Error('パスワードが違います。'); });
    });
  }

  function lock() { sessionKey = null; cache = null; }

  function save() {
    if (!sessionKey || !cache) return Promise.reject(new Error('ロックされています。'));
    return encryptJSON(cache, sessionKey).then(function (blob) {
      localStorage.setItem(LS_CUSTOMERS, blob);
      return true;
    });
  }

  function getData() { return cache; }

  function upsertCustomer(c) {
    if (!cache) throw new Error('ロックされています。');
    if (!c.id) { c.id = 'c' + Date.now() + Math.floor(Math.random() * 1000); c.createdAt = new Date().toISOString(); }
    c.updatedAt = new Date().toISOString();
    var idx = cache.customers.findIndex(function (x) { return x.id === c.id; });
    if (idx >= 0) cache.customers[idx] = c; else cache.customers.push(c);
    return save().then(function () { return c; });
  }
  function deleteCustomer(id) {
    if (!cache) throw new Error('ロックされています。');
    cache.customers = cache.customers.filter(function (x) { return x.id !== id; });
    cache.reservations = cache.reservations.filter(function (x) { return x.customerId !== id; });
    return save();
  }

  function addReservation(r) {
    if (!cache) throw new Error('ロックされています。');
    r.id = 'r' + Date.now();
    cache.reservations.push(r);
    return save().then(function () { return r; });
  }
  function deleteReservation(id) {
    cache.reservations = cache.reservations.filter(function (x) { return x.id !== id; });
    return save();
  }
  function addSale(s) {
    if (!cache) throw new Error('ロックされています。');
    s.id = 's' + Date.now();
    cache.sales.push(s);
    return save().then(function () { return s; });
  }
  function deleteSale(id) {
    cache.sales = cache.sales.filter(function (x) { return x.id !== id; });
    return save();
  }
  function salesSummary() {
    if (!cache) return {};
    var byMonth = {};
    cache.sales.forEach(function (s) {
      var key = (s.date || '').slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + (Number(s.amount) || 0);
    });
    return byMonth;
  }

  /* ---------- バックアップ（暗号化されたまま書き出し） ---------- */
  function exportBackup() {
    return {
      format: 'ssp-backup-v1',
      exportedAt: new Date().toISOString(),
      salt: localStorage.getItem(LS_SALT),
      check: localStorage.getItem(LS_CHECK),
      customers: localStorage.getItem(LS_CUSTOMERS),
      settings: localStorage.getItem(LS_SETTINGS)
    };
  }
  function importBackup(obj) {
    if (!obj || obj.format !== 'ssp-backup-v1') throw new Error('バックアップファイルの形式が正しくありません。');
    if (obj.salt) localStorage.setItem(LS_SALT, obj.salt);
    if (obj.check) localStorage.setItem(LS_CHECK, obj.check);
    if (obj.customers) localStorage.setItem(LS_CUSTOMERS, obj.customers);
    if (obj.settings) localStorage.setItem(LS_SETTINGS, obj.settings);
    lock();
    return true;
  }

  /* ---------- 設定（流派）の保存 ---------- */
  function saveSettings(settings) { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(LS_SETTINGS)) || null; } catch (e) { return null; }
  }

  /* ---------- ファイルダウンロード補助 ---------- */
  function downloadJSON(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  global.Store = {
    hasCrypto: hasCrypto,
    isSetup: isSetup,
    isUnlocked: isUnlocked,
    setup: setup,
    unlock: unlock,
    lock: lock,
    save: save,
    getData: getData,
    upsertCustomer: upsertCustomer,
    deleteCustomer: deleteCustomer,
    addReservation: addReservation,
    deleteReservation: deleteReservation,
    addSale: addSale,
    deleteSale: deleteSale,
    salesSummary: salesSummary,
    exportBackup: exportBackup,
    importBackup: importBackup,
    saveSettings: saveSettings,
    loadSettings: loadSettings,
    downloadJSON: downloadJSON
  };
})(typeof window !== 'undefined' ? window : globalThis);
