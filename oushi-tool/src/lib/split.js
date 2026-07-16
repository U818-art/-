// AI が生成した鑑定文（「## 章タイトル」区切り）を章ごとに分割する。
// 見出しが無いテキストは 1 章として扱う。

export function splitChapters(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections = []
  let cur = null
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/)
    if (m) {
      if (cur) sections.push(cur)
      cur = { title: m[1].trim(), text: '' }
    } else if (cur) {
      cur.text += (cur.text ? '\n' : '') + line
    } else if (line.trim()) {
      cur = { title: 'はじめに', text: line }
    }
  }
  if (cur) sections.push(cur)
  const stamp = Date.now()
  return sections
    .map((s, i) => ({
      id: `g${stamp}_${i}`,
      title: s.title,
      text: s.text.trim(),
    }))
    .filter((s) => s.title || s.text)
}
