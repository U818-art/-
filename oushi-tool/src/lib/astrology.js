// ---------------------------------------------------------------
// 西洋占星術（トロピカル / プラシダスハウス）
//
// 【採用ルール】
// - 方式: トロピカル。黄経は astronomy-engine の「真分点・日付黄道 (of date)」座標。
// - 10天体（太陽〜冥王星）のサイン・度数・ハウス、ASC、MC を算出。
// - ハウス: プラシダス。出生時刻不明時はソーラーサインハウス（太陽サイン=1室）に
//   自動切替し、その旨を notes に出す。
// - アスペクト: 合・衝 オーブ8°、トライン・スクエア・セクスタイル オーブ6°。
// - 恒星時: astronomy-engine SiderealTime（グリニッジ視恒星時）+ 東経。
// - 黄道傾斜角: 平均黄道傾斜角（Meeus の多項式）。ハウス計算用途では章動分(±9″)の
//   誤差は度数表示(0.01°)に影響しない。
// - プラシダス計算は「昼弧/夜弧の 1/3・2/3 分割」を赤経空間で不動点反復して解く標準法。
//   |緯度| > 66° の極圏ではプラシダスが定義できない場合があるため警告を出す。
// ---------------------------------------------------------------
import {
  Body,
  GeoVector,
  Ecliptic,
  SiderealTime,
  MakeTime,
} from 'astronomy-engine'

const DEG = Math.PI / 180
const norm360 = (x) => ((x % 360) + 360 + 360) % 360

export const SIGNS = [
  '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
  '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座',
]
export const SIGNS_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const PLANET_DEFS = [
  { body: Body.Sun, name: '太陽', en: 'Sun' },
  { body: Body.Moon, name: '月', en: 'Moon' },
  { body: Body.Mercury, name: '水星', en: 'Mercury' },
  { body: Body.Venus, name: '金星', en: 'Venus' },
  { body: Body.Mars, name: '火星', en: 'Mars' },
  { body: Body.Jupiter, name: '木星', en: 'Jupiter' },
  { body: Body.Saturn, name: '土星', en: 'Saturn' },
  { body: Body.Uranus, name: '天王星', en: 'Uranus' },
  { body: Body.Neptune, name: '海王星', en: 'Neptune' },
  { body: Body.Pluto, name: '冥王星', en: 'Pluto' },
]

const ASPECT_DEFS = [
  { name: '合', en: 'Conjunction', angle: 0, orb: 8 },
  { name: '衝', en: 'Opposition', angle: 180, orb: 8 },
  { name: 'トライン', en: 'Trine', angle: 120, orb: 6 },
  { name: 'スクエア', en: 'Square', angle: 90, orb: 6 },
  { name: 'セクスタイル', en: 'Sextile', angle: 60, orb: 6 },
]

/** 地心視黄経（トロピカル・of date） */
function geoEclipticLon(body, date) {
  const vec = GeoVector(body, date, true) // 光行差込み（aberration=true）
  const ecl = Ecliptic(vec)
  return norm360(ecl.elon)
}

/** 平均黄道傾斜角（Meeus 22.2） */
export function meanObliquity(date) {
  const T = (MakeTime(date).tt) / 36525 // J2000 からのユリウス世紀（TT）
  const sec = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T
  return 23 + 26 / 60 + sec / 3600
}

/** 黄経 → { sign, signIdx, degInSign } */
export function lonToSign(lon) {
  const l = norm360(lon)
  const signIdx = Math.floor(l / 30)
  return { signIdx, sign: SIGNS[signIdx], degInSign: l - signIdx * 30 }
}

/** 度数を「12.34°」形式に */
export function fmtDeg(d) {
  return `${d.toFixed(2)}°`
}

/** 赤経 RA(°) 上の点に対応する黄経（黄道と等赤経円の交点） */
function raToEclLon(raDeg, epsDeg) {
  const ra = raDeg * DEG
  const eps = epsDeg * DEG
  return norm360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) / DEG)
}

/** ASC の黄経 */
function ascendant(ramcDeg, latDeg, epsDeg) {
  const ramc = ramcDeg * DEG
  const eps = epsDeg * DEG
  const phi = latDeg * DEG
  // λASC = atan2( cos(RAMC), -( sin(RAMC)·cosε + tanφ·sinε ) )
  return norm360(
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
    ) / DEG
  )
}

/** MC の黄経 */
function midheaven(ramcDeg, epsDeg) {
  return raToEclLon(ramcDeg, epsDeg)
}

/** 角度差を (-180,180] に正規化 */
const angDiff = (a, b) => {
  let d = norm360(a - b)
  if (d > 180) d -= 360
  return d
}

/**
 * プラシダスハウスカスプ（1..12 の黄経）。
 * 11室: 昼弧の 1/3、12室: 2/3。2室: 夜弧の 2/3、3室: 1/3（IC からの距離）。
 * 赤経空間の不動点反復（30回）で解く。
 */
function placidusCusps(ramcDeg, latDeg, epsDeg, ascLon, mcLon) {
  const phi = latDeg * DEG
  const eps = epsDeg * DEG

  // λ から赤緯 δ を求め、昼半弧 SA(°) を返す（周極は clamp）
  function semiArc(lambdaDeg) {
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambdaDeg * DEG))
    let x = -Math.tan(phi) * Math.tan(dec)
    x = Math.max(-1, Math.min(1, x))
    return Math.acos(x) / DEG
  }

  // f: SA から目標赤経を作る関数。初期赤経 ra0 から反復。
  function solve(ra0, targetRA) {
    let lam = raToEclLon(ra0, epsDeg)
    for (let i = 0; i < 30; i++) {
      const sa = semiArc(lam)
      lam = raToEclLon(targetRA(sa), epsDeg)
    }
    return lam
  }

  const c11 = solve(ramcDeg + 30, (sa) => ramcDeg + sa / 3)
  const c12 = solve(ramcDeg + 60, (sa) => ramcDeg + (2 * sa) / 3)
  const c2 = solve(ramcDeg + 120, (sa) => ramcDeg + 180 - (2 * (180 - sa)) / 3)
  const c3 = solve(ramcDeg + 150, (sa) => ramcDeg + 180 - (180 - sa) / 3)

  const cusps = new Array(13)
  cusps[1] = ascLon
  cusps[2] = c2
  cusps[3] = c3
  cusps[4] = norm360(mcLon + 180)
  cusps[5] = norm360(c11 + 180)
  cusps[6] = norm360(c12 + 180)
  cusps[7] = norm360(ascLon + 180)
  cusps[8] = norm360(c2 + 180)
  cusps[9] = norm360(c3 + 180)
  cusps[10] = mcLon
  cusps[11] = c11
  cusps[12] = c12
  return cusps
}

/** 黄経 lon がどのハウスに入るか（cusps[i]〜cusps[i+1] の間 = i 室） */
function houseOf(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const a = cusps[i]
    const b = cusps[i === 12 ? 1 : i + 1]
    const span = norm360(b - a)
    const off = norm360(lon - a)
    if (off < span) return i
  }
  return 12
}

/**
 * ホロスコープ計算のメイン。
 * @param birthUTC  出生瞬間（UTC Date）
 * @param latDeg    出生地緯度
 * @param lonDeg    出生地経度（東経が正）
 * @param timeKnown 出生時刻が判明しているか
 */
export function computeHoroscope(birthUTC, latDeg, lonDeg, timeKnown) {
  const notes = []
  const epsDeg = meanObliquity(birthUTC)

  // --- 天体位置 ---
  const dayMs = 86400 * 1000
  const planets = PLANET_DEFS.map((p) => {
    const lon = geoEclipticLon(p.body, birthUTC)
    const lonNext = geoEclipticLon(p.body, new Date(birthUTC.getTime() + dayMs))
    const retro =
      p.body !== Body.Sun && p.body !== Body.Moon && angDiff(lonNext, lon) < 0
    return { ...lonToSign(lon), name: p.name, en: p.en, lon, retro }
  })

  // --- ASC / MC / ハウス ---
  let asc = null
  let mc = null
  let cusps = null
  let houseSystem
  if (timeKnown) {
    houseSystem = 'プラシダス'
    const gastHours = SiderealTime(birthUTC) // グリニッジ視恒星時（時間）
    const ramc = norm360(gastHours * 15 + lonDeg) // 地方恒星時(°) = RAMC
    const mcLon = midheaven(ramc, epsDeg)
    const ascLon = ascendant(ramc, latDeg, epsDeg)
    asc = { lon: ascLon, ...lonToSign(ascLon) }
    mc = { lon: mcLon, ...lonToSign(mcLon) }
    if (Math.abs(latDeg) > 66) {
      notes.push(
        '緯度が66°を超えるためプラシダスハウスが不安定です。結果のハウスは参考値としてください。'
      )
    }
    cusps = placidusCusps(ramc, latDeg, epsDeg, ascLon, mcLon)
    for (const p of planets) p.house = houseOf(p.lon, cusps)
    var debug = { gastHours, ramc, epsDeg }
  } else {
    houseSystem = 'ソーラーサイン'
    notes.push(
      '出生時刻不明のため、正午（現地時刻12:00）で天体位置を計算し、ハウスはソーラーサインハウス（太陽のサイン=1室）に自動切替しています。'
    )
    notes.push(
      '月は1日に約12〜13°移動するため、時刻不明の場合は最大±6.5°の誤差があります。サイン境界付近の月は両サインの可能性を考慮してください。ASC・MC は算出できません。'
    )
    const sunSignIdx = planets[0].signIdx
    for (const p of planets) {
      p.house = ((p.signIdx - sunSignIdx + 12) % 12) + 1
    }
    var debug = { epsDeg }
  }

  // --- アスペクト（10天体間） ---
  const aspects = []
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const d = Math.abs(angDiff(planets[i].lon, planets[j].lon))
      for (const a of ASPECT_DEFS) {
        const orb = Math.abs(d - a.angle)
        if (orb <= a.orb) {
          aspects.push({
            p1: planets[i].name,
            p2: planets[j].name,
            aspect: a.name,
            en: a.en,
            orb,
          })
          break
        }
      }
    }
  }
  aspects.sort((x, y) => x.orb - y.orb)

  return {
    planets,
    asc,
    mc,
    cusps,
    aspects,
    houseSystem,
    notes,
    rules: {
      方式: 'トロピカル',
      ハウス: houseSystem + (timeKnown ? '' : '（時刻不明のため自動切替）'),
      オーブ: '合・衝 8° / 三分・矩・六分 6°',
      黄道傾斜角: '平均黄道傾斜角（Meeus）',
      計算エンジン: 'astronomy-engine',
    },
    debug,
  }
}
