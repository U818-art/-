/* =========================================================
 * meishiki.js — 命式解析エンジン
 * 蔵干・通変星・十二運・神殺・合冲刑害・透干通根・五行バランス・
 * 身強身弱・格局・用神（扶抑＋調候）・命宮・胎元・胎息・身宮
 * ========================================================= */
(function (global) {
  'use strict';
  var Astro = global.Astro || (typeof require !== 'undefined' ? require('./astro.js') : null);
  var Data = global.Data || (typeof require !== 'undefined' ? require('./data.js') : null);
  var Koyomi = global.Koyomi || (typeof require !== 'undefined' ? require('./koyomi.js') : null);

  var PILLAR_KEYS = ['year', 'month', 'day', 'hour'];
  var PILLAR_NAMES = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };

  /* ---------- 蔵干の取り出し ----------
   * mode: 'bunya'（月律分野・節入りからの日数で取り分け）
   *       'main' （本気のみ）
   *       'all'  （全蔵干を並列表示） */
  function zokanOf(branch, daysIntoMonth, mode) {
    if (mode === 'main') return [Data.ZOKAN_MAIN[branch]];
    if (mode === 'all') return Data.ZOKAN_ALL[branch].slice();
    // 月律分野: 経過日数に応じて1つ選ぶ
    var table = Data.ZOKAN_BUNYA[branch];
    var d = daysIntoMonth;
    for (var i = 0; i < table.length; i++) {
      if (table[i].d === null || d < sumDays(table, i + 1)) {
        if (table[i].d === null) return [table[i].s];
        if (d < sumDays(table, i + 1)) return [table[i].s];
      }
    }
    return [table[table.length - 1].s];
  }
  function sumDays(table, upto) {
    var s = 0;
    for (var i = 0; i < upto; i++) s += table[i].d === null ? 99 : table[i].d;
    return s;
  }

  /* ---------- 命宮・身宮・胎元・胎息 ---------- */
  // 命宮: 月支数＋時支数（子=1〜亥=12）の和を 14（または26）から引く
  function meikyu(monthBranch, hourBranch, yearStem) {
    if (hourBranch == null) return null;
    var m = monthBranch + 1, h = hourBranch + 1;
    var s = m + h;
    var n = (s <= 13) ? 14 - s : 26 - s;
    var branch = (n - 1 + 12) % 12;
    // 天干は五虎遁（年干から寅月起で数える）
    var monthIdx = (branch - 2 + 12) % 12;
    var stem = ((yearStem % 5) * 2 + 2 + monthIdx) % 10;
    return Koyomi.pillarFromSixty(Koyomi.sixtyFromStemBranch(stem, branch));
  }
  // 身宮: 月支数＋時支数から順に求める（一説による）
  function shinkyu(monthBranch, hourBranch, yearStem) {
    if (hourBranch == null) return null;
    var m = monthBranch + 1, h = hourBranch + 1;
    var n = ((m + h - 2) % 12) + 1;
    var branch = (n - 1 + 12) % 12;
    var monthIdx = (branch - 2 + 12) % 12;
    var stem = ((yearStem % 5) * 2 + 2 + monthIdx) % 10;
    return Koyomi.pillarFromSixty(Koyomi.sixtyFromStemBranch(stem, branch));
  }
  // 胎元: 月干＋1, 月支＋3
  function taigen(monthPillar) {
    var stem = (monthPillar.stem + 1) % 10;
    var branch = (monthPillar.branch + 3) % 12;
    return Koyomi.pillarFromSixty(Koyomi.sixtyFromStemBranch(stem, branch));
  }
  // 胎息: 日干と干合する干＋日支と支合する支
  function taisoku(dayPillar) {
    var stem = Data.KANGO[dayPillar.stem];
    var branch = Data.SHIGO[dayPillar.branch];
    return Koyomi.pillarFromSixty(Koyomi.sixtyFromStemBranch(stem, branch));
  }

  /* ---------- 神殺の判定 ---------- */
  function findShinsatsu(p, settings) {
    var list = []; // {name, pillar, detail}
    var dayStem = p.day.stem;
    var enabled = (settings && settings.shinsatsuSet) || null; // null=全部
    function on(name) { return !enabled || enabled.indexOf(name) >= 0; }
    function add(name, pillar, detail) { if (on(name)) list.push({ name: name, pillar: pillar, detail: detail || '' }); }

    PILLAR_KEYS.forEach(function (k) {
      var pl = p[k];
      if (!pl) return;
      var b = pl.branch;
      // 日干基準
      if ((Data.TENITSU[dayStem] || []).indexOf(b) >= 0) add('天乙貴人', k);
      if (Data.BUNSHO[dayStem] === b) add('文昌貴人', k);
      if (Data.KINYO[dayStem] === b) add('金輿', k);
      if (Data.YOJIN[dayStem] === b) add('羊刃', k);
      if (Data.HIJIN[dayStem] === b) add('飛刃', k);
      if (Data.KOEN[dayStem] === b) add('紅艶殺', k);
      // 年支基準（三合）
      var yb = p.year.branch;
      var R = Data.triadOf(yb);
      if (Data.EKIBA[R] === b && k !== 'year') add('駅馬', k);
      if (Data.KANCHI[R] === b && k !== 'year') add('咸池（桃花）', k);
      if (Data.KAGAI[R] === b && k !== 'year') add('華蓋', k);
      if (Data.KOSHIN[yb] === b && k !== 'year') add('孤辰', k);
      if (Data.KASHUKU[yb] === b && k !== 'year') add('寡宿', k);
      // 日支基準（三合）— 日支から見る流儀も併用
      if (k !== 'day') {
        var Rd = Data.triadOf(p.day.branch);
        if (Data.EKIBA[Rd] === b) add('駅馬（日支基準）', k);
        if (Data.KANCHI[Rd] === b) add('咸池（日支基準）', k);
      }
    });

    // 月支基準（天徳・月徳）: 干にも支にも当たりうる
    var mb = p.month.branch;
    var tj = Data.TENTOKU[mb];
    var gt = Data.GETTOKU[Data.triadOf(mb)];
    PILLAR_KEYS.forEach(function (k) {
      var pl = p[k];
      if (!pl) return;
      if (tj === Data.STEMS[pl.stem] || tj === Data.BRANCHES[pl.branch]) add('天徳貴人', k);
      if (gt === Data.STEMS[pl.stem]) add('月徳貴人', k);
    });

    // 魁罡（日柱のみ）
    Data.KAIGO.forEach(function (kg) {
      if (p.day.stem === kg[0] && p.day.branch === kg[1]) add('魁罡', 'day');
    });
    return list;
  }

  /* ---------- 十二神殺（年支基準・全支に付与） ---------- */
  function juniShinsatsu(p) {
    var out = {};
    PILLAR_KEYS.forEach(function (k) {
      if (!p[k]) return;
      out[k] = Data.juniShinsatsuOf(p.year.branch, p[k].branch);
    });
    return out;
  }

  /* ---------- 合冲刑害の検出 ---------- */
  function findGoChu(p) {
    var rel = [];
    var keys = PILLAR_KEYS.filter(function (k) { return p[k]; });
    // 干合
    for (var i = 0; i < keys.length; i++) {
      for (var j = i + 1; j < keys.length; j++) {
        var a = p[keys[i]], b = p[keys[j]];
        if (Data.KANGO[a.stem] === b.stem) {
          var el = Data.kangoElem(a.stem, b.stem);
          rel.push({ type: '干合', a: keys[i], b: keys[j], detail: Data.STEMS[a.stem] + '＋' + Data.STEMS[b.stem] + '（化' + Data.ELEMS[el] + '）' });
        }
        // 支の関係
        var ab = a.branch, bb = b.branch;
        if (Data.SHIGO[ab] === bb) rel.push({ type: '支合', a: keys[i], b: keys[j], detail: Data.BRANCHES[ab] + '＋' + Data.BRANCHES[bb] });
        if (Data.chuOf(ab) === bb) rel.push({ type: '冲', a: keys[i], b: keys[j], detail: Data.BRANCHES[ab] + '⇔' + Data.BRANCHES[bb] });
        Data.KEI.forEach(function (kei) {
          if (kei[0] === ab && kei[1] === bb) rel.push({ type: '刑', a: keys[i], b: keys[j], detail: Data.BRANCHES[ab] + '→' + Data.BRANCHES[bb] + '（' + kei[2] + '）' });
        });
        if (Data.GAI[ab] === bb) rel.push({ type: '害', a: keys[i], b: keys[j], detail: Data.BRANCHES[ab] + '＋' + Data.BRANCHES[bb] });
        if (Data.HA[ab] === bb) rel.push({ type: '破', a: keys[i], b: keys[j], detail: Data.BRANCHES[ab] + '＋' + Data.BRANCHES[bb] });
      }
    }
    // 三合・半会
    var branches = keys.map(function (k) { return p[k].branch; });
    Data.SANGO.forEach(function (g) {
      var hit = [g[0], g[1], g[2]].filter(function (x) { return branches.indexOf(x) >= 0; });
      if (hit.length === 3) rel.push({ type: '三合会局', a: null, b: null, detail: hit.map(function (x) { return Data.BRANCHES[x]; }).join('') + '（' + Data.ELEMS[g[3]] + '局）' });
      else if (hit.length === 2 && hit.indexOf(g[1]) >= 0) rel.push({ type: '半会', a: null, b: null, detail: hit.map(function (x) { return Data.BRANCHES[x]; }).join('') + '（' + Data.ELEMS[g[3]] + '）' });
    });
    Data.HOGO.forEach(function (g) {
      var hit = [g[0], g[1], g[2]].filter(function (x) { return branches.indexOf(x) >= 0; });
      if (hit.length === 3) rel.push({ type: '方合', a: null, b: null, detail: hit.map(function (x) { return Data.BRANCHES[x]; }).join('') + '（' + Data.ELEMS[g[3]] + '方）' });
    });
    return rel;
  }

  /* ---------- 透干・通根 ---------- */
  function toukanTsukon(p, zokanMap) {
    var stems = [], out = { toukan: [], tsukon: [] };
    var keys = PILLAR_KEYS.filter(function (k) { return p[k]; });
    // 透干: 蔵干が天干に現れている
    keys.forEach(function (bk) {
      (Data.ZOKAN_ALL[p[bk].branch] || []).forEach(function (z) {
        keys.forEach(function (sk) {
          if (p[sk].stem === z) {
            out.toukan.push({ stem: z, from: bk, to: sk });
          }
        });
      });
    });
    // 通根: 天干と同五行の蔵干を支に持つ
    keys.forEach(function (sk) {
      var se = Data.STEM_ELEM[p[sk].stem];
      keys.forEach(function (bk) {
        var hit = (Data.ZOKAN_ALL[p[bk].branch] || []).filter(function (z) { return Data.STEM_ELEM[z] === se; });
        if (hit.length) out.tsukon.push({ pillar: sk, root: bk, strength: p[bk].branch === p[sk] ? 2 : 1 });
      });
    });
    return out;
  }

  /* ---------- 五行バランス ----------
   * 天干1.0 / 本気1.0 / 中気0.5 / 余気0.3 で加点 */
  function gogyoBalance(p) {
    var score = [0, 0, 0, 0, 0];
    var keys = PILLAR_KEYS.filter(function (k) { return p[k]; });
    keys.forEach(function (k) {
      score[Data.STEM_ELEM[p[k].stem]] += 1.0;
      var za = Data.ZOKAN_ALL[p[k].branch];
      za.forEach(function (z, i) {
        var w = i === 0 ? 1.0 : (i === 1 ? 0.5 : 0.3);
        score[Data.STEM_ELEM[z]] += w;
      });
    });
    return score;
  }

  /* ---------- 身強身弱 ----------
   * mode: 'score'（点数法・標準）| 'getsurei'（月令重視） */
  function mikata(elem, dayElem) { // 日干を助ける五行か（印=生じる, 比=同じ）
    return elem === dayElem || (elem + 1) % 5 === dayElem;
  }
  function shinKyojaku(p, meta, settings) {
    var dayElem = Data.STEM_ELEM[p.day.stem];
    var mode = (settings && settings.strengthMode) || 'score';
    var detail = [];
    var score = 0;

    // 得令（月令）: 月支の五行
    var mbElem = Data.BRANCH_ELEM[p.month.branch];
    var tokurei = mikata(mbElem, dayElem);
    if (mbElem === dayElem) { score += 3; detail.push('得令（月支が日干と同気）+3'); }
    else if ((mbElem + 1) % 5 === dayElem) { score += 2; detail.push('得令（月支が日干を生じる）+2'); }
    else detail.push('失令（月支の助けなし）+0');

    // 得地（通根）
    var keys = PILLAR_KEYS.filter(function (k) { return p[k]; });
    keys.forEach(function (k) {
      var za = Data.ZOKAN_ALL[p[k].branch];
      var rooted = za.some(function (z) { return Data.STEM_ELEM[z] === dayElem; });
      if (rooted) {
        var pt = (k === 'day') ? 1.5 : 1.0;
        score += pt;
        detail.push('得地（' + PILLAR_NAMES[k] + 'に通根）+' + pt);
      }
    });

    // 得勢（天干の印比）
    keys.forEach(function (k) {
      if (k === 'day') return;
      var e = Data.STEM_ELEM[p[k].stem];
      if (e === dayElem) { score += 1; detail.push('得勢（' + PILLAR_NAMES[k] + '天干に比劫）+1'); }
      else if ((e + 1) % 5 === dayElem) { score += 1; detail.push('得勢（' + PILLAR_NAMES[k] + '天干に印星）+1'); }
    });

    var max = 3 + 1.5 + 3 + 3;
    var level;
    if (mode === 'getsurei') {
      // 月令重視: 得令なら基本身強
      level = tokurei ? (score >= 6 ? '極身強' : '身強') : (score >= 5.5 ? '中和' : (score >= 3 ? '身弱' : '極身弱'));
    } else {
      if (score >= 7.5) level = '極身強';
      else if (score >= 5.5) level = '身強';
      else if (score >= 4) level = '中和';
      else if (score >= 2) level = '身弱';
      else level = '極身弱';
    }
    return { score: score, max: max, level: level, detail: detail, tokurei: tokurei };
  }

  /* ---------- 格局 ----------
   * mode: 'auto'（透干優先）| 'hongi'（月支本気固定） */
  function kakkyoku(p, meta, strength, settings) {
    var mode = (settings && settings.kakkyokuMode) || 'auto';
    var dayStem = p.day.stem;
    var mb = p.month.branch;
    var keys = PILLAR_KEYS.filter(function (k) { return p[k] && k !== 'day'; });
    var stemsOnBoard = keys.map(function (k) { return p[k].stem; });

    // 外格（従格）の判定: 極端な強弱
    if (settings && settings.allowGaikaku !== false) {
      if (strength.level === '極身強') {
        var kanshaOrZai = false; // 官殺・財が全く無いか
        var all = gogyoBalance(p);
        var de = Data.STEM_ELEM[dayStem];
        if (all[(de + 2) % 5] < 0.5 && all[(de + 3) % 5] < 0.5) {
          return { name: '従旺格（外格）', type: 'gaikaku', base: null, note: '日干が極めて強く、剋洩の星がほとんど無いため、勢いに従う外格と判定しました。' };
        }
      }
      if (strength.level === '極身弱') {
        var all2 = gogyoBalance(p);
        var de2 = Data.STEM_ELEM[dayStem];
        // 従格は比劫・印星の支えがほぼ無いことが条件（日干自身の1.0を除く）
        var sasae = all2[de2] - 1.0 + all2[(de2 + 4) % 5];
        if (sasae < 1.0) {
          var shokujin = all2[(de2 + 1) % 5], zai = all2[(de2 + 2) % 5], kan = all2[(de2 + 3) % 5];
          var maxE = Math.max(shokujin, zai, kan);
          var name = maxE === kan ? '従殺格（外格）' : (maxE === zai ? '従財格（外格）' : '従児格（外格）');
          return { name: name, type: 'gaikaku', base: null, note: '日干が極めて弱く支えが無いため、最も強い五行に従う外格と判定しました。' };
        }
      }
    }

    // 建禄・月刃
    var kenrokuBranch = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 }; // 建禄の支
    if (kenrokuBranch[dayStem] === mb) return { name: '建禄格', type: 'naikaku', base: null, note: '月支が日干の建禄にあたります。' };
    if (Data.YOJIN[dayStem] === mb) return { name: '月刃格', type: 'naikaku', base: null, note: '月支が日干の羊刃にあたります。' };

    // 内格: 月支蔵干から
    var candidates = Data.ZOKAN_ALL[mb]; // [本気, 中気, 余気]
    var chosen = null;
    if (mode === 'auto') {
      // 透干している蔵干を優先（本気→中気→余気）
      for (var i = 0; i < candidates.length; i++) {
        if (stemsOnBoard.indexOf(candidates[i]) >= 0) { chosen = candidates[i]; break; }
      }
    }
    if (chosen === null) chosen = candidates[0]; // 本気
    var t = Data.tsuhenIndex(dayStem, chosen);
    var kakuName = {
      0: '建禄格', 1: '月刃格', 2: '食神格', 3: '傷官格', 4: '偏財格',
      5: '正財格', 6: '偏官格（七殺格）', 7: '正官格', 8: '偏印格', 9: '印綬格'
    }[t];
    return {
      name: kakuName, type: 'naikaku', base: chosen,
      note: '月支「' + Data.BRANCHES[mb] + '」の蔵干「' + Data.STEMS[chosen] + '」（' + Data.TSUHEN[t] + '）を格として採りました。'
    };
  }

  /* ---------- 用神（扶抑＋調候） ---------- */
  function yojin(p, strength, settings) {
    var de = Data.STEM_ELEM[p.day.stem];
    var bal = gogyoBalance(p);
    var result = { fuyoku: null, koki: [], kiki: [], choko: null, note: [] };

    var IN = (de + 4) % 5;   // 印（日干を生じる）
    var HI = de;             // 比劫
    var SHOKU = (de + 1) % 5; // 食傷
    var ZAI = (de + 2) % 5;  // 財
    var KAN = (de + 3) % 5;  // 官殺

    if (strength.level === '身弱' || strength.level === '極身弱') {
      // 弱→扶ける（印・比）。より不足している方を用神に
      result.fuyoku = bal[IN] <= bal[HI] ? IN : HI;
      result.koki = [IN, HI];
      result.kiki = [KAN, ZAI, SHOKU];
      result.note.push('日干が弱いため、日干を生じ助ける「' + Data.ELEMS[IN] + '（印星）」「' + Data.ELEMS[HI] + '（比劫）」が喜神です。');
    } else if (strength.level === '身強' || strength.level === '極身強') {
      // 強→抑える（官殺）か洩らす（食傷）か分ける（財）
      var cands = [[KAN, bal[KAN]], [SHOKU, bal[SHOKU]], [ZAI, bal[ZAI]]];
      cands.sort(function (a, b) { return b[1] - a[1]; }); // 命式にある程度存在する星を優先
      result.fuyoku = cands[0][0];
      result.koki = [SHOKU, ZAI, KAN];
      result.kiki = [IN, HI];
      result.note.push('日干が強いため、力を洩らし・分け・抑える「' + Data.ELEMS[SHOKU] + '（食傷）」「' + Data.ELEMS[ZAI] + '（財星）」「' + Data.ELEMS[KAN] + '（官殺）」が喜神です。');
    } else {
      // 中和→最も少ない五行を補う
      var minIdx = 0;
      for (var i = 1; i < 5; i++) if (bal[i] < bal[minIdx]) minIdx = i;
      result.fuyoku = minIdx;
      result.koki = [minIdx];
      result.kiki = [];
      result.note.push('五行のバランスがとれた中和の命式です。最も少ない「' + Data.ELEMS[minIdx] + '」を補うと安定します。');
    }

    // 調候用神
    var ck = Data.CHOKO[p.day.stem] && Data.CHOKO[p.day.stem][p.month.branch];
    if (ck) {
      result.choko = ck;
      result.note.push('調候の観点（生まれ月の寒暖燥湿）からは「' + ck.split('').join('・') + '」が調候用神です。');
    }
    return result;
  }

  /* ---------- 命式の総合ビルド ---------- */
  function build(input, settings) {
    var s = settings || {};
    var r = Koyomi.computePillars(input, s);
    var p = { year: r.year, month: r.month, day: r.day, hour: r.hour };
    var meta = r.meta;

    var zmode = s.zokanMode || 'bunya';
    var zokan = {};
    PILLAR_KEYS.forEach(function (k) {
      if (!p[k]) return;
      zokan[k] = zokanOf(p[k].branch, meta.daysIntoMonth, zmode);
    });

    // 通変星（天干・蔵干）
    var tsuhen = { stems: {}, zokan: {} };
    PILLAR_KEYS.forEach(function (k) {
      if (!p[k]) return;
      tsuhen.stems[k] = (k === 'day') ? null : Data.tsuhenIndex(p.day.stem, p[k].stem);
      tsuhen.zokan[k] = zokan[k].map(function (z) { return Data.tsuhenIndex(p.day.stem, z); });
    });

    // 十二運（日干×各支）
    var juniun = {};
    PILLAR_KEYS.forEach(function (k) {
      if (!p[k]) return;
      juniun[k] = Data.juniunIndex(p.day.stem, p[k].branch);
    });

    // 空亡・納音
    var kubo = Data.kuboOf(p.day.sixty);
    var natchin = {};
    PILLAR_KEYS.forEach(function (k) { if (p[k]) natchin[k] = Data.natchinOf(p[k].sixty); });

    var strength = shinKyojaku(p, meta, s);
    var kaku = kakkyoku(p, meta, strength, s);
    var yj = yojin(p, strength, s);

    return {
      pillars: p,
      meta: meta,
      zokan: zokan,
      zokanMode: zmode,
      tsuhen: tsuhen,
      juniun: juniun,
      kubo: kubo,
      jun: Data.junOf(p.day.sixty),
      natchin: natchin,
      shinsatsu: findShinsatsu(p, s),
      juniShinsatsu: juniShinsatsu(p),
      gochu: findGoChu(p),
      toukanTsukon: toukanTsukon(p),
      gogyo: gogyoBalance(p),
      strength: strength,
      kakkyoku: kaku,
      yojin: yj,
      meikyu: meikyu(p.month.branch, meta.hourBranch, p.year.stem),
      shinkyu: shinkyu(p.month.branch, meta.hourBranch, p.year.stem),
      taigen: taigen(p.month),
      taisoku: taisoku(p.day),
      settings: s
    };
  }

  global.Meishiki = {
    PILLAR_KEYS: PILLAR_KEYS,
    PILLAR_NAMES: PILLAR_NAMES,
    build: build,
    zokanOf: zokanOf,
    gogyoBalance: gogyoBalance,
    shinKyojaku: shinKyojaku,
    kakkyoku: kakkyoku,
    yojin: yojin,
    findShinsatsu: findShinsatsu,
    findGoChu: findGoChu,
    meikyu: meikyu,
    taigen: taigen,
    taisoku: taisoku
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Meishiki;
})(typeof window !== 'undefined' ? window : globalThis);
