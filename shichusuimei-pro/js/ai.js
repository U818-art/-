/* =========================================================
 * ai.js — オフラインAI機能
 * 「AI文章仕上げ」: 鑑定文を自然で読みやすい日本語に整える
 *   軽量な日本語ルールベースNLPエンジン（PC内で完結）
 * 「AIアシスタント」: 用語・使い方・表示中の命式について
 *   チャット形式で回答する対話エンジン
 * ※ いずれも外部送信は一切行いません。
 * ========================================================= */
(function (global) {
  'use strict';
  var Data = global.Data || (typeof require !== 'undefined' ? require('./data.js') : null);
  var Koyomi = global.Koyomi || (typeof require !== 'undefined' ? require('./koyomi.js') : null);

  /* =========================================
   * AI文章仕上げ
   * ========================================= */
  var CONNECTORS = ['また、', 'さらに、', '一方で、', 'そして、', '加えて、'];

  function polishText(text, options) {
    var o = options || {};
    var tone = o.tone || 'polite'; // polite | soft | formal
    var lines = text.split('\n');
    var out = [];
    var connIdx = 0;
    var prevWasBody = false;

    lines.forEach(function (line) {
      var t = line.trim();
      if (!t) { out.push(''); prevWasBody = false; return; }
      // 見出しはそのまま
      if (/^[【◆■○]/.test(t)) { out.push(t); prevWasBody = false; return; }

      // 1) 重複語の除去（「ですです」「ますます。」等）
      t = t.replace(/です。です。/g, 'です。').replace(/ます。ます。/g, 'ます。');
      // 2) 文頭の接続詞を適度に補い、単調さを軽減
      // 3文に1回程度、決定的に付与（乱数は使わず文字数で決める＝再現性確保）
      if (prevWasBody && !/^(また|さらに|一方|そして|ただし|なお|加えて|特に|この)/.test(t) && connIdx < 5 && t.length % 3 === 0) {
        t = CONNECTORS[connIdx % CONNECTORS.length] + t; connIdx++;
      }
      // 3) 文末のトーン調整
      if (tone === 'soft') {
        t = t.replace(/です。/g, 'ですよ。').replace(/ですよ。ですよ。/g, 'ですよ。')
             .replace(/でしょう。/g, 'でしょうね。')
             .replace(/が吉です(よ)?。/g, 'をおすすめします。');
        t = t.replace(/(ですよ。){2,}/g, 'ですよ。');
      } else if (tone === 'formal') {
        t = t.replace(/ですよ。/g, 'です。')
             .replace(/タイプです/g, '傾向を備えています')
             .replace(/〜/g, 'から');
      }
      // 4) 冗長表現の圧縮
      t = t.replace(/することができます/g, 'できます')
           .replace(/という風に/g, 'というように')
           .replace(/ということです。/g, 'です。');
      // 5) 連続する読点の整理
      t = t.replace(/、、+/g, '、').replace(/。。+/g, '。');
      out.push(t);
      prevWasBody = true;
    });

    var result = out.join('\n');
    // 6) 全体の締めの一文（重複防止）
    if (o.addClosing && result.indexOf('実り多い日々') < 0) {
      result += '\n\nこの鑑定が、実り多い日々への一助となりますように。';
    }
    return result;
  }

  // 要約（鑑定書の「要約版」用）: 見出しごとに先頭文を抽出
  function summarizeText(text, maxSentencesPerSection) {
    var n = maxSentencesPerSection || 1;
    var lines = text.split('\n');
    var out = [];
    var sectionBody = 0;
    lines.forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      if (/^[【◆■○]/.test(t)) { out.push(t); sectionBody = 0; return; }
      if (sectionBody < n) {
        var first = t.split('。').slice(0, 1).join('。');
        if (first) out.push(first + '。');
        sectionBody++;
      }
    });
    return out.join('\n');
  }

  /* =========================================
   * AIアシスタント（チャット）
   * ========================================= */
  function normalize(q) {
    return (q || '').toLowerCase().replace(/[\s　、。？?！!]/g, '');
  }

  // 使い方ヘルプ
  var HOWTO = [
    { keys: ['使い方', 'ヘルプ', 'help', 'はじめ'], a: '基本の流れ:\n1.「鑑定入力」タブで生年月日・出生時刻・性別を入力し「命式を立てる」を押します。\n2.「命式」タブで四柱・蔵干・通変星などを確認できます。\n3.「鑑定文」タブで文章を生成し、エディタで自由に編集できます。\n4.「PDF鑑定書」ボタンで印刷（PDF保存）できます。' },
    { keys: ['pdf', '鑑定書', '印刷'], a: 'PDF鑑定書は「鑑定文」タブまたは各画面の「PDF鑑定書」ボタンから作成します。種類（標準／要約／年運／相性）を選ぶと印刷プレビューが開き、プリンタの選択で「PDFに保存」を選べば保存先を指定して保存できます。書体は明朝系を使用しています。' },
    { keys: ['流派', 'カスタマイズ', '設定'], a: '「設定」タブで7つの収録流派プリセットを切り替えられます。年柱／日柱の切替・時刻補正（真太陽時）・蔵干方式・通変星の表記・大運の順逆・起運・身強身弱・格局・神殺・空亡の呼称を個別に調整し、「マイ流派として保存」であなただけの流派を作成できます。' },
    { keys: ['顧客', 'お客様', 'カルテ'], a: '「顧客管理」タブで顧客情報を登録できます。データはパスワードで暗号化してこのPC内にのみ保存されます。「バックアップ」ボタンで暗号化されたままファイルに書き出せます。' },
    { keys: ['予約', '売上'], a: '「顧客管理」タブ内の「予約・売上」で鑑定予約と売上を記録できます。月別の集計も表示されます。' },
    { keys: ['旧暦'], a: '「鑑定入力」タブで「旧暦で入力」に切り替えると、旧暦の年月日（閏月対応）で入力できます。内部で新暦に変換して命式を立てます。' },
    { keys: ['逆引き', '干支から'], a: '「ツール」タブの「干支の逆引き」で、日干支（例: 甲子）を指定して該当する日付を検索できます。' },
    { keys: ['択日', '開運日', '吉日'], a: '「ツール」タブの「択日（開運日）」で、目的（契約・引越し・恋愛など）と期間を指定すると、命式に合う吉日を提案します。' },
    { keys: ['json', '入出力', 'エクスポート'], a: '「ツール」タブから命式データをJSON形式で書き出し・読み込みできます。他のPCへの持ち運びや記録の保管にご利用ください。' },
    { keys: ['メール', '下書き'], a: '鑑定文画面の「メール下書き」ボタンで、既定のメールソフトに鑑定文入りの下書きを作成します。' },
    { keys: ['オフライン', 'インターネット', '送信'], a: '本ソフトは計算・鑑定文生成・AI機能・PDF作成のすべてがお使いのPC内で完結します。データが外部に送信されることは一切ありません。' },
    { keys: ['ai', '文章仕上げ'], a: '「AI文章仕上げ」は鑑定文の語調を整え、重複や冗長表現を除いて読みやすくする機能です。丁寧・やわらか・格調の3トーンを選べます。処理はすべてPC内で行われます。' }
  ];

  function chartSummary(m) {
    if (!m) return null;
    var P = ['year', 'month', 'day', 'hour'];
    var names = P.map(function (k) { return m.pillars[k] ? Koyomi.sixtyName(m.pillars[k].sixty) : '—'; });
    return {
      names: names,
      dayStem: m.pillars.day.stem,
      strength: m.strength.level,
      kaku: m.kakkyoku.name,
      yojin: Data.ELEMS[m.yojin.fuyoku],
      kubo: Data.BRANCHES[m.kubo[0]] + Data.BRANCHES[m.kubo[1]]
    };
  }

  function assistantAnswer(question, currentMeishiki) {
    var q = normalize(question);
    if (!q) return 'ご質問をどうぞ。用語の意味、使い方、表示中の命式について何でもお答えします。';

    // 1) 表示中の命式についての質問
    var cs = chartSummary(currentMeishiki);
    if (cs) {
      if (/この(命式|人|方)|いまの|今の|表示中/.test(question) || /命式.*(教えて|説明|どんな)/.test(question)) {
        return '表示中の命式は 年柱' + cs.names[0] + '・月柱' + cs.names[1] + '・日柱' + cs.names[2] + '・時柱' + cs.names[3] +
          ' です。日主は「' + Data.STEMS[cs.dayStem] + '」、身強身弱は「' + cs.strength + '」、格局は「' + cs.kaku +
          '」、用神は「' + cs.yojin + '」、空亡は「' + cs.kubo + '」です。詳しくは「命式」タブをご覧ください。';
      }
      if (q.indexOf('ようじん') >= 0 || question.indexOf('用神') >= 0) {
        if (question.indexOf('とは') < 0 && question.indexOf('意味') < 0) {
          return '表示中の命式の用神は「' + cs.yojin + '」です。' + currentMeishiki.yojin.note.join('') +
            '\n（用語としての「用神」の意味を知りたい場合は「用神とは」とお尋ねください）';
        }
      }
      if (question.indexOf('身強') >= 0 || question.indexOf('身弱') >= 0) {
        if (question.indexOf('とは') < 0) {
          return '表示中の命式は「' + cs.strength + '」です。判定内訳: ' + currentMeishiki.strength.detail.join(' / ');
        }
      }
      if (question.indexOf('格局') >= 0 && question.indexOf('とは') < 0) {
        return '表示中の命式の格局は「' + cs.kaku + '」です。' + currentMeishiki.kakkyoku.note;
      }
    }

    // 2) 用語辞典から検索
    var best = null, bestLen = 0;
    Data.GLOSSARY.forEach(function (g) {
      var term = g.term.replace(/（.*）/, '');
      if (question.indexOf(term) >= 0 && term.length > bestLen) { best = g; bestLen = term.length; }
      // 別表記（括弧内）でも
      var alt = (g.term.match(/（(.+)）/) || [])[1];
      if (alt && question.indexOf(alt) >= 0 && alt.length > bestLen) { best = g; bestLen = alt.length; }
    });
    if (best) return '【' + best.term + '（' + best.yomi + '）】\n' + best.desc;

    // 3) 使い方ヘルプ
    for (var i = 0; i < HOWTO.length; i++) {
      for (var k = 0; k < HOWTO[i].keys.length; k++) {
        if (q.indexOf(normalize(HOWTO[i].keys[k])) >= 0) return HOWTO[i].a;
      }
    }

    // 4) 干支そのものの質問（例:「甲子とは」）
    for (var s = 0; s < 60; s++) {
      var nm = Koyomi.sixtyName(s);
      if (question.indexOf(nm) >= 0) {
        var p = Koyomi.pillarFromSixty(s);
        return '「' + nm + '」は六十干支の第' + (s + 1) + '番。天干「' + Data.STEMS[p.stem] + '」（' + Data.ELEMS[Data.STEM_ELEM[p.stem]] + 'の' + (Data.STEM_YANG[p.stem] ? '陽' : '陰') + '）と地支「' + Data.BRANCHES[p.branch] + '」の組み合わせで、納音は「' + Data.natchinOf(s) + '」です。';
      }
    }

    return '申し訳ありません、うまくお答えできませんでした。「用語（例: 通変星とは）」「使い方（例: PDFの作り方）」「表示中の命式について」などの聞き方でお試しください。';
  }

  global.AI = {
    polishText: polishText,
    summarizeText: summarizeText,
    assistantAnswer: assistantAnswer
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.AI;
})(typeof window !== 'undefined' ? window : globalThis);
