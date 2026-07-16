import React, { useRef, useState } from 'react'
import { buildClaudePrompt } from '../lib/prompt.js'
import { generateKantei, AI_MODEL } from '../lib/ai.js'
import { splitChapters } from '../lib/split.js'

const LS_KEY = 'oushi_api_key_v1'

export default function GeneratePanel({ input, results, tarot, setSections, setView }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) ?? '')
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const runRef = useRef(null)

  const saveKey = (v) => {
    setApiKey(v)
    localStorage.setItem(LS_KEY, v)
  }

  async function generate() {
    if (!apiKey.trim()) {
      setError('APIキーを入力してください（console.anthropic.com で発行できます）。')
      setStatus('error')
      return
    }
    setStatus('running')
    setError('')
    setPreview('')
    const prompt = buildClaudePrompt({
      input: {
        name: input.name,
        theme: input.theme,
        dateStr: results.meta.dateStr,
        timeKnown: input.timeKnown,
        timeStr: results.meta.timeStr,
        placeLabel: results.meta.place.label,
      },
      results: { ...results, tarot },
      todayStr: results.meta.todayStr,
    })
    let acc = ''
    const run = generateKantei({
      apiKey: apiKey.trim(),
      prompt,
      onDelta: (t) => {
        acc += t
        setPreview(acc)
      },
    })
    runRef.current = run
    try {
      const text = await run.promise
      const chapters = splitChapters(text)
      if (chapters.length === 0) throw new Error('生成結果が空でした。')
      setSections(chapters)
      setStatus('done')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    } finally {
      runRef.current = null
    }
  }

  return (
    <details className="genpanel">
      <summary>サイト内で鑑定文を生成（Claude API・任意）</summary>
      <div className="genbody">
        <p className="gennote">
          APIキーを設定すると、コピー＆貼り付けなしでこのツール内で鑑定文を生成し、章ごとにエディタへ自動で流し込みます。
          キーは端末内（localStorage）にのみ保存されます。生成時は計算結果が Anthropic API（api.anthropic.com）に送信されます。
          モデル: {AI_MODEL}。※ claude.ai の Artifact ページ上では外部接続がブロックされるため、この機能はローカル起動時に使えます。
        </p>
        <div className="genrow">
          <input
            type="password"
            placeholder="Anthropic APIキー（sk-ant-...）"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value)}
            autoComplete="off"
          />
          {status !== 'running' ? (
            <button className="btn-copy" onClick={generate}>
              鑑定文を生成
            </button>
          ) : (
            <button className="btn-sub" onClick={() => runRef.current?.stop()}>
              中断
            </button>
          )}
        </div>
        {status === 'running' && (
          <div className="gennote">生成中… テーマ「{input.theme}」の鑑定文を書いています。</div>
        )}
        {error && <div className="note">⚠ {error}</div>}
        {preview && (status === 'running' || status === 'error') && (
          <pre className="genpreview">{preview}</pre>
        )}
        {status === 'done' && (
          <div className="copybar" style={{ margin: '10px 0 0' }}>
            <span className="msg">✓ 生成完了。章ごとにエディタへ取り込みました。</span>
            <button className="btn-sub" onClick={() => setView('editor')}>
              エディタで確認・禁止用語チェック
            </button>
            <button className="btn-sub" onClick={() => setView('print')}>
              印刷プレビュー
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
