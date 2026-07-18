/* =========================================================
 * app.js — アプリケーション本体（UI結線）
 * ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    meishiki: null,     // 現在の命式
    input: null,        // 現在の入力値
    name: '',
    settings: null,     // 流派設定
    persons: [],        // 相性用
    calY: null, calM: null,
    editingCustId: null
  };

  /* =========================================
   * 流派プリセット（7流派）
   * ========================================= */
  var PRESETS = [
    { id: 'standard', name: '櫻紫標準（日本通俗式）', s: { yearSwitch: 'risshun', daySwitch: 'midnight', timeAdjust: 'none', zokanMode: 'bunya', tsuhenNames: 'std', taiunDir: 'standard', kiunMode: 'detail', strengthMode: 'score', kakkyokuMode: 'auto', allowGaikaku: true, kuboName: '空亡' } },
    { id: 'taizan', name: '泰山流系', s: { yearSwitch: 'risshun', daySwitch: 'midnight', timeAdjust: 'none', zokanMode: 'bunya', tsuhenNames: 'std', taiunDir: 'standard', kiunMode: 'floor', strengthMode: 'getsurei', kakkyokuMode: 'hongi', allowGaikaku: true, kuboName: '空亡' } },
    { id: 'takagi', name: '高木乗系', s: { yearSwitch: 'risshun', daySwitch: 'midnight', timeAdjust: 'lmt', zokanMode: 'bunya', tsuhenNames: 'std', taiunDir: 'standard', kiunMode: 'detail', strengthMode: 'score', kakkyokuMode: 'auto', allowGaikaku: true, kuboName: '空亡' } },
    { id: 'toha', name: '透派系', s: { yearSwitch: 'risshun', daySwitch: 'h23', timeAdjust: 'tst', zokanMode: 'main', tsuhenNames: 'alt', taiunDir: 'standard', kiunMode: 'detail', strengthMode: 'getsurei', kakkyokuMode: 'auto', allowGaikaku: true, kuboName: '旬空' } },
    { id: 'shihei', name: '子平古典系', s: { yearSwitch: 'risshun', daySwitch: 'midnight', timeAdjust: 'tst', zokanMode: 'main', tsuhenNames: 'alt', taiunDir: 'standard', kiunMode: 'floor', strengthMode: 'getsurei', kakkyokuMode: 'hongi', allowGaikaku: true, kuboName: '旬空' } },
    { id: 'jissho', name: '現代実証系', s: { yearSwitch: 'risshun', daySwitch: 'midnight', timeAdjust: 'tst', zokanMode: 'all', tsuhenNames: 'std', taiunDir: 'standard', kiunMode: 'detail', strengthMode: 'score', kakkyokuMode: 'auto', allowGaikaku: false, kuboName: '空亡' } },
    { id: 'toji', name: '冬至基準研究系', s: { yearSwitch: 'toji', daySwitch: 'midnight', timeAdjust: 'tst', zokanMode: 'bunya', tsuhenNames: 'std', taiunDir: 'standard', kiunMode: 'detail', strengthMode: 'score', kakkyokuMode: 'auto', allowGaikaku: true, kuboName: '空亡' } }
  ];
  var SHINSATSU_ALL = ['天乙貴人', '天徳貴人', '月徳貴人', '文昌貴人', '金輿', '駅馬', '咸池（桃花）', '華蓋', '羊刃', '飛刃', '紅艶殺', '魁罡', '孤辰', '寡宿', '駅馬（日支基準）', '咸池（日支基準）'];

  /* 都道府県 → 県庁所在地の東経（時刻補正用） */
  var PREFS = [
    ['未指定（補正なし）', null], ['北海道（札幌）', 141.35], ['青森', 140.74], ['岩手', 141.15], ['宮城', 140.87], ['秋田', 140.10],
    ['山形', 140.36], ['福島', 140.47], ['茨城', 140.45], ['栃木', 139.88], ['群馬', 139.06], ['埼玉', 139.65],
    ['千葉', 140.12], ['東京', 139.69], ['神奈川', 139.64], ['新潟', 139.02], ['富山', 137.21], ['石川', 136.63],
    ['福井', 136.22], ['山梨', 138.57], ['長野', 138.18], ['岐阜', 136.72], ['静岡', 138.38], ['愛知', 136.91],
    ['三重', 136.51], ['滋賀', 135.87], ['京都', 135.76], ['大阪', 135.52], ['兵庫', 135.18], ['奈良', 135.83],
    ['和歌山', 135.17], ['鳥取', 134.24], ['島根', 133.05], ['岡山', 133.93], ['広島', 132.46], ['山口', 131.47],
    ['徳島', 134.56], ['香川', 134.04], ['愛媛', 132.77], ['高知', 133.53], ['福岡', 130.42], ['佐賀', 130.30],
    ['長崎', 129.87], ['熊本', 130.74], ['大分', 131.61], ['宮崎', 131.42], ['鹿児島', 130.56], ['沖縄（那覇）', 127.68]
  ];

  function tsuhenName(i) {
    var set = state.settings.tsuhenNames === 'alt' ? Data.TSUHEN_ALT : Data.TSUHEN;
    return set[i];
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* =========================================
   * タブ
   * ========================================= */
  function switchTab(id) {
    document.querySelectorAll('#mainTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.id === 'tab-' + id); });
  }
  $('mainTabs').addEventListener('click', function (e) {
    if (e.target.dataset.tab) switchTab(e.target.dataset.tab);
  });

  /* =========================================
   * 設定タブ
   * ========================================= */
  function renderPresets() {
    var row = $('presetRow');
    row.innerHTML = '';
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.textContent = p.name;
      b.className = state.settings && state.settings.presetId === p.id ? 'active' : '';
      b.onclick = function () {
        state.settings = JSON.parse(JSON.stringify(p.s));
        state.settings.presetId = p.id;
        state.settings.presetName = p.name;
        state.settings.shinsatsuSet = null;
        settingsToForm();
        renderPresets();
        updateSchoolNote();
        rebuildIfPossible();
      };
      row.appendChild(b);
    });
    var my = Store.loadSettings();
    if (my && my.presetId === 'my') {
      var b2 = document.createElement('button');
      b2.textContent = '★ マイ流派';
      b2.className = state.settings.presetId === 'my' ? 'active' : '';
      b2.onclick = function () {
        state.settings = my; settingsToForm(); renderPresets(); updateSchoolNote(); rebuildIfPossible();
      };
      row.appendChild(b2);
    }
  }

  function settingsToForm() {
    var s = state.settings;
    $('stYearSwitch').value = s.yearSwitch;
    $('stDaySwitch').value = s.daySwitch;
    $('stTimeAdjust').value = s.timeAdjust;
    $('stZokan').value = s.zokanMode;
    $('stTsuhen').value = s.tsuhenNames;
    $('stTaiunDir').value = s.taiunDir;
    $('stKiun').value = s.kiunMode;
    $('stStrength').value = s.strengthMode;
    $('stKakkyoku').value = s.kakkyokuMode;
    $('stGaikaku').value = s.allowGaikaku ? 'yes' : 'no';
    $('stKubo').value = s.kuboName;
    // 神殺チェック
    var box = $('stShinsatsuChecks');
    box.innerHTML = '';
    SHINSATSU_ALL.forEach(function (name) {
      var lb = document.createElement('label');
      var ck = document.createElement('input');
      ck.type = 'checkbox';
      ck.checked = !s.shinsatsuSet || s.shinsatsuSet.indexOf(name) >= 0;
      ck.dataset.name = name;
      ck.onchange = formToSettings;
      lb.appendChild(ck);
      lb.appendChild(document.createTextNode(name));
      box.appendChild(lb);
    });
  }

  function formToSettings() {
    var s = state.settings;
    s.yearSwitch = $('stYearSwitch').value;
    s.daySwitch = $('stDaySwitch').value;
    s.timeAdjust = $('stTimeAdjust').value;
    s.zokanMode = $('stZokan').value;
    s.tsuhenNames = $('stTsuhen').value;
    s.taiunDir = $('stTaiunDir').value;
    s.kiunMode = $('stKiun').value;
    s.strengthMode = $('stStrength').value;
    s.kakkyokuMode = $('stKakkyoku').value;
    s.allowGaikaku = $('stGaikaku').value === 'yes';
    s.kuboName = $('stKubo').value;
    var checks = Array.prototype.slice.call($('stShinsatsuChecks').querySelectorAll('input'));
    var sel = checks.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.name; });
    s.shinsatsuSet = sel.length === SHINSATSU_ALL.length ? null : sel;
    s.presetId = 'custom';
    s.presetName = 'カスタム（未保存）';
    renderPresets();
    updateSchoolNote();
    rebuildIfPossible();
  }
  ['stYearSwitch', 'stDaySwitch', 'stTimeAdjust', 'stZokan', 'stTsuhen', 'stTaiunDir', 'stKiun', 'stStrength', 'stKakkyoku', 'stGaikaku', 'stKubo'].forEach(function (id) {
    $(id).addEventListener('change', formToSettings);
  });
  $('btnSaveSchool').onclick = function () {
    state.settings.presetId = 'my';
    state.settings.presetName = '★ マイ流派';
    Store.saveSettings(state.settings);
    $('saveSchoolNote').textContent = '保存しました。次回起動時も「マイ流派」が使えます。';
    renderPresets(); updateSchoolNote();
  };
  function updateSchoolNote() {
    $('schoolNote').textContent = '現在の流派: ' + (state.settings.presetName || '標準');
  }

  /* =========================================
   * 鑑定入力タブ
   * ========================================= */
  (function initInput() {
    var sel = $('inPref');
    PREFS.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = p[1] === null ? '' : p[1];
      o.textContent = p[0];
      sel.appendChild(o);
    });
    $('inCalendar').onchange = function () {
      var lunar = this.value === 'l';
      $('gregorianInputs').classList.toggle('hidden', lunar);
      $('lunarInputs').classList.toggle('hidden', !lunar);
    };
    $('inTimeUnknown').onchange = function () {
      $('inHH').disabled = this.checked;
      $('inMM').disabled = this.checked;
    };
  })();

  function readInput() {
    var y, m, d;
    if ($('inCalendar').value === 'l') {
      var g = Astro.lunarToGregorian(+$('inLY').value, +$('inLM').value, $('inLeap').checked, +$('inLD').value);
      if (!g) { alert('旧暦の日付を新暦に変換できませんでした。日付をご確認ください。'); return null; }
      y = g.y; m = g.m; d = g.d;
    } else {
      y = +$('inY').value; m = +$('inM').value; d = +$('inD').value;
    }
    if (!y || !m || !d || y < 1900 || y > 2100) { alert('生年月日をご確認ください（1900〜2100年に対応）。'); return null; }
    var timeUnknown = $('inTimeUnknown').checked;
    return {
      y: y, m: m, d: d,
      hh: timeUnknown ? 12 : +$('inHH').value,
      mm: timeUnknown ? 0 : +$('inMM').value,
      gender: $('inGender').value,
      lon: $('inPref').value === '' ? null : +$('inPref').value,
      timeUnknown: timeUnknown
    };
  }

  $('btnBuild').onclick = function () {
    var input = readInput();
    if (!input) return;
    buildChart(input, $('inName').value.trim());
  };

  function buildChart(input, name) {
    try {
      state.input = input;
      state.name = name || '';
      state.meishiki = Meishiki.build(input, state.settings);
      renderMeishiki();
      renderUnsei();
      switchTab('meishiki');
    } catch (e) {
      alert('計算中にエラーが発生しました: ' + e.message);
      console.error(e);
    }
  }
  function rebuildIfPossible() {
    if (state.input) {
      state.meishiki = Meishiki.build(state.input, state.settings);
      renderMeishiki();
      renderUnsei();
    }
  }

  /* =========================================
   * 命式タブ描画
   * ========================================= */
  function stemHTML(s) { return '<span class="elem-' + Data.STEM_ELEM[s] + '">' + Data.STEMS[s] + '</span>'; }
  function branchHTML(b) { return '<span class="elem-' + Data.BRANCH_ELEM[b] + '">' + Data.BRANCHES[b] + '</span>'; }

  function renderMeishiki() {
    var m = state.meishiki;
    if (!m) return;
    $('meishikiEmpty').classList.add('hidden');
    $('meishikiBody').classList.remove('hidden');

    var inp = m.meta.input;
    var adjustedNote = '';
    if (m.meta.adjusted.corrMin) adjustedNote = '（時刻補正 ' + (m.meta.adjusted.corrMin > 0 ? '+' : '') + m.meta.adjusted.corrMin.toFixed(0) + '分）';
    $('msPerson').textContent = (state.name ? state.name + '様 ' : '') +
      inp.y + '年' + inp.m + '月' + inp.d + '日 ' +
      (inp.timeUnknown ? '時刻不明' : ('0' + inp.hh).slice(-2) + ':' + ('0' + inp.mm).slice(-2)) +
      ' ' + (inp.gender === 'F' ? '女性' : '男性') + adjustedNote +
      '｜流派: ' + (state.settings.presetName || '標準');

    var keys = ['year', 'month', 'day', 'hour'];
    var heads = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    var rows = [];
    function row(label, fn) {
      var tds = keys.map(function (k) {
        if (!m.pillars[k]) return '<td class="small">—</td>';
        return fn(k);
      }).join('');
      rows.push('<tr><th>' + label + '</th>' + tds + '</tr>');
    }
    rows.push('<tr><th></th>' + keys.map(function (k) { return '<th>' + heads[k] + (k === 'day' ? '（日主）' : '') + '</th>'; }).join('') + '</tr>');
    row('天干', function (k) {
      var t = m.tsuhen.stems[k];
      return '<td class="kan">' + stemHTML(m.pillars[k].stem) + (t == null ? '<div class="ts">日主</div>' : '<div class="ts">' + tsuhenName(t) + '</div>') + '</td>';
    });
    row('地支', function (k) { return '<td class="shi">' + branchHTML(m.pillars[k].branch) + '</td>'; });
    row('蔵干', function (k) {
      var z = m.zokan[k].map(function (s, i) { return Data.STEMS[s] + '（' + tsuhenName(m.tsuhen.zokan[k][i]) + '）'; }).join('<br>');
      return '<td class="small">' + z + '</td>';
    });
    row('十二運', function (k) { return '<td>' + Data.JUNIUN[m.juniun[k]] + '</td>'; });
    row('十二神殺', function (k) { return '<td class="small">' + m.juniShinsatsu[k] + '</td>'; });
    row('納音', function (k) { return '<td class="small">' + m.natchin[k] + '</td>'; });
    $('msTable').innerHTML = rows.join('');

    // 補足情報
    var kname = state.settings.kuboName || '空亡';
    var ex = [];
    ex.push('<span class="item"><b>' + kname + '</b>：' + Data.BRANCHES[m.kubo[0]] + '・' + Data.BRANCHES[m.kubo[1]] + '（' + m.jun + '）</span>');
    if (m.meikyu) ex.push('<span class="item"><b>命宮</b>：' + Koyomi.sixtyName(m.meikyu.sixty) + '</span>');
    if (m.shinkyu) ex.push('<span class="item"><b>身宮</b>：' + Koyomi.sixtyName(m.shinkyu.sixty) + '</span>');
    ex.push('<span class="item"><b>胎元</b>：' + Koyomi.sixtyName(m.taigen.sixty) + '</span>');
    ex.push('<span class="item"><b>胎息</b>：' + Koyomi.sixtyName(m.taisoku.sixty) + '</span>');
    ex.push('<span class="item"><b>節入</b>：' + m.meta.prevSetsu.name + '（経過' + m.meta.daysIntoMonth.toFixed(1) + '日）</span>');
    ex.push('<span class="item"><b>起運</b>：' + m.meta.kiun.years + '歳' + (m.meta.kiun.months ? m.meta.kiun.months + 'ヶ月' : '') + '（大運' + (m.meta.forward ? '順行' : '逆行') + '）</span>');
    $('msExtra').innerHTML = ex.join('');

    // 五行レーダー
    Charts.drawGogyoRadar($('radarCanvas'), m.gogyo);
    // 関係図
    Charts.renderRelationSVG($('relationSVG'), m);

    // 判定
    var j = [];
    j.push('<p><b>身強身弱</b>：<strong>' + m.strength.level + '</strong>（' + m.strength.score.toFixed(1) + '点）</p>');
    j.push('<p class="note">' + m.strength.detail.join('／') + '</p>');
    j.push('<p><b>格局</b>：<strong>' + m.kakkyoku.name + '</strong><br><span class="note">' + m.kakkyoku.note + '</span></p>');
    j.push('<p><b>用神</b>：<strong class="elem-' + m.yojin.fuyoku + '">' + Data.ELEMS[m.yojin.fuyoku] + '</strong>');
    if (m.yojin.choko) j.push('　<b>調候用神</b>：' + m.yojin.choko.split('').join('・'));
    j.push('</p><p class="note">' + m.yojin.note.join('<br>') + '</p>');
    if (m.yojin.koki.length) j.push('<p><b>喜神</b>：' + m.yojin.koki.map(function (e) { return Data.ELEMS[e]; }).join('・') +
      (m.yojin.kiki.length ? '　<b>忌神</b>：' + m.yojin.kiki.map(function (e) { return Data.ELEMS[e]; }).join('・') : '') + '</p>');
    $('msJudge').innerHTML = j.join('');

    // 神殺
    var sh = [];
    if (m.shinsatsu.length) {
      var byName = {};
      m.shinsatsu.forEach(function (s) {
        (byName[s.name] = byName[s.name] || []).push(Meishiki.PILLAR_NAMES[s.pillar]);
      });
      sh.push('<ul>');
      Object.keys(byName).forEach(function (n) {
        sh.push('<li><b>' + n + '</b>（' + byName[n].join('・') + '）</li>');
      });
      sh.push('</ul>');
    } else sh.push('<p class="note">表示対象の神殺はありません。</p>');
    sh.push('<p class="note">十二神殺は命式表の行に表示しています。</p>');
    $('msShinsatsu').innerHTML = sh.join('');

    // 透干通根
    var tt = m.toukanTsukon;
    var t1 = tt.toukan.map(function (t) {
      return Meishiki.PILLAR_NAMES[t.from] + 'の蔵干「' + Data.STEMS[t.stem] + '」が' + Meishiki.PILLAR_NAMES[t.to] + 'の天干に透出';
    });
    var seen = {};
    t1 = t1.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
    var t2seen = {};
    var t2 = tt.tsukon.map(function (t) {
      return Meishiki.PILLAR_NAMES[t.pillar] + 'の天干が' + Meishiki.PILLAR_NAMES[t.root] + 'に通根';
    }).filter(function (x) { if (t2seen[x]) return false; t2seen[x] = true; return true; });
    $('msToukan').innerHTML =
      '<p><b>透干</b>：' + (t1.length ? t1.join('／') : 'なし') + '</p>' +
      '<p><b>通根</b>：' + (t2.length ? t2.join('／') : 'なし') + '</p>';
  }

  /* =========================================
   * 鑑定文タブ
   * ========================================= */
  $('btnGenText').onclick = function () {
    if (!state.meishiki) { alert('先に命式を立ててください。'); return; }
    var theme = $('themeSelect').value;
    var text;
    if (theme === 'general') text = Texts.generalText(state.meishiki, state.name);
    else text = Texts.themeText(state.meishiki, theme, state.input.gender);
    $('textEditor').value = text;
  };
  $('btnPolish').onclick = function () {
    var t = $('textEditor').value;
    if (!t.trim()) { alert('先に鑑定文を生成または入力してください。'); return; }
    $('textEditor').value = AI.polishText(t, { tone: $('aiTone').value, addClosing: true });
  };
  $('btnMailDraft').onclick = function () {
    var t = $('textEditor').value;
    if (!t.trim()) { alert('鑑定文がありません。'); return; }
    var subject = '【櫻紫より鑑定書のお届け】' + (state.name ? state.name + '様 ' : '') + '四柱推命鑑定結果';
    location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(t);
  };
  $('btnPDF').onclick = function () { makePDF($('pdfKind') ? $('pdfKind').value : 'full'); };
  $('btnPDF2').onclick = function () { makePDF($('pdfKind').value); };

  /* =========================================
   * 運勢タブ
   * ========================================= */
  function renderUnsei() {
    var m = state.meishiki;
    if (!m) return;
    $('unseiEmpty').classList.add('hidden');
    $('unseiBody').classList.remove('hidden');

    var now = new Date();
    // 大運
    var tu = Unsei.taiun(m, 10);
    var rows = ['<tr><th>年齢</th><th>西暦</th><th>干支</th><th>通変星</th><th>十二運</th><th>吉凶</th></tr>'];
    tu.forEach(function (t) {
      rows.push('<tr><td>' + t.startAge + '〜' + t.endAge + '歳</td><td>' + t.startYear + '年〜</td><td>' + t.name + (t.kubo ? '<span class="note">（' + (state.settings.kuboName || '空亡') + '）</span>' : '') + '</td><td>' + tsuhenName(t.tsuhen) + '</td><td>' + Data.JUNIUN[t.juniun] + '</td><td class="score-' + Unsei.scoreLabel(t.score) + '">' + Unsei.scoreLabel(t.score) + '</td></tr>');
    });
    $('taiunTable').innerHTML = rows.join('');
    Charts.drawFortuneCurve($('taiunCanvas'), tu.map(function (t) { return { label: t.startAge + '歳', score: t.score }; }));

    // 年運
    if (!$('nenunFrom').value) $('nenunFrom').value = now.getFullYear();
    renderNenun();

    // 月運
    if (!$('getsuunYear').value) $('getsuunYear').value = now.getFullYear();
    renderGetsuun();

    // 日運カレンダー
    if (state.calY === null) { state.calY = now.getFullYear(); state.calM = now.getMonth() + 1; }
    renderCal();

    // ライフチャート
    var lifePts = Unsei.lifeChart(m, 100);
    var age = now.getFullYear() - m.meta.input.y;
    Charts.drawLifeChart($('lifeCanvas'), lifePts, age);
  }

  function renderNenun() {
    var m = state.meishiki; if (!m) return;
    var from = +$('nenunFrom').value || new Date().getFullYear();
    var list = Unsei.nenun(m, from, 10);
    var rows = ['<tr><th>西暦</th><th>年齢</th><th>干支</th><th>通変星</th><th>十二運</th><th>吉凶</th></tr>'];
    list.forEach(function (t) {
      rows.push('<tr><td>' + t.year + '</td><td>' + t.age + '歳</td><td>' + t.name + (t.kubo ? '<span class="note">（' + (state.settings.kuboName || '空亡') + '）</span>' : '') + '</td><td>' + tsuhenName(t.tsuhen) + '</td><td>' + Data.JUNIUN[t.juniun] + '</td><td class="score-' + Unsei.scoreLabel(t.score) + '">' + Unsei.scoreLabel(t.score) + '</td></tr>');
    });
    $('nenunTable').innerHTML = rows.join('');
    Charts.drawFortuneCurve($('nenunCanvas'), list.map(function (t) { return { label: String(t.year), score: t.score }; }));
  }
  $('nenunFrom').addEventListener('change', renderNenun);

  function renderGetsuun() {
    var m = state.meishiki; if (!m) return;
    var y = +$('getsuunYear').value || new Date().getFullYear();
    var list = Unsei.getsuun(m, y);
    var rows = ['<tr><th>節入り</th><th>節</th><th>干支</th><th>通変星</th><th>十二運</th><th>吉凶</th></tr>'];
    list.forEach(function (t) {
      rows.push('<tr><td>' + t.label + '</td><td>' + t.setsu + '</td><td>' + t.name + '</td><td>' + tsuhenName(t.tsuhen) + '</td><td>' + Data.JUNIUN[t.juniun] + '</td><td class="score-' + Unsei.scoreLabel(t.score) + '">' + Unsei.scoreLabel(t.score) + '</td></tr>');
    });
    $('getsuunTable').innerHTML = rows.join('');
  }
  $('getsuunYear').addEventListener('change', renderGetsuun);

  function renderCal() {
    var m = state.meishiki; if (!m) return;
    var days = Unsei.nichiun(m, state.calY, state.calM);
    $('calLabel').textContent = state.calY + '年' + state.calM + '月';
    Charts.renderCalendar($('calContainer'), days, state.calY, state.calM);
  }
  $('calPrev').onclick = function () { state.calM--; if (state.calM < 1) { state.calM = 12; state.calY--; } renderCal(); };
  $('calNext').onclick = function () { state.calM++; if (state.calM > 12) { state.calM = 1; state.calY++; } renderCal(); };

  /* =========================================
   * 相性タブ
   * ========================================= */
  function addPersonRow(preset) {
    var div = document.createElement('div');
    div.className = 'person-row';
    div.innerHTML =
      '<label>名前<input type="text" class="pName" value="' + esc(preset && preset.name || '') + '"></label>' +
      '<label>性別<select class="pGender"><option value="F">女性</option><option value="M">男性</option></select></label>' +
      '<label>生年月日<span class="date-row">' +
      '<input type="number" class="pY" style="width:5.5em" value="' + (preset && preset.y || 1990) + '">年' +
      '<input type="number" class="pM" style="width:3.5em" value="' + (preset && preset.m || 1) + '">月' +
      '<input type="number" class="pD" style="width:3.5em" value="' + (preset && preset.d || 1) + '">日</span></label>' +
      '<label>時刻<span class="date-row">' +
      '<input type="number" class="pHH" style="width:3.5em" value="12">時' +
      '<input type="number" class="pMM" style="width:3.5em" value="0">分' +
      '<label class="inline"><input type="checkbox" class="pUnknown" checked>不明</label></span></label>' +
      '<button class="mini pDel">削除</button>';
    div.querySelector('.pDel').onclick = function () { div.remove(); };
    if (preset && preset.gender) div.querySelector('.pGender').value = preset.gender;
    $('aishouPersons').appendChild(div);
  }
  $('btnAddPerson').onclick = function () { addPersonRow(); };

  function readPersons() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('#aishouPersons .person-row'));
    return rows.map(function (r, i) {
      var unknown = r.querySelector('.pUnknown').checked;
      return {
        name: r.querySelector('.pName').value.trim() || ('人物' + (i + 1)),
        input: {
          y: +r.querySelector('.pY').value, m: +r.querySelector('.pM').value, d: +r.querySelector('.pD').value,
          hh: unknown ? 12 : +r.querySelector('.pHH').value, mm: unknown ? 0 : +r.querySelector('.pMM').value,
          gender: r.querySelector('.pGender').value, lon: null, timeUnknown: unknown
        }
      };
    });
  }

  var lastAishou = [];
  $('btnAishou').onclick = function () {
    var persons = readPersons();
    if (persons.length < 2) { alert('2名以上を登録してください。'); return; }
    var charts;
    try {
      charts = persons.map(function (p) { return { name: p.name, m: Meishiki.build(p.input, state.settings) }; });
    } catch (e) { alert('計算エラー: ' + e.message); return; }
    var out = [];
    lastAishou = [];
    for (var i = 0; i < charts.length; i++) {
      for (var j = i + 1; j < charts.length; j++) {
        var r = Texts.aishouText(charts[i].m, charts[j].m, charts[i].name, charts[j].name);
        lastAishou.push({ a: charts[i].name, b: charts[j].name, r: r });
        out.push('<div class="aishou-block"><div class="aishou-score">' + esc(charts[i].name) + ' × ' + esc(charts[j].name) + '　' + r.score + '点</div>' + esc(r.text) + '</div>');
      }
    }
    $('aishouResult').innerHTML = out.join('');
  };
  $('btnAishouPDF').onclick = function () {
    if (!lastAishou.length) { alert('先に相性を鑑定してください。'); return; }
    makePDF('aishou');
  };

  /* =========================================
   * 顧客管理タブ
   * ========================================= */
  function renderLockPane() {
    var pane = $('lockPane');
    if (!Store.hasCrypto()) {
      pane.innerHTML = '<p class="env-ng">この環境では暗号化機能（WebCrypto）が利用できないため、顧客管理は無効です。最新のブラウザでお試しください。</p>';
      return;
    }
    if (Store.isUnlocked()) {
      pane.innerHTML = '<p class="env-ok">ロック解除済み。顧客データは暗号化されてこのPC内にのみ保存されています。</p>';
      $('customerBody').classList.remove('hidden');
      renderCustomers(); renderResv(); renderSales();
      return;
    }
    $('customerBody').classList.add('hidden');
    if (!Store.isSetup()) {
      pane.innerHTML =
        '<p>顧客データベースを初期化します。データはパスワードで暗号化され、<b>このPC内にのみ</b>保存されます。</p>' +
        '<div class="form-grid"><label>マスターパスワード（お忘れになると復元できません）<input type="password" id="pwNew"></label></div>' +
        '<div class="actions"><button class="primary" id="btnSetup">初期化する</button></div>';
      $('btnSetup').onclick = function () {
        var pw = $('pwNew').value;
        if (pw.length < 4) { alert('パスワードは4文字以上にしてください。'); return; }
        Store.setup(pw).then(renderLockPane).catch(function (e) { alert(e.message); });
      };
    } else {
      pane.innerHTML =
        '<div class="form-grid"><label>マスターパスワード<input type="password" id="pwOpen"></label></div>' +
        '<div class="actions"><button class="primary" id="btnUnlock">ロック解除</button></div>';
      $('btnUnlock').onclick = function () {
        Store.unlock($('pwOpen').value).then(renderLockPane).catch(function (e) { alert(e.message); });
      };
      $('pwOpen').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btnUnlock').click(); });
    }
  }
  $('btnLock').onclick = function () { Store.lock(); renderLockPane(); };

  function renderCustomers() {
    var data = Store.getData(); if (!data) return;
    var q = $('custSearch').value.trim();
    var rows = ['<tr><th>氏名</th><th>生年月日</th><th>性別</th><th>電話</th><th></th></tr>'];
    data.customers
      .filter(function (c) { return !q || (c.name || '').indexOf(q) >= 0 || (c.kana || '').indexOf(q) >= 0; })
      .forEach(function (c) {
        rows.push('<tr><td>' + esc(c.name) + '</td><td>' + c.y + '/' + c.m + '/' + c.d + '</td><td>' + (c.gender === 'F' ? '女' : '男') + '</td><td>' + esc(c.tel || '') + '</td>' +
          '<td><button class="mini" data-edit="' + c.id + '">開く</button></td></tr>');
      });
    $('custTable').innerHTML = rows.join('');
    $('custTable').querySelectorAll('button[data-edit]').forEach(function (b) {
      b.onclick = function () { openCustomer(b.dataset.edit); };
    });
    // 予約フォームの顧客プルダウン
    var sel = $('rCust');
    sel.innerHTML = '';
    data.customers.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o);
    });
  }
  $('custSearch').addEventListener('input', renderCustomers);

  $('btnNewCust').onclick = function () { openCustomer(null); };
  function openCustomer(id) {
    state.editingCustId = id;
    var c = id ? Store.getData().customers.find(function (x) { return x.id === id; }) : null;
    $('custEditCard').classList.remove('hidden');
    $('custEditTitle').textContent = c ? '顧客情報: ' + c.name : '新規顧客';
    $('cName').value = c ? c.name : '';
    $('cKana').value = c ? c.kana || '' : '';
    $('cGender').value = c ? c.gender : 'F';
    $('cY').value = c ? c.y : ''; $('cM').value = c ? c.m : ''; $('cD').value = c ? c.d : '';
    $('cHH').value = c && c.hh != null ? c.hh : ''; $('cMM').value = c && c.mm != null ? c.mm : '';
    $('cTimeUnknown').checked = c ? !!c.timeUnknown : true;
    $('cTel').value = c ? c.tel || '' : '';
    $('cMail').value = c ? c.mail || '' : '';
    $('cMemo').value = c ? c.memo || '' : '';
  }
  $('btnSaveCust').onclick = function () {
    var c = {
      id: state.editingCustId || undefined,
      name: $('cName').value.trim(), kana: $('cKana').value.trim(), gender: $('cGender').value,
      y: +$('cY').value, m: +$('cM').value, d: +$('cD').value,
      hh: $('cHH').value === '' ? null : +$('cHH').value, mm: $('cMM').value === '' ? null : +$('cMM').value,
      timeUnknown: $('cTimeUnknown').checked,
      tel: $('cTel').value.trim(), mail: $('cMail').value.trim(), memo: $('cMemo').value
    };
    if (!c.name) { alert('氏名を入力してください。'); return; }
    var existing = state.editingCustId ? Store.getData().customers.find(function (x) { return x.id === state.editingCustId; }) : null;
    if (existing) { c.createdAt = existing.createdAt; c.id = existing.id; }
    Store.upsertCustomer(c).then(function (saved) {
      state.editingCustId = saved.id;
      renderCustomers();
      $('custEditTitle').textContent = '顧客情報: ' + saved.name + '（保存済み）';
    }).catch(function (e) { alert(e.message); });
  };
  $('btnDelCust').onclick = function () {
    if (!state.editingCustId) return;
    if (!confirm('この顧客と関連する予約を削除します。よろしいですか？')) return;
    Store.deleteCustomer(state.editingCustId).then(function () {
      state.editingCustId = null;
      $('custEditCard').classList.add('hidden');
      renderCustomers(); renderResv();
    });
  };
  $('btnCloseCust').onclick = function () { $('custEditCard').classList.add('hidden'); };
  $('btnCustToChart').onclick = function () {
    if (!state.editingCustId) { alert('先に保存してください。'); return; }
    var c = Store.getData().customers.find(function (x) { return x.id === state.editingCustId; });
    if (!c) return;
    var unknown = c.timeUnknown || c.hh == null;
    buildChart({ y: c.y, m: c.m, d: c.d, hh: unknown ? 12 : c.hh, mm: unknown ? 0 : (c.mm || 0), gender: c.gender, lon: null, timeUnknown: unknown }, c.name);
  };

  function renderResv() {
    var data = Store.getData(); if (!data) return;
    var rows = ['<tr><th>日時</th><th>顧客</th><th>内容</th><th></th></tr>'];
    data.reservations.slice().sort(function (a, b) { return (a.when || '').localeCompare(b.when || ''); }).forEach(function (r) {
      var c = data.customers.find(function (x) { return x.id === r.customerId; });
      rows.push('<tr><td>' + esc((r.when || '').replace('T', ' ')) + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' + esc(r.note || '') + '</td>' +
        '<td><button class="mini" data-del="' + r.id + '">削除</button></td></tr>');
    });
    $('resvTable').innerHTML = rows.join('');
    $('resvTable').querySelectorAll('button[data-del]').forEach(function (b) {
      b.onclick = function () { Store.deleteReservation(b.dataset.del).then(renderResv); };
    });
  }
  $('btnAddResv').onclick = function () {
    if (!$('rWhen').value) { alert('日時を入力してください。'); return; }
    Store.addReservation({ when: $('rWhen').value, customerId: $('rCust').value, note: $('rNote').value })
      .then(function () { $('rNote').value = ''; renderResv(); });
  };

  function renderSales() {
    var data = Store.getData(); if (!data) return;
    var rows = ['<tr><th>日付</th><th>金額</th><th>内容</th><th></th></tr>'];
    data.sales.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).forEach(function (s) {
      rows.push('<tr><td>' + esc(s.date) + '</td><td class="num">' + Number(s.amount).toLocaleString() + '円</td><td>' + esc(s.note || '') + '</td>' +
        '<td><button class="mini" data-del="' + s.id + '">削除</button></td></tr>');
    });
    $('salesTable').innerHTML = rows.join('');
    $('salesTable').querySelectorAll('button[data-del]').forEach(function (b) {
      b.onclick = function () { Store.deleteSale(b.dataset.del).then(renderSales); };
    });
    var sum = Store.salesSummary();
    var months = Object.keys(sum).sort().reverse().slice(0, 6);
    $('salesSummary').innerHTML = months.length
      ? '<p class="note">月別売上: ' + months.map(function (k) { return k + '＝' + sum[k].toLocaleString() + '円'; }).join('　') + '</p>' : '';
  }
  $('btnAddSale').onclick = function () {
    if (!$('sDate').value || !$('sAmount').value) { alert('日付と金額を入力してください。'); return; }
    Store.addSale({ date: $('sDate').value, amount: +$('sAmount').value, note: $('sNote').value })
      .then(function () { $('sNote').value = ''; $('sAmount').value = ''; renderSales(); });
  };

  $('btnBackup').onclick = function () {
    Store.downloadJSON(Store.exportBackup(), 'shichusuimei-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  };
  $('btnRestore').onclick = function () {
    pickFile(function (obj) {
      try {
        Store.importBackup(obj);
        alert('バックアップを読み込みました。パスワードでロック解除してください。');
        renderLockPane();
      } catch (e) { alert(e.message); }
    });
  };

  /* =========================================
   * ツールタブ
   * ========================================= */
  $('btnTakujitsu').onclick = function () {
    if (!state.meishiki) { alert('先に命式を立ててください（本人の命式に合わせて吉日を選びます）。'); return; }
    var from = $('tkFrom').value ? new Date($('tkFrom').value) : new Date();
    var list = Unsei.takujitsu(state.meishiki, from.getFullYear(), from.getMonth() + 1, from.getDate(), +$('tkDays').value, $('tkPurpose').value);
    var rows = ['<tr><th>日付</th><th>干支</th><th>評価</th><th>備考</th></tr>'];
    list.slice(0, 15).forEach(function (d) {
      rows.push('<tr><td>' + d.y + '/' + d.m + '/' + d.d + '</td><td>' + d.name + '</td><td class="score-' + d.label + '">' + d.label + '</td><td class="note">' + d.notes.join('・') + '</td></tr>');
    });
    $('tkTable').innerHTML = rows.join('');
  };

  (function initReverse() {
    Data.STEMS.forEach(function (s, i) { var o = document.createElement('option'); o.value = i; o.textContent = s; $('rvStem').appendChild(o); });
    Data.BRANCHES.forEach(function (b, i) { var o = document.createElement('option'); o.value = i; o.textContent = b; $('rvBranch').appendChild(o); });
  })();
  $('btnReverse').onclick = function () {
    var stem = +$('rvStem').value, branch = +$('rvBranch').value;
    var sixty = Koyomi.sixtyFromStemBranch(stem, branch);
    if (sixty < 0) { $('rvResult').innerHTML = '<p class="env-ng">その組み合わせ（陰陽不一致）は六十干支に存在しません。</p>'; return; }
    var days = Koyomi.reverseLookupDays(sixty, +$('rvY1').value, +$('rvY2').value, 500);
    $('rvResult').innerHTML = '<p><b>' + Koyomi.sixtyName(sixty) + '</b>の日（' + days.length + '件）</p>' +
      days.map(function (d) { return d.y + '/' + d.m + '/' + d.d; }).join('、 ');
  };

  $('btnExportJSON').onclick = function () {
    if (!state.input) { alert('先に命式を立ててください。'); return; }
    var m = state.meishiki;
    Store.downloadJSON({
      format: 'ssp-meishiki-v1',
      name: state.name,
      input: state.input,
      settings: state.settings,
      result: {
        pillars: ['year', 'month', 'day', 'hour'].map(function (k) { return m.pillars[k] ? Koyomi.sixtyName(m.pillars[k].sixty) : null; }),
        strength: m.strength.level,
        kakkyoku: m.kakkyoku.name,
        yojin: Data.ELEMS[m.yojin.fuyoku]
      }
    }, 'meishiki-' + (state.name || 'noname') + '.json');
  };
  function importMeishikiJSON(obj) {
    if (!obj || obj.format !== 'ssp-meishiki-v1' || !obj.input) { alert('命式JSONの形式が正しくありません。'); return; }
    if (obj.settings) { state.settings = obj.settings; settingsToForm(); renderPresets(); updateSchoolNote(); }
    buildChart(obj.input, obj.name || '');
  }
  $('btnImportJSON').onclick = function () { pickFile(importMeishikiJSON); };
  $('btnLoadJSON').onclick = function () { pickFile(importMeishikiJSON); };

  function pickFile(cb) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { cb(JSON.parse(rd.result)); } catch (e) { alert('JSONの読み込みに失敗しました: ' + e.message); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  function renderTodayKoyomi() {
    var now = new Date();
    var r = Koyomi.pillarsOfDate(now.getFullYear(), now.getMonth() + 1, now.getDate(), state.settings);
    var lunar = Astro.gregorianToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
    $('todayKoyomi').innerHTML =
      '<p>' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日</p>' +
      '<p><b>年柱</b> ' + Koyomi.sixtyName(r.year.sixty) + '　<b>月柱</b> ' + Koyomi.sixtyName(r.month.sixty) + '　<b>日柱</b> ' + Koyomi.sixtyName(r.day.sixty) + '</p>' +
      (lunar ? '<p><b>旧暦</b> ' + lunar.year + '年' + (lunar.leap ? '閏' : '') + lunar.month + '月' + lunar.day + '日</p>' : '') +
      '<p class="note">節: ' + r.meta.prevSetsu.name + '（' + r.meta.prevSetsu.jst.m + '/' + r.meta.prevSetsu.jst.d + '）〜 次節: ' + r.meta.nextSetsu.name + '（' + r.meta.nextSetsu.jst.m + '/' + r.meta.nextSetsu.jst.d + '）</p>';
  }

  /* =========================================
   * 用語辞典
   * ========================================= */
  function renderGlossary(q) {
    var list = $('glossaryList');
    var html = [];
    Data.GLOSSARY.forEach(function (g) {
      if (q && g.term.indexOf(q) < 0 && g.yomi.indexOf(q) < 0 && g.desc.indexOf(q) < 0) return;
      html.push('<dt>' + esc(g.term) + '<span class="yomi">' + esc(g.yomi) + '</span></dt><dd>' + esc(g.desc) + '</dd>');
    });
    list.innerHTML = html.join('') || '<dd>該当する用語が見つかりませんでした。</dd>';
  }
  $('glossarySearch').addEventListener('input', function () { renderGlossary(this.value.trim()); });

  /* =========================================
   * AIアシスタント
   * ========================================= */
  $('aiToggle').onclick = function () { $('aiPanel').classList.toggle('hidden'); };
  $('aiClose').onclick = function () { $('aiPanel').classList.add('hidden'); };
  function aiSend() {
    var q = $('aiQuestion').value.trim();
    if (!q) return;
    var log = $('aiLog');
    var u = document.createElement('div'); u.className = 'ai-msg user'; u.textContent = q; log.appendChild(u);
    var a = document.createElement('div'); a.className = 'ai-msg bot';
    a.textContent = AI.assistantAnswer(q, state.meishiki);
    log.appendChild(a);
    log.scrollTop = log.scrollHeight;
    $('aiQuestion').value = '';
  }
  $('aiSend').onclick = aiSend;
  $('aiQuestion').addEventListener('keydown', function (e) { if (e.key === 'Enter') aiSend(); });

  /* =========================================
   * PDF鑑定書
   * ========================================= */
  function pillarTableHTML(m) {
    var keys = ['year', 'month', 'day', 'hour'];
    var heads = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    var h = ['<table><tr><th></th>' + keys.map(function (k) { return '<th>' + heads[k] + '</th>'; }).join('') + '</tr>'];
    function row(label, fn) {
      h.push('<tr><th>' + label + '</th>' + keys.map(function (k) { return m.pillars[k] ? fn(k) : '<td>—</td>'; }).join('') + '</tr>');
    }
    row('干支', function (k) { return '<td class="kanji-big">' + Koyomi.sixtyName(m.pillars[k].sixty) + '</td>'; });
    row('通変星', function (k) { var t = m.tsuhen.stems[k]; return '<td>' + (t == null ? '日主' : tsuhenName(t)) + '</td>'; });
    row('蔵干', function (k) { return '<td>' + m.zokan[k].map(function (s, i) { return Data.STEMS[s] + '（' + tsuhenName(m.tsuhen.zokan[k][i]) + '）'; }).join(' ') + '</td>'; });
    row('十二運', function (k) { return '<td>' + Data.JUNIUN[m.juniun[k]] + '</td>'; });
    h.push('</table>');
    return h.join('');
  }

  function makePDF(kind) {
    var area = $('printArea');
    var m = state.meishiki;
    var today = new Date();
    var dateStr = today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日';
    var signer = $('pdfSigner').value.trim();
    var pages = [];

    function head(title) {
      var inp = m ? m.meta.input : null;
      return '<h1>' + title + '</h1>' +
        '<div class="pdf-meta">' +
        (state.name ? esc(state.name) + ' 様　' : '') +
        (inp ? inp.y + '年' + inp.m + '月' + inp.d + '日生（' + (inp.gender === 'F' ? '女性' : '男性') + (inp.timeUnknown ? '・時刻不明' : '・' + ('0' + inp.hh).slice(-2) + ':' + ('0' + inp.mm).slice(-2)) + '）　' : '') +
        '鑑定日 ' + dateStr + '</div>';
    }
    function foot() {
      return (signer ? '<div class="pdf-sign">' + esc(signer) + '</div>' : '') +
        '<div class="pdf-foot">❀ 本鑑定書は櫻紫式鑑定システムにより作成されました（流派: ' + esc(state.settings.presetName || '標準') + '） ❀</div>';
    }

    if (kind === 'aishou') {
      if (!lastAishou.length) { alert('先に相性タブで鑑定してください。'); return; }
      var body = lastAishou.map(function (x) {
        return '<h2>' + esc(x.a) + ' × ' + esc(x.b) + '（' + x.r.score + '点）</h2><div class="pdf-body">' + esc(x.r.text) + '</div>';
      }).join('');
      pages.push('<div class="pdf-page"><h1>櫻紫式 相性鑑定書</h1><div class="pdf-meta">鑑定日 ' + dateStr + '</div>' + body + foot() + '</div>');
    } else {
      if (!m) { alert('先に命式を立ててください。'); return; }
      var editorText = $('textEditor').value.trim() || Texts.generalText(m, state.name);

      if (kind === 'summary') {
        var sum = AI.summarizeText(editorText, 2);
        pages.push('<div class="pdf-page">' + head('櫻紫式 鑑定書（要約）') + pillarTableHTML(m) +
          '<h2>鑑定要旨</h2><div class="pdf-body">' + esc(sum) + '</div>' + foot() + '</div>');
      } else if (kind === 'nenun') {
        var list = Unsei.nenun(m, today.getFullYear(), 10);
        var rows = ['<table><tr><th>西暦</th><th>年齢</th><th>干支</th><th>通変星</th><th>十二運</th><th>吉凶</th></tr>'];
        list.forEach(function (t) {
          rows.push('<tr><td>' + t.year + '</td><td>' + t.age + '歳</td><td>' + t.name + '</td><td>' + tsuhenName(t.tsuhen) + '</td><td>' + Data.JUNIUN[t.juniun] + '</td><td>' + Unsei.scoreLabel(t.score) + '</td></tr>');
        });
        rows.push('</table>');
        pages.push('<div class="pdf-page">' + head('櫻紫式 年運鑑定書') + pillarTableHTML(m) +
          '<h2>今後10年の年運</h2>' + rows.join('') +
          '<div class="pdf-body">' + esc(Texts.nenunText(m, list)) + '</div>' + foot() + '</div>');
      } else {
        // 標準
        var tu = Unsei.taiun(m, 8);
        var turows = ['<table><tr><th>年齢</th><th>干支</th><th>通変星</th><th>十二運</th><th>吉凶</th></tr>'];
        tu.forEach(function (t) {
          turows.push('<tr><td>' + t.startAge + '〜' + t.endAge + '歳</td><td>' + t.name + '</td><td>' + tsuhenName(t.tsuhen) + '</td><td>' + Data.JUNIUN[t.juniun] + '</td><td>' + Unsei.scoreLabel(t.score) + '</td></tr>');
        });
        turows.push('</table>');
        var kname = state.settings.kuboName || '空亡';
        pages.push('<div class="pdf-page">' + head('櫻紫式 四柱推命鑑定書') + pillarTableHTML(m) +
          '<div class="pdf-body">' +
          esc('格局：' + m.kakkyoku.name + '　身強身弱：' + m.strength.level + '　用神：' + Data.ELEMS[m.yojin.fuyoku] +
            (m.yojin.choko ? '　調候用神：' + m.yojin.choko.split('').join('・') : '') +
            '　' + kname + '：' + Data.BRANCHES[m.kubo[0]] + '・' + Data.BRANCHES[m.kubo[1]]) + '</div>' +
          '<h2>鑑定文</h2><div class="pdf-body">' + esc(editorText) + '</div></div>');
        pages.push('<div class="pdf-page"><h2>大運（10年ごとの運気）</h2>' + turows.join('') +
          '<h2>直近の年運</h2><div class="pdf-body">' + esc(Texts.nenunText(m, Unsei.nenun(m, today.getFullYear(), 5))) + '</div>' + foot() + '</div>');
      }
    }
    area.innerHTML = pages.join('');
    window.print();
  }

  /* =========================================
   * 環境診断（初回起動時）
   * ========================================= */
  function runDiagnostics() {
    var rows = [];
    function check(name, ok, note) {
      rows.push('<tr><td>' + name + '</td><td class="' + (ok ? 'env-ok' : 'env-ng') + '">' + (ok ? '✓ 正常' : '✕ 利用不可') + '</td><td class="note">' + (note || '') + '</td></tr>');
      return ok;
    }
    var okLS = false;
    try { localStorage.setItem('ssp.test', '1'); localStorage.removeItem('ssp.test'); okLS = true; } catch (e) { }
    check('データ保存（localStorage）', okLS, okLS ? '設定・顧客DBを保存できます' : 'プライベートモードでは保存できません');
    check('暗号化（WebCrypto）', Store.hasCrypto(), Store.hasCrypto() ? '顧客DBを暗号化できます' : '顧客管理機能が無効になります');
    var okCanvas = !!document.createElement('canvas').getContext;
    check('グラフ描画（Canvas）', okCanvas);
    // 計算自己テスト
    var calcOK = false;
    try {
      var t = Koyomi.computePillars({ y: 2000, m: 1, d: 1, hh: 0, mm: 0, gender: 'M', lon: null }, {});
      calcOK = Koyomi.sixtyName(t.day.sixty) === '戊午' && Koyomi.sixtyName(t.year.sixty) === '己卯';
    } catch (e) { }
    check('暦計算エンジン自己テスト', calcOK, calcOK ? '既知の命式と一致しました' : '計算に問題があります');
    check('印刷（PDF作成）', typeof window.print === 'function', '「PDFに保存」で鑑定書を出力できます');
    check('オフライン動作', true, 'すべての処理はこのPC内で完結します');
    $('envReport').innerHTML = '<table>' + rows.join('') + '</table>';
  }

  /* =========================================
   * 初期化
   * ========================================= */
  function init() {
    var saved = Store.loadSettings();
    if (saved) state.settings = saved;
    else {
      state.settings = JSON.parse(JSON.stringify(PRESETS[0].s));
      state.settings.presetId = 'standard';
      state.settings.presetName = PRESETS[0].name;
    }
    settingsToForm();
    renderPresets();
    updateSchoolNote();
    renderGlossary('');
    renderLockPane();
    runDiagnostics();
    renderTodayKoyomi();
    addPersonRow(); addPersonRow(); // 相性の初期2名
    var now = new Date();
    $('tkFrom').value = now.toISOString().slice(0, 10);
    $('sDate').value = now.toISOString().slice(0, 10);
  }
  init();
})();
