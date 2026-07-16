// ---------------------------------------------------------------
// 九星気学
//
// 【採用ルール】
// - 本命星: 立春切替（天文計算による立春の瞬間）。立春前生まれは前年扱い。
//   本命星 = 11 − (年 mod 9)（結果を 1..9 に正規化）。例: 1990年 → 一白水星。
// - 月命星: 節入り切替（天文計算）。標準対応表:
//     本命 1・4・7 → 寅月=八白 から毎月 1 ずつ減
//     本命 2・5・8 → 寅月=二黒 から毎月 1 ずつ減
//     本命 3・6・9 → 寅月=五黄 から毎月 1 ずつ減
// - 傾斜宮: 本命星を中宮に置いた後天定位盤で、月命星が回座する宮。
//   月命星＝本命星のときは中宮傾斜とする（流派により坤宮傾斜とする説もある旨を注記）。
// - 当年・当月の巡り: 鑑定日基準。年盤の中宮星 = 11 − (当年 mod 9)（立春切替）、
//   月盤の中宮星は年の三合グループによる標準表（子午卯酉年→寅月八白 …ではなく、
//   年星グループ 1・4・7 / 2・5・8 / 3・6・9 で寅月 8 / 2 / 5 起点、毎月 1 減）。
//   本命星がその盤で回座する宮を後天定位から求める。
// ---------------------------------------------------------------
import { currentSetsuMonth, adjustedYear } from './solarterms.js'

export const STAR_NAMES = [
  '', '一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星',
  '六白金星', '七赤金星', '八白土星', '九紫火星',
]

// 後天定位盤: 宮 → 定位星番号
const PALACES = [
  { name: '坎宮', base: 1, dir: '北' },
  { name: '坤宮', base: 2, dir: '南西' },
  { name: '震宮', base: 3, dir: '東' },
  { name: '巽宮', base: 4, dir: '南東' },
  { name: '中宮', base: 5, dir: '中央' },
  { name: '乾宮', base: 6, dir: '北西' },
  { name: '兌宮', base: 7, dir: '西' },
  { name: '艮宮', base: 8, dir: '北東' },
  { name: '離宮', base: 9, dir: '南' },
]

const mod9 = (n) => ((n - 1) % 9 + 9) % 9 + 1 // 1..9 に正規化

/** 年（立春調整済み）→ 本命星番号 */
export function honmeiOf(year) {
  return mod9(11 - (year % 9))
}

/** 本命星グループ → 寅月の月命星 */
function toraMonthStar(honmei) {
  if ([1, 4, 7].includes(honmei)) return 8
  if ([2, 5, 8].includes(honmei)) return 2
  return 5
}

/** 月命星: monthOrder = 0(寅月)..11(丑月) */
export function getsumeiOf(honmei, monthOrder) {
  return mod9(toraMonthStar(honmei) - monthOrder)
}

/** 中宮星 center の盤で、星 star が回座する宮 */
export function palaceOf(star, center) {
  if (star === center) return PALACES.find((p) => p.name === '中宮')
  // 定位 base の宮に入る星 = center + (base - 5)  (mod 9)
  const base = ((star - center + 5 - 1) % 9 + 9) % 9 + 1
  return PALACES.find((p) => p.base === base)
}

export function computeKyusei(birthUTC, civilYear, todayUTC, todayCivilYear) {
  const notes = []

  // 本命星（立春切替）
  const adj = adjustedYear(birthUTC, civilYear)
  const honmei = honmeiOf(adj.year)

  // 月命星（節入り切替）
  const setsu = currentSetsuMonth(birthUTC)
  const getsumei = getsumeiOf(honmei, setsu.monthOrder)

  // 傾斜宮
  const keisha = palaceOf(getsumei, honmei)
  if (keisha.name === '中宮') {
    notes.push('月命星が本命星と同じため中宮傾斜としています（坤宮傾斜とする流派もあります）。')
  }

  // 当年・当月の巡り（鑑定日基準）
  const todayAdj = adjustedYear(todayUTC, todayCivilYear)
  const yearStar = honmeiOf(todayAdj.year) // 年盤の中宮星
  const todaySetsu = currentSetsuMonth(todayUTC)
  const monthStar = getsumeiOf(yearStar, todaySetsu.monthOrder) // 月盤の中宮星
  const yearPalace = palaceOf(honmei, yearStar)
  const monthPalace = palaceOf(honmei, monthStar)

  return {
    honmei,
    honmeiName: STAR_NAMES[honmei],
    getsumei,
    getsumeiName: STAR_NAMES[getsumei],
    keisha,
    current: {
      year: todayAdj.year,
      yearStar,
      yearStarName: STAR_NAMES[yearStar],
      yearPalace,
      monthStar,
      monthStarName: STAR_NAMES[monthStar],
      monthPalace,
      monthSetsuName: todaySetsu.setsuName,
    },
    adjYear: adj,
    setsu,
    notes,
    rules: {
      本命星: '立春切替（天文計算）',
      月命星: '節入り切替＋本命星グループ標準対応表',
      傾斜: '本命星中宮の後天定位盤における月命星の宮',
      巡り: '鑑定日基準（年盤・月盤）',
    },
  }
}
