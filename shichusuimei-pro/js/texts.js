/* =========================================================
 * texts.js — 鑑定文の生成
 * 日干・通変星・十二運・五行・格局などの解釈テキストと、
 * テーマ別（総合・恋愛・結婚・仕事・転職・健康・金運）の
 * 鑑定文アセンブリ、相性鑑定。
 * ========================================================= */
(function (global) {
  'use strict';
  var Data = global.Data || (typeof require !== 'undefined' ? require('./data.js') : null);
  var Koyomi = global.Koyomi || (typeof require !== 'undefined' ? require('./koyomi.js') : null);
  var Unsei = global.Unsei || (typeof require !== 'undefined' ? require('./unsei.js') : null);

  /* ---------- 日干（日主）の性質 ---------- */
  var NIKKAN = {
    0: { sym: '大樹', text: '甲は天に向かってまっすぐ伸びる大樹の木性です。向上心と芯の強さを備え、一度決めた道を着実に歩む姿勢が持ち味です。曲がったことを嫌う正直さがあり、周囲からの信頼を集めますが、融通のきかなさが頑固さとして出ることもあります。' },
    1: { sym: '草花', text: '乙はしなやかな草花の木性です。環境に合わせて柔軟に形を変えながら、決して折れない粘り強さを秘めています。人当たりが柔らかく協調性に富みますが、内には確かな主張を持っており、静かに目標を達成していく人です。' },
    2: { sym: '太陽', text: '丙は万物を照らす太陽の火性です。明るくエネルギッシュで、その場の空気を一変させる存在感があります。裏表がなくオープンな性格で人を惹きつけますが、熱しやすく冷めやすい面や、感情が表に出やすい面もあります。' },
    3: { sym: '灯火', text: '丁は闇を照らす灯火・炉の火性です。表向きは物静かでも、内に情熱と鋭い感受性を秘めています。細やかな気配りと洞察力に優れ、芸術や精神性の分野で才能を発揮しやすい人です。感情の起伏を溜め込みやすい点には注意が必要です。' },
    4: { sym: '山岳', text: '戊はどっしりと構える山・大地の土性です。安定感と包容力があり、周囲から頼られる存在です。動じない胆力を持ちますが、腰が重く変化を好まない傾向もあります。信頼を守る誠実さが最大の財産です。' },
    5: { sym: '田畑', text: '己は作物を育てる田畑の土性です。面倒見がよく、人を育て支えることに喜びを見いだします。柔軟で吸収力が高く、知識や経験を蓄えて実らせる才能があります。一方で心配性な面や、他人に尽くしすぎる傾向もあります。' },
    6: { sym: '鋼鉄', text: '庚は鍛えられた鋼・刃物の金性です。決断力と行動力に富み、困難に立ち向かうほど力を発揮する闘志の人です。白黒をはっきりつける性分で、改革や勝負の場面で頼りになりますが、言葉が鋭くなりやすい点は要注意です。' },
    7: { sym: '宝石', text: '辛は磨かれた宝石・貴金属の金性です。繊細な美意識と鋭い感性を持ち、洗練されたものを好みます。プライドが高く自分を磨く努力を惜しみませんが、傷つきやすい内面を強がりで覆うことがあります。品格が武器になる人です。' },
    8: { sym: '大河', text: '壬は滔々と流れる大河・海の水性です。スケールが大きく自由を愛し、知恵と行動力で新しい世界を切り開きます。細事にこだわらないおおらかさが魅力ですが、奔放さが気まぐれと映ることもあります。' },
    9: { sym: '雨露', text: '癸は静かに大地を潤す雨・泉の水性です。物静かで思慮深く、鋭い直感と観察眼を持ちます。縁の下で人を支え、知識を深めることに長けています。内向的に見えますが、内面には粘り強い意志を秘めています。' }
  };

  /* ---------- 通変星 ---------- */
  var TSUHEN_TEXT = {
    0: { general: '独立心と自我の強さを表す星です。人に頼らず自分の力で道を開こうとします。', work: '独立・自営に向き、対等な立場での協働を好みます。組織では自分の裁量がある仕事で力を発揮します。', love: '恋愛でも対等な関係を望みます。束縛を嫌い、自立したパートナーシップを築くタイプです。' },
    1: { general: '負けん気と勝負強さの星です。目標へ向かう突破力と、仲間を巻き込む力があります。', work: '競争のある環境で燃えるタイプです。営業や勝負事に強い反面、金銭の出入りが荒くなりがちです。', love: '情熱的で駆け引きも辞さないタイプです。恋のライバルがいるほど燃える傾向があります。' },
    2: { general: '衣食住に恵まれる福の星です。おおらかで楽しみ上手、人生を味わう才能があります。', work: '専門技術・食・サービス・創作など、楽しみながら続けられる仕事で長く花開きます。', love: '穏やかで自然体の恋愛を好みます。一緒にいて楽な相手と縁が深まります。' },
    3: { general: '鋭い感性と表現力の星です。美意識が高く、繊細で頭の回転が速い人です。', work: '企画・デザイン・技術・批評など、感性と頭脳を活かす仕事が適職です。単調な作業は苦手です。', love: '理想が高く、ドラマチックな恋を求める傾向があります。言葉の鋭さが出ないよう注意を。' },
    4: { general: '回転の速い財の星です。社交性と商才があり、動きながら豊かさをつかみます。', work: '商売・営業・金融など、お金と人が動く現場に強い星です。副業や投資の才もあります。', love: 'モテる星です。出会いが多く恋も軽やかですが、本命を定める決断が課題になります。' },
    5: { general: '堅実な財の星です。コツコツと信用と資産を積み上げる、誠実で真面目な人です。', work: '経理・管理・不動産など、確実さが求められる仕事で信頼を得ます。堅実な蓄財に向きます。', love: '誠実で一途な恋愛をします。結婚に結びつく真面目な交際を望むタイプです。' },
    6: { general: '行動力と統率力の星です。困難に挑む気迫があり、親分肌・姉御肌の人望を集めます。', work: '現場指揮・起業・警察消防など、責任と決断を伴う仕事で輝きます。じっとした事務は不向きです。', love: '押しの強い情熱的な恋をします。主導権を握りたいタイプで、スピード婚も少なくありません。' },
    7: { general: '責任感と品位の星です。規律を重んじ、組織や社会の中で信頼を得て地位を築きます。', work: '公務・管理職・法務など、正確さと信用が問われる仕事が天職です。着実に出世する星です。', love: '真面目で折り目正しい交際をします。世間体や家柄を意識した堅実な結婚に向かいます。' },
    8: { general: '独創性と探究心の星です。人と違う視点を持ち、専門の道や副業的な才能で光ります。', work: '研究・医療・占術・IT・芸能など、特殊な専門分野が適職です。飽きっぽさが課題です。', love: '変化のある恋を好み、平凡な関係には物足りなさを感じがちです。年の差や遠距離の縁も。' },
    9: { general: '知性と学びの星です。知識を吸収し人に伝える才があり、目上からの引き立てに恵まれます。', work: '教育・執筆・学術・宗教など、知を扱う仕事が適職です。名誉を重んじ、実利は二の次になりがちです。', love: '精神的なつながりを重視します。尊敬できる相手との落ち着いた愛情を育みます。' }
  };

  /* ---------- 十二運 ---------- */
  var JUNIUN_TEXT = {
    0: '長生：素直で伸びやかな発展のエネルギー。学び始めたことが順調に育ちます。',
    1: '沐浴：変化と迷いのエネルギー。感受性が豊かで、住まいや心が定まりにくい時期・性質を表します。',
    2: '冠帯：華やかな上昇のエネルギー。人前に立つほど輝き、見栄も力に変えます。',
    3: '建禄：自立と実力のエネルギー。地に足のついた努力が確実に実ります。',
    4: '帝旺：頂点の強運エネルギー。強い意志と統率力を持ちますが、強すぎて孤立しない配慮も必要です。',
    5: '衰：円熟と内省のエネルギー。派手さはなくとも、経験に裏打ちされた堅実さがあります。',
    6: '病：感受性と想像力のエネルギー。優しく空想力豊かですが、気力の波があります。',
    7: '死：静けさと専門性のエネルギー。一つの道を深く極める職人気質を表します。',
    8: '墓：蓄積と探究のエネルギー。物・知識・お金を蓄える才があり、渋い魅力を放ちます。',
    9: '絶：転換と再生のエネルギー。移り気な面はありますが、ゼロから立ち上がる強さがあります。',
    10: '胎：構想と可能性のエネルギー。新しいことを思い描く力に富み、好奇心が原動力です。',
    11: '養：育みと継承のエネルギー。人に可愛がられる徳があり、受け継いだものを大切に育てます。'
  };

  /* ---------- 五行 ---------- */
  var GOGYO_TRAIT = {
    0: '木（成長・仁）', 1: '火（情熱・礼）', 2: '土（安定・信）', 3: '金（決断・義）', 4: '水（知恵・智）'
  };

  function fmtPillar(p) { return Koyomi.sixtyName(p.sixty); }

  /* ---------- 命式の総合鑑定文 ---------- */
  function generalText(m, name) {
    var d = m.pillars.day;
    var out = [];
    var who = name ? name + '様' : 'あなた';

    out.push('【日主：' + Data.STEMS[d.stem] + '（' + NIKKAN[d.stem].sym + '）】');
    out.push(who + 'の日主（生まれ日の干）は「' + Data.STEMS[d.stem] + '」。' + NIKKAN[d.stem].text);

    // 月柱通変星（社会面の中心）
    var mt = m.tsuhen.stems.month;
    if (mt != null) {
      out.push('【社会面の星：' + Data.TSUHEN[mt] + '】');
      out.push('月柱に「' + Data.TSUHEN[mt] + '」を持ちます。' + TSUHEN_TEXT[mt].general + TSUHEN_TEXT[mt].work);
    }
    // 月支蔵干通変星（内面の中核）
    var mz = m.tsuhen.zokan.month && m.tsuhen.zokan.month[0];
    if (mz != null) {
      out.push('内面の中核には「' + Data.TSUHEN[mz] + '」の性質が流れています。' + TSUHEN_TEXT[mz].general);
    }
    // 日支十二運
    out.push('【日柱の十二運：' + Data.JUNIUN[m.juniun.day] + '】');
    out.push(JUNIUN_TEXT[m.juniun.day]);

    // 五行バランス
    var g = m.gogyo;
    var maxI = 0, minI = 0;
    for (var i = 1; i < 5; i++) { if (g[i] > g[maxI]) maxI = i; if (g[i] < g[minI]) minI = i; }
    out.push('【五行のバランス】');
    out.push('命式中で最も強いのは' + GOGYO_TRAIT[maxI] + 'の気、最も少ないのは' + GOGYO_TRAIT[minI] + 'の気です。' +
      Data.ELEMS[minI] + 'を補う色・方位・習慣を取り入れると全体の調和が高まります。');

    // 身強弱・格局・用神
    out.push('【身強身弱と格局】');
    out.push('日主の強さは「' + m.strength.level + '」、格局は「' + m.kakkyoku.name + '」です。' + m.kakkyoku.note);
    out.push('【用神】');
    out.push('運勢の鍵を握る用神は「' + Data.ELEMS[m.yojin.fuyoku] + '」。' + m.yojin.note.join(''));

    // 神殺
    if (m.shinsatsu.length) {
      var names = {};
      m.shinsatsu.forEach(function (s) { names[s.name] = true; });
      out.push('【神殺】');
      out.push('命式には ' + Object.keys(names).join('・') + ' が巡っています。特に吉神は人生の要所で守りとなり、注意星は自覚することで力に変わります。');
    }
    // 空亡
    var kname = (m.settings && m.settings.kuboName) || '空亡';
    out.push('【' + kname + '】');
    out.push(kname + 'は「' + Data.BRANCHES[m.kubo[0]] + '・' + Data.BRANCHES[m.kubo[1]] + '」。この支が巡る年月は結論を急がず、準備と学びに充てるのが吉です。');

    return out.join('\n');
  }

  /* ---------- テーマ別鑑定 ---------- */
  function findStars(m, indexes) { // 指定通変星がどこにあるか
    var hits = [];
    ['year', 'month', 'hour'].forEach(function (k) {
      if (m.tsuhen.stems[k] != null && indexes.indexOf(m.tsuhen.stems[k]) >= 0) hits.push({ where: k, t: m.tsuhen.stems[k], pos: '天干' });
    });
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      (m.tsuhen.zokan[k] || []).forEach(function (t) {
        if (indexes.indexOf(t) >= 0) hits.push({ where: k, t: t, pos: '蔵干' });
      });
    });
    return hits;
  }

  function themeText(m, theme, gender) {
    var out = [];
    var d = m.pillars.day.stem;
    var isM = gender !== 'F';
    switch (theme) {
      case 'love': {
        out.push('◆ 恋愛運');
        var stars = isM ? findStars(m, [4, 5]) : findStars(m, [6, 7]);
        var starName = isM ? '財星（正財・偏財）' : '官星（正官・偏官）';
        if (stars.length >= 2) out.push('恋愛の縁を示す' + starName + 'が命式に複数あり、出会いには恵まれる方です。選ぶ目を養うことが幸せへの近道です。');
        else if (stars.length === 1) out.push('恋愛の縁を示す' + starName + 'がしっかりと根づいています。縁は量より質。信頼を積み重ねる交際が実ります。');
        else out.push('恋愛の星が表に出ていない分、恋に不器用な印象を与えることがあります。ただし縁が無いのではなく、運気（財官の巡る年）が扉を開くタイプです。');
        var kanchiHits = m.shinsatsu.filter(function (s) { return s.name.indexOf('咸池') >= 0 || s.name === '紅艶殺'; });
        if (kanchiHits.length) out.push('咸池（桃花）・紅艶といった魅力の星を持ち、異性を惹きつける華があります。');
        out.push(TSUHEN_TEXT[m.tsuhen.zokan.day && m.tsuhen.zokan.day[0] != null ? m.tsuhen.zokan.day[0] : 0].love);
        break;
      }
      case 'marriage': {
        out.push('◆ 結婚運');
        out.push('結婚生活の場を示すのは日支（配偶者宮）です。日支は「' + Data.BRANCHES[m.pillars.day.branch] + '」、十二運は' + Data.JUNIUN[m.juniun.day] + '。');
        var chu = m.gochu.filter(function (r) { return r.type === '冲' && (r.a === 'day' || r.b === 'day'); });
        var go = m.gochu.filter(function (r) { return (r.type === '支合' || r.type === '半会') && (r.a === 'day' || r.b === 'day'); });
        if (go.length) out.push('日支が他の柱と合を結んでおり、家庭が心の拠り所となる暗示です。パートナーとの結びつきは強い方です。');
        if (chu.length) out.push('日支に冲があり、結婚生活には変化やすれ違いが起きやすい暗示です。生活リズムの違いを認め合う工夫が長続きの秘訣です。');
        if (!go.length && !chu.length) out.push('配偶者宮は穏やかで、結婚により運気が安定するタイプです。');
        if (m.kubo.indexOf(m.pillars.day.branch) >= 0) out.push('配偶者宮が空亡にあたるため、結婚の形にとらわれない柔軟な夫婦観が吉と出ます。');
        break;
      }
      case 'work': {
        out.push('◆ 仕事運・適職');
        var mt = m.tsuhen.stems.month != null ? m.tsuhen.stems.month : (m.tsuhen.zokan.month ? m.tsuhen.zokan.month[0] : 0);
        out.push('社会での顔を示す月柱の星は「' + Data.TSUHEN[mt] + '」。' + TSUHEN_TEXT[mt].work);
        out.push('格局「' + m.kakkyoku.name + '」から見ると、' + kakuWork(m.kakkyoku.name));
        var bunsho = m.shinsatsu.some(function (s) { return s.name === '文昌貴人'; });
        if (bunsho) out.push('文昌貴人があり、文筆・学術・資格の分野で頭角を現しやすい人です。');
        break;
      }
      case 'career': {
        out.push('◆ 転職・独立');
        var ekiba = m.shinsatsu.some(function (s) { return s.name.indexOf('駅馬') >= 0; });
        if (ekiba) out.push('駅馬を持つため、転職・転居などの「動」があるたびに運が開けるタイプです。環境を変えることを恐れる必要はありません。');
        else out.push('駅馬が無く、腰を据えて積み上げるほど強みが出るタイプです。転職は「逃げ」でなく「攻め」のタイミングで。');
        if (m.strength.level.indexOf('身強') >= 0) out.push('日主が強いため独立・起業に耐える体力があります。勝負運の巡る年（喜神の年）を選んで動きましょう。');
        else out.push('日主は控えめなため、単独での起業よりも、良きパートナーや組織の看板を活かす形が安全です。');
        break;
      }
      case 'health': {
        out.push('◆ 健康運');
        var g = m.gogyo;
        var minI = 0, maxI = 0;
        for (var i = 1; i < 5; i++) { if (g[i] < g[minI]) minI = i; if (g[i] > g[maxI]) maxI = i; }
        var organ = { 0: '肝・胆・目・筋', 1: '心・小腸・血流', 2: '脾・胃・消化器', 3: '肺・大腸・呼吸器・皮膚', 4: '腎・膀胱・耳・冷え' };
        out.push('五行で最も弱い「' + Data.ELEMS[minI] + '」に対応する ' + organ[minI] + ' は労わりたい部位です。');
        out.push('また最も強い「' + Data.ELEMS[maxI] + '」は過剰による不調（' + organ[maxI] + 'の酷使）にも注意が必要です。');
        out.push('用神「' + Data.ELEMS[m.yojin.fuyoku] + '」を養う生活（' + yojinLife(m.yojin.fuyoku) + '）が健康の土台になります。');
        break;
      }
      case 'money': {
        out.push('◆ 金運');
        var zai = findStars(m, [4, 5]);
        if (zai.length >= 2) out.push('財星が豊かで、お金との縁は太い方です。ただし財が多い命式は「お金は入るが出ても行く」形。管理の仕組み化が鍵です。');
        else if (zai.length === 1) out.push('財星が一つ、良い位置に据わっています。堅実な蓄財に向き、コツコツ型の資産形成が性に合います。');
        else out.push('財星が表に出ていないため、お金そのものより「技能・信用」を蓄える方が結果的に豊かになれるタイプです。');
        if (m.strength.level === '身弱' || m.strength.level === '極身弱') out.push('日主が弱めなので、大きな財を動かす投機より、身の丈の積立や技能への投資が吉です。');
        else out.push('日主がしっかりしているため、財を追う攻めの投資にも耐えられます。喜神の年が勝負どきです。');
        break;
      }
      default: {
        out.push(generalText(m));
      }
    }
    return out.join('\n');
  }
  function kakuWork(name) {
    if (name.indexOf('正官') >= 0) return '組織の中で信頼と地位を築く王道の出世タイプです。';
    if (name.indexOf('偏官') >= 0) return '現場の指揮官タイプ。責任と権限のある立場で燃えます。';
    if (name.indexOf('正財') >= 0) return '堅実な実務・管理で財を成すタイプです。';
    if (name.indexOf('偏財') >= 0) return '商才と人脈で流通・商売の世界を泳ぐタイプです。';
    if (name.indexOf('食神') >= 0) return '好きなことを続けて食べていける、専門・創作向きのタイプです。';
    if (name.indexOf('傷官') >= 0) return '感性と技術で勝負するスペシャリストタイプです。';
    if (name.indexOf('印') >= 0) return '知識・教育・資格を武器にする学究タイプです。';
    if (name.indexOf('建禄') >= 0 || name.indexOf('月刃') >= 0) return '自力で道を切り開く独立独歩のタイプです。';
    if (name.indexOf('従') >= 0) return '時流と環境に乗ることで大きく伸びる特殊な形です。流れに逆らわないことが成功の鍵です。';
    return '自分の格を活かした働き方が吉です。';
  }
  function yojinLife(elem) {
    return { 0: '緑・朝の散歩・東の方位', 1: '赤・日光浴・南の方位', 2: '黄・土いじり・規則的な食事', 3: '白・呼吸法・西の方位', 4: '黒・水分と休息・北の方位' }[elem];
  }

  /* ---------- 相性鑑定 ---------- */
  function aishouText(m1, m2, name1, name2) {
    var out = [];
    var n1 = name1 || 'お一人目', n2 = name2 || 'お二人目';
    var d1 = m1.pillars.day, d2 = m2.pillars.day;
    var score = 50;

    out.push('◆ ' + n1 + '（日主 ' + Data.STEMS[d1.stem] + '・' + fmtPillar(d1) + '） × ' + n2 + '（日主 ' + Data.STEMS[d2.stem] + '・' + fmtPillar(d2) + '）');

    // 日干の関係
    var t12 = Data.tsuhenIndex(d1.stem, d2.stem);
    var e1 = Data.STEM_ELEM[d1.stem], e2 = Data.STEM_ELEM[d2.stem];
    if (Data.KANGO[d1.stem] === d2.stem) {
      score += 20;
      out.push('お二人の日干は「干合」の関係。理屈を超えて惹かれ合う、四柱推命で最も縁の深い組み合わせの一つです。');
    } else if ((e1 + 1) % 5 === e2 || (e2 + 1) % 5 === e1) {
      score += 10;
      out.push('日干は相生（生じ合う）の関係。どちらかが自然に相手を支える、循環の良い間柄です。');
    } else if ((e1 + 2) % 5 === e2 || (e2 + 2) % 5 === e1) {
      score -= 5;
      out.push('日干は相剋の関係。刺激し合い成長できる反面、疲れたときに衝突しやすい組み合わせです。役割分担を明確にすると安定します。');
    } else if (e1 === e2) {
      score += 5;
      out.push('日干は同じ五行。価値観が近く「わかり合える」関係ですが、似た者同士ゆえに譲り合いが課題です。');
    }

    // 日支の関係
    var b1 = d1.branch, b2 = d2.branch;
    if (Data.SHIGO[b1] === b2) { score += 15; out.push('日支は「支合」。生活のリズムが自然と噛み合う、家庭運の良い相性です。'); }
    if (Data.chuOf(b1) === b2) { score -= 12; out.push('日支は「冲」。生活習慣や価値観が正反対になりやすい組み合わせです。違いを面白がれるかが分かれ目です。'); }
    Data.SANGO.forEach(function (g) {
      var tri = [g[0], g[1], g[2]];
      if (tri.indexOf(b1) >= 0 && tri.indexOf(b2) >= 0 && b1 !== b2) { score += 12; out.push('日支は三合の仲間。同じ目標へ向かうときに絶大な力を発揮するチームの相性です。'); }
    });
    if (Data.GAI[b1] === b2) { score -= 6; out.push('日支に「害」があり、小さなすれ違いが積もりやすい面があります。不満はその日のうちに言葉にしましょう。'); }

    // 空亡の一致
    var k1 = m1.kubo.join(','), k2 = m2.kubo.join(',');
    if (k1 === k2) { score += 8; out.push('お二人は同じ空亡（天中殺）グループ。人生の停滞期と充実期が重なるため、共に歩みやすい間柄です。'); }

    // 用神の補完
    if (m2.gogyo[m1.yojin.fuyoku] >= 2) { score += 10; out.push(n2 + 'は' + n1 + 'の用神「' + Data.ELEMS[m1.yojin.fuyoku] + '」を豊かに持っており、一緒にいるだけで運気を補ってくれる存在です。'); }
    if (m1.gogyo[m2.yojin.fuyoku] >= 2) { score += 10; out.push(n1 + 'は' + n2 + 'の用神「' + Data.ELEMS[m2.yojin.fuyoku] + '」を豊かに持っており、互いに支え合う縁です。'); }

    score = Math.max(5, Math.min(98, Math.round(score)));
    out.splice(1, 0, '総合相性スコア: ' + score + ' / 100');
    return { text: out.join('\n'), score: score };
  }

  /* ---------- 大運・年運の文章 ---------- */
  function taiunText(m, tu) {
    return tu.map(function (t) {
      var lab = Unsei.scoreLabel(t.score);
      return t.startAge + '歳〜' + t.endAge + '歳（' + t.startYear + '年〜）: ' + t.name +
        '　' + Data.TSUHEN[t.tsuhen] + '・' + Data.JUNIUN[t.juniun] + (t.kubo ? '・空亡' : '') +
        '【' + lab + '】 ' + TSUHEN_TEXT[t.tsuhen].general;
    }).join('\n');
  }
  function nenunText(m, list) {
    return list.map(function (t) {
      var lab = Unsei.scoreLabel(t.score);
      return t.year + '年（' + t.age + '歳・' + t.name + '）【' + lab + '】 ' +
        Data.TSUHEN[t.tsuhen] + 'の年。' + TSUHEN_TEXT[t.tsuhen].general + (t.kubo ? '空亡年のため、新規の大勝負より足場固めが吉。' : '');
    }).join('\n');
  }

  global.Texts = {
    NIKKAN: NIKKAN,
    TSUHEN_TEXT: TSUHEN_TEXT,
    JUNIUN_TEXT: JUNIUN_TEXT,
    generalText: generalText,
    themeText: themeText,
    aishouText: aishouText,
    taiunText: taiunText,
    nenunText: nenunText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Texts;
})(typeof window !== 'undefined' ? window : globalThis);
