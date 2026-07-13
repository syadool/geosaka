# 技術選定書: GeOsaka の Cloudflare Pages CLI 公開（Direct Upload）

作成日: 2026-07-13 / 作成: Fable（dev-pipeline Phase 3、sol との合意事項）

## 1. 決定事項

| 論点 | 決定 | 理由 |
|---|---|---|
| デプロイ CLI | **wrangler**（`pages project create` + `pages deploy`）。C3 は不採用 | C3 は新規プロジェクトの雛形生成が目的。既存リポジトリのビルド済み `dist/` を Pages へ送る公式経路は `wrangler pages deploy`（Fable・sol 一致） |
| 公開プラットフォーム | **Cloudflare Pages（Direct Upload）** | ユーザーの明示指示。静的サイトで Functions 不要のため Workers Static Assets へ寄せる技術的必要性なし（sol 賛成） |
| wrangler.jsonc | **削除**（`pages_build_output_dir` への書き換えはしない） | 現内容は Workers 形式で経路誤認の元。Functions/Bindings がない現状では CLI 引数明示のほうが管理対象が少ない。将来 Functions 導入時に Pages 形式で再導入（sol 賛成） |
| wrangler の版管理 | **devDependencies に 4.110.0 固定** + lockfile 更新 | `npx` の暗黙最新版取得を防ぐ（sol 賛成） |
| deploy スクリプト | `predeploy: "npm test && npm run build"` / `deploy: "wrangler pages deploy ./dist --project-name=<NAME>"` | **sol 指摘による設計修正**: テストをデプロイの強制ゲートにする（NFR-3）。npm スクリプト内では `npx` を外し、ローカル固定版を確実に使う |
| テスト標準経路 | `npm test`（`vitest run --configLoader native`） | Windows の `spawn EPERM` 回避のため、素の `npx vitest run` ではなく既存 npm スクリプトを標準とする（sol 指摘） |
| 公開 URL の扱い | **CLI の実出力を正**とする | プロジェクト名衝突時に URL へランダム文字列が付く可能性があるため、`<NAME>.pages.dev` は期待値であり確定値としない（sol 指摘） |

## 2. 不採用案と保留事項

- **C3（create-cloudflare）**: 不採用。新規雛形生成ツールであり、既存プロジェクトのデプロイには不適（ユーザー提案だったが、CLI 経由公開という目的は wrangler で達成）。
- **Workers Static Assets（`wrangler deploy`）**: 不採用。既存 wrangler.jsonc はこの形式だったが、ユーザー指示は Pages。静的サイトのみで技術的優位もない。
- **wrangler.jsonc の Pages 形式書き換え**: 不採用。設定ファイルを置くと Pages 設定の source of truth になり管理対象が増える。
- **既存 GitHub 連携プロジェクトの再利用**: 保留（低確信）。sol は「Git 連携プロジェクトへも wrangler から手動デプロイ可能」と指摘したが、設計書は「方式が確認できない限り別名で Direct Upload プロジェクトを新規作成」としており、安全側のこの方針を維持する。実装時に `pages project list` で確認して判断する。

## 3. 実装への引き継ぎ（設計書への反映事項）

1. `package.json`: `predeploy`（`npm test && npm run build`）と `deploy`（`npx` なし）の 2 スクリプト構成に変更。
2. 手順書・受け入れテスト: 公開 URL は deploy コマンドの実出力から取得して記録する。
3. テスト手順の標準は `npm test` とする。
