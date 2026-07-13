# 基本設計・詳細設計書: GeOsaka の Cloudflare Pages CLI 公開（Direct Upload）

作成日: 2026-07-13
対象要件: [SPECIFICATION_REQUIREMENTS_CloudflarePagesCLI.md](SPECIFICATION_REQUIREMENTS_CloudflarePagesCLI.md)
対象リポジトリ: syadool/geosaka
対象ブランチ: master
設計状態: 確定。ただし Pages プロジェクト名は公開前に決定する。

## 1. 設計の結論

GeOsaka は、ローカルで Vite の静的成果物を生成し、Wrangler の
Cloudflare Pages Direct Upload で dist/ を本番公開する。

採用する CLI は既存リポジトリをデプロイするための Wrangler とする。
C3 は新規プロジェクトの雛形生成を主目的とするため、既存の GeOsaka の
ソース・テスト・ビルド設定を維持する今回の方式には採用しない。

公開方式の要点は次のとおりである。

| 項目 | 設計内容 |
|---|---|
| 公開方式 | Cloudflare Pages Direct Upload |
| プロジェクト作成 | wrangler pages project create |
| アセット公開 | wrangler pages deploy ./dist --project-name=<PROJECT_NAME> |
| 公開前ゲート | predeploy: npm test && npm run build |
| ローカルビルド | npm run build |
| 再デプロイ | npm run deploy |
| 公開 URL | deploy コマンド成功ログに出力された実 URL（期待形: https://<PROJECT_NAME>.pages.dev） |
| 本番ブランチの記録 | Pages プロジェクト作成時に master を指定 |
| サーバー処理 | 使用しない。Pages Functions、Workers、API は作成しない |
| 認証 | 初回だけ wrangler login を実行し、ブラウザで Cloudflare の認証を承認する |
| 秘密情報 | リポジトリ、ビルド成果物、ブラウザには保存しない |

GitHub 連携による自動ビルドは本設計の公開経路ではない。Cloudflare Pages は
Git 連携で作成したプロジェクトを Direct Upload へ、Direct Upload で作成した
プロジェクトを Git 連携へ、後から相互に切り替えられないため、既存の Git 連携
プロジェクトと同名のプロジェクトを不用意に再利用しない。既存プロジェクトを
再利用するのは、それが Direct Upload プロジェクトであることを確認できる場合
に限る。方式が不明な場合は別のプロジェクト名を選ぶ。

## 2. 前提とスコープ

### 2.1 現状

- React 18、Vite 8、TypeScript の静的 Web アプリである。
- npm run build は tsc -b && vite build --configLoader native を実行し、
  リポジトリ直下の dist/ を生成する。
- アプリのゲーム状態・採点・写真データはブラウザ内で完結する。
- 写真は Wikimedia Commons、地図タイルは OpenStreetMap からブラウザが
  直接取得する。
- StreetView は API 埋め込みではなく、正解地点への Google Maps 外部リンク
  である。API キー、課金設定、サーバー側プロキシは使用しない。
- .node-version には 22.16.0 が存在するため、今回新たに Node 版指定を
  作らず、現在の指定を維持する。
- リポジトリ直下の wrangler.jsonc は現在 Workers 静的アセット形式の
  未コミット設定であり、Pages Direct Upload の採用後は残さない。

### 2.2 スコープ内

- Wrangler の導入・バージョン固定。
- Pages Direct Upload プロジェクトの CLI 作成。
- dist/ の本番アップロード。
- package.json の deploy スクリプト追加。
- 初回認証、初回公開、再デプロイ、公開確認の手順書作成。
- 既存の GitHub 連携手順書を削除せず、旧方式であることを明示する注記の追加。

### 2.3 スコープ外

- Cloudflare アカウントの作成。
- wrangler login のブラウザ承認そのもの。
- カスタムドメイン。
- GitHub 連携による自動デプロイの構築・撤去。
- Pages Functions、Workers、KV、D1、R2、Secrets。
- Google Maps API の導入。
- ゲーム本体、写真データ、採点ロジック、画面デザインの変更。

## 3. 基本設計

### 3.1 公開アーキテクチャ

~~~text
開発者の PowerShell
  │
  └─ npm run deploy
       ├─ predeploy: npm test && npm run build
       │    ├─ Vitest 全テスト
       │    └─ TypeScript 型検査 + Vite build
       │         └─ dist/
       └─ wrangler pages deploy ./dist --project-name=<PROJECT_NAME>
           │
           └─ Cloudflare Pages Direct Upload
                    │
                    └─ deploy 成功ログの実 URL
                              │
                              ├─ Wikimedia Commons（写真）
                              ├─ OpenStreetMap（地図タイル）
                              └─ Google Maps（StreetView 外部リンク）
~~~

Cloudflare 側でソースリポジトリをビルドしない。ビルドは開発者の
ローカル環境で完了させ、Cloudflare へは dist/ の静的ファイルだけを
アップロードする。したがって Direct Upload のデプロイが成功したことと、
外部写真・地図サービスが一時的に応答することは別々に確認する。

### 3.2 実行責務

| 実行場所 | 責務 | 保持・送信するもの |
|---|---|---|
| ローカル開発環境 | テスト、型検査、Vite ビルド、Wrangler アップロード | ソース、dist/、Wrangler のユーザー認証 |
| Cloudflare Pages | 静的ファイルの保存と CDN 配信 | dist/ の HTML、JavaScript、CSS、画像等 |
| 利用者のブラウザ | ゲーム状態、採点、地図・写真の取得 | 一時的なゲーム状態。秘密情報は持たない |
| Wikimedia Commons | 写真の配信 | 写真とライセンス情報 |
| OpenStreetMap | 地図タイルの配信 | 地図タイル |
| Google Maps | StreetView 外部ページの表示 | リンク先ページ。GeOsaka から API 呼び出しはしない |

### 3.3 CLI と設定の方針

Direct Upload は、ビルド済みディレクトリをコマンドに渡して公開できる。
今回のサイトは Pages Functions や pages dev 用のバインディングを持たない
ため、Pages 用 Wrangler 設定ファイルは必須ではない。

そのため、現在の wrangler.jsonc は次の理由で削除対象とする。

1. 現在の assets.directory は Workers Static Assets の設定であり、
   Pages Direct Upload の公開方式と異なる。
2. 設定を残すと、wrangler deploy と wrangler pages deploy の経路を
   誤認しやすい。
3. 公開ディレクトリとプロジェクト名をデプロイコマンドに明示すれば、
   Direct Upload の必要条件を満たせる。

将来 Pages Functions や pages dev が必要になった場合は、その時点で
pages_build_output_dir: "./dist" を持つ Pages 用設定を別途設計する。
Workers 用の assets.directory を流用しない。

### 3.4 ビルド・公開の固定値

| 項目 | 固定値・方針 | 備考 |
|---|---|---|
| 作業ディレクトリ | リポジトリルート | package.json と dist/ の基準位置 |
| Node.js | .node-version の 22.16.0 | Vite 8 の要件を満たす現在の指定を維持 |
| Wrangler | 4.110.0 を devDependencies に固定 | npm スクリプトではローカル固定版の `wrangler` を使用し、npx による暗黙取得を行わない |
| ビルドコマンド | npm run build | 型検査を含む既存コマンドを変更しない |
| テスト標準経路 | npm test | `vitest run --configLoader native` を実行し、Windows の設定ロード時の `spawn EPERM` を回避する |
| 出力ディレクトリ | ./dist | Vite の既定出力先 |
| 本番プロジェクト | 実装時に決定する <PROJECT_NAME> | 小文字・英数字・ハイフンで構成し、URL と一致させる |
| 本番デプロイ | `wrangler pages deploy ./dist --project-name=<PROJECT_NAME>` | `npm run deploy` の `predeploy` 成功後に実行し、対象を明示する |
| Preview デプロイ | 必要時のみ --branch=<BRANCH_NAME> | 通常の npm run deploy では使用しない |
| 環境変数 | 不要 | API キー、Cloudflare Secrets、VITE_* は設定しない |
| Pages Functions | 作成しない | 静的サイトのみ |
| _redirects | 作成しない | 現在は単一ページで URL ルーティングを持たない |
| _headers | 作成しない | 外部写真・地図取得を妨げる CSP を先行導入しない |

### 3.5 プロジェクトのライフサイクル

1. wrangler login で Cloudflare アカウントを認証する。
2. pages project list --json でプロジェクト名の衝突を確認する。
3. Direct Upload 用の新規プロジェクトを pages project create で作成し、
   production branch に master を指定する。
4. npm run deploy で `predeploy`（テストとビルド）を通過させ、本番アップロードを行う。
5. 以降の変更では、同じ npm run deploy を実行する。npm のライフサイクルにより、
   毎回 `predeploy` が先に実行される。

Direct Upload は GitHub の push をトリガーにしない。master はプロジェクト
作成時に記録する本番ブランチ名であり、Git 連携の自動ビルド設定ではない。
本番公開は --branch を付けないデプロイとし、Preview を作る場合だけ
明示的な --branch を付ける。

## 4. 詳細設計

### 4.1 リポジトリ変更対象

| パス | 変更 | 詳細 |
|---|---|---|
| package.json | 変更 | wrangler を devDependencies に 4.110.0 で追加し、`predeploy` と `deploy` の2スクリプトを追加する |
| package-lock.json | 更新 | Wrangler 追加結果を lockfile に反映する |
| wrangler.jsonc | 削除 | Workers Static Assets 用の暫定設定を公開経路から除外する |
| .node-version | 維持 | 22.16.0 をそのまま使用する |
| docs/DEPLOY_CloudflarePagesCLI.md | 追加 | CLI 認証、プロジェクト作成、初回公開、確認、再デプロイを記録する |
| docs/DEPLOY_CloudflarePages.md | 冒頭注記を追加 | 旧 GitHub 連携方式を削除せず、現行方式が CLI であることと新手順へのリンクを示す |
| src/、tests/ | 変更しない | 公開方式の変更でゲーム挙動を変更しない |

package.json の実装後のスクリプトは次の形とする。<PROJECT_NAME> は
公開前に実際に確保した Pages プロジェクト名へ置換し、プレースホルダーを
コミットしない。

~~~json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build --configLoader native",
    "test": "vitest run --configLoader native",
    "predeploy": "npm test && npm run build",
    "deploy": "wrangler pages deploy ./dist --project-name=<PROJECT_NAME>"
  },
  "devDependencies": {
    "wrangler": "4.110.0"
  }
}
~~~

`npm run deploy` は npm のライフサイクルにより先に `predeploy` を実行する。
`predeploy` が `npm test` または `npm run build` のいずれかで失敗した場合は、
後続の `wrangler pages deploy` を実行しない。したがって、再デプロイもテスト・
ビルド・アップロードを一コマンドで実行できる。

### 4.2 初回セットアップ手順

以下はリポジトリルートで実行する。<PROJECT_NAME> は事前に決定した
一意の Pages プロジェクト名に置換する。

~~~powershell
npm install
npm exec -- wrangler --version
npm exec -- wrangler login
npm exec -- wrangler pages project list --json
npm exec -- wrangler pages project create <PROJECT_NAME> --production-branch master
~~~

設計上の確認事項は次のとおりである。

- wrangler --version が固定した 4.110.0 であることを確認する。
- wrangler login は Cloudflare のブラウザ認証を開始する。認証情報や
  API トークンをソースファイルへ記録しない。
- 同名プロジェクトが存在する場合、既存プロジェクトが Direct Upload で
  作成されたと確認できない限り再利用せず、別名を選ぶ。
- pages project create はプロジェクトと本番ブランチを Cloudflare に登録
  する。ダッシュボードでのプロジェクト作成は行わない。

### 4.3 初回公開と再デプロイ

初回公開前に、現在の作業ツリーに公開してよい変更だけが含まれることを
確認する。要件では StreetView 機能を含む現在の作業ツリーを公開対象とする。

~~~powershell
# 公開前の個別証跡を取得する場合
npm test
npm run build

# predeploy が npm test と npm run build を再実行してから公開する
npm run deploy
~~~

このリポジトリのテスト標準経路は `npm test` とする。`npm test` は
`vitest run --configLoader native` を実行し、Windows で Vite の設定ファイルを
読み込む際のプロセス生成問題を避ける。要件上の「全テスト成功」はこの標準経路
で確認し、`spawn EPERM` などテストランナー起動前の環境エラーとテストケースの
失敗は別の事象として記録する。

初回公開だけ、npm run deploy の代わりに次の直接コマンドを使ってもよい。
これは実際のプロジェクト名と送信先を確認するための切り分け用である。

~~~powershell
npm exec -- wrangler pages deploy ./dist --project-name=<PROJECT_NAME>
~~~

通常の更新では、次の一コマンドを使用する。

~~~powershell
npm run deploy
~~~

Preview を一時的に作成する場合は、本番スクリプトを変更せず、別コマンド
として実行する。

~~~powershell
npm run build
npm exec -- wrangler pages deploy ./dist --project-name=<PROJECT_NAME> --branch=preview
~~~

Preview URL は本番 URL と区別し、Preview を本番と誤認して受け入れテストを
完了扱いにしない。

### 4.4 公開確認

デプロイコマンドの成功ログ、成功ログから取得した公開 URL、ブラウザ上の
ゲーム動作を別々に記録する。`<PROJECT_NAME>.pages.dev` は期待形に過ぎず、
プロジェクト名の衝突等で URL にランダム文字列が付く場合があるため、公開 URL の
正は `wrangler pages deploy` の成功ログに出力された実 URL とする。

#### CLI・HTTP 確認

~~~powershell
npm exec -- wrangler pages project list --json
npm exec -- wrangler pages deployment list
$publicUrl = "<DEPLOY_OUTPUT_URL>" # deploy 成功ログに出力された URL
Invoke-WebRequest -Uri $publicUrl -UseBasicParsing
~~~

合格条件は、対象プロジェクトのデプロイが成功状態であり、公開 URL への
HTTP 応答が成功し、index.html が配信されることである。

#### ブラウザ確認

deploy 成功ログから取得した実 URL をシークレットウィンドウ等で開き、次を
順番に確認する。

1. タイトル画面からゲームを開始できる。
2. 写真が表示される。失敗時は Pages のデプロイ失敗と外部写真サービスの
   応答失敗を開発者ツールで区別する。
3. OpenStreetMap の地図タイルと attribution が表示される。
4. 地図上に推測地点を置き、推測を確定できる。
5. 採点、距離、正解地点、写真クレジットがラウンド結果に表示される。
6. StreetView リンクが結果画面にだけ表示され、新しいタブで開く。
7. 5 ラウンドを完走し、最終結果画面を表示できる。

### 4.5 失敗時の扱い

| 失敗箇所 | 判定・対応 |
|---|---|
| npm run build | 公開を中止する。TypeScript、Vite、依存関係を修正してから再実行する |
| npm test | 公開を中止する。既存テストを変更せず、失敗原因を調査する |
| wrangler login | ブラウザ認証と対象 Cloudflare アカウントを確認する。トークンをソースに書かない |
| プロジェクト作成 | 同名衝突、権限、アカウントを確認し、既存 Git 連携プロジェクトを Direct Upload として扱わない |
| pages deploy | dist/index.html の有無、プロジェクト名、認証、ネットワーク、ファイル数・サイズを確認する |
| 公開後の画面 | デプロイ成功と外部 Wikimedia・OSM・Google Maps の応答を分離して確認する |
| 直前版への復旧 | 正常なソース状態で npm run deploy を実行する。predeploy を通過した成果物だけを公開し、原因変更を残したまま上書きしない |

Direct Upload では GitHub のコミットから自動的に再ビルドされないため、
公開版の識別にはデプロイ日時、Wrangler のログ、ローカルのコミットハッシュ
を記録する。デプロイ前の git status と git rev-parse HEAD を手順書の
確認項目に含める。

### 4.6 無料枠・アップロード制限

本アプリは静的アセットだけを配信し、Pages Functions を使わない。したがって
Functions の実行回数を発生させない。

2026-07-13 時点の Cloudflare Pages 公式ドキュメントでは、Free plan の
ビルド／デプロイ枠は月 500 回、サイト内ファイル数は 20,000 個、単一アセット
の上限は 25 MiB とされている。Direct Upload の Wrangler 経由でも、公開前に
アカウント側の最新の利用量・制限を確認し、次を運用上の検査対象とする。

- 月間の Direct Upload デプロイ回数とアカウント側の利用上限。
- `dist/` のファイル数が 20,000 個以下であること。
- 単一アセットが 25 MiB 以下であること。
- `dist/` に不要なログ、ソースマップ、ローカル一時ファイルが混入していないこと。

本アプリは Functions を使用しないため、静的アセット配信のために Pages
Functions の実行枠を消費しない。制限値は変更され得るため、手順書では固定値を
永続的な契約として扱わず、公開前に [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)
と [Direct Upload の制限](https://developers.cloudflare.com/pages/get-started/direct-upload/)
を再確認する。

現在の設計では写真を dist/ に同梱せず、Wikimedia Commons から取得する。
地図タイルも同梱しないため、静的成果物が不要に大きくなる要因を持ち込まない。

### 4.7 セキュリティ・認証

- 初回のローカル公開は wrangler login を使用する。
- Cloudflare API トークンを package.json、.env、Markdown、ログ、Git
  履歴へ保存しない。
- CLOUDFLARE_API_TOKEN や CLOUDFLARE_ACCOUNT_ID を使う CI 公開は今回の
  スコープ外とする。将来 CI 化する場合は、最小権限トークン、秘密情報の
  保管場所、ローテーションを別途設計する。
- dist/ に認証情報やローカル設定を生成する処理は追加しない。
- 外部写真・OSM・StreetView は既存の公開 URL を使用し、Pages 側のプロキシや
  秘密情報によるアクセス制御を追加しない。

## 5. 受け入れテスト設計

| ID | 対応要件 | 手順 | 合格条件・証跡 |
|---|---|---|---|
| AT-01 | NFR-2 | wrangler.jsonc の状態と Git 差分を確認する | Workers Static Assets 用の設定が公開経路に残っておらず、アプリコードに変更がない |
| AT-02 | NFR-3 | npm run build を実行する | 終了コード 0、dist/index.html とアセットが生成される |
| AT-03 | NFR-3 | `npm test` を実行する | `vitest run --configLoader native` で全テストが成功する |
| AT-04 | FR-1 | wrangler login 後に pages project create と pages deploy を実行する | CLI のみで Pages プロジェクト作成と dist/ 公開が成功する |
| AT-05 | FR-2 | deploy 成功ログに出力された実 URL をブラウザで操作する | 写真、地図、採点、StreetView リンク、5 ラウンド完走を確認できる |
| AT-06 | FR-3 | wrangler.jsonc の削除とデプロイコマンドを確認する | Pages Direct Upload と Workers Static Assets の設定が混在していない |
| AT-07 | FR-4 | 公開済みのソースに変更を加え、npm run deploy を実行する | build から Direct Upload まで一コマンドで成功する |
| AT-08 | NFR-1 | dist/ のファイル数・最大ファイルサイズと Pages 利用量を確認する | Free plan の現行上限を超えず、不要な再デプロイを行っていない |
| AT-09 | NFR-2 | 公開前後にゲームの既存テストと主要操作を比較する | 公開方式変更による既存ゲーム挙動の回帰がない |

## 6. 利用者向け手順書の設計

実装時に docs/DEPLOY_CloudflarePagesCLI.md を追加し、次の章構成にする。

1. この手順の前提と公開方式。
2. 必要な Node.js、npm、Wrangler の確認。
3. wrangler login と認証確認。
4. プロジェクト名の衝突確認。
5. pages project create <PROJECT_NAME> --production-branch master。
6. npm test（必要に応じて npm run build の個別証跡も取得）。
7. npm run deploy（predeploy が npm test と npm run build を再実行）。
8. CLI、HTTP、ブラウザによる公開確認。
9. Preview デプロイの方法。
10. 再デプロイ、失敗時確認、既知の制限。
11. API トークンを保存しないための注意。

既存の docs/DEPLOY_CloudflarePages.md は削除しない。冒頭に、次の意味の
注記を追加する。

> 現行の公開方式は Wrangler による Cloudflare Pages Direct Upload です。
> 本書は過去の GitHub 連携方式の記録であり、新規公開・再デプロイには
> [DEPLOY_CloudflarePagesCLI.md](DEPLOY_CloudflarePagesCLI.md) を使用してください。

これにより過去の設定履歴を保持しつつ、利用者が旧方式を現行手順と誤認する
ことを防ぐ。

## 7. 要件トレーサビリティ

| 要件 | 設計対応 |
|---|---|
| FR-1 | Wrangler の pages project create と pages deploy を使い、ダッシュボードでのプロジェクト作成を行わない（1、3.5、4.2、4.3） |
| FR-2 | 静的 CDN 配信とブラウザからの Wikimedia・OSM・Google Maps 外部リンクを採用し、写真、地図、採点、StreetView、5 ラウンドを公開確認する（3.1、4.4、AT-05） |
| FR-3 | Workers 形式の wrangler.jsonc を削除し、dist と Pages プロジェクト名を Direct Upload コマンドに明示する（3.3、4.1、AT-01、AT-06） |
| FR-4 | package.json に `predeploy: npm test && npm run build` と `deploy: wrangler pages deploy ...` を定義し、再デプロイを一コマンド化する（3.4、4.1、4.3、AT-07） |
| FR-5 | CLI 手順書を追加し、既存 GitHub 連携手順書は削除せず現行方式の注記を追加する（4.1、6） |
| NFR-1 | Functions を使わず、Direct Upload の現行利用上限・ファイル数・サイズを公開前に確認する（2.3、4.6、AT-08） |
| NFR-2 | src/ と tests/ を変更対象外とし、Wrangler 設定と npm スクリプトだけを公開方式変更の中心にする（2.2、4.1、AT-09） |
| NFR-3 | `predeploy` の `npm test && npm run build` を公開前ゲートとする（4.3、5、AT-02、AT-03） |
| AC-1 | AT-02、AT-03 |
| AC-2 | AT-04 |
| AC-3 | AT-05 |
| AC-4 | AT-07 |

## 8. 未決事項

| 項目 | 状態 | 決定方法 |
|---|---|---|
| Pages プロジェクト名 | 要決定 | pages project list --json で衝突を確認し、未使用の <PROJECT_NAME> を決める |
| 既存同名プロジェクトの方式 | 要確認 | Git 連携か Direct Upload か不明なら再利用せず、別名で Direct Upload プロジェクトを作成する |
| 公開 URL | 初回 deploy 実行時に確定 | `wrangler pages deploy` 成功ログの実出力を正とし、`https://<PROJECT_NAME>.pages.dev` は期待形として扱う |
| 本番公開の実施者 | 利用者 | Cloudflare アカウントのブラウザ認証と実デプロイを実施する |
| 無料枠の現行数値 | 実行時確認 | Cloudflare Pages 公式 Limits と Direct Upload の制限を公開前に再確認する |
| CI への拡張 | スコープ外 | API トークン管理を含む別設計として起票する |

## 9. 参考資料

- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare Pages の Wrangler コマンド](https://developers.cloudflare.com/workers/wrangler/commands/pages/)
- [Cloudflare Pages の Wrangler 設定](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages の Direct Upload と CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare Pages の Free plan 制限](https://developers.cloudflare.com/pages/platform/limits/)
- [既存の Cloudflare Pages 要件定義](SPECIFICATION_REQUIREMENTS_CloudflarePages.md)
- [既存の Cloudflare Pages GitHub 連携設計](SPECIFICATION_DESIGN_CloudflarePages.md)
