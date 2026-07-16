/* =========================================================
 * unsei.js — 運勢計算
 * 大運・年運・月運・日運の柱と吉凶スコア、択日（開運日）
 * ========================================================= */
(function (global) {
  'use strict';
  var Astro = global.Astro || (typeof require !== 'undefined' ? require('./astro.js') : null);
  var Data = global.Data || (typeof require !== 'undefined' ? require('./data.js') : null);
  var Koyomi = global.Koyomi || (typeof require !== 'undefined' ? require('./koyomi.js') : null);

  /* ---------- 吉凶スコア ----------
   * 巡ってくる柱（干支）が命式に対してどう働くかを -5〜+5 で採点。
   * 喜神五行 +、忌神五行 −、空亡 −、命式との合 +、冲刑 − */
  function scorePillar(m, pillar) {
    var s = 0;
    var yj = m.yojin;
    var se = Data.STEM_ELEM[pillar.stem];
    var be = Data.BRANCH_ELEM[pillar.branch];
    if (yj.koki.indexOf(se) >= 0) s += 1.5;
    if (yj.kiki.indexOf(se) >= 0) s -= 1.2;
    if (yj.koki.indexOf(be) >= 0) s += 1.2;
    if (yj.kiki.indexOf(be) >= 0) s -= 1.0;
    // 調候用神の干が巡る
    if (yj.choko && yj.choko.indexOf(Data.STEMS[pillar.stem]) >= 0) s += 1.0;
    // 空亡
    if (m.kubo.indexOf(pillar.branch) >= 0) s -= 1.5;
    // 命式の支との関係
    Meishiki_keys(m).forEach(function (k) {
      var pb = m.pillars[k].branch;
      if (Data.SHIGO[pb] === pillar.branch) s += 0.7;         // 支合
      if (Data.chuOf(pb) === pillar.branch) s -= 1.0;         // 冲
      if (Data.GAI[pb] === pillar.branch) s -= 0.4;           // 害
      Data.KEI.forEach(function (kei) {
        if ((kei[0] === pb && kei[1] === pillar.branch) || (kei[0] === pillar.branch && kei[1] === pb)) s -= 0.5;
      });
      // 三合半会
      Data.SANGO.forEach(function (g) {
        var tri = [g[0], g[1], g[2]];
        if (tri.indexOf(pb) >= 0 && tri.indexOf(pillar.branch) >= 0 && pb !== pillar.branch) {
          s += (yj.koki.indexOf(g[3]) >= 0) ? 0.6 : 0.2;
        }
      });
    });
    // 干合（日干との）
    if (Data.KANGO[m.pillars.day.stem] === pillar.stem) s += 0.5;
    return Math.max(-5, Math.min(5, s));
  }
  function Meishiki_keys(m) {
    return ['year', 'month', 'day', 'hour'].filter(function (k) { return m.pillars[k]; });
  }
  function scoreLabel(s) {
    if (s >= 2.5) return '大吉';
    if (s >= 1.2) return '吉';
    if (s >= -0.7) return '平';
    if (s >= -2.2) return '注意';
    return '要注意';
  }

  /* ---------- 大運 ---------- */
  function taiun(m, count) {
    count = count || 10;
    var meta = m.meta;
    var pillars = Koyomi.taiunPillars(m.pillars.month.sixty, meta.forward, count);
    var list = [];
    for (var i = 0; i < count; i++) {
      var startAge = meta.kiun.years + i * 10;
      var p = pillars[i];
      list.push({
        pillar: p,
        name: Koyomi.sixtyName(p.sixty),
        startAge: startAge,
        endAge: startAge + 9,
        startYear: meta.input.y + startAge,
        tsuhen: Data.tsuhenIndex(m.pillars.day.stem, p.stem),
        juniun: Data.juniunIndex(m.pillars.day.stem, p.branch),
        kubo: m.kubo.indexOf(p.branch) >= 0,
        score: scorePillar(m, p)
      });
    }
    return list;
  }

  /* ---------- 年運 ---------- */
  function nenun(m, fromYear, count) {
    var list = [];
    for (var i = 0; i < count; i++) {
      var y = fromYear + i;
      var p = Koyomi.yearPillarOf(y);
      list.push({
        year: y,
        age: y - m.meta.input.y,
        pillar: p,
        name: Koyomi.sixtyName(p.sixty),
        tsuhen: Data.tsuhenIndex(m.pillars.day.stem, p.stem),
        juniun: Data.juniunIndex(m.pillars.day.stem, p.branch),
        kubo: m.kubo.indexOf(p.branch) >= 0,
        score: scorePillar(m, p)
      });
    }
    return list;
  }

  /* ---------- 月運（節入り基準の12ヶ月） ---------- */
  function getsuun(m, year) {
    var list = [];
    // その年の立春に始まる寅月から12ヶ月
    for (var i = 0; i < 12; i++) {
      var deg = (315 + i * 30) % 360;
      var y = year;
      var jd = Astro.solarTermJD(y, deg);
      var jst = Astro.jstFromJD(jd);
      // 節入り翌日の日付で月柱を得る（境界の安全側）
      var t2 = Astro.jstFromJD(jd + 1.5);
      var pd2 = Koyomi.pillarsOfDate(t2.y, t2.m, t2.d, m.settings);
      var p = pd2.month;
      list.push({
        label: jst.y + '年' + jst.m + '月' + jst.d + '日〜',
        setsu: Astro.SETSU[i].name,
        pillar: p,
        name: Koyomi.sixtyName(p.sixty),
        tsuhen: Data.tsuhenIndex(m.pillars.day.stem, p.stem),
        juniun: Data.juniunIndex(m.pillars.day.stem, p.branch),
        kubo: m.kubo.indexOf(p.branch) >= 0,
        score: scorePillar(m, p)
      });
    }
    return list;
  }

  /* ---------- 日運（1ヶ月分のカレンダー） ---------- */
  function nichiun(m, year, month) {
    var days = new Date(year, month, 0).getDate(); // month: 1-12
    var list = [];
    for (var d = 1; d <= days; d++) {
      var jdn = Astro.jdnOfJSTDate(year, month, d);
      var sixty = Koyomi.daySixtyFromJDN(jdn);
      var p = Koyomi.pillarFromSixty(sixty);
      list.push({
        y: year, m: month, d: d,
        weekday: new Date(year, month - 1, d).getDay(),
        pillar: p,
        name: Koyomi.sixtyName(sixty),
        tsuhen: Data.tsuhenIndex(m.pillars.day.stem, p.stem),
        kubo: m.kubo.indexOf(p.branch) >= 0,
        score: scorePillar(m, p)
      });
    }
    return list;
  }

  /* ---------- ライフチャート（0〜100歳の運勢曲線データ） ----------
   * 大運スコア（基調）＋年運スコア（変動）の合成 */
  function lifeChart(m, maxAge) {
    maxAge = maxAge || 100;
    var tu = taiun(m, Math.ceil(maxAge / 10) + 1);
    var birthYear = m.meta.input.y;
    var points = [];
    for (var age = 0; age <= maxAge; age++) {
      var y = birthYear + age;
      var yp = Koyomi.yearPillarOf(y);
      var ys = scorePillar(m, yp);
      var ts = 0;
      for (var i = 0; i < tu.length; i++) {
        if (age >= tu[i].startAge && age <= tu[i].endAge) { ts = tu[i].score; break; }
      }
      points.push({ age: age, year: y, score: ts * 0.6 + ys * 0.4, taiun: ts, nenun: ys });
    }
    return points;
  }

  /* ---------- 択日（開運日の提案） ----------
   * purpose: 'general'|'love'|'money'|'work'|'contract'|'moving'|'health' */
  function takujitsu(m, fromY, fromM, fromD, daysAhead, purpose) {
    var out = [];
    var jd0 = Astro.jdnOfJSTDate(fromY, fromM, fromD);
    var purposeBoost = {
      love: [5, 4],      // 正財・偏財（異性縁は財官）… 女性は官
      money: [4, 5],     // 偏財・正財
      work: [7, 6],      // 正官・偏官
      contract: [7, 9],  // 正官・印綬
      moving: [],        // 駅馬でみる
      health: [9, 8],    // 印星
      general: []
    }[purpose || 'general'] || [];
    for (var i = 0; i < daysAhead; i++) {
      var jdn = jd0 + i;
      var t = Astro.utcFromJD(jdn - 0.5 + 9 / 24);
      var sixty = Koyomi.daySixtyFromJDN(jdn);
      var p = Koyomi.pillarFromSixty(sixty);
      var s = scorePillar(m, p);
      var notes = [];
      var tsu = Data.tsuhenIndex(m.pillars.day.stem, p.stem);
      if (purposeBoost.indexOf(tsu) >= 0) { s += 1.0; notes.push(Data.TSUHEN[tsu] + 'の日'); }
      if (purpose === 'moving') {
        var R = Data.triadOf(m.pillars.day.branch);
        if (Data.EKIBA[R] === p.branch) { s += 1.2; notes.push('駅馬の日'); }
      }
      if ((Data.TENITSU[m.pillars.day.stem] || []).indexOf(p.branch) >= 0) { s += 0.8; notes.push('天乙貴人の日'); }
      if (m.kubo.indexOf(p.branch) >= 0) notes.push('空亡');
      if (Data.chuOf(m.pillars.day.branch) === p.branch) notes.push('日支と冲');
      out.push({ y: t.y, m: t.m, d: t.d, name: Koyomi.sixtyName(sixty), score: s, label: scoreLabel(s), notes: notes });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  global.Unsei = {
    scorePillar: scorePillar,
    scoreLabel: scoreLabel,
    taiun: taiun,
    nenun: nenun,
    getsuun: getsuun,
    nichiun: nichiun,
    lifeChart: lifeChart,
    takujitsu: takujitsu
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Unsei;
})(typeof window !== 'undefined' ? window : globalThis);
