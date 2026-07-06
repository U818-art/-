# note運用ワークフロー（U818）

note運用でくり返し発生する20のタスクを、**そのままコピペで使えるプロンプトテンプレート**として整理したものです。
各ファイルの「プロンプト」部分をAI（Claudeなど）に貼り付け、`【 】` の箇所を自分の情報に書き換えて使います。

## 使い方

1. やりたいタスクのファイルを開く
2. 「プロンプト」ブロックをコピーする
3. `【 】` を埋めてAIに送る
4. 出力を「チェックポイント」で確認してから使う

## タスク一覧

### リサーチ・分析

| # | タスク | ファイル |
|---|--------|----------|
| ① | バズ投稿の分析 | [01-buzz-analysis.md](01-buzz-analysis.md) |
| ⑦ | 競合note分析 | [07-competitor-analysis.md](07-competitor-analysis.md) |
| ⑫ | SEOキーワード分析 | [12-seo-keywords.md](12-seo-keywords.md) |
| ⑮ | トレンド情報の収集 | [15-trend-research.md](15-trend-research.md) |
| ⑲ | フォロワー反応分析 | [19-follower-insights.md](19-follower-insights.md) |

### ネタ・企画

| # | タスク | ファイル |
|---|--------|----------|
| ② | noteネタの自動収集 | [02-idea-collection.md](02-idea-collection.md) |
| ⑭ | フック案の大量生成 | [14-hook-generation.md](14-hook-generation.md) |
| ⑱ | サムネ文言の提案 | [18-thumbnail-copy.md](18-thumbnail-copy.md) |

### 執筆

| # | タスク | ファイル |
|---|--------|----------|
| ③ | 記事構成の作成 | [03-article-outline.md](03-article-outline.md) |
| ④ | タイトル案の生成 | [04-title-ideas.md](04-title-ideas.md) |
| ⑥ | 投稿文の作成 | [06-post-writing.md](06-post-writing.md) |
| ⑤ | AI臭の修正 | [05-deai-editing.md](05-deai-editing.md) |
| ⑯ | 文章の読みやすさ調整 | [16-readability.md](16-readability.md) |

### 運用・改善

| # | タスク | ファイル |
|---|--------|----------|
| ⑧ | コメント返信案 | [08-comment-replies.md](08-comment-replies.md) |
| ⑨ | 導線改善提案 | [09-funnel-improvement.md](09-funnel-improvement.md) |
| ⑩ | 過去記事のリライト | [10-rewrite.md](10-rewrite.md) |
| ⑪ | 伸びた投稿の再設計 | [11-winning-post-redesign.md](11-winning-post-redesign.md) |
| ⑬ | 投稿時間の最適化 | [13-posting-time.md](13-posting-time.md) |
| ⑰ | note販売導線の改善 | [17-sales-funnel.md](17-sales-funnel.md) |
| ⑳ | 改善ポイントのレポート化 | [20-improvement-report.md](20-improvement-report.md) |

## 週間ルーティン（目安）

| 曜日 | やること | 使うテンプレ |
|------|----------|--------------|
| 月 | トレンド収集・ネタ出し | ⑮ → ② |
| 火 | 記事構成・タイトル決め | ③ → ④ → ⑭ |
| 水 | 執筆・仕上げ | ⑥ → ⑤ → ⑯ → ⑱ |
| 木 | 投稿・コメント対応 | ⑬ → ⑧ |
| 金 | 反応チェック | ⑲ → ① |
| 土日 | 休む or 軽いリライト | ⑩ |

## 月次ルーティン（目安）

- 月初：⑦ 競合分析、⑫ SEOキーワードの見直し
- 月中：⑨ 導線チェック、⑰ 販売導線の見直し
- 月末：⑳ 改善レポート作成 → 翌月の計画に反映、⑪ 伸びた投稿の再設計

## 共通の前提プロンプト

各テンプレの先頭に、以下の「自分の設定」を貼っておくと出力の精度が上がります。

```text
【わたしの発信の前提】
- 発信者：U818（ユーエイト）。元主婦の個人事業主。
- テーマ：AI×感性。note・SNS発信、AI画像/音楽生成、Web制作、ライティング。
- トーン：やさしく、あたたかく、押しつけない。です・ます調。
- 読者像：AIを使って自分の「好き」を仕事にしたい人。特に子育て中の女性や副業初心者。
- NG：煽り表現、専門用語の羅列、上から目線。
```
