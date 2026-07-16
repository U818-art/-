// 検証スクリプト: node scripts/verify.mjs
// VERIFICATION.md のチェックリストに対応する自動検証。
import { risshunOf, searchTerm, currentSetsuMonth, sunLongitude } from '../src/lib/solarterms.js'
import { computeShichu, STEMS, BRANCHES } from '../src/lib/shichusuimei.js'
import { computeNumerology, reduceKeepMaster } from '../src/lib/numerology.js'
import { computeKyusei, honmeiOf } from '../src/lib/kyusei.js'
import { computeHoroscope } from '../src/lib/astrology.js'
import { localToUTC, fmtJST, jdn } from '../src/lib/time.js'
import * as A from 'astronomy-engine'

let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✔ ${label} ${detail}`)
  } else {
    fail++
    console.log(`  ✘ FAIL: ${label} ${detail}`)
  }
}

console.log('■ 1. 二十四節気（天文計算）')
// 春分は太陽黄経0°。2000年春分 = 2000-03-20 07:35 UTC（NAOJ/USNO 公表値）
const eq2000 = searchTerm(0, new Date(Date.UTC(2000, 2, 1)), 30)
const eq2000expect = Date.UTC(2000, 2, 20, 7, 35)
check(
  '2000年春分 2000-03-20 07:35 UTC ±3分',
  Math.abs(eq2000.getTime() - eq2000expect) < 3 * 60000,
  `→ 計算値 ${eq2000.toISOString()}`
)
for (const y of [2000, 2024, 2025, 2026]) {
  console.log(`  立春 ${y}: ${fmtJST(risshunOf(y))} （国立天文台 暦要項と照合すること）`)
}
// 立春の瞬間の太陽黄経が315°であること（自己整合）
const r24 = risshunOf(2024)
check('立春の瞬間の太陽黄経=315°', Math.abs(sunLongitude(r24) - 315) < 0.001, `λ=${sunLongitude(r24).toFixed(5)}`)

console.log('■ 2. 日柱（干支暦）')
// 基準日: 2000年1月1日 = 戊午
const s1 = computeShichu(localToUTC(2000, 1, 1, 12, 0, 9), 139.692, 2000, true)
check('2000/1/1 の日柱 = 戊午', s1.pillars.day.kanshi === '戊午', `→ ${s1.pillars.day.kanshi}`)
// 60日後も同じ干支
const s2 = computeShichu(localToUTC(2000, 3, 1, 12, 0, 9), 139.692, 2000, true)
check('2000/3/1（60日後）の日柱 = 戊午', s2.pillars.day.kanshi === '戊午', `→ ${s2.pillars.day.kanshi}`)
// 甲子日: 2000/1/1(戊午=54) の 6日後 2000/1/7 が甲子(0)
const s3 = computeShichu(localToUTC(2000, 1, 7, 12, 0, 9), 139.692, 2000, true)
check('2000/1/7 の日柱 = 甲子', s3.pillars.day.kanshi === '甲子', `→ ${s3.pillars.day.kanshi}`)

console.log('■ 3. 23時台の翌日繰り上げ・地方時補正')
// 東京 (139.692°E): LMT = JST + 18.8分 ≒ JST−? (139.692-135)*4 = +18.77分
const sA = computeShichu(localToUTC(2000, 1, 1, 22, 50, 9), 139.692, 2000, true)
const sB = computeShichu(localToUTC(2000, 1, 1, 23, 30, 9), 139.692, 2000, true)
check('JST22:50 東京 → LMT23時台 → 日柱繰り上げ（己未）', sA.pillars.day.kanshi === '己未', `→ ${sA.pillars.day.kanshi}（LMT ${sA.lmt.hh}:${String(sA.lmt.mm).padStart(2, '0')}）`)
check('JST23:30 東京 → 日柱繰り上げ + 子刻', sB.pillars.day.kanshi === '己未' && sB.pillars.hour.branch === '子', `→ ${sB.pillars.day.kanshi} ${sB.pillars.hour.kanshi}`)
// 長崎 (129.874°E): 補正 −20.5分 → JST23:10 は LMT22時台 → 繰り上げなし
const sC = computeShichu(localToUTC(2000, 1, 1, 23, 10, 9), 129.874, 2000, true)
check('JST23:10 長崎 → LMT22時台 → 繰り上げなし（戊午）', sC.pillars.day.kanshi === '戊午' && sC.pillars.hour.branch === '亥', `→ ${sC.pillars.day.kanshi} ${sC.pillars.hour.kanshi}時（LMT ${sC.lmt.hh}:${String(sC.lmt.mm).padStart(2, '0')}）`)

console.log('■ 4. 五鼠遁・五虎遁')
// 甲日の子刻は甲子時: 2000/1/7(甲子日) 00:10 LMT付近 → 東京 JST 00:00 は LMT 00:18
const sD = computeShichu(localToUTC(2000, 1, 7, 0, 10, 9), 139.692, 2000, true)
check('甲子日の子刻 → 甲子時', sD.pillars.hour.kanshi === '甲子', `→ ${sD.pillars.hour.kanshi}`)
// 2000年は庚辰年 → 五虎遁: 乙庚→戊寅起。2000/3/1 は啓蟄前(2/4立春後)→寅月→戊寅月? 3/1は啓蟄(3/5頃)前なので寅月
check('2000/3/1 の年柱 = 庚辰・月柱 = 戊寅', s2.pillars.year.kanshi === '庚辰' && s2.pillars.month.kanshi === '戊寅', `→ ${s2.pillars.year.kanshi}年 ${s2.pillars.month.kanshi}月`)

console.log('■ 5. 立春前後の年柱・本命星切替')
const r2000 = risshunOf(2000)
const before = new Date(r2000.getTime() - 3600 * 1000)
const after = new Date(r2000.getTime() + 3600 * 1000)
const sBefore = computeShichu(before, 139.692, 2000, true)
const sAfter = computeShichu(after, 139.692, 2000, true)
check('立春1時間前 → 己卯年（1999年扱い）', sBefore.pillars.year.kanshi === '己卯', `→ ${sBefore.pillars.year.kanshi}`)
check('立春1時間後 → 庚辰年', sAfter.pillars.year.kanshi === '庚辰', `→ ${sAfter.pillars.year.kanshi}`)
const today = new Date()
const kBefore = computeKyusei(before, 2000, today, today.getFullYear())
const kAfter = computeKyusei(after, 2000, today, today.getFullYear())
check('九星: 立春前 → 1999年扱い=一白水星', kBefore.honmeiName === '一白水星', `→ ${kBefore.honmeiName}`)
check('九星: 立春後 → 2000年=九紫火星', kAfter.honmeiName === '九紫火星', `→ ${kAfter.honmeiName}`)
check('九星: 1990年 → 一白水星', honmeiOf(1990) === 1)
check('九星: 1985年 → 六白金星', honmeiOf(1985) === 6)

console.log('■ 6. 数秘術（マスターナンバー保持）')
const n1 = computeNumerology(1993, 2, 9, 2026)
check('1993/2/9 → ライフパス33（保持）', n1.lifePath.value === 33 && n1.lifePath.isMaster, `→ ${n1.lifePathExpr} → ${n1.lifePath.steps.join('→')}`)
const n2 = computeNumerology(1990, 12, 22, 2026)
check('生まれ日22 → バースデーナンバー22（保持）', n2.birthday.value === 22)
const n3 = computeNumerology(1984, 5, 29, 2026)
check('生まれ日29 → 2+9=11（保持）', n3.birthday.value === 11, `→ ${n3.birthday.steps.join('→')}`)
const r38 = reduceKeepMaster(38)
check('38 → 11 で停止', r38.value === 11, `→ ${r38.steps.join('→')}`)

console.log('■ 7. 西洋占星術（自己整合性）')
// 7-1. GeoVector+Ecliptic の太陽黄経が SunPosition と一致するか
const t0 = new Date(Date.UTC(2024, 5, 1, 3, 0))
const h0 = computeHoroscope(t0, 35.69, 139.692, true)
const sunLam = sunLongitude(t0)
check('太陽黄経: GeoVector/Ecliptic ≒ SunPosition（±0.01°）', Math.abs(h0.planets[0].lon - sunLam) < 0.01, `→ ${h0.planets[0].lon.toFixed(4)} vs ${sunLam.toFixed(4)}`)
// 7-2. 日の出の瞬間、太陽はASC付近にあるはず（±2°: 大気差・視半径分ずれる）
const obs = new A.Observer(35.69, 139.692, 0)
const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, t0, 2)
const hRise = computeHoroscope(rise.date, 35.69, 139.692, true)
let dAsc = Math.abs(((hRise.asc.lon - sunLongitude(rise.date)) % 360 + 540) % 360 - 180)
check('日の出時: ASC ≒ 太陽黄経（±2°）', dAsc < 2, `→ 差 ${dAsc.toFixed(2)}°`)
// 7-3. 南中の瞬間、太陽はMC付近にあるはず（±0.5°）
const transit = A.SearchHourAngle(A.Body.Sun, obs, 0, t0)
const hTr = computeHoroscope(transit.time.date, 35.69, 139.692, true)
let dMc = Math.abs(((hTr.mc.lon - sunLongitude(transit.time.date)) % 360 + 540) % 360 - 180)
check('南中時: MC ≒ 太陽黄経（±0.5°）', dMc < 0.5, `→ 差 ${dMc.toFixed(2)}°`)
// 7-4. プラシダス自己整合: カスプが ASC→MC 間で正しい順序か
const c = h0.cusps
const seq = [10, 11, 12, 1, 2, 3]
let ordered = true
for (let i = 0; i < seq.length - 1; i++) {
  const a = c[seq[i]]
  const b = c[seq[i + 1]]
  if (((b - a) % 360 + 360) % 360 > 120) ordered = false
}
check('プラシダスカスプの順序整合（10→11→12→1→2→3）', ordered, `→ ${seq.map((i) => c[i].toFixed(1)).join(' → ')}`)
// 7-5. 対向カスプは180°差
check('4室 = 10室+180°', Math.abs(((c[4] - c[10] - 180) % 360 + 360) % 360) < 0.001)

console.log('■ 8. 時刻不明モード・海外出生')
const hUnknown = computeHoroscope(localToUTC(1990, 5, 15, 12, 0, 9), 35.69, 139.692, false)
check('時刻不明 → ソーラーサインハウス・ASCなし', hUnknown.houseSystem === 'ソーラーサイン' && hUnknown.asc === null && hUnknown.planets[0].house === 1)
// ニューヨーク出生 (40.71N, 74.01W, UTC-5): LMT補正 = -74.01*4 = -296分 + 300分(UTC-5) = +4分
const sNY = computeShichu(localToUTC(1990, 5, 15, 12, 0, -5), -74.006, 1990, true)
check('海外出生（NY UTC-5）の LMT 補正が約+4分', sNY.lmt.hh === 12 && Math.abs(sNY.lmt.mm - 4) <= 1, `→ LMT ${sNY.lmt.hh}:${String(sNY.lmt.mm).padStart(2, '0')}`)

console.log('■ 9. 蔵干（月律分野）・サンプル総合出力')
for (const [y, m, d, hh, mm] of [[1990, 5, 15, 14, 30], [1985, 2, 4, 6, 0], [2001, 12, 1, 23, 45]]) {
  const utc = localToUTC(y, m, d, hh, mm, 9)
  const s = computeShichu(utc, 139.692, y, true)
  const k = computeKyusei(utc, y, today, today.getFullYear())
  const num = computeNumerology(y, m, d, today.getFullYear())
  console.log(
    `  ${y}/${m}/${d} ${hh}:${mm} 東京 → 四柱: ${s.pillars.year.kanshi} ${s.pillars.month.kanshi} ${s.pillars.day.kanshi} ${s.pillars.hour?.kanshi ?? '—'}` +
      ` / 月支蔵干:${s.pillars.month.zokan}(${s.pillars.month.zokanKind}, 節入り+${s.debug.setsuElapsedDays}日)` +
      ` / 空亡:${s.kubo} / 本命星:${k.honmeiName} 月命星:${k.getsumeiName} ${k.keisha.name}傾斜 / LP:${num.lifePath.value}`
  )
}

console.log(`\n結果: ${pass} 件成功 / ${fail} 件失敗`)
process.exit(fail ? 1 : 0)
