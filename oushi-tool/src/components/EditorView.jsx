import React, { useState } from 'react'
import { findNG, segmentsWithNG, NG_WORDS } from '../lib/checker.js'
import { splitChapters } from '../lib/split.js'

function SectionEditor({ section, onChange, onRemove, onMove }) {
  const hits = findNG(section.text)
  const segs = segmentsWithNG(section.text)
  return (
    <div className="section-block">
      <div className="head">
        <input
          className="title"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="章タイトル"
        />
        <button className="btn-sub" onClick={() => onMove(-1)} title="上へ">↑</button>
        <button className="btn-sub" onClick={() => onMove(1)} title="下へ">↓</button>
        <button className="btn-sub" onClick={onRemove}>削除</button>
      </div>
      <textarea
        value={section.text}
        placeholder="AIで生成した文章をこの章に貼り付け"
        onChange={(e) => onChange({ ...section, text: e.target.value })}
      />
      {section.text &&
        (hits.length === 0 ? (
          <div className="ng-summary ok">✓ 禁止用語・断定表現は見つかりませんでした</div>
        ) : (
          <>
            <div className="ng-summary bad">
              ⚠ {hits.length} 件検出:{' '}
              {Object.entries(
                hits.reduce((acc, h) => ({ ...acc, [h.word]: (acc[h.word] ?? 0) + 1 }), {})
              )
                .map(([w, n]) => `「${w}」×${n}`)
                .join('、')}
            </div>
            <div className="ng-preview">
              {segs.map((s, i) =>
                s.ng ? (
                  <mark key={i} className="ng" title={s.ng}>
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                )
              )}
            </div>
          </>
        ))}
    </div>
  )
}

function BulkPaste({ setSections, hasContent }) {
  const [text, setText] = useState('')
  const apply = () => {
    const chapters = splitChapters(text)
    if (chapters.length === 0) return
    if (hasContent && !confirm('既存の章を置き換えて取り込みます。よろしいですか？')) return
    setSections(chapters)
    setText('')
  }
  return (
    <div className="section-block" style={{ background: 'var(--lavender-pale)' }}>
      <div className="head">
        <span style={{ fontSize: 13, letterSpacing: '0.15em', color: 'var(--lavender)' }}>
          まとめて貼り付け（「## 章タイトル」で自動分割）
        </span>
      </div>
      <textarea
        value={text}
        placeholder="AIチャットの回答を丸ごとここに貼り付けると、## 見出しごとに章へ自動分割されます"
        onChange={(e) => setText(e.target.value)}
        style={{ minHeight: 90 }}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn-sub btn-gold" onClick={apply} disabled={!text.trim()}>
          章に分割して取り込む
        </button>
      </div>
    </div>
  )
}

export default function EditorView({ sections, setSections, defaults }) {
  const totalHits = sections.reduce((n, s) => n + findNG(s.text).length, 0)
  const hasContent = sections.some((s) => s.text.trim())

  const update = (idx, next) =>
    setSections((prev) => prev.map((s, i) => (i === idx ? next : s)))
  const remove = (idx) => setSections((prev) => prev.filter((_, i) => i !== idx))
  const move = (idx, dir) =>
    setSections((prev) => {
      const j = idx + dir
      if (j < 0 || j >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return arr
    })
  const add = () =>
    setSections((prev) => [...prev, { id: `s${Date.now()}`, title: '新しい章', text: '' }])

  return (
    <section className="card no-print">
      <h2>鑑 定 書 エ デ ィ タ</h2>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        AIチャットで生成した鑑定文章を章ごとに貼り付けてください。内容は端末内（localStorage）にのみ保存されます。
        禁止用語（{NG_WORDS.map((w) => `「${w.word}」`).join('')}）を自動検出します。
      </p>
      <BulkPaste setSections={setSections} hasContent={hasContent} />
      <div className={`ng-summary ${totalHits ? 'bad' : 'ok'}`} style={{ marginBottom: 14 }}>
        {totalHits
          ? `⚠ 全体で ${totalHits} 件の禁止用語・断定表現が残っています`
          : '✓ 全章クリア（禁止用語・断定表現なし）'}
      </div>
      {sections.map((s, i) => (
        <SectionEditor
          key={s.id}
          section={s}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-sub" onClick={add}>＋ 章を追加</button>
        <button
          className="btn-sub"
          onClick={() => {
            if (confirm('全章の本文を消去して初期構成に戻します。よろしいですか？')) {
              setSections(defaults.map((d) => ({ ...d })))
            }
          }}
        >
          初期構成に戻す
        </button>
      </div>
    </section>
  )
}
