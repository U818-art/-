# U818-articles｜記事管理（Phase 0 運用）

noteに公式投稿APIが存在しないため、**「下書き完成までを自動化・管理し、公開の30秒だけ手動」** を方針とする。
詳細は [`_docs/article-studio-design-v1.0.md`](./_docs/article-studio-design-v1.0.md) を参照。

## フォルダの流れ

```
00_ideas → 10_drafts → 20_review → 30_ready → 90_published
```

| フォルダ | 状態 | ルール |
|---|---|---|
| `00_ideas/` | テーマメモ | 1行でもOK。思いついたら即置く |
| `10_drafts/` | 執筆中 | テンプレ（`_templates/`）をコピーして書く |
| `20_review/` | リライト・品質チェック待ち | `_prompts/` のプロンプトでチェック |
| `30_ready/` | 公開待ち | noteにコピペするだけの完成状態 |
| `90_published/` | 公開済みアーカイブ | front matterに `published_url` / `published_date` を記入して移動 |

## ファイル名規則

```
YYYYMMDD_type_タイトル短縮.md
例：20260706_guide_AI画像プロンプト比較.md
```

## 運用手順（1記事あたり）

1. `00_ideas/` にメモを置く（front matter不要・1行でOK）
2. 書き始めるとき `_templates/essay.md` か `guide.md` をコピーして `10_drafts/` へ（ファイル名規則に従う）
3. 書き上がったら `20_review/` へ移動し、`_prompts/quality_check.md` でチェック → checklist を更新
4. 全チェック `true` になったら `30_ready/` へ
5. noteに貼り付けて公開（手動・30秒）→ `published_url` と `published_date` を記入して `90_published/` へ

## やらないこと（設計書 §3.2 より）

- 自動投稿（note規約リスク）
- 自動リサーチの完全放置運転
- 競合分析の常時クローリング
