# Cloudflare Pages 公開手順（GitHub 連携）

> 現行の公開方式は Wrangler による Cloudflare Pages Direct Upload です。
> 本書は過去の GitHub 連携方式の記録であり、新規公開・再デプロイには
> [DEPLOY_CloudflarePagesCLI.md](DEPLOY_CloudflarePagesCLI.md) を使用してください。

対象リポジトリ: `syadool/geosaka`  
対象ブランチ: `master`  
公開方式: Cloudflare Pages 無料枠・GitHub 連携

## 1. この手順の前提

- 本アプリは React + Vite でビルドする静的サイトである。Cloudflare Pages Functions、API キー、環境変数は使用しない。
- `master` へ push したコミットだけを本番ビルド・公開する。初期状態では Preview branch builds を無効にする。
- Node.js の版はリポジトリ直下の [`.node-version`](../.node-version) だけで管理する。Cloudflare ダッシュボードの `NODE_VERSION` は**設定しない**。
- Git 統合で作成した Pages プロジェクトは、後から Direct Upload 方式へ単純に切り替えられない。公開方式を変更する必要が生じた場合は、別の Pages プロジェクト作成を含めて別途検討する。

## 2. 公開前の確認

1. `master` に公開対象の変更が含まれていることを確認する。
2. `.node-version` が保守中の Node 22 系の具体的パッチ版であることを確認する。
3. ローカルで次を実行し、成功することを確認する。

   ```powershell
   npm run build
   npx vitest run
   ```

4. `package-lock.json` を削除・更新漏れなくコミット対象に含める。Cloudflare Pages はこの lockfile に基づいて依存関係を解決する。

## 3. Cloudflare と GitHub を接続する

1. Cloudflare ダッシュボードで **Workers & Pages** を開く。
2. **Create application** から **Pages**、続けて GitHub 連携による作成を選ぶ。
3. Cloudflare から GitHub へのアクセスを許可し、リポジトリ **`syadool/geosaka`** を選ぶ。
4. プロジェクト名を入力する。この名前が既定 URL `https://<project>.pages.dev` の `<project>` になる。

## 4. ビルド設定

作成画面では次を設定・確認する。画面表示が更新されている場合も、値そのものを優先する。

| 項目 | 設定値 |
|---|---|
| Production branch | `master` |
| Framework preset | Vite または Custom |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 未指定（リポジトリルート） |
| Node.js | `.node-version` の `22.16.0` を使用 |
| 環境変数 | 設定しない。特に `NODE_VERSION` は追加しない。 |

`NODE_VERSION` を設定すると `.node-version` と二重管理になり、ビルド環境の不一致を招く。そのため Node.js の情報源は `.node-version` のみとする。

`_redirects`、`_headers`、`functions/`、`wrangler.toml` は今回追加しない。本アプリは URL パスを持つクライアントルーティングを使用せず、サーバー処理も不要である。

## 5. Preview branch builds を明示的に無効化する

Git 連携の Pages プロジェクトでは、production branch 以外がプレビューとしてビルドされる設定になり得る。既定値に任せず、初回作成時または作成直後に次を確認する。

1. プロジェクトの **Settings** を開き、**Builds & deployments**（または Preview の設定画面）へ進む。
2. **Preview branch builds** を **Disabled / 無効** に設定する。
3. 保存後、`master` 以外のブランチが対象に含まれていないことを再確認する。

PR ごとのプレビューが必要になった場合だけ、この設定を有効化する。プレビュー用のビルドも無料枠の **500 ビルド／月**に算入されるため、必要な期間・ブランチに限定して運用する。

## 6. 初回デプロイとビルドログの確認

設定を保存すると、Cloudflare Pages が `master` の最新コミットで初回ビルドを開始する。デプロイ詳細のログで、次を順に確認する。

1. `.node-version` に指定した Node.js `22.16.0` が選択されていること。
2. 依存関係のインストール段階で `package-lock.json` が認識・使用されていること。ログに lockfile を見つけられない旨や、lockfile と不整合である旨の警告・エラーがないことも確認する。
3. `npm run build` が実行され、`tsc -b` と `vite build --configLoader native` が成功していること。
4. `dist` が出力ディレクトリとして検出され、デプロイが Success になること。

成功すると `https://<project>.pages.dev` が発行される。カスタムドメインは本手順の対象外とする。

## 7. 公開後の動作確認

発行された `pages.dev` URL をシークレットウィンドウ等で開き、次を確認する。

- 写真が表示されること。
- 地図タイルが表示され、推測ピンを配置できること。
- 推測を確定して採点結果を表示できること。
- 5 ラウンドを最後まで完走し、最終結果を表示できること。
- 結果画面に写真の作者・ライセンス・出典が表示されること。
- 地図上に OpenStreetMap の attribution が常時表示されること。

写真と地図は利用者のブラウザから Wikimedia Commons と OpenStreetMap へ直接アクセスする。外部リソースの一時障害と Pages のデプロイ失敗を区別して確認する。

## 8. 更新と自動デプロイ確認

通常は `master` へ push すると Cloudflare Pages が自動で新しいデプロイを作成する。

自動デプロイ（AT-07）の確認には空コミットを使わない。手順書の誤字修正など、レビュー可能で安全な小変更を `master` にコミットして push し、次を確認する。

1. Cloudflare の Deployments に新しいビルドが作成される。
2. ビルドが成功する。
3. 本番 `pages.dev` URL に新しいデプロイが反映される。

## 9. 失敗時の確認と復旧

デプロイが失敗した場合は、Cloudflare の Deployments から対象デプロイのビルドログを開き、次の順に確認する。

1. `.node-version` の値と、ログ上で使用された Node.js の版が一致しているか。
2. `package-lock.json` が認識され、依存関係のインストールが成功しているか。
3. `npm run build`、特に TypeScript と Vite のエラーがないか。
4. 出力先が `dist` になっているか。

失敗したコミットは公開されず、直前の成功済みデプロイが引き続き配信される。原因を修正して `master` へ push し、再ビルドする。手動の Wrangler／Direct Upload で上書きしない。

既に公開済みの版へ戻す必要がある場合は、Cloudflare Pages のデプロイ履歴から直近の成功済みデプロイを再公開し、Git 側も必要に応じて revert して整合させる。
