# 櫻紫（OUSHI）鑑定計算ツール

非公開・制作者専用の鑑定書制作ツール。生年月日等から5占術（西洋占星術・四柱推命・数秘術・タロット・九星気学）を
コードで正確に計算し、AI用構造化テキストのコピー → 鑑定文章の貼り戻し → A4ブランドレイアウトでの印刷（PDF保存）まで
このツール内で完結する。

## 起動

```bash
npm install
npm run dev        # ローカル起動
npm run build      # dist/ にビルド（file:// で直接開いても動作する）
node scripts/verify.mjs   # 計算検証（VERIFICATION.md 対応・27項目）
```

## 技術方針

- **完全クライアントサイド**。計算・編集・印刷において入力データ（顧客の生年月日）を外部に送信する処理はない。保存は localStorage のみ。
- **サイト内生成（任意・Phase 2 前倒し）**: Anthropic API キーを設定すると、ツール内で鑑定文を生成し章ごとにエディタへ自動取込できる（`src/lib/ai.js`、モデル claude-opus-4-8・ストリーミング）。この機能を使う場合のみ、計算結果が api.anthropic.com に送信される。キーは localStorage にのみ保存。claude.ai の Artifact ページ上では CSP により動作しないため、その場合はエディタの「まとめて貼り付け」（## 見出しで章に自動分割）を使う。
- 天体位置・二十四節気（節入り）は **astronomy-engine**（MIT）による天文計算。固定日付テーブル不使用。
- タロットのドローは `crypto.getRandomValues`（棄却法でバイアス除去）。
- 各占術の採用ルール（流派差の出る箇所）は `src/lib/*.js` 冒頭コメントおよび画面上のルールバッジに明記。

## 構成

```
src/lib/solarterms.js    二十四節気（天文計算）
src/lib/astrology.js     西洋占星術（トロピカル / プラシダス）
src/lib/shichusuimei.js  四柱推命（立春/節入り切替・地方時補正・月律分野蔵干）
src/lib/numerology.js    数秘術（ピタゴラス式・マスターナンバー保持）
src/lib/kyusei.js        九星気学（本命星・月命星・傾斜・年月の巡り）
src/lib/tarot.js         タロット78枚・スプレッド
src/lib/prompt.js        「Claude用にコピー」の構造化テキスト生成
src/lib/checker.js       禁止用語チェッカー（開運/浄化/運気/必ず/絶対に）
src/data/prefectures.js  都道府県庁所在地の緯度経度
src/components/          入力・結果タブ・鑑定書エディタ・印刷プレビュー
scripts/verify.mjs       検証スクリプト
```

Phase 2（Claude API 組み込み・顧客管理・相性鑑定）に備え、計算結果は構造化データ（results オブジェクト）として保持している。
