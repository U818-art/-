// ---------------------------------------------------------------
// 禁止用語チェッカー
// 「開運」「浄化」「運気」および断定表現（「必ず」「絶対に」）を検出する。
// ---------------------------------------------------------------

export const NG_WORDS = [
  { word: '開運', kind: '禁止用語' },
  { word: '浄化', kind: '禁止用語' },
  { word: '運気', kind: '禁止用語' },
  { word: '必ず', kind: '断定表現' },
  { word: '絶対に', kind: '断定表現' },
]

/** テキスト中の NG 語を検出して [{word, kind, index}] を返す */
export function findNG(text) {
  const hits = []
  for (const ng of NG_WORDS) {
    let idx = text.indexOf(ng.word)
    while (idx !== -1) {
      hits.push({ ...ng, index: idx })
      idx = text.indexOf(ng.word, idx + ng.word.length)
    }
  }
  return hits.sort((a, b) => a.index - b.index)
}

/** ハイライト表示用に text を [{text, ng?}] のセグメント列に分割する */
export function segmentsWithNG(text) {
  const hits = findNG(text)
  const segs = []
  let pos = 0
  for (const h of hits) {
    if (h.index < pos) continue // 重複領域はスキップ
    if (h.index > pos) segs.push({ text: text.slice(pos, h.index) })
    segs.push({ text: h.word, ng: h.kind })
    pos = h.index + h.word.length
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) })
  return segs
}
