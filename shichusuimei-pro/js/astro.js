/* =========================================================
 * astro.js — 天文計算エンジン（完全オフライン）
 * 太陽黄経・二十四節気・均時差（真太陽時）・朔（新月）・旧暦
 * 簡易版 Meeus 理論に基づく近似計算（節気: ±1分程度 / 朔: ±数分程度）
 * ========================================================= */
(function (global) {
  'use strict';

  var RAD = Math.PI / 180;

  /* ---------- ユリウス日 ---------- */
  // グレゴリオ暦 (y,m,d[,時分秒 UTC]) → ユリウス日
  function jdFromUTC(y, m, d, hh, mm, ss) {
    hh = hh || 0; mm = mm || 0; ss = ss || 0;
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    var jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
    return jd + (hh + mm / 60 + ss / 3600) / 24;
  }

  // JST（UTC+9）→ ユリウス日
  function jdFromJST(y, m, d, hh, mm, ss) {
    return jdFromUTC(y, m, d, hh, mm, ss) - 9 / 24;
  }

  // ユリウス日 → { y, m, d, hh, mm, ss }（UTC）
  function utcFromJD(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var a = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var dd = Math.floor(365.25 * c);
    var e = Math.floor((b - dd) / 30.6001);
    var day = b - dd - Math.floor(30.6001 * e) + f;
    var month = (e < 14) ? e - 1 : e - 13;
    var year = (month > 2) ? c - 4716 : c - 4715;
    var di = Math.floor(day);
    var hf = (day - di) * 24;
    var hh = Math.floor(hf);
    var mf = (hf - hh) * 60;
    var mm = Math.floor(mf);
    var ss = Math.round((mf - mm) * 60);
    if (ss >= 60) { ss -= 60; mm += 1; }
    if (mm >= 60) { mm -= 60; hh += 1; }
    if (hh >= 24) { hh -= 24; di += 1; }
    return { y: year, m: month, d: di, hh: hh, mm: mm, ss: ss };
  }

  function jstFromJD(jd) { return utcFromJD(jd + 9 / 24); }

  // その日の JST 0時のユリウス日から通日番号（日柱用の整数）
  // JDN: 正午基準。JST の暦日 → その日の JDN
  function jdnOfJSTDate(y, m, d) {
    return Math.round(jdFromUTC(y, m, d, 12, 0, 0)); // 正午のJDで丸め
  }

  /* ---------- ΔT（地球時と世界時の差）簡易モデル ---------- */
  function deltaT(year) {
    // 1900〜2150 を対象とした簡易近似（秒）
    var t;
    if (year < 1920) { t = (year - 1900) / 100; return -2.79 + 149.4119 * t - 598.939 * t * t + 6196.6 * t * t * t - 19700 * t * t * t * t; }
    if (year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t; }
    if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    t = (year - 1820) / 100; return -20 + 32 * t * t - 0.5628 * (2150 - year);
  }

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  /* ---------- 太陽黄経（視黄経・精度約0.01°） ---------- */
  function sunLongitude(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
          + 0.000289 * Math.sin(3 * M * RAD);
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return norm360(lambda);
  }

  /* ---------- 均時差（分）: 真太陽時 = 平均太陽時 + E ---------- */
  function equationOfTime(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    var eps = 23.43929111 - 0.0130042 * T - 0.00000016 * T * T;
    var y = Math.tan((eps / 2) * RAD); y = y * y;
    var E = y * Math.sin(2 * L0 * RAD)
          - 2 * e * Math.sin(M * RAD)
          + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
          - 0.5 * y * y * Math.sin(4 * L0 * RAD)
          - 1.25 * e * e * Math.sin(2 * M * RAD);
    return E / RAD * 4; // ラジアン→度→分（1度=4分）
  }

  /* ---------- 月黄経（主要項のみ・精度約0.05°） ---------- */
  function moonLongitude(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
    var D  = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
    var M  = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
    var F  = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T);
    var s = function (x) { return Math.sin(x * RAD); };
    var lon = Lp
      + 6.288774 * s(Mp)
      + 1.274027 * s(2 * D - Mp)
      + 0.658314 * s(2 * D)
      + 0.213618 * s(2 * Mp)
      - 0.185116 * s(M)
      - 0.114332 * s(2 * F)
      + 0.058793 * s(2 * D - 2 * Mp)
      + 0.057066 * s(2 * D - M - Mp)
      + 0.053322 * s(2 * D + Mp)
      + 0.045758 * s(2 * D - M)
      - 0.040923 * s(M - Mp)
      - 0.034720 * s(D)
      - 0.030383 * s(M + Mp)
      + 0.015327 * s(2 * D - 2 * F)
      - 0.012528 * s(Mp + 2 * F)
      + 0.010980 * s(Mp - 2 * F);
    return norm360(lon);
  }

  /* ---------- 節気の探索 ----------
   * targetDeg の太陽黄経となる時刻（JDE）を二分探索で求める。
   * jdeGuess の前後 20 日以内に解があることを前提とする。 */
  function findSolarTerm(targetDeg, jdeGuess) {
    var lo = jdeGuess - 20, hi = jdeGuess + 20;
    var diff = function (jde) {
      var d = sunLongitude(jde) - targetDeg;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return d;
    };
    // lo が負, hi が正になるよう調整
    var dlo = diff(lo);
    if (dlo > 0) { lo -= 15; }
    var dhi = diff(hi);
    if (dhi < 0) { hi += 15; }
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (diff(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // 二十四節気テーブル: 黄経 315°=立春 から 30°刻みが「節」
  var SETSU = [
    { name: '立春', deg: 315, month: 0 },  // 寅月の始まり（index0=寅）
    { name: '啓蟄', deg: 345, month: 1 },
    { name: '清明', deg: 15,  month: 2 },
    { name: '立夏', deg: 45,  month: 3 },
    { name: '芒種', deg: 75,  month: 4 },
    { name: '小暑', deg: 105, month: 5 },
    { name: '立秋', deg: 135, month: 6 },
    { name: '白露', deg: 165, month: 7 },
    { name: '寒露', deg: 195, month: 8 },
    { name: '立冬', deg: 225, month: 9 },
    { name: '大雪', deg: 255, month: 10 },
    { name: '小寒', deg: 285, month: 11 }
  ];
  var CHUKI = [
    { name: '雨水', deg: 330 }, { name: '春分', deg: 0 },  { name: '穀雨', deg: 30 },
    { name: '小満', deg: 60 },  { name: '夏至', deg: 90 }, { name: '大暑', deg: 120 },
    { name: '処暑', deg: 150 }, { name: '秋分', deg: 180 }, { name: '霜降', deg: 210 },
    { name: '小雪', deg: 240 }, { name: '冬至', deg: 270 }, { name: '大寒', deg: 300 }
  ];

  // 黄経 deg を通過するおおよその日（年内）
  function approxDateForDeg(year, deg) {
    // 春分(0°)≈3/20.5 を基準に 1° ≈ 1.0146日 で概算
    var d0 = jdFromUTC(year, 3, 20, 12, 0, 0);
    // 春分0°(3月)〜冬至270°(12月)は同年、小寒285°〜啓蟄345°は年初側
    var dd = deg;
    if (dd > 272) dd -= 360; // 315°→-45°（同年2月）
    return d0 + dd * 365.2422 / 360;
  }

  // year 年の指定黄経の節気時刻（JST のユリウス日）
  function solarTermJD(year, deg) {
    var guess = approxDateForDeg(year, deg);
    var jde = findSolarTerm(deg, guess);
    var dt = deltaT(year) / 86400;
    return jde - dt; // TT→UT
  }

  // 指定 JD(UT) の直前の「節」を返す { name, deg, month, jd }
  function previousSetsu(jdUT) {
    var date = utcFromJD(jdUT);
    var best = null;
    for (var y = date.y - 1; y <= date.y + 1; y++) {
      for (var i = 0; i < SETSU.length; i++) {
        var jd = solarTermJD(y, SETSU[i].deg);
        if (jd <= jdUT && (!best || jd > best.jd)) {
          best = { name: SETSU[i].name, deg: SETSU[i].deg, month: SETSU[i].month, jd: jd };
        }
      }
    }
    return best;
  }

  // 指定 JD(UT) の直後の「節」
  function nextSetsu(jdUT) {
    var date = utcFromJD(jdUT);
    var best = null;
    for (var y = date.y - 1; y <= date.y + 1; y++) {
      for (var i = 0; i < SETSU.length; i++) {
        var jd = solarTermJD(y, SETSU[i].deg);
        if (jd > jdUT && (!best || jd < best.jd)) {
          best = { name: SETSU[i].name, deg: SETSU[i].deg, month: SETSU[i].month, jd: jd };
        }
      }
    }
    return best;
  }

  // ある年の立春（JST 表示用）
  function risshunJST(year) { return jstFromJD(solarTermJD(year, 315)); }
  // ある年の冬至
  function tojiJD(year) { return solarTermJD(year, 270); }

  /* ---------- 朔（新月）の探索 ---------- */
  function moonSunDiff(jde) {
    var d = moonLongitude(jde) - sunLongitude(jde);
    return norm360(d);
  }

  // jdeStart 以降で最初の朔（月と太陽の黄経差が 0 になる時刻・JDE）
  function findNewMoonAfter(jdeStart) {
    var lo = jdeStart;
    var prev = moonSunDiff(lo);
    var found = null;
    for (var i = 0; i < 35 * 24; i++) { // 1時間刻みで35日分走査
      var hi = lo + 1 / 24;
      var cur = moonSunDiff(hi);
      if (prev > 300 && cur < 60) { found = [lo, hi]; break; }
      lo = hi; prev = cur;
    }
    if (!found) return null;
    var a = found[0], b = found[1];
    for (var k = 0; k < 40; k++) {
      var mid = (a + b) / 2;
      var d = moonSunDiff(mid);
      if (d > 300) a = mid; else b = mid;
    }
    return (a + b) / 2;
  }

  /* ---------- 旧暦（天保暦準拠の簡易実装） ----------
   * 冬至を含む月を11月とし、中気を含まない月を閏月とする。
   * 戻り値: { year, month, leap, day } / 逆変換 lunarToGregorian
   */
  function lunarMonthsAround(year) {
    // year-1 年の冬至の少し前から year+1 年の冬至過ぎまでの朔をリストアップ
    var dt = deltaT(year) / 86400;
    var start = tojiJD(year - 1) - 40 + dt; // JDE
    var end = tojiJD(year + 1) + 40 + dt;
    var months = [];
    var jde = start;
    for (var i = 0; i < 32; i++) {
      var nm = findNewMoonAfter(jde);
      if (nm === null) break;
      months.push(nm - dt); // JDE→UT
      jde = nm + 1; // 次の朔を探す
      if (nm > end) break;
    }
    return months;
  }

  // JST 暦日の 0時 JD(UT)
  function jstMidnightJD(y, m, d) { return jdFromJST(y, m, d, 0, 0, 0); }

  // JST 暦日単位に丸め（朔・中気がどの暦日に属すか）
  function jstDayNumber(jdUT) {
    var t = jstFromJD(jdUT);
    return jdnOfJSTDate(t.y, t.m, t.d);
  }

  function gregorianToLunar(y, m, d) {
    var targetDay = jdnOfJSTDate(y, m, d);
    // 対象日を含みうる範囲の朔一覧（暦日単位）
    var nms = lunarMonthsAround(y);
    var days = nms.map(jstDayNumber);
    // 対象日が属する月（朔日 <= 対象日 < 次の朔日）
    var idx = -1;
    for (var i = 0; i < days.length - 1; i++) {
      if (days[i] <= targetDay && targetDay < days[i + 1]) { idx = i; break; }
    }
    if (idx < 0) return null;

    // 各月に含まれる中気を調べ、冬至を含む月から月名を振る
    var y0;
    var chukiJDs = [];
    for (y0 = y - 2; y0 <= y + 1; y0++) {
      for (var c = 0; c < CHUKI.length; c++) {
        chukiJDs.push({ deg: CHUKI[c].deg, name: CHUKI[c].name, day: jstDayNumber(solarTermJD(y0, CHUKI[c].deg)) });
      }
    }
    function chukiIn(a, b) { // 暦日 a <= x < b に含まれる中気
      return chukiJDs.filter(function (t) { return a <= t.day && t.day < b; });
    }
    // 冬至（270°）を含む月 = 11月。そこを起点に前後へ月番号を展開
    var tojiDayPrev = jstDayNumber(tojiJD(y - 1));
    var tojiDayCur = jstDayNumber(tojiJD(y));
    var anchor = -1, anchorDay = null;
    for (var j = 0; j < days.length - 1; j++) {
      if (days[j] <= tojiDayPrev && tojiDayPrev < days[j + 1]) { anchor = j; anchorDay = tojiDayPrev; }
    }
    if (anchor < 0 || anchor > idx) {
      for (var j2 = 0; j2 < days.length - 1; j2++) {
        if (days[j2] <= tojiDayCur && tojiDayCur < days[j2 + 1]) { anchor = j2; anchorDay = tojiDayCur; }
      }
    }
    if (anchor < 0) return null;

    // anchor 月を11月として、以降の月に番号を振る（閏月は番号を進めない）
    var names = []; // {num, leap}
    var num = 11, leap = false;
    names[anchor] = { num: 11, leap: false };
    // anchor から次の冬至までの間に朔が13回あれば閏あり年
    for (var k = anchor + 1; k < days.length - 1 && k <= idx + 1; k++) {
      var mid = chukiIn(days[k], days[k + 1]);
      if (mid.length === 0 && !leapUsedBetween(names, anchor, k)) {
        names[k] = { num: num, leap: true };
      } else {
        num = (num % 12) + 1;
        names[k] = { num: num, leap: false };
      }
    }
    function leapUsedBetween(arr, a, b) {
      for (var q = a; q < b; q++) { if (arr[q] && arr[q].leap) return true; }
      return false;
    }
    if (!names[idx]) return null;
    var lm = names[idx];
    var day = targetDay - days[idx] + 1;
    // 旧暦年: 11月・12月は（冬至年）、1月以降は翌年
    var lunarYear;
    var anchorDate = jstFromJD(jstMidnightJD ? jdFromJST(y, m, d, 12, 0, 0) : 0); // 使わない
    // anchorDay の属する新暦年に基づき決定
    var tojiY = (anchorDay === tojiDayPrev) ? y - 1 : y;
    if (lm.num >= 11) lunarYear = tojiY; else lunarYear = tojiY + 1;
    return { year: lunarYear, month: lm.num, leap: lm.leap, day: day };
  }

  // 旧暦 → 新暦（JST 暦日）
  function lunarToGregorian(ly, lm, leap, ld) {
    // 候補範囲を走査して一致を探す（確実だが単純）
    var startJD = jdFromUTC(ly, 1, 1, 0, 0, 0) - 40;
    for (var i = 0; i < 450; i++) {
      var t = jstFromJD(startJD + i);
      var r = gregorianToLunar(t.y, t.m, t.d);
      if (r && r.year === ly && r.month === lm && r.leap === !!leap && r.day === ld) {
        return { y: t.y, m: t.m, d: t.d };
      }
    }
    return null;
  }

  global.Astro = {
    jdFromUTC: jdFromUTC,
    jdFromJST: jdFromJST,
    utcFromJD: utcFromJD,
    jstFromJD: jstFromJD,
    jdnOfJSTDate: jdnOfJSTDate,
    deltaT: deltaT,
    sunLongitude: sunLongitude,
    moonLongitude: moonLongitude,
    equationOfTime: equationOfTime,
    solarTermJD: solarTermJD,
    previousSetsu: previousSetsu,
    nextSetsu: nextSetsu,
    risshunJST: risshunJST,
    tojiJD: tojiJD,
    SETSU: SETSU,
    CHUKI: CHUKI,
    gregorianToLunar: gregorianToLunar,
    lunarToGregorian: lunarToGregorian
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Astro;
})(typeof window !== 'undefined' ? window : globalThis);
