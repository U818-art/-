/* =========================================================
 * koyomi.js — 干支暦エンジン
 * 四柱（年月日時）の算出。流派設定（年柱切替・日柱切替・
 * 時刻補正・大運順逆・起運方式）に対応。
 * ========================================================= */
(function (global) {
  'use strict';
  var Astro = global.Astro || (typeof require !== 'undefined' ? require('./astro.js') : null);
  var Data = global.Data || (typeof require !== 'undefined' ? require('./data.js') : null);

  /* 六十干支 index（0=甲子〜59=癸亥）→ {stem, branch} */
  function pillarFromSixty(sixty) {
    sixty = ((sixty % 60) + 60) % 60;
    return { sixty: sixty, stem: sixty % 10, branch: sixty % 12 };
  }
  function sixtyName(sixty) {
    var p = pillarFromSixty(sixty);
    return Data.STEMS[p.stem] + Data.BRANCHES[p.branch];
  }
  // 干と支から六十干支 index（陰陽が一致する組のみ有効）
  function sixtyFromStemBranch(stem, branch) {
    for (var i = 0; i < 60; i++) {
      if (i % 10 === stem && i % 12 === branch) return i;
    }
    return -1;
  }

  /* ---------- 日柱 ----------
   * JDN + 49 ≡ 干支番号 (mod 60)。検証: 2000-01-01=戊午, 1900-01-01=甲戌 */
  function daySixtyFromJDN(jdn) { return ((jdn + 49) % 60 + 60) % 60; }

  /* ---------- 時刻補正 ----------
   * mode: 'none'（標準時のまま） | 'lmt'（地方平均時） | 'tst'（真太陽時）
   * lon: 出生地の東経（度）。日本標準時子午線は東経135度。 */
  function adjustedMinutes(y, m, d, hh, mm, mode, lon) {
    var total = hh * 60 + mm;
    if (mode === 'none' || lon == null) return { min: total, corr: 0 };
    var corr = (lon - 135) * 4; // 経度差補正（分）
    if (mode === 'tst') {
      var jd = Astro.jdFromJST(y, m, d, hh, mm, 0);
      corr += Astro.equationOfTime(jd);
    }
    return { min: total + corr, corr: corr };
  }

  /* ---------- 主計算 ----------
   * input: { y, m, d, hh, mm, gender:'M'|'F', lon(東経度|null), timeUnknown:bool }
   * settings: {
   *   yearSwitch: 'risshun' | 'toji' | 'newyear',
   *   daySwitch: 'midnight' | 'h23',
   *   timeAdjust: 'none' | 'lmt' | 'tst',
   *   taiunDir: 'standard'(陽男陰女順行) | 'allForward' | 'allBackward',
   *   kiunMode: 'floor' | 'round' | 'detail'(年+月まで)
   * }
   * 戻り値: { year, month, day, hour(null可), meta:{...} } 各柱 {sixty, stem, branch}
   */
  function computePillars(input, settings) {
    var s = settings || {};
    var yearSwitch = s.yearSwitch || 'risshun';
    var daySwitch = s.daySwitch || 'midnight';
    var timeAdjust = s.timeAdjust || 'none';

    var adj = input.timeUnknown
      ? { min: 12 * 60, corr: 0 } // 時刻不明は正午仮置き（時柱は立てない）
      : adjustedMinutes(input.y, input.m, input.d, input.hh, input.mm, timeAdjust, input.lon);

    // 補正後の暦日・時刻（分単位で日をまたぐ場合を処理）
    var y = input.y, m = input.m, d = input.d;
    var min = adj.min;
    var dayShift = 0;
    while (min < 0) { min += 1440; dayShift -= 1; }
    while (min >= 1440) { min -= 1440; dayShift += 1; }
    if (dayShift !== 0) {
      var t = Astro.jstFromJD(Astro.jdFromJST(y, m, d, 12, 0, 0) + dayShift);
      y = t.y; m = t.m; d = t.d;
    }
    var hh2 = Math.floor(min / 60), mm2 = Math.round(min % 60);

    // 出生瞬間の JD(UT)（節入り判定は補正後の真時刻で行う）
    var jdBirth = Astro.jdFromJST(y, m, d, hh2, mm2, 0);

    /* --- 日柱 --- */
    var jdn = Astro.jdnOfJSTDate(y, m, d);
    var dayJdn = jdn;
    if (!input.timeUnknown && daySwitch === 'h23' && hh2 >= 23) dayJdn += 1; // 23時以降は翌日の日柱
    var dayP = pillarFromSixty(daySixtyFromJDN(dayJdn));

    /* --- 時柱 --- */
    var hourP = null, hourBranch = null;
    if (!input.timeUnknown) {
      hourBranch = Math.floor(((hh2 * 60 + mm2) + 60) / 120) % 12; // 23:00〜0:59 → 子
      var hourStem = ((dayP.stem % 5) * 2 + hourBranch) % 10; // 五鼠遁
      hourP = pillarFromSixty(sixtyFromStemBranch(hourStem, hourBranch));
    }

    /* --- 年柱 --- */
    var solarYear = y;
    if (yearSwitch === 'risshun') {
      var ris = Astro.solarTermJD(y, 315);
      if (jdBirth < ris) solarYear = y - 1;
    } else if (yearSwitch === 'toji') {
      // 冬至基準: 前年冬至〜当年冬至の間を「当年」とする研究方式
      var tj = Astro.tojiJD(y);
      if (jdBirth >= tj) solarYear = y + 1;
    } // 'newyear' は暦年のまま
    var yearP = pillarFromSixty((solarYear - 4) % 60);

    /* --- 月柱 --- */
    var prevS = Astro.previousSetsu(jdBirth);
    var nextS = Astro.nextSetsu(jdBirth);
    var monthIdx = prevS.month; // 0=寅 … 11=丑
    // 五虎遁: 年干から寅月の干を起こす
    var monthStem = ((yearP.stem % 5) * 2 + 2 + monthIdx) % 10;
    var monthBranch = (monthIdx + 2) % 12; // 寅=2
    var monthP = pillarFromSixty(sixtyFromStemBranch(monthStem, monthBranch));

    /* --- 大運の順逆と起運 --- */
    var male = input.gender !== 'F';
    var yangYear = Data.STEM_YANG[yearP.stem];
    var forward;
    if (s.taiunDir === 'allForward') forward = true;
    else if (s.taiunDir === 'allBackward') forward = false;
    else forward = (yangYear && male) || (!yangYear && !male); // 陽男陰女順行

    var daysToSetsu = forward ? (nextS.jd - jdBirth) : (jdBirth - prevS.jd);
    var kiun; // 起運年齢
    var kiunMode = s.kiunMode || 'detail';
    var years = daysToSetsu / 3;
    if (kiunMode === 'floor') kiun = { years: Math.max(0, Math.floor(years)), months: 0 };
    else if (kiunMode === 'round') kiun = { years: Math.max(0, Math.round(years)), months: 0 };
    else {
      var yy = Math.floor(years);
      var months = Math.round((years - yy) * 12); // 1日 = 4ヶ月
      if (months >= 12) { yy += 1; months -= 12; }
      kiun = { years: yy, months: months };
    }

    return {
      year: yearP, month: monthP, day: dayP, hour: hourP,
      meta: {
        input: input,
        adjusted: { y: y, m: m, d: d, hh: input.timeUnknown ? null : hh2, mm: input.timeUnknown ? null : mm2, corrMin: adj.corr },
        jdBirth: jdBirth,
        prevSetsu: { name: prevS.name, jd: prevS.jd, jst: Astro.jstFromJD(prevS.jd) },
        nextSetsu: { name: nextS.name, jd: nextS.jd, jst: Astro.jstFromJD(nextS.jd) },
        daysIntoMonth: jdBirth - prevS.jd, // 節入りからの経過日数（蔵干月律用）
        solarYear: solarYear,
        forward: forward,
        kiun: kiun,
        hourBranch: hourBranch
      }
    };
  }

  /* ---------- 大運の柱列 ----------
   * 月柱から順行/逆行に十干支を進める。count 本。 */
  function taiunPillars(monthSixty, forward, count) {
    var list = [];
    for (var i = 1; i <= count; i++) {
      var s = forward ? monthSixty + i : monthSixty - i;
      list.push(pillarFromSixty(s));
    }
    return list;
  }

  /* ---------- 年運・月運・日運 ---------- */
  function yearPillarOf(year) { return pillarFromSixty((year - 4) % 60); }

  // ある新暦年月日の月柱（節入り基準）・日柱
  function pillarsOfDate(y, m, d, settings) {
    var r = computePillars({ y: y, m: m, d: d, hh: 12, mm: 0, gender: 'M', lon: null, timeUnknown: true }, settings || {});
    return { year: r.year, month: r.month, day: r.day, meta: r.meta };
  }

  /* ---------- 干支の逆引き ----------
   * 指定の日干支に一致する日を範囲 [y1, y2] から列挙 */
  function reverseLookupDays(sixty, y1, y2, limit) {
    var out = [];
    var jd1 = Astro.jdnOfJSTDate(y1, 1, 1);
    var jd2 = Astro.jdnOfJSTDate(y2, 12, 31);
    // 最初の一致日を求める
    var r = ((sixty - daySixtyFromJDN(jd1)) % 60 + 60) % 60;
    for (var jd = jd1 + r; jd <= jd2; jd += 60) {
      var t = Astro.jstFromJD(jd); // jdn→暦日（正午JDなので誤差なし）
      var tt = Astro.utcFromJD(jd - 0.5 + 9 / 24);
      out.push({ y: tt.y, m: tt.m, d: tt.d });
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  global.Koyomi = {
    pillarFromSixty: pillarFromSixty,
    sixtyName: sixtyName,
    sixtyFromStemBranch: sixtyFromStemBranch,
    daySixtyFromJDN: daySixtyFromJDN,
    computePillars: computePillars,
    taiunPillars: taiunPillars,
    yearPillarOf: yearPillarOf,
    pillarsOfDate: pillarsOfDate,
    reverseLookupDays: reverseLookupDays
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Koyomi;
})(typeof window !== 'undefined' ? window : globalThis);
