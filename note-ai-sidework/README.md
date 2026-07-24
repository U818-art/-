# note AI副業 ワークスペース

AI副業に関する情報をリサーチし、note で有料記事（無料レター付き）を販売するための作業フォルダです。

## フォルダ構成

```
note-ai-sidework/
├── 00_planning/        企画・ネタ管理
│   ├── ideas.md            ネタ帳（思いついたら即メモ）
│   └── content_calendar.md 公開スケジュール・進行管理
├── 01_research/        リサーチ素材の保管庫
│   ├── x_posts/            X（旧Twitter）で見つけた投稿のメモ
│   ├── web/                ウェブ記事・ブログのリサーチメモ
│   ├── tools/              AIツールの調査メモ（料金・機能など）
│   └── sources.md          出典・参考URLの一覧
├── 10_articles/        執筆中の記事（1記事 = 1フォルダ）
│   └── _template/          新規記事用テンプレート（コピーして使う）
│       ├── meta.md             タイトル案・価格・タグなどの企画メモ
│       ├── research.md         この記事専用のリサーチまとめ
│       ├── letter.md           無料部分（レター）の原稿
│       └── paid.md             有料部分の原稿
├── 20_published/       公開済み記事のアーカイブ
├── 30_assets/          画像素材
│   ├── eyecatch/           アイキャッチ画像
│   └── images/             記事内で使う図解・スクショ
└── 40_sales/           販売・振り返り
    ├── sales_log.md        売上記録
    └── feedback.md         読者の反応・改善メモ
```

## 運用フロー

1. **ネタ出し** — `00_planning/ideas.md` にネタを貯め、書くと決めたら `content_calendar.md` に登録
2. **リサーチ** — X・ウェブで情報収集し、`01_research/` にメモ。出典は必ず `sources.md` に残す
3. **記事作成** — `10_articles/_template/` をコピーして `10_articles/YYYYMMDD_記事タイトル/` を作成
   - `letter.md`（無料部分）: 読者の興味を引き、有料部分への期待を高める導入
   - `paid.md`（有料部分）: 具体的なノウハウ・手順・実例
4. **公開** — note に投稿したら、記事フォルダを `20_published/` へ移動し、`meta.md` に公開URLを追記
5. **振り返り** — `40_sales/` に売上と読者の反応を記録し、次の記事に活かす

## 命名ルール

- 記事フォルダ: `YYYYMMDD_タイトル`（例: `20260801_chatgpt-fukugyo-guide`）
- 画像: `記事フォルダ名_連番.png`（例: `20260801_chatgpt-fukugyo-guide_01.png`）
