# 要件定義書: GeOsaka の Cloudflare Pages（無料枠）公開

作成日: 2026-07-11 / 作成: Fable（dev-pipeline Phase 1）

## 1. 背景と目的

GeOsaka（React 18 + Vite 8 + TypeScript の静的 Web ゲーム。API キー不要、`npm run build` で `dist/` に静的ファイルを出力）を、Cloudflare Pages の無料枠で一般公開する。

## 2. 決定済み事項（ユーザー確認済み）

- **デプロイ方式: GitHub 連携（自動デプロイ）**。Cloudflare ダッシュボードで GitHub リポジトリ `syadool/geosaka` を接続し、`master` ブランチへの push で自動ビルド・デプロイする。
- wrangler 直接アップロード方式は不採用（ユーザー選択）。
- ダッシュボードでのリポジトリ接続・アカウント操作はユーザー自身が行う。本パイプラインの成果物は、そのために必要なリポジトリ側の整備と手順書である。

## 3. 機能要件

- FR-1: `master` への push をトリガーに、Cloudflare Pages が `npm run build` を実行し `dist/` を配信すること。
- FR-2: 公開 URL（`https://<project>.pages.dev`）でゲームが完全動作すること（写真読み込み・地図タイル・採点まで）。外部依存は Wikimedia Commons 画像と OSM タイルのみで、いずれもクライアント側から直接取得するため、Pages 側の追加設定（Functions、環境変数、API キー）は不要。
- FR-3: リポジトリに、Cloudflare Pages のビルドが成功するための設定ファイルを追加すること。具体的には：
  - Node バージョンの固定（Vite 8 は Node 20.19+ / 22.12+ を要求。Pages ビルド環境のデフォルト Node では失敗する可能性があるため `.node-version` 等で明示する）。
  - 必要に応じて SPA 用ヘッダー／リダイレクト設定（本アプリはルーティングを持たない単一ページのため `_redirects` は原則不要。不要なら追加しない根拠を設計書に記す）。
- FR-4: ユーザーがダッシュボードで行う接続手順（プロジェクト作成、ビルドコマンド `npm run build`、出力ディレクトリ `dist`、環境変数等）を日本語の手順書 `docs/DEPLOY_CloudflarePages.md` として作成すること。

## 4. 非機能要件

- NFR-1: 無料枠の制約内で運用できること（ビルド 500 回/月、静的アセット配信は無制限・無料。dist は現状数百 KB 程度で問題なし）。
- NFR-2: 既存のゲーム挙動・テストを変更しないこと（デプロイ設定の追加のみ）。
- NFR-3: 写真・地図のクレジット方針（README 記載）を公開後も満たすこと（コード変更不要の見込み。確認のみ）。

## 5. スコープ外

- カスタムドメインの設定（`*.pages.dev` のデフォルト URL で公開）。
- Cloudflare アカウント作成・ログイン・ダッシュボード操作の代行（ユーザーが実施）。
- GitHub Actions 等の独自 CI 追加（Pages の内蔵ビルドを使う）。

## 6. 受け入れ基準

- AC-1: `npm run build` がローカルで成功し、`dist/` が生成される。`.node-version` と同一版でのローカル確認を原則とし、困難な場合は「Node 24 でのローカル build 成功 + Pages 上の指定版での初回ビルド成功」を代替証跡とする（Phase 3 合意による更新）。
- AC-2: 追加した設定ファイルが設計書どおりで、既存テスト（`npx vitest run`）が全件パスする。
- AC-3: 手順書に従えば、ユーザーがダッシュボード操作だけで公開まで到達できる内容になっている。

## 7. 前提・既知の環境情報

- リポジトリ: `https://github.com/syadool/geosaka.git`（origin 設定済み、ブランチ `master`）。
- ローカル未コミットの変更なし（クリーン）。ただしデプロイ設定追加後はコミット・push が必要（コミットはユーザー指示を待つ）。
- `package.json`: build = `tsc -b && vite build --configLoader native`。`--configLoader native` は Node 上で ESM 設定を直接ロードするため、Node バージョン要件に特に注意。
