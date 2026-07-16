import React from 'react'
import { PREFECTURES } from '../data/prefectures.js'

const THEMES = ['総合', '金運', '恋愛', '仕事']

export default function InputForm({ input, setInput, onCalculate }) {
  const set = (k, v) => setInput((prev) => ({ ...prev, [k]: v }))

  return (
    <section className="card no-print">
      <h2>鑑 定 情 報 の 入 力</h2>
      <div className="form-grid">
        <div className="field">
          <label>お名前（表示用・任意）</label>
          <input
            type="text"
            value={input.name}
            placeholder="鑑定書の宛名に使用します"
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="field">
          <label>生年月日（必須・西暦）</label>
          <input type="date" value={input.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="field">
          <label>出生時刻（任意）</label>
          <input
            type="time"
            value={input.time}
            disabled={!input.timeKnown}
            onChange={(e) => set('time', e.target.value)}
          />
          <div className="check-row">
            <input
              type="checkbox"
              id="tk"
              checked={!input.timeKnown}
              onChange={(e) => set('timeKnown', !e.target.checked)}
            />
            <label htmlFor="tk" style={{ margin: 0 }}>時刻不明（時刻不明モードで計算）</label>
          </div>
        </div>
        <div className="field">
          <label>出生地（必須）</label>
          <div className="radio-row" style={{ marginBottom: 6 }}>
            <label>
              <input
                type="radio"
                checked={input.placeMode === 'pref'}
                onChange={() => set('placeMode', 'pref')}
              />
              国内（都道府県）
            </label>
            <label>
              <input
                type="radio"
                checked={input.placeMode === 'custom'}
                onChange={() => set('placeMode', 'custom')}
              />
              海外（直接入力）
            </label>
          </div>
          {input.placeMode === 'pref' ? (
            <select value={input.pref} onChange={(e) => set('pref', e.target.value)}>
              {PREFECTURES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}（{p.city}）
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <input
                type="number"
                step="0.001"
                placeholder="緯度（北+）"
                value={input.lat}
                onChange={(e) => set('lat', e.target.value)}
              />
              <input
                type="number"
                step="0.001"
                placeholder="経度（東+）"
                value={input.lon}
                onChange={(e) => set('lon', e.target.value)}
              />
              <input
                type="number"
                step="0.25"
                placeholder="時差（UTC±）"
                value={input.tz}
                onChange={(e) => set('tz', e.target.value)}
              />
            </div>
          )}
          {input.placeMode === 'custom' && (
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
              時差は出生当時に適用されていたオフセット（夏時間中はその分を含む）を入力
            </div>
          )}
        </div>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label>鑑定テーマ（必須）</label>
        <div className="theme-row">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={input.theme === t ? 'active' : ''}
              onClick={() => set('theme', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-main" onClick={onCalculate}>
        鑑 定 計 算
      </button>
    </section>
  )
}
