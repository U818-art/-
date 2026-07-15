/* =========================================================
   U818 Astro Engine
   出生図（ネイタルチャート）計算エンジン
   - 10天体の黄経（トロピカル・地心視位置ベースの近似計算）
   - アセンダント / MC / プラシーダスハウス
   - アスペクト検出
   精度目安: 太陽・惑星 ±0.1°程度 / 月 ±0.3°程度（1900-2100年）
   ========================================================= */

var AstroEngine = (function () {
  "use strict";

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  function norm360(x) {
    x = x % 360;
    return x < 0 ? x + 360 : x;
  }

  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function tand(x) { return Math.tan(x * D2R); }

  /* ---------- ユリウス日 ---------- */
  function julianDay(y, mo, d, hourUTC) {
    if (mo <= 2) { y -= 1; mo += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5 + hourUTC / 24;
  }

  /* ---------- 黄道傾斜角 ---------- */
  function obliquity(T) {
    return 23.43929111 - 0.0130041667 * T - 1.6389e-7 * T * T + 5.0361e-7 * T * T * T;
  }

  /* ---------- 太陽黄経（Meeus 簡略式・視位置に近い幾何黄経） ---------- */
  function sunLongitude(T) {
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M)
          + (0.019993 - 0.000101 * T) * sind(2 * M)
          + 0.000289 * sind(3 * M);
    return norm360(L0 + C);
  }

  /* ---------- 月黄経（Meeus 第47章の主要項） ---------- */
  var MOON_TERMS = [
    // [係数(度), D, M, M', F]
    [6.288774, 0, 0, 1, 0],
    [1.274027, 2, 0, -1, 0],
    [0.658314, 2, 0, 0, 0],
    [0.213618, 0, 0, 2, 0],
    [-0.185116, 0, 1, 0, 0],
    [-0.114332, 0, 0, 0, 2],
    [0.058793, 2, 0, -2, 0],
    [0.057066, 2, -1, -1, 0],
    [0.053322, 2, 0, 1, 0],
    [0.045758, 2, -1, 0, 0],
    [-0.040923, 0, 1, -1, 0],
    [-0.034720, 1, 0, 0, 0],
    [-0.030383, 0, 1, 1, 0],
    [0.015327, 2, 0, 0, -2],
    [-0.012528, 0, 0, 1, 2],
    [0.010980, 0, 0, 1, -2],
    [0.010675, 4, 0, -1, 0],
    [0.010034, 0, 0, 3, 0],
    [0.008548, 4, 0, -2, 0],
    [-0.007888, 2, 1, -1, 0],
    [-0.006766, 2, 1, 0, 0],
    [-0.005163, 1, 0, -1, 0]
  ];

  function moonLongitude(T) {
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841);
    var D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868);
    var M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699);
    var F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000);
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;

    var sum = 0;
    for (var i = 0; i < MOON_TERMS.length; i++) {
      var t = MOON_TERMS[i];
      var arg = t[1] * D + t[2] * M + t[3] * Mp + t[4] * F;
      var coef = t[0];
      if (t[2] === 1 || t[2] === -1) coef *= E;
      if (t[2] === 2 || t[2] === -2) coef *= E * E;
      sum += coef * sind(arg);
    }
    return norm360(Lp + sum);
  }

  /* ---------- 惑星軌道要素（JPL近似・J2000基準 + 世紀あたり変化率） ----------
     [a(au), e, I(deg), L(deg), 近日点黄経(deg), 昇交点黄経(deg)] + 同順の変化率 */
  var ELEMENTS = {
    mercury: {
      base: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
      rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]
    },
    venus: {
      base: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
      rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]
    },
    earth: {
      base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
      rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]
    },
    mars: {
      base: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
      rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]
    },
    jupiter: {
      base: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
      rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]
    },
    saturn: {
      base: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
      rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
    },
    uranus: {
      base: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
      rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]
    },
    neptune: {
      base: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
      rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
    },
    pluto: {
      base: [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684],
      rate: [-0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]
    }
  };

  function keplerSolve(Mdeg, e) {
    var M = norm360(Mdeg) * D2R;
    var E = M + e * Math.sin(M);
    for (var i = 0; i < 20; i++) {
      var dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  /* J2000黄道座標での日心位置ベクトル */
  function helioVector(key, T) {
    var el = ELEMENTS[key];
    var a = el.base[0] + el.rate[0] * T;
    var e = el.base[1] + el.rate[1] * T;
    var I = el.base[2] + el.rate[2] * T;
    var L = el.base[3] + el.rate[3] * T;
    var peri = el.base[4] + el.rate[4] * T;
    var node = el.base[5] + el.rate[5] * T;

    var M = L - peri;
    var w = peri - node;
    var E = keplerSolve(M, e);

    var xp = a * (Math.cos(E) - e);
    var yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

    var cw = cosd(w), sw = sind(w);
    var cn = cosd(node), sn = sind(node);
    var ci = cosd(I), si = sind(I);

    return {
      x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
      y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
      z: (sw * si) * xp + (cw * si) * yp
    };
  }

  /* 歳差補正（J2000黄経 → 元期黄経） */
  function precession(T) {
    return (5029.0966 * T + 1.11113 * T * T) / 3600;
  }

  function planetGeoLongitude(key, T) {
    var p = helioVector(key, T);
    var eV = helioVector("earth", T);
    var gx = p.x - eV.x;
    var gy = p.y - eV.y;
    var lonJ2000 = norm360(Math.atan2(gy, gx) * R2D);
    return norm360(lonJ2000 + precession(T));
  }

  /* ---------- 全天体の黄経 ---------- */
  var PLANET_KEYS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

  function longitudesAt(jd) {
    var T = (jd - 2451545.0) / 36525;
    var result = {};
    result.sun = sunLongitude(T);
    result.moon = moonLongitude(T);
    var keys = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
    for (var i = 0; i < keys.length; i++) {
      result[keys[i]] = planetGeoLongitude(keys[i], T);
    }
    return result;
  }

  /* ---------- 恒星時・アングル ---------- */
  function gmstDeg(jd) {
    var T = (jd - 2451545.0) / 36525;
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  function lonFromRA(raDeg, epsDeg) {
    return norm360(Math.atan2(sind(raDeg), cosd(raDeg) * cosd(epsDeg)) * R2D);
  }

  function ascendant(ramc, epsDeg, latDeg) {
    return norm360(Math.atan2(
      cosd(ramc),
      -(sind(ramc) * cosd(epsDeg) + tand(latDeg) * sind(epsDeg))
    ) * R2D);
  }

  /* ---------- プラシーダスハウス（反復解法） ---------- */
  function placidusCusp(which, ramc, epsDeg, latDeg) {
    var offset = { 11: 30, 12: 60, 2: 120, 3: 150 }[which];
    var lam = lonFromRA(norm360(ramc + offset), epsDeg);
    for (var i = 0; i < 40; i++) {
      var dec = Math.asin(sind(epsDeg) * sind(lam)) * R2D;
      var cosSA = -tand(latDeg) * tand(dec);
      if (cosSA > 1) cosSA = 1;
      if (cosSA < -1) cosSA = -1;
      var SA = Math.acos(cosSA) * R2D; // 昼半弧
      var targetRA;
      if (which === 11) targetRA = ramc + SA / 3;
      else if (which === 12) targetRA = ramc + 2 * SA / 3;
      else if (which === 2) targetRA = ramc + (2 * SA + 180) / 3;
      else targetRA = ramc + (SA + 360) / 3;
      var next = lonFromRA(norm360(targetRA), epsDeg);
      if (Math.abs(norm360(next - lam + 180) - 180) < 1e-7) { lam = next; break; }
      lam = next;
    }
    return lam;
  }

  function housesPlacidus(jd, latDeg, lonDegEast) {
    var T = (jd - 2451545.0) / 36525;
    var eps = obliquity(T);
    var ramc = norm360(gmstDeg(jd) + lonDegEast);
    var mc = lonFromRA(ramc, eps);
    var asc = ascendant(ramc, eps, latDeg);
    var cusps = new Array(13);
    cusps[1] = asc;
    cusps[10] = mc;
    cusps[11] = placidusCusp(11, ramc, eps, latDeg);
    cusps[12] = placidusCusp(12, ramc, eps, latDeg);
    cusps[2] = placidusCusp(2, ramc, eps, latDeg);
    cusps[3] = placidusCusp(3, ramc, eps, latDeg);
    cusps[4] = norm360(mc + 180);
    cusps[5] = norm360(cusps[11] + 180);
    cusps[6] = norm360(cusps[12] + 180);
    cusps[7] = norm360(asc + 180);
    cusps[8] = norm360(cusps[2] + 180);
    cusps[9] = norm360(cusps[3] + 180);
    return { asc: asc, mc: mc, cusps: cusps, ramc: ramc, eps: eps };
  }

  function houseOf(lon, cusps) {
    for (var h = 1; h <= 12; h++) {
      var a = cusps[h];
      var b = cusps[h === 12 ? 1 : h + 1];
      var span = norm360(b - a);
      var d = norm360(lon - a);
      if (d < span || span === 0) {
        if (d < span) return h;
      }
    }
    return 12;
  }

  /* ---------- アスペクト ---------- */
  var ASPECT_ANGLES = [
    { angle: 0, key: "conj", orb: 8 },
    { angle: 60, key: "sextile", orb: 4 },
    { angle: 90, key: "square", orb: 7 },
    { angle: 120, key: "trine", orb: 7 },
    { angle: 150, key: "quincunx", orb: 3 },
    { angle: 180, key: "opposition", orb: 8 }
  ];

  function angleDiff(a, b) {
    var d = Math.abs(norm360(a) - norm360(b));
    return d > 180 ? 360 - d : d;
  }

  function findAspects(points) {
    // points: [{id, name, lon, isAngle}]
    var found = [];
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var A = points[i], B = points[j];
        if (A.isAngle && B.isAngle) continue;
        var d = angleDiff(A.lon, B.lon);
        for (var k = 0; k < ASPECT_ANGLES.length; k++) {
          var asp = ASPECT_ANGLES[k];
          var orb = Math.abs(d - asp.angle);
          var maxOrb = asp.orb;
          if (A.id === "sun" || A.id === "moon" || B.id === "sun" || B.id === "moon") maxOrb += 1;
          if (A.isAngle || B.isAngle) maxOrb = Math.min(maxOrb, 6);
          if (orb <= maxOrb) {
            found.push({ a: A, b: B, aspect: asp.key, angle: asp.angle, orb: orb });
            break;
          }
        }
      }
    }
    found.sort(function (x, y) { return x.orb - y.orb; });
    return found;
  }

  /* ---------- 逆行判定 ---------- */
  function retrogradeFlags(jd) {
    var before = longitudesAt(jd - 0.5);
    var after = longitudesAt(jd + 0.5);
    var flags = {};
    for (var i = 0; i < PLANET_KEYS.length; i++) {
      var k = PLANET_KEYS[i];
      if (k === "sun" || k === "moon") { flags[k] = false; continue; }
      var move = norm360(after[k] - before[k] + 180) - 180;
      flags[k] = move < 0;
    }
    return flags;
  }

  /* ---------- チャート一式 ---------- */
  function computeChart(opts) {
    // opts: {year, month, day, hour, minute, tz, lat, lon, timeUnknown}
    var localHour = opts.timeUnknown ? 12 : (opts.hour + opts.minute / 60);
    var utcHour = localHour - opts.tz;
    var jd = julianDay(opts.year, opts.month, opts.day, utcHour);
    var lons = longitudesAt(jd);
    var retro = retrogradeFlags(jd);

    var chart = {
      jd: jd,
      planets: {},
      timeUnknown: !!opts.timeUnknown
    };
    for (var i = 0; i < PLANET_KEYS.length; i++) {
      var k = PLANET_KEYS[i];
      chart.planets[k] = { lon: lons[k], retro: retro[k] };
    }

    if (!opts.timeUnknown) {
      var H = housesPlacidus(jd, opts.lat, opts.lon);
      chart.asc = H.asc;
      chart.mc = H.mc;
      chart.cusps = H.cusps;
      for (var j = 0; j < PLANET_KEYS.length; j++) {
        var key = PLANET_KEYS[j];
        chart.planets[key].house = houseOf(chart.planets[key].lon, H.cusps);
      }
    }

    return chart;
  }

  return {
    julianDay: julianDay,
    longitudesAt: longitudesAt,
    housesPlacidus: housesPlacidus,
    houseOf: houseOf,
    findAspects: findAspects,
    computeChart: computeChart,
    norm360: norm360,
    angleDiff: angleDiff,
    PLANET_KEYS: PLANET_KEYS
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AstroEngine;
}
