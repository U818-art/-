// ---------------------------------------------------------------
// 「Claude用にコピー」— 計算結果を AI チャットに貼るだけで鑑定文章を
// 依頼できる構造化テキスト（プロンプト雛形込み）を生成する。
// ---------------------------------------------------------------
import { fmtJST } from './time.js'
import { fmtDeg } from './astrology.js'

const THEME_FOCUS = {
  総合: `- 人生全体の傾向（資質・対人・仕事・金銭・転機）をバランスよく扱ってください。
- 5つの分析手法に共通して現れるテーマがあれば、それを軸に章を構成してください。`,
  金運: `- 金銭との向き合い方・収入の得方の傾向・支出の癖・資産形成に向く進め方を深掘りしてください。
- 四柱推命の財星（正財・偏財）と五行バランス、占星術の2室・8室と金星・木星、数秘のライフパスの金銭傾向を必ず参照してください。
- 投資・ギャンブル等の推奨はせず、傾向の分析にとどめてください。`,
  恋愛: `- 恋愛・パートナーシップにおける資質、relationship のパターン、相性の見方、関係を育てるうえでの留意点を深掘りしてください。
- 占星術の金星・火星・月と7室、四柱推命の配偶者宮（日支）と官星・財星、数秘の対人傾向を必ず参照してください。`,
  仕事: `- 適性・強みの活かし方・働き方の傾向・キャリアの転機の捉え方を深掘りしてください。
- 占星術のMC・10室・6室と太陽・土星、四柱推命の官星・食傷と身強身弱、数秘のライフパス、九星の本命星の特性を必ず参照してください。`,
}

const fmtPillar = (p) =>
  p
    ? `${p.kanshi}（蔵干:${p.zokan}[${p.zokanKind}] ${p.label === '日柱' ? '日主' : '通変星:' + p.tsuhenStem} / 蔵干通変:${p.tsuhenZokan} / 十二運:${p.stage}）`
    : '—（出生時刻不明）'

export function buildClaudePrompt({ input, results, todayStr }) {
  const { astro, shichu, numerology, kyusei, tarot } = results
  const L = []

  L.push('あなたはブランド「櫻紫（OUSHI）」の鑑定書ライターです。')
  L.push('以下の計算済みデータのみを根拠に、鑑定書の本文を日本語で書いてください。')
  L.push('')
  L.push('# 執筆ルール（厳守）')
  L.push('- これは「占い」ではなく「人生分析」です。文章内でも占いではなく人生分析として書いてください。')
  L.push('- 断定的な結果表現をしないでください（「〜です」と運命を断定しない。「〜という傾向」「〜しやすい資質」等の表現を使う）。')
  L.push('- 「開運」「浄化」「運気」という語を使わないでください。「必ず」「絶対に」も使用禁止です。')
  L.push('- 恐怖を煽る表現、医療・法律・投資の助言はしないでください。')
  L.push('- 文体: 上品で静かな敬体。ヨーロッパの由緒ある書斎で手渡される書面のような、品格と知性のある文章。')
  L.push('- データにない事実を作らないでください。計算値の解釈のみ行ってください。')
  L.push('- 出力は章ごとに「## 章タイトル」で区切ってください（そのまま鑑定書エディタに貼り付けます）。')
  L.push('')
  L.push(`# 鑑定テーマ: ${input.theme}`)
  L.push(THEME_FOCUS[input.theme] ?? THEME_FOCUS['総合'])
  L.push('')
  L.push('# 対象者')
  L.push(`- お名前: ${input.name || '（未記入）'}`)
  L.push(`- 生年月日: ${input.dateStr}`)
  L.push(`- 出生時刻: ${input.timeKnown ? input.timeStr : '不明（時柱・ハウス・月位置は精度限定）'}`)
  L.push(`- 出生地: ${input.placeLabel}`)
  L.push(`- 鑑定日: ${todayStr}`)
  L.push('')

  // ---- 西洋占星術 ----
  L.push('# 1. 西洋占星術（トロピカル / ' + astro.houseSystem + 'ハウス / オーブ: 合・衝8° 三分・矩・六分6°）')
  for (const p of astro.planets) {
    L.push(
      `- ${p.name}: ${p.sign} ${fmtDeg(p.degInSign)} / 第${p.house}ハウス${p.retro ? '（逆行）' : ''}`
    )
  }
  if (astro.asc) L.push(`- ASC: ${astro.asc.sign} ${fmtDeg(astro.asc.degInSign)}`)
  if (astro.mc) L.push(`- MC: ${astro.mc.sign} ${fmtDeg(astro.mc.degInSign)}`)
  if (astro.aspects.length) {
    L.push('- 主要アスペクト: ' + astro.aspects.map((a) => `${a.p1}-${a.p2} ${a.aspect}(オーブ${a.orb.toFixed(1)}°)`).join(' / '))
  }
  for (const n of astro.notes) L.push(`- 注記: ${n}`)
  L.push('')

  // ---- 四柱推命 ----
  L.push('# 2. 四柱推命（立春・節入り=天文計算 / 時柱=地方時補正 / 蔵干=月律分野）')
  L.push(`- 年柱: ${fmtPillar(shichu.pillars.year)}`)
  L.push(`- 月柱: ${fmtPillar(shichu.pillars.month)}`)
  L.push(`- 日柱: ${fmtPillar(shichu.pillars.day)}`)
  L.push(`- 時柱: ${fmtPillar(shichu.pillars.hour)}`)
  L.push(`- 空亡: ${shichu.kubo}`)
  L.push(
    `- 五行バランス: ` +
      Object.entries(shichu.gogyoPct)
        .map(([k, v]) => `${k}${v}%`)
        .join(' / ')
  )
  L.push(`- 身強身弱の目安: ${shichu.strength}（簡易指標・扶抑の正式判定ではない）`)
  for (const n of shichu.notes) L.push(`- 注記: ${n}`)
  L.push('')

  // ---- 数秘術 ----
  L.push('# 3. 数秘術（モダン数秘・生年月日ベース / 11・22・33は保持）')
  L.push(`- ライフパスナンバー: ${numerology.lifePath.value}${numerology.lifePath.isMaster ? '（マスターナンバー）' : ''}（${numerology.lifePathExpr} → ${numerology.lifePath.steps.join(' → ')}）`)
  L.push(`- バースデーナンバー: ${numerology.birthday.value}`)
  L.push(`- パーソナルイヤーナンバー（${numerology.personalYearYear}年）: ${numerology.personalYear.value}`)
  L.push('')

  // ---- タロット ----
  if (tarot) {
    L.push(`# 4. タロット（ライダー・ウェイト版78枚 / ${tarot.spreadName}）`)
    for (const c of tarot.cards) {
      L.push(
        `- ${c.position}: ${c.card.jp}（${c.card.en}）${c.reversed ? '逆位置' : '正位置'} — キーワード: ${c.reversed ? c.card.rev : c.card.up}`
      )
    }
  } else {
    L.push('# 4. タロット')
    L.push('- 今回はドローなし（タロットの章は書かないでください）')
  }
  L.push('')

  // ---- 九星気学 ----
  L.push('# 5. 九星気学（本命星=立春切替 / 月命星=節入り切替）')
  L.push(`- 本命星: ${kyusei.honmeiName}`)
  L.push(`- 月命星: ${kyusei.getsumeiName}`)
  L.push(`- 傾斜: ${kyusei.keisha.name}傾斜`)
  L.push(
    `- 今年の巡り: ${kyusei.current.year}年は${kyusei.current.yearStarName}中宮 → 本命星は${kyusei.current.yearPalace.name}（${kyusei.current.yearPalace.dir}）に回座`
  )
  L.push(
    `- 今月の巡り: ${kyusei.current.monthStarName}中宮 → 本命星は${kyusei.current.monthPalace.name}（${kyusei.current.monthPalace.dir}）に回座`
  )
  for (const n of kyusei.notes) L.push(`- 注記: ${n}`)
  L.push('')

  L.push('# 出力してほしい構成')
  L.push('## はじめに（この鑑定書の読み方・2〜3段落）')
  L.push('## 生まれ持った資質（占星術＋四柱推命＋数秘の統合）')
  L.push(`## テーマ分析（${input.theme}）`)
  if (tarot) L.push('## いまへのメッセージ（タロット）')
  L.push('## この一年の流れ（パーソナルイヤー＋九星の巡り）')
  L.push('## 結びに（3〜4段落・押し付けない静かな励まし）')

  return L.join('\n')
}
