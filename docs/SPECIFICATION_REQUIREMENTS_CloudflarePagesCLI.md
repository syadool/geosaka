# 要件定義書: GeOsaka の Cloudflare Pages CLI 公開（Direct Upload）

作成日: 2026-07-13 / 作成: Fable（dev-pipeline Phase 1）

## 1. 背景と目的

前回パイプライン（`SPECIFICATION_REQUIREMENTS_CloudflarePages.md`）では GitHub 連携方式を採用し、ダッシュボード操作の手順書（`DEPLOY_CloudflarePages.md`）を作成した。今回、ユーザーから新たに **「CLI 経由で公開する」** 指示があり、これが前回の方式決定を上書きする。ダッシュボード操作を必要とせず、ローカルの CLI から直接 Cloudflare Pages に公開する。

ユーザーは C3（create-cloudflare）を候補として挙げているが、C3 は新規プロジェクトの雛形生成ツールであり、既存リポジトリのデプロイには **wrangler**（`wrangler pages project create` / `wrangler pages deploy`）が公式の CLI 経路である。ツール選定の最終判断は Phase 3（技術選定）で行う。

## 2. 現状把握（2026-07-13 時点）

- アプリ: React 18 + Vite 8 + TypeScript の静的サイト。`npm run build` で `dist/` を出力。API キー・サーバー処理・環境変数は不要。
- wrangler 4.110.0 が `npx` 経由で利用可能。**未認証**（`wrangler login` が必要 — ユーザーのブラウザ承認を要する）。
- リポジトリ直下に未コミットの `wrangler.jsonc` が存在するが、内容は Workers 静的アセット形式（`assets.directory`）であり、**Pages 用設定（`pages_build_output_dir`）ではない**。Pages コマンドとの整合を設計で解決する。
- 作業ツリーには StreetView 機能（実装・テスト済み、未コミット）が含まれる。公開対象はこの現在の作業ツリーの内容とする。
- 前回手順書の注意: GitHub 連携で作成した Pages プロジェクトは Direct Upload に切替不可。ダッシュボードで連携プロジェクトが既に作成済みかは不明のため、認証後に `wrangler pages project list` で確認し、名前衝突があれば別プロジェクト名を用いる。

## 3. 機能要件

- FR-1: CLI のみで（ダッシュボード操作なしで）Cloudflare Pages プロジェクトを作成し、`dist/` を本番デプロイできること。
- FR-2: 公開 URL（`https://<project>.pages.dev`）でゲームが完全動作すること（写真・地図タイル・採点・StreetView リンク）。
- FR-3: `wrangler.jsonc` を Pages Direct Upload と整合する内容にすること（または不要なら削除の判断を設計で示す）。
- FR-4: 再デプロイを 1 コマンドで行えるよう `package.json` に `deploy` スクリプトを追加すること（build → pages deploy）。
- FR-5: CLI 公開手順を `docs/DEPLOY_CloudflarePagesCLI.md` に記録すること（初回認証、プロジェクト作成、デプロイ、確認、再デプロイ）。既存の GitHub 連携手順書は削除せず、冒頭に「現行方式は CLI」の注記を追える形とする（扱いは設計で決定）。

## 4. 非機能要件

- NFR-1: 無料枠内で運用（Direct Upload のデプロイ回数制限に留意）。
- NFR-2: 既存のゲーム挙動・テストを変更しない（設定とスクリプトの追加のみ）。
- NFR-3: デプロイ前にローカルで `npm run build` と `npx vitest run` が成功していること。

## 5. スコープ外

- カスタムドメイン設定。
- GitHub 連携（自動デプロイ）の構築・撤去。
- Cloudflare アカウント作成。認証（`wrangler login`）のブラウザ承認はユーザーが行う。

## 6. 受け入れ基準

- AC-1: ローカルで build・全テストがパスする。
- AC-2: `npx wrangler pages deploy` が成功し、公開 URL が発行される。
- AC-3: 公開 URL でゲームの主要動作（写真表示・地図・採点・5 ラウンド完走）が確認できる。
- AC-4: `npm run deploy` 一発で再デプロイできる。
