// ---------------------------------------------------------------
// 時刻・時差ユーティリティ
//
// 【採用ルール】
// - 入力された「現地の時計時刻」+ タイムゾーンオフセット(時間) から UTC 瞬間を求める。
//   日本は JST = UTC+9 固定（日本にサマータイムはない）。
// - 地方平均時 (LMT) = UTC + 経度/15 時間。
//   JST 基準で書くと LMT = JST + (経度 - 135°) × 4分 と同値（海外にも一般化した式を採用）。
// - 海外出生はタイムゾーンオフセットを直接入力する（出生当時に適用されていた
//   オフセット、サマータイム中ならその分を含めて入力する運用とする）。
// ---------------------------------------------------------------

/** 現地時計時刻 → UTC の Date。tz は UTC からの時差（時間、東経側が正）。 */
export function localToUTC(y, m, d, hh, mm, tzHours) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - tzHours * 3600 * 1000)
}

/** UTC の Date → 経度 lonDeg での地方平均時 (LMT) の年月日時分。 */
export function lmtParts(utcDate, lonDeg) {
  const t = new Date(utcDate.getTime() + (lonDeg / 15) * 3600 * 1000)
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
  }
}

/** UTC の Date → タイムゾーン tzHours での現地時計の年月日時分。 */
export function zoneParts(utcDate, tzHours) {
  const t = new Date(utcDate.getTime() + tzHours * 3600 * 1000)
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
  }
}

/** グレゴリオ暦（先発）年月日 → ユリウス通日（正午基準の整数 JDN）。日柱計算に使用。 */
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12)
  const y2 = y + 4800 - a
  const m2 = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  )
}

/** 年月日 (y,m,d) を 1 日進める。 */
export function nextDay(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

const pad = (n) => String(n).padStart(2, '0')

/** UTC Date を JST 表記の文字列にする（検証表示用） */
export function fmtJST(date) {
  if (!date) return '—'
  const t = new Date(date.getTime() + 9 * 3600 * 1000)
  return `${t.getUTCFullYear()}/${pad(t.getUTCMonth() + 1)}/${pad(t.getUTCDate())} ${pad(
    t.getUTCHours()
  )}:${pad(t.getUTCMinutes())} JST`
}

/** UTC Date を任意タイムゾーン表記にする */
export function fmtZone(date, tzHours, label) {
  if (!date) return '—'
  const t = new Date(date.getTime() + tzHours * 3600 * 1000)
  return `${t.getUTCFullYear()}/${pad(t.getUTCMonth() + 1)}/${pad(t.getUTCDate())} ${pad(
    t.getUTCHours()
  )}:${pad(t.getUTCMinutes())} ${label ?? `UTC${tzHours >= 0 ? '+' : ''}${tzHours}`}`
}

export function fmtHM(hh, mm) {
  return `${pad(hh)}:${pad(mm)}`
}
