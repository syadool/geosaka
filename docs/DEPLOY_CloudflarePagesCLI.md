# Cloudflare Pages 公開手順（Wrangler Direct Upload）

対象リポジトリ: `syadool/geosaka`
対象ブランチ: `master`
公開方式: Cloudflare Pages Direct Upload

## 1. この手順の前提

- 現行の公開経路は、ローカルで生成した `dist/` を Wrangler で Cloudflare Pages へアップロードする Direct Upload である。
- Cloudflare 側ではソースコードのビルドを行わない。テストと Vite ビルドはローカルで実行する。
- `package.json` の `predeploy` が `npm test && npm run build` を実行し、成功した場合だけ `deploy` がアップロードを行う。
- Wrangler は `devDependencies` の 4.110.0 を使用する。`npx` による暗黙の最新版取得は行わない。
- `wrangler.jsonc` は使用しない。Workers Static Assets の `assets.directory` 設定と Pages Direct Upload を混在させない。
- Pages プロジェクト名の初期実装値は `geosaka` とする。プロジェクト一覧で衝突が確認された場合は、未使用の名前へ変更し、`package.json` の `deploy` を更新する。
- GitHub 連携による自動デプロイは行わない。既存 Git 連携プロジェクトの方式が確認できない場合は、別名で Direct Upload プロジェクトを作成する。

Direct Upload で作成した Pages プロジェクトと Git 連携プロジェクトは、後から相互に単純切り替えできない。公開方式を変更する場合は、新しい Pages プロジェクトを別途作成する。

## 2. 必要な環境

- Node.js: `.node-version` の `22.16.0`
- npm
- Cloudflare アカウント
- Cloudflare Pages のプロジェクト作成・デプロイ権限

Node.js と依存関係を確認する。

~~~powershell
node --version
npm --version
npm install
npm exec -- wrangler --version
~~~

`npm exec -- wrangler --version` が `4.110.0` になることを確認する。

## 3. 初回認証とプロジェクト作成

### 3.1 Wrangler の認証

初回だけ、リポジトリルートで実行する。

~~~powershell
npm exec -- wrangler login
~~~

ブラウザで Cloudflare の認証を承認する。API トークンを `package.json`、`.env`、Markdown、ログ、Git 履歴へ保存しない。

### 3.2 既存プロジェクトの確認

プロジェクト名を決める前に、一覧を確認する。

~~~powershell
npm exec -- wrangler pages project list --json
~~~

`geosaka` が未使用なら、次のコマンドで Direct Upload プロジェクトを作成する。

~~~powershell
npm exec -- wrangler pages project create geosaka --production-branch master
~~~

同名プロジェクトがある場合は、既存プロジェクトが Direct Upload であることを確認できない限り再利用しない。別名を選んだ場合は、次の `package.json` の値を同じ名前へ変更する。

~~~json
"deploy": "wrangler pages deploy ./dist --project-name=<PROJECT_NAME>"
~~~

プロジェクト名の衝突によって URL にランダム文字列が付く場合があるため、`<PROJECT_NAME>.pages.dev` は期待形として扱う。実際の公開 URL はデプロイ成功ログの出力を正とする。

## 4. 初回デプロイ

公開前に、現在の作業ツリーの内容を確認する。

~~~powershell
git status --short
git rev-parse HEAD
~~~

通常の初回公開は次の一コマンドで行う。

~~~powershell
npm run deploy
~~~

`npm run deploy` は次の順に動作する。

1. `predeploy` が `npm test` を実行する。
2. テスト成功後、`npm run build` が `dist/` を生成する。
3. build 成功後、`wrangler pages deploy ./dist --project-name=geosaka` が実行される。
4. Wrangler の成功ログに表示された公開 URL を記録する。

個別の証跡を取得してからデプロイする場合は、次も実行できる。ただし `npm run deploy` の `predeploy` によりテストと build は再実行される。

~~~powershell
npm test
npm run build
npm run deploy
~~~

## 5. 公開確認

### 5.1 CLI・HTTP 確認

デプロイ成功ログの URL を `$publicUrl` に設定する。プロジェクト名から URL を推測して置き換えない。

~~~powershell
npm exec -- wrangler pages project list --json
npm exec -- wrangler pages deployment list
$publicUrl = "<DEPLOY_OUTPUT_URL>"
Invoke-WebRequest -Uri $publicUrl -UseBasicParsing
~~~

対象プロジェクトのデプロイが成功し、`$publicUrl` が HTTP 成功応答を返し、`index.html` が配信されれば CLI・HTTP 確認は合格とする。

### 5.2 ブラウザ確認

デプロイ成功ログから取得した実 URL をシークレットウィンドウ等で開き、次を確認する。

- タイトル画面からゲームを開始できる。
- 写真が表示される。
- OpenStreetMap の地図タイルと attribution が表示される。
- 地図上に推測地点を置き、推測を確定できる。
- 採点、距離、正解地点、写真クレジットが表示される。
- StreetView リンクが結果画面に表示され、新しいタブで開く。
- 5 ラウンドを完走し、最終結果画面を表示できる。

写真・地図・StreetView の失敗は、Pages のデプロイ失敗と分けて確認する。写真は Wikimedia Commons、地図は OpenStreetMap、StreetView は Google Maps の外部リンクである。

## 6. 再デプロイ

ソース変更後は、次の一コマンドだけを使用する。

~~~powershell
npm run deploy
~~~

テストまたは build が失敗した場合、アップロードは実行されない。原因を修正してから再実行する。

Direct Upload は GitHub の push を自動デプロイのトリガーにしない。公開版を識別するため、デプロイ日時、Wrangler のログ、ローカルのコミットハッシュを記録する。

## 7. Preview デプロイ

Preview を作成する場合は、本番用 `npm run deploy` の対象を変更せず、明示的な branch を指定する。

~~~powershell
npm test
npm run build
npm exec -- wrangler pages deploy ./dist --project-name=geosaka --branch=preview
~~~

Preview URL は本番 URL と区別する。公開受け入れテストは、production のデプロイ成功ログに出力された URL に対して行う。

## 8. 失敗時の確認

| 失敗箇所 | 確認・対応 |
|---|---|
| `npm test` | テスト失敗の原因を修正する。`npm test` は `vitest run --configLoader native` を実行する。 |
| `npm run build` | TypeScript、Vite、依存関係、`dist/index.html` の生成を確認する。 |
| `wrangler login` | ブラウザ認証、Cloudflare アカウント、権限を確認する。トークンはソースに書かない。 |
| プロジェクト作成 | 同名衝突と既存プロジェクトの公開方式を確認し、方式が不明なら別名を使う。 |
| `pages deploy` | `dist/index.html`、プロジェクト名、認証、ネットワーク、ファイル数・サイズを確認する。 |
| 公開後の画面 | デプロイ成功と Wikimedia・OSM・Google Maps の外部リソース応答を分離して確認する。 |

既に公開済みの版へ戻す場合は、正常なソース状態で `npm run deploy` を再実行する。原因変更を残したまま上書きしない。

## 9. Free plan とアップロード制限

公開前に Cloudflare Pages の最新制限を確認する。2026-07-13 時点では、Free plan の Pages には月 500 回のビルド／デプロイ枠、サイト内 20,000 ファイル、単一アセット 25 MiB の制限がある。Direct Upload の詳細は公式ドキュメントを優先する。

- `dist/` に不要なログ、ソースマップ、ローカル一時ファイルを含めない。
- 写真と地図タイルは `dist/` に同梱せず、既存の外部 URL を使用する。
- Functions、API キー、Secrets、環境変数は使用しない。

参照: [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)

