import React, { useState } from 'react'
import { fmtDeg } from '../lib/astrology.js'
import { SPREADS, drawSpread } from '../lib/tarot.js'
import { buildClaudePrompt } from '../lib/prompt.js'
import { fmtJST, fmtHM } from '../lib/time.js'
import GeneratePanel from './GeneratePanel.jsx'

const GOGYO_COLORS = { 木: '#9fb28a', 火: '#c99a8e', 土: '#c9b483', 金: '#b8bcc0', 水: '#93a7bd' }

function RuleBadges({ rules }) {
  return (
    <div className="rule-badges">
      {Object.entries(rules).map(([k, v]) => (
        <span key={k} className="rule-badge">
          {k}: {v}
        </span>
      ))}
    </div>
  )
}

function Notes({ notes }) {
  return notes?.map((n, i) => (
    <div key={i} className="note">
      {n}
    </div>
  ))
}

/* ---------------- タブ本体 ---------------- */

function SummaryTab({ results, input }) {
  const { astro, shichu, numerology, kyusei, meta } = results
  const sun = astro.planets[0]
  const moon = astro.planets[1]
  return (
    <div>
      <table className="res">
        <tbody>
          <tr>
            <th>対象</th>
            <td>
              {input.name || '（宛名未記入）'}　{meta.dateStr} {meta.timeStr}　{meta.place.label}
              　テーマ: {input.theme}
            </td>
          </tr>
          <tr>
            <th>占星術</th>
            <td>
              太陽 {sun.sign} / 月 {moon.sign}
              {astro.asc ? ` / ASC ${astro.asc.sign}` : '（ASC 時刻不明のため算出なし）'}
            </td>
          </tr>
          <tr>
            <th>四柱推命</th>
            <td>
              {['year', 'month', 'day', 'hour']
                .map((k) => shichu.pillars[k]?.kanshi ?? '——')
                .join('　')}
              　（日主 {shichu.pillars.day.stem} / {shichu.strength}）
            </td>
          </tr>
          <tr>
            <th>数秘術</th>
            <td>
              LP {numerology.lifePath.value}
              {numerology.lifePath.isMaster ? '（マスター）' : ''} / BD {numerology.birthday.value} /
              PY {numerology.personalYear.value}
            </td>
          </tr>
          <tr>
            <th>九星気学</th>
            <td>
              本命 {kyusei.honmeiName} / 月命 {kyusei.getsumeiName} / {kyusei.keisha.name}傾斜
            </td>
          </tr>
        </tbody>
      </table>
      <Notes notes={[...astro.notes, ...shichu.notes]} />
    </div>
  )
}

function AstroTab({ astro }) {
  return (
    <div>
      <RuleBadges rules={astro.rules} />
      <Notes notes={astro.notes} />
      <table className="res">
        <thead>
          <tr>
            <th>天体</th>
            <th>サイン</th>
            <th className="num">度数</th>
            <th className="num">ハウス</th>
            <th>逆行</th>
          </tr>
        </thead>
        <tbody>
          {astro.planets.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.sign}</td>
              <td className="num">{fmtDeg(p.degInSign)}</td>
              <td className="num">{p.house}</td>
              <td>{p.retro ? 'R' : ''}</td>
            </tr>
          ))}
          {astro.asc && (
            <tr>
              <td>ASC</td>
              <td>{astro.asc.sign}</td>
              <td className="num">{fmtDeg(astro.asc.degInSign)}</td>
              <td className="num">1</td>
              <td></td>
            </tr>
          )}
          {astro.mc && (
            <tr>
              <td>MC</td>
              <td>{astro.mc.sign}</td>
              <td className="num">{fmtDeg(astro.mc.degInSign)}</td>
              <td className="num">10</td>
              <td></td>
            </tr>
          )}
        </tbody>
      </table>
      <h3 style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--ink-soft)' }}>アスペクト</h3>
      {astro.aspects.length === 0 ? (
        <p style={{ fontSize: 13 }}>設定オーブ内のアスペクトはありません。</p>
      ) : (
        <table className="res">
          <tbody>
            {astro.aspects.map((a, i) => (
              <tr key={i}>
                <td>
                  {a.p1} — {a.p2}
                </td>
                <td>{a.aspect}</td>
                <td className="num">オーブ {a.orb.toFixed(2)}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ShichuTab({ shichu }) {
  return (
    <div>
      <RuleBadges rules={shichu.rules} />
      <Notes notes={shichu.notes} />
      <div className="kanshi-grid">
        {['year', 'month', 'day', 'hour'].map((k) => {
          const p = shichu.pillars[k]
          if (!p)
            return (
              <div key={k} className="pillar">
                <div className="lbl">時 柱</div>
                <div className="kanshi">——</div>
                <div className="meta">時刻不明</div>
              </div>
            )
          return (
            <div key={k} className="pillar">
              <div className="lbl">{p.label}</div>
              <div className="kanshi">{p.kanshi}</div>
              <div className="meta">
                {p.label === '日柱' ? '日主' : p.tsuhenStem}
                <br />
                蔵干 {p.zokan}（{p.zokanKind}）→ {p.tsuhenZokan}
                <br />
                十二運 {p.stage}
              </div>
            </div>
          )
        })}
      </div>
      <table className="res">
        <tbody>
          <tr>
            <th>空亡</th>
            <td>{shichu.kubo}</td>
          </tr>
          <tr>
            <th>身強身弱</th>
            <td>
              {shichu.strength}（比劫＋印の比率 {shichu.strengthRatio}%・簡易指標）
            </td>
          </tr>
          <tr>
            <th>節入り</th>
            <td>
              {shichu.setsu.setsuName} {fmtJST(shichu.setsu.setsuTime)}（節入りから{' '}
              {shichu.debug.setsuElapsedDays} 日経過）
            </td>
          </tr>
          <tr>
            <th>地方時補正</th>
            <td>
              LMT = 時計時刻 {shichu.lmtCorrectionMin >= 0 ? '+' : ''}
              {shichu.lmtCorrectionMin} 分（JST基準）→ LMT {fmtHM(shichu.lmt.hh, shichu.lmt.mm)}
            </td>
          </tr>
        </tbody>
      </table>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--ink-soft)' }}>
          五行バランス（天干＋蔵干）
        </div>
        <div className="gogyo-bar">
          {Object.entries(shichu.gogyoPct).map(([k, v]) =>
            v > 0 ? <div key={k} style={{ width: `${v}%`, background: GOGYO_COLORS[k] }} /> : null
          )}
        </div>
        <div className="gogyo-legend">
          {Object.entries(shichu.gogyoPct).map(([k, v]) => (
            <span key={k}>
              <span className="dot" style={{ background: GOGYO_COLORS[k] }} />
              {k} {v}%
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function NumTab({ numerology }) {
  return (
    <div>
      <RuleBadges rules={numerology.rules} />
      <div className="bignum">
        <div className="item">
          <div className="l">ライフパス</div>
          <div className="v">{numerology.lifePath.value}</div>
          {numerology.lifePath.isMaster && <div className="s">マスターナンバー</div>}
        </div>
        <div className="item">
          <div className="l">バースデー</div>
          <div className="v">{numerology.birthday.value}</div>
          {numerology.birthday.isMaster && <div className="s">マスターナンバー</div>}
        </div>
        <div className="item">
          <div className="l">パーソナルイヤー（{numerology.personalYearYear}）</div>
          <div className="v">{numerology.personalYear.value}</div>
          {numerology.personalYear.isMaster && <div className="s">マスターナンバー</div>}
        </div>
      </div>
      <table className="res">
        <tbody>
          <tr>
            <th>ライフパス還元過程</th>
            <td>
              {numerology.lifePathExpr} → {numerology.lifePath.steps.join(' → ')}
            </td>
          </tr>
          <tr>
            <th>バースデー還元過程</th>
            <td>{numerology.birthday.steps.join(' → ')}</td>
          </tr>
          <tr>
            <th>パーソナルイヤー還元過程</th>
            <td>
              {numerology.personalYearExpr} → {numerology.personalYear.steps.join(' → ')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TarotTab({ tarot, setTarot }) {
  const [spread, setSpread] = useState('one')
  return (
    <div>
      <div className="rule-badges">
        <span className="rule-badge">デッキ: ライダー・ウェイト版78枚</span>
        <span className="rule-badge">逆位置: あり</span>
        <span className="rule-badge">乱数: crypto.getRandomValues</span>
      </div>
      <div className="radio-row" style={{ marginBottom: 12 }}>
        {Object.entries(SPREADS).map(([key, s]) => (
          <label key={key}>
            <input
              type="radio"
              checked={spread === key}
              onChange={() => setSpread(key)}
            />
            {s.name}
          </label>
        ))}
      </div>
      <button className="btn-sub btn-gold" onClick={() => setTarot(drawSpread(spread))}>
        カードを引く
      </button>
      {tarot && (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12 }}>
            {tarot.spreadName}
          </div>
          <div className="tarot-cards">
            {tarot.cards.map((c, i) => (
              <div className="tarot-card" key={i} style={c.reversed ? { borderStyle: 'dashed' } : {}}>
                <div className="pos">{c.position}</div>
                <div className="sym">{c.reversed ? '▽' : '△'}</div>
                <div className="jp">{c.card.jp}</div>
                <div className="en">{c.card.en}</div>
                <div className="rv">{c.reversed ? '逆 位 置' : '正 位 置'}</div>
                <div className="kw">{c.reversed ? c.card.rev : c.card.up}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function KyuseiTab({ kyusei }) {
  return (
    <div>
      <RuleBadges rules={kyusei.rules} />
      <Notes notes={kyusei.notes} />
      <div className="bignum">
        <div className="item">
          <div className="l">本命星</div>
          <div className="v" style={{ fontSize: 20 }}>{kyusei.honmeiName}</div>
        </div>
        <div className="item">
          <div className="l">月命星</div>
          <div className="v" style={{ fontSize: 20 }}>{kyusei.getsumeiName}</div>
        </div>
        <div className="item">
          <div className="l">傾斜</div>
          <div className="v" style={{ fontSize: 20 }}>{kyusei.keisha.name}</div>
        </div>
      </div>
      <table className="res">
        <tbody>
          <tr>
            <th>今年の巡り（{kyusei.current.year}年・年盤 {kyusei.current.yearStarName} 中宮）</th>
            <td>
              本命星は {kyusei.current.yearPalace.name}（{kyusei.current.yearPalace.dir}）に回座
            </td>
          </tr>
          <tr>
            <th>今月の巡り（{kyusei.current.monthSetsuName}節・月盤 {kyusei.current.monthStarName} 中宮）</th>
            <td>
              本命星は {kyusei.current.monthPalace.name}（{kyusei.current.monthPalace.dir}）に回座
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- デバッグ表示 ---------------- */

function DebugPanel({ results }) {
  const { astro, shichu, kyusei, numerology, meta } = results
  const dump = {
    出生UTC: meta.birthUTC.toISOString(),
    出生地: meta.place,
    占星術: {
      ...astro.debug,
      cusps: astro.cusps?.slice(1).map((c, i) => `${i + 1}室 ${c.toFixed(3)}°`),
      planets: astro.planets.map((p) => `${p.name} ${p.lon.toFixed(4)}°${p.retro ? ' R' : ''}`),
    },
    四柱推命: {
      ...shichu.debug,
      節入り: `${shichu.setsu.setsuName} ${shichu.setsu.setsuTime.toISOString()}`,
      次の節入り: `${shichu.setsu.nextSetsuName} ${shichu.setsu.nextSetsuTime?.toISOString()}`,
      立春: shichu.adjYear.risshun.toISOString(),
      採用年: shichu.adjYear.year,
      蔵干表_月支: shichu.pillars.month.zokanTable,
    },
    九星: {
      採用年: kyusei.adjYear.year,
      本命星: kyusei.honmei,
      月命星: kyusei.getsumei,
      月順: kyusei.setsu.monthOrder,
    },
    数秘: {
      LP: numerology.lifePath,
      BD: numerology.birthday,
      PY: numerology.personalYear,
    },
  }
  return (
    <details className="debug no-print">
      <summary>開発者向け: 計算過程（中間値）を表示</summary>
      <pre>{JSON.stringify(dump, null, 2)}</pre>
    </details>
  )
}

/* ---------------- メイン ---------------- */

const TABS = [
  ['summary', '総合サマリー'],
  ['astro', '西洋占星術'],
  ['shichu', '四柱推命'],
  ['num', '数秘術'],
  ['tarot', 'タロット'],
  ['kyusei', '九星気学'],
]

export default function ResultView({ input, results, tarot, setTarot, setSections, setView }) {
  const [tab, setTab] = useState('summary')
  const [copyMsg, setCopyMsg] = useState('')

  async function copyForClaude() {
    const text = buildClaudePrompt({
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
    try {
      await navigator.clipboard.writeText(text)
      setCopyMsg('コピーしました。AIチャットに貼り付けてください。')
    } catch {
      // file:// などで Clipboard API が使えない場合のフォールバック
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyMsg(ok ? 'コピーしました。' : 'コピーに失敗しました。デバッグ表示から手動でコピーしてください。')
    }
    setTimeout(() => setCopyMsg(''), 5000)
  }

  return (
    <section className="no-print">
      <div className="copybar">
        <button className="btn-copy" onClick={copyForClaude}>
          Claude 用にコピー
        </button>
        <span className="msg">
          {copyMsg ||
            `全計算結果＋テーマ「${input.theme}」の深掘り指示＋執筆制約（断定表現・開運/浄化/運気の不使用・人生分析として書く）を含む依頼文をコピーします。${tarot ? `タロット（${tarot.spreadName}）を含みます。` : 'タロットは未ドローのため含まれません。'}`}
        </span>
      </div>

      <GeneratePanel
        input={input}
        results={results}
        tarot={tarot}
        setSections={setSections}
        setView={setView}
      />

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="tabpanel">
        {tab === 'summary' && <SummaryTab results={results} input={input} />}
        {tab === 'astro' && <AstroTab astro={results.astro} />}
        {tab === 'shichu' && <ShichuTab shichu={results.shichu} />}
        {tab === 'num' && <NumTab numerology={results.numerology} />}
        {tab === 'tarot' && <TarotTab tarot={tarot} setTarot={setTarot} />}
        {tab === 'kyusei' && <KyuseiTab kyusei={results.kyusei} />}
      </div>

      <DebugPanel results={results} />
    </section>
  )
}
