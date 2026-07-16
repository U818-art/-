// ---------------------------------------------------------------
// 二十四節気（節入り）の天文計算
//
// 【採用ルール】
// - 二十四節気は「太陽の視黄経（トロピカル）が 15° の倍数に達する瞬間」として
//   astronomy-engine の SearchSunLongitude で厳密に求める。固定日付テーブルは使わない。
// - 四柱推命・九星気学の「月」は十二節（立春 315°, 啓蟄 345°, 清明 15°, …）で切り替える。
//   立春(315°)→寅月, 啓蟄(345°)→卯月, … 小寒(285°)→丑月。
// - 年の切替は立春の瞬間（瞬間同士の比較なのでタイムゾーンに依存しない）。
// ---------------------------------------------------------------
import { SearchSunLongitude, SunPosition } from 'astronomy-engine'

const norm360 = (x) => ((x % 360) + 360 + 360) % 360

/** 十二節: 太陽黄経 → 月支インデックス（子=0…亥=11）と節名 */
export const SETSU_TABLE = [
  { lon: 315, name: '立春', branchIdx: 2 }, // 寅
  { lon: 345, name: '啓蟄', branchIdx: 3 }, // 卯
  { lon: 15, name: '清明', branchIdx: 4 }, // 辰
  { lon: 45, name: '立夏', branchIdx: 5 }, // 巳
  { lon: 75, name: '芒種', branchIdx: 6 }, // 午
  { lon: 105, name: '小暑', branchIdx: 7 }, // 未
  { lon: 135, name: '立秋', branchIdx: 8 }, // 申
  { lon: 165, name: '白露', branchIdx: 9 }, // 酉
  { lon: 195, name: '寒露', branchIdx: 10 }, // 戌
  { lon: 225, name: '立冬', branchIdx: 11 }, // 亥
  { lon: 255, name: '大雪', branchIdx: 0 }, // 子
  { lon: 285, name: '小寒', branchIdx: 1 }, // 丑
]

/** その瞬間の太陽の視黄経（トロピカル、分点は日付平均分点+章動 = astronomy-engine の of date） */
export function sunLongitude(date) {
  return norm360(SunPosition(date).elon)
}

/** 指定黄経に太陽が達する瞬間を date 以降（または以前）から探索して UTC Date で返す */
export function searchTerm(targetLon, startDate, limitDays = 400) {
  const t = SearchSunLongitude(norm360(targetLon), startDate, limitDays)
  return t ? t.date : null
}

/**
 * 出生瞬間 birthUTC が属する「節月」を返す。
 * 戻り値: { branchIdx, setsuName, setsuLon, setsuTime(UTC Date), nextSetsuTime, elapsedDays }
 * elapsedDays = 節入りからの経過日数（実数）。蔵干（月律分野）判定に使用。
 */
export function currentSetsuMonth(birthUTC) {
  const lam = sunLongitude(birthUTC)
  // 立春(315°)を起点に 30° ごとが節。いま太陽が超えている直近の節を求める。
  const k = Math.floor(norm360(lam - 315) / 30)
  const entry = SETSU_TABLE[k]
  // 節入り瞬間: 出生の 33 日前から前方探索すれば必ず 1 回だけヒットする
  const start = new Date(birthUTC.getTime() - 33 * 86400 * 1000)
  const setsuTime = searchTerm(entry.lon, start, 40)
  const nextEntry = SETSU_TABLE[(k + 1) % 12]
  const nextSetsuTime = searchTerm(nextEntry.lon, birthUTC, 40)
  const elapsedDays = (birthUTC.getTime() - setsuTime.getTime()) / 86400000
  return {
    branchIdx: entry.branchIdx,
    monthOrder: k, // 0=寅月, 1=卯月, …
    setsuName: entry.name,
    setsuLon: entry.lon,
    setsuTime,
    nextSetsuName: nextEntry.name,
    nextSetsuTime,
    elapsedDays,
  }
}

/** 西暦 year の立春の瞬間（UTC Date）。 */
export function risshunOf(year) {
  return searchTerm(315, new Date(Date.UTC(year, 0, 20)), 30)
}

/**
 * 節分（立春）切替を考慮した「干支年・九星年」を返す。
 * civilYear は現地時計での暦年。立春前なら前年扱い。
 */
export function adjustedYear(birthUTC, civilYear) {
  const r = risshunOf(civilYear)
  if (birthUTC.getTime() < r.getTime()) {
    return { year: civilYear - 1, risshun: r, beforeRisshun: true }
  }
  return { year: civilYear, risshun: r, beforeRisshun: false }
}
