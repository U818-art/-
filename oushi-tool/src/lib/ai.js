// ---------------------------------------------------------------
// Claude API による鑑定文のサイト内生成（Phase 2 前倒し実装）
//
// 【方針】
// - 公式 SDK (@anthropic-ai/sdk) をブラウザから直接使用する
//   （dangerouslyAllowBrowser: 自分専用ツールで自分の API キーを自分の端末で
//    使う構成のため許容。キーは localStorage にのみ保存し外部送信しない）。
// - モデル: claude-opus-4-8 / アダプティブ思考 / ストリーミング。
// - 生成時は計算結果（構造化テキスト）が api.anthropic.com に送信される。
//   UI 上にその旨を明記する。
// - claude.ai の Artifact ページ上では CSP により外部 API 接続がブロックされる
//   ため動作しない → 接続エラーを検出して案内を出す。
// ---------------------------------------------------------------
import Anthropic from '@anthropic-ai/sdk'

export const AI_MODEL = 'claude-opus-4-8'

/**
 * 鑑定文を生成する（ストリーミング）。
 * @param apiKey  Anthropic API キー
 * @param prompt  buildClaudePrompt() の出力
 * @param onDelta テキスト断片ごとのコールバック
 * @returns { text, stop }  stop() で中断可能な Promise を返す
 */
export function generateKantei({ apiKey, prompt, onDelta }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  })
  if (onDelta) stream.on('text', onDelta)

  const promise = stream
    .finalMessage()
    .then((msg) => {
      if (msg.stop_reason === 'refusal') {
        throw new Error('生成が拒否されました。内容を変えて再度お試しください。')
      }
      return msg.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
    })
    .catch((e) => {
      throw new Error(toJaError(e))
    })

  return { promise, stop: () => stream.abort() }
}

/** SDK の型付き例外 → 日本語メッセージ */
function toJaError(e) {
  if (e instanceof Anthropic.AuthenticationError) {
    return 'APIキーが無効です。console.anthropic.com で発行したキーを確認してください。'
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return 'このAPIキーには権限がありません。'
  }
  if (e instanceof Anthropic.RateLimitError) {
    return 'レート制限に達しました。しばらく待ってから再度お試しください。'
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return (
      'Anthropic API に接続できませんでした。claude.ai の Artifact ページ上では' +
      '外部API接続がブロックされるため、この機能はローカル起動時（npm run dev / dist/index.html）に' +
      'ご利用ください。Artifact 上では「Claude用にコピー」→ チャットに貼り付け → ' +
      'エディタの「まとめて貼り付け」をご利用いただけます。'
    )
  }
  if (e instanceof Anthropic.APIError) {
    return `APIエラー（${e.status ?? '?'}）: ${e.message}`
  }
  if (e?.name === 'AbortError' || /aborted/i.test(e?.message ?? '')) {
    return '生成を中断しました。'
  }
  return e?.message ?? String(e)
}
