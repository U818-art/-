// ---------------------------------------------------------------
// 四柱推命
//
// 【採用ルール（この実装で固定した流儀）】
// 1. 年柱: 立春（天文計算による厳密な瞬間）で切替。立春前生まれは前年の干支。
// 2. 月柱: 十二節の節入り瞬間（天文計算）で切替。月支は 立春→寅 … 小寒→丑。
//    月干は五虎遁（甲己年→丙寅月起、乙庚→戊寅、丙辛→庚寅、丁壬→壬寅、戊癸→甲寅）。
// 3. 日柱: 標準の干支暦（グレゴリオ暦→ユリウス通日→60干支）。
//    基準: 2000年1月1日 = 戊午（60干支インデックス 54）。
// 4. 時柱: 地方時補正あり。LMT = JST + (出生地経度 − 135°)×4分
//    （一般式: LMT = 現地時計 + 経度×4分 − 時差×60分）で時刻の柱を決める。
//    時干は五鼠遁（甲己日→甲子時起、乙庚→丙子、丙辛→戊子、丁壬→庚子、戊癸→壬子）。
// 5. 23時台の扱い: LMT で 23:00 以降は「翌日の日干」として扱う方式に固定
//    （日柱の日付切替も LMT 23:00。いわゆる夜子の刻は採らない）。
// 6. 蔵干: 月律分野蔵干。節入りからの経過日数（実数）で 余気→中気→本気 を判定。
//    年支・日支・時支にも同じ経過日数を各支の分野表に当てて適用する（月律分野方式）。
//    経過日数が表の合計を超える場合は本気とする。
// 7. 通変星: 日干から見た五行の生剋と陰陽で判定（標準）。
// 8. 十二運: 日干から見た各支。陽干は順行・陰干は逆行（標準の長生起点）。
// 9. 空亡: 日柱の旬による（甲子旬→戌亥空亡 …）。
// 10. 五行バランス: 天干（年月日時）＋各支の蔵干（月律で選定した1字）の計8字
//     （時柱不明時は6字）を等ウェイトで集計した比率。
// 11. 身強身弱: 目安として、日干を除く7字（月支蔵干のみ重み2）のうち
//     日干と同五行（比劫）または日干を生じる五行（印）の重み比率で判定。
//     55%以上=身強の傾向 / 45%以下=身弱の傾向 / 中間=中和。簡易指標であり
//     正式な扶抑判定ではないことを明記して表示する。
// ---------------------------------------------------------------
import { jdn, lmtParts, nextDay } from './time.js'
import { currentSetsuMonth, adjustedYear } from './solarterms.js'

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const STEM_ELEM = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
// 干の陰陽: 偶数番=陽
const stemYang = (i) => i % 2 === 0

// 月律分野蔵干表（余気→中気→本気の順。数値は分野日数）
// 採用表: 日本で広く使われる標準表（泰山流系）
const ZOKAN = {
  0: [['壬', 10], ['癸', 20]],                 // 子
  1: [['癸', 9], ['辛', 3], ['己', 18]],       // 丑
  2: [['戊', 7], ['丙', 7], ['甲', 16]],       // 寅
  3: [['甲', 10], ['乙', 20]],                 // 卯
  4: [['乙', 9], ['癸', 3], ['戊', 18]],       // 辰
  5: [['戊', 5], ['庚', 9], ['丙', 16]],       // 巳
  6: [['丙', 10], ['己', 9], ['丁', 11]],      // 午
  7: [['丁', 9], ['乙', 3], ['己', 18]],       // 未
  8: [['戊', 7], ['壬', 7], ['庚', 16]],       // 申
  9: [['庚', 10], ['辛', 20]],                 // 酉
  10: [['辛', 9], ['丁', 3], ['戊', 18]],      // 戌
  11: [['戊', 7], ['甲', 5], ['壬', 18]],      // 亥
}
const ZOKAN_KIND = ['余気', '中気', '本気']

// 十二運: 長生の起点支（甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯）
const CHOSEI_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]
const STAGE12 = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養']

// 空亡: 旬番号 → 空亡の二支
const KUBO = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑']

// 五行の相生: 木→火→土→金→水→木
const GEN_NEXT = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
// 相剋: 木→土, 土→水, 水→火, 火→金, 金→木
const OVERCOME = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

export function stemElement(stemIdx) {
  return STEM_ELEM[stemIdx]
}

/** 日干（インデックス）から見た他干の通変星 */
export function tsuhensei(dayStemIdx, otherStemIdx) {
  const e0 = STEM_ELEM[dayStemIdx]
  const e1 = STEM_ELEM[otherStemIdx]
  const same = stemYang(dayStemIdx) === stemYang(otherStemIdx)
  if (e1 === e0) return same ? '比肩' : '劫財'
  if (GEN_NEXT[e0] === e1) return same ? '食神' : '傷官'
  if (OVERCOME[e0] === e1) return same ? '偏財' : '正財'
  if (OVERCOME[e1] === e0) return same ? '偏官' : '正官'
  if (GEN_NEXT[e1] === e0) return same ? '偏印' : '印綬'
  return '—'
}

/** 日干から見た支の十二運 */
export function twelveStage(dayStemIdx, branchIdx) {
  const start = CHOSEI_START[dayStemIdx]
  const dir = stemYang(dayStemIdx) ? 1 : -1
  const off = (((branchIdx - start) * dir) % 12 + 12) % 12
  return STAGE12[off]
}

/** 節入りからの経過日数で、支 branchIdx の月律分野蔵干を選ぶ */
function pickZokan(branchIdx, elapsedDays) {
  const table = ZOKAN[branchIdx]
  let acc = 0
  for (let i = 0; i < table.length; i++) {
    acc += table[i][1]
    if (elapsedDays < acc) {
      return {
        stem: table[i][0],
        kind: ZOKAN_KIND[3 - table.length + i],
        all: table,
      }
    }
  }
  // 分野表合計（30日）を超えた場合は本気
  const last = table[table.length - 1]
  return { stem: last[0], kind: '本気', all: table }
}

/**
 * 四柱推命メイン。
 * @param birthUTC   出生瞬間（UTC Date）
 * @param lonDeg     出生地経度（東経が正）
 * @param civilYear  現地時計での出生年
 * @param timeKnown  出生時刻が判明しているか
 */
export function computeShichu(birthUTC, lonDeg, civilYear, timeKnown) {
  const notes = []

  // ---- LMT（地方平均時）----
  const lmt = lmtParts(birthUTC, lonDeg)
  const lmtCorrectionMin = Math.round((lonDeg / 15) * 60 - 9 * 60) // JST比の補正分（表示用）

  // ---- 日柱: LMT 23:00 以降は翌日扱い ----
  let dY = lmt.y, dM = lmt.m, dD = lmt.d
  let rolled = false
  if (timeKnown && lmt.hh >= 23) {
    ;({ y: dY, m: dM, d: dD } = nextDay(dY, dM, dD))
    rolled = true
    notes.push('LMT 23時台の出生のため、日柱は翌日の干支を採用しています（採用ルール5）。')
  }
  const dayIdx = ((jdn(dY, dM, dD) - jdn(2000, 1, 1) + 54) % 60 + 60) % 60
  const dayStem = Math.floor(dayIdx % 10)
  const dayBranch = dayIdx % 12

  // ---- 年柱: 立春切替 ----
  const adj = adjustedYear(birthUTC, civilYear)
  const yStemIdx = ((adj.year - 4) % 10 + 10) % 10
  const yBranchIdx = ((adj.year - 4) % 12 + 12) % 12
  if (adj.beforeRisshun) {
    notes.push('立春前の出生のため、年柱・本命星は前年扱いです。')
  }

  // ---- 月柱: 節入り切替 ----
  const setsu = currentSetsuMonth(birthUTC)
  const mBranchIdx = setsu.branchIdx
  // 五虎遁: 寅月の月干 = (年干 % 5)*2 + 2
  const toraStem = ((yStemIdx % 5) * 2 + 2) % 10
  const mStemIdx = (toraStem + setsu.monthOrder) % 10

  // ---- 時柱 ----
  let hStemIdx = null
  let hBranchIdx = null
  if (timeKnown) {
    const mins = lmt.hh * 60 + lmt.mm
    hBranchIdx = Math.floor(((mins + 60) % 1440) / 120)
    // 五鼠遁: 子刻の時干 = (日干 % 5)*2
    hStemIdx = (((dayStem % 5) * 2) + hBranchIdx) % 10
  } else {
    notes.push('出生時刻不明のため時柱は算出していません（三柱での鑑定）。')
  }

  // ---- 蔵干（月律分野・全支に適用）----
  const zokanOf = (branchIdx) => pickZokan(branchIdx, setsu.elapsedDays)

  const mkPillar = (label, stemIdx, branchIdx) => {
    if (stemIdx === null || branchIdx === null) return null
    const z = zokanOf(branchIdx)
    const zStemIdx = STEMS.indexOf(z.stem)
    return {
      label,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      stemIdx,
      branchIdx,
      kanshi: STEMS[stemIdx] + BRANCHES[branchIdx],
      zokan: z.stem,
      zokanKind: z.kind,
      zokanTable: z.all,
      tsuhenStem: label === '日柱' ? '（日主）' : tsuhensei(dayStem, stemIdx),
      tsuhenZokan: tsuhensei(dayStem, zStemIdx),
      stage: twelveStage(dayStem, branchIdx),
    }
  }

  const pillars = {
    year: mkPillar('年柱', yStemIdx, yBranchIdx),
    month: mkPillar('月柱', mStemIdx, mBranchIdx),
    day: mkPillar('日柱', dayStem, dayBranch),
    hour: timeKnown ? mkPillar('時柱', hStemIdx, hBranchIdx) : null,
  }

  // ---- 空亡 ----
  const kubo = KUBO[Math.floor(dayIdx / 10)]

  // ---- 五行バランス（採用ルール10）----
  const units = []
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key]
    if (!p) continue
    units.push(STEM_ELEM[p.stemIdx])
    units.push(STEM_ELEM[STEMS.indexOf(p.zokan)])
  }
  const gogyo = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const e of units) gogyo[e]++
  const gogyoPct = {}
  for (const k of Object.keys(gogyo)) {
    gogyoPct[k] = Math.round((gogyo[k] / units.length) * 1000) / 10
  }

  // ---- 身強身弱の目安（採用ルール11）----
  const dayElem = STEM_ELEM[dayStem]
  const genMe = Object.keys(GEN_NEXT).find((k) => GEN_NEXT[k] === dayElem) // 日干を生じる五行
  let support = 0
  let total = 0
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key]
    if (!p) continue
    const items = []
    if (key !== 'day') items.push({ e: STEM_ELEM[p.stemIdx], w: 1 }) // 日干自身は除外
    items.push({ e: STEM_ELEM[STEMS.indexOf(p.zokan)], w: key === 'month' ? 2 : 1 })
    for (const it of items) {
      total += it.w
      if (it.e === dayElem || it.e === genMe) support += it.w
    }
  }
  const ratio = total ? support / total : 0
  const strength =
    ratio >= 0.55 ? '身強の傾向' : ratio <= 0.45 ? '身弱の傾向' : '中和'

  return {
    pillars,
    dayIdx,
    kubo,
    gogyo,
    gogyoPct,
    strength,
    strengthRatio: Math.round(ratio * 100),
    setsu,
    adjYear: adj,
    lmt,
    lmtCorrectionMin,
    rolled,
    notes,
    rules: {
      年切替: '立春（天文計算）',
      月切替: '節入り（天文計算）',
      日柱: '干支暦（基準 2000/1/1=戊午）',
      時柱: '地方平均時補正あり・23時以降は翌日の日干',
      蔵干: '月律分野（節入りからの経過日数）',
      身旺弱: '簡易指標（比劫＋印の重み比率、月支×2）',
    },
    debug: {
      lmt,
      lmtCorrectionMin,
      dayJdn: jdn(dY, dM, dD),
      dayIdx,
      setsuElapsedDays: Math.round(setsu.elapsedDays * 100) / 100,
      supportRatio: ratio,
    },
  }
}
