import React, { useEffect, useState } from 'react'
import InputForm from './components/InputForm.jsx'
import ResultView from './components/ResultView.jsx'
import EditorView from './components/EditorView.jsx'
import PrintView from './components/PrintView.jsx'
import { PREFECTURES } from './data/prefectures.js'
import { localToUTC } from './lib/time.js'
import { computeHoroscope } from './lib/astrology.js'
import { computeShichu } from './lib/shichusuimei.js'
import { computeNumerology } from './lib/numerology.js'
import { computeKyusei } from './lib/kyusei.js'

const LS_INPUT = 'oushi_input_v1'
const LS_SECTIONS = 'oushi_sections_v1'

const DEFAULT_INPUT = {
  name: '',
  date: '1990-01-01',
  timeKnown: true,
  time: '12:00',
  placeMode: 'pref', // 'pref' | 'custom'
  pref: '東京都',
  lat: '',
  lon: '',
  tz: '9',
  theme: '総合',
}

const DEFAULT_SECTIONS = [
  'はじめに',
  '生まれ持った資質',
  'テーマ分析',
  'いまへのメッセージ',
  'この一年の流れ',
  '結びに',
].map((title, i) => ({ id: `s${i}`, title, text: '' }))

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [view, setView] = useState('calc') // calc | editor | print
  const [input, setInput] = useState(() => ({ ...DEFAULT_INPUT, ...loadLS(LS_INPUT, {}) }))
  const [results, setResults] = useState(null)
  const [tarot, setTarot] = useState(null)
  const [error, setError] = useState(null)
  const [sections, setSections] = useState(() => loadLS(LS_SECTIONS, DEFAULT_SECTIONS))

  // 端末内（localStorage）のみに保存。外部送信は一切しない。
  useEffect(() => {
    localStorage.setItem(LS_INPUT, JSON.stringify(input))
  }, [input])
  useEffect(() => {
    localStorage.setItem(LS_SECTIONS, JSON.stringify(sections))
  }, [sections])

  function resolvePlace() {
    if (input.placeMode === 'pref') {
      const p = PREFECTURES.find((x) => x.name === input.pref)
      return { lat: p.lat, lon: p.lon, tz: 9, label: `${p.name}（${p.city}・JST）` }
    }
    const lat = parseFloat(input.lat)
    const lon = parseFloat(input.lon)
    const tz = parseFloat(input.tz)
    if (!isFinite(lat) || !isFinite(lon) || !isFinite(tz)) return null
    return { lat, lon, tz, label: `緯度${lat}° 経度${lon}°（UTC${tz >= 0 ? '+' : ''}${tz}）` }
  }

  function calculate() {
    setError(null)
    try {
      const [y, m, d] = input.date.split('-').map(Number)
      if (!y || !m || !d) throw new Error('生年月日を入力してください。')
      const place = resolvePlace()
      if (!place) throw new Error('出生地（緯度・経度・時差）を正しく入力してください。')
      const [hh, mm] = input.timeKnown ? input.time.split(':').map(Number) : [12, 0]
      const birthUTC = localToUTC(y, m, d, hh, mm, place.tz)

      const now = new Date()
      const todayY = now.getFullYear()

      const astro = computeHoroscope(birthUTC, place.lat, place.lon, input.timeKnown)
      const shichu = computeShichu(birthUTC, place.lon, y, input.timeKnown)
      const numerology = computeNumerology(y, m, d, todayY)
      const kyusei = computeKyusei(birthUTC, y, now, todayY)

      setResults({
        astro,
        shichu,
        numerology,
        kyusei,
        meta: {
          birthUTC,
          place,
          dateStr: `${y}年${m}月${d}日`,
          timeStr: input.timeKnown ? input.time : '不明',
          todayStr: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
        },
      })
    } catch (e) {
      console.error(e)
      setError(e.message || String(e))
      setResults(null)
    }
  }

  return (
    <div className="app">
      <header className="brand-header no-print">
        <h1>櫻紫</h1>
        <div className="sub">OUSHI — LIFE ANALYSIS</div>
        <div className="private">鑑定計算ツール（非公開・制作者専用 / 全計算は端末内で完結）</div>
      </header>

      <nav className="viewnav no-print">
        <button className={view === 'calc' ? 'active' : ''} onClick={() => setView('calc')}>
          計算
        </button>
        <button className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}>
          鑑定書エディタ
        </button>
        <button className={view === 'print' ? 'active' : ''} onClick={() => setView('print')}>
          印刷プレビュー
        </button>
      </nav>

      {view === 'calc' && (
        <>
          <InputForm input={input} setInput={setInput} onCalculate={calculate} />
          {error && <div className="note">⚠ {error}</div>}
          {results && (
            <ResultView input={input} results={results} tarot={tarot} setTarot={setTarot} />
          )}
        </>
      )}

      {view === 'editor' && (
        <EditorView sections={sections} setSections={setSections} defaults={DEFAULT_SECTIONS} />
      )}

      {view === 'print' && (
        <PrintView
          name={input.name}
          sections={sections}
          todayStr={
            results?.meta.todayStr ??
            `${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日`
          }
        />
      )}
    </div>
  )
}
