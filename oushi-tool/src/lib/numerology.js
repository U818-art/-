// ---------------------------------------------------------------
// 数秘術（モダン数秘 / ピタゴラス式・生年月日ベースのみ）
//
// 【採用ルール】
// - ライフパスナンバー: 生年月日（西暦）の全数字を 1 桁ずつ合算し、
//   1 桁になるまで還元。ただし途中・最終で 11・22・33 が出たら還元せず保持。
//   例: 1993年2月9日 → 1+9+9+3+2+9 = 33 → マスターナンバー 33 を保持。
// - バースデーナンバー: 生まれ日を同ルールで還元（11・22 は保持。33 は日付上出ない）。
// - パーソナルイヤーナンバー: 鑑定日基準・暦年切替（1/1）。
//   誕生月・誕生日・当年（西暦）の全数字を合算し同ルールで還元（11・22・33 保持）。
// - 名前由来の数（運命数等）は本バージョンでは実装しない。
// ---------------------------------------------------------------

const MASTERS = [11, 22, 33]

function digitSum(n) {
  return String(n)
    .split('')
    .reduce((a, c) => a + Number(c), 0)
}

/** マスターナンバー保持つき還元。途中経過 steps を返す。 */
export function reduceKeepMaster(start) {
  const steps = [start]
  let n = start
  while (n > 9 && !MASTERS.includes(n)) {
    n = digitSum(n)
    steps.push(n)
  }
  return { value: n, steps, isMaster: MASTERS.includes(n) }
}

/** 生年月日の全数字合算の式文字列（検証表示用） */
function digitsExpr(nums) {
  return nums
    .map((n) => String(n).split('').join('+'))
    .join('+')
}

export function computeNumerology(y, m, d, todayY) {
  // ライフパス
  const lpTotal = digitSum(y) + digitSum(m) + digitSum(d)
  const lp = reduceKeepMaster(lpTotal)

  // バースデー
  const bd = reduceKeepMaster(d)

  // パーソナルイヤー（鑑定日基準・暦年切替）
  const pyTotal = digitSum(m) + digitSum(d) + digitSum(todayY)
  const py = reduceKeepMaster(pyTotal)

  return {
    lifePath: lp,
    lifePathExpr: `${digitsExpr([y, m, d])} = ${lpTotal}`,
    birthday: bd,
    personalYear: py,
    personalYearExpr: `${digitsExpr([m, d, todayY])} = ${pyTotal}`,
    personalYearYear: todayY,
    rules: {
      方式: 'モダン数秘（ピタゴラス式）・生年月日ベース',
      マスターナンバー: '11・22・33 は還元せず保持',
      パーソナルイヤー: `暦年切替（${todayY}年・1/1基準）`,
    },
  }
}
