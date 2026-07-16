import React from 'react'

// 章テキスト → 段落（空行区切り）
function paragraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export default function PrintView({ name, sections, todayStr }) {
  const filled = sections.filter((s) => s.text.trim())
  return (
    <div>
      <div className="print-toolbar no-print">
        <button className="btn-copy" onClick={() => window.print()}>
          印刷 / PDF 保存
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', alignSelf: 'center' }}>
          ブラウザの印刷ダイアログで「PDFに保存」を選ぶとPDF出力できます（余白は「なし」を推奨・用紙A4）
        </span>
      </div>
      {filled.length === 0 && (
        <div className="note no-print">
          鑑定書エディタに本文がまだありません。エディタで文章を貼り付けると、ここにA4レイアウトで表示されます。
        </div>
      )}

      {/* ---- 表紙 ---- */}
      <div className="sheet cover">
        <div className="frame">
          <div className="diamond">◇</div>
          <div className="brandname">櫻紫</div>
          <div className="roman">OUSHI</div>
          <div className="doctitle">人 生 分 析 書</div>
          <div className="rule" />
          <div className="addressee">{name ? `${name} 様` : '　'}</div>
          <div className="kdate">鑑定日　{todayStr}</div>
        </div>
      </div>

      {/* ---- 本文 ---- */}
      {filled.map((s) => (
        <div className="sheet" key={s.id}>
          <div className="chap">
            <h2 className="chap-title">{s.title}</h2>
            {paragraphs(s.text).map((p, i) => (
              <p className="body-text" key={i}>
                {p.split('\n').map((line, j, arr) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
          <div className="pagefoot">櫻紫 — OUSHI</div>
        </div>
      ))}

      {/* ---- 結び ---- */}
      <div className="sheet closing">
        <div className="inner">
          <div className="word">
            この書面が、あなたがご自身を
            <br />
            深く知るための静かな時間となりますように。
          </div>
          <div className="brand-small">櫻紫</div>
          <div className="brand-roman">OUSHI — LIFE ANALYSIS</div>
          <div className="disclaimer">
            本書は、生年月日等に基づく複数の分析手法を用いた「人生分析」の書面です。
            <br />
            内容は資質や傾向についての一つの見方を示すものであり、将来を保証するものではありません。
          </div>
        </div>
      </div>
    </div>
  )
}
