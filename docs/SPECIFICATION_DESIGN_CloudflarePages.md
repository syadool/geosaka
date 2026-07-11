# 基本設計・詳細設計書: GeOsaka の Cloudflare Pages 公開

作成日: 2026-07-11  
作成者: terra（設計担当）  
対象要件: `docs/SPECIFICATION_REQUIREMENTS_CloudflarePages.md`  
対象リポジトリ: `syadool/geosaka`（ブランチ: `master`）

## 1. 設計の結論

GeOsaka は Cloudflare Pages の **GitHub 連携による静的サイト配信**として公開する。`master` へ push されたコミットを Cloudflare Pages が検知し、依存関係をインストール後に `npm run build` を実行し、生成された `dist/` を `https://<project>.pages.dev` で配信する。

ゲーム本体はブラウザだけで完結する React + Vite アプリケーションであり、サーバー処理、Cloudflare Pages Functions、環境変数、API キー、独自 CI は使用しない。写真は Wikimedia Commons、地図タイルは OpenStreetMap から、公開済みブラウザが直接取得する。

```text
開発者
  │ git push origin master
  ▼
GitHub: syadool/geosaka / master
  │ GitHub 連携の webhook
  ▼
Cloudflare Pages（無料枠）
  │ 保守中の Node 22 系（.node-version に固定した具体的パッチ版）
  │ npm install（lockfile に従う）
  │ npm run build
  ▼
dist/（HTML / JS / CSS）
  │ CDN 配信
  ▼
https://<project>.pages.dev
  ├── Wikimedia Commons（写真をブラウザが取得）
  └── OpenStreetMap（地図タイルをブラウザが取得）
```

## 2. 基本設計

### 2.1 配信方式

| 項目 | 確定内容 | 根拠 |
|---|---|---|
| ホスティング | Cloudflare Pages 無料枠 | 静的成果物のみで動作し、無料枠の静的アセット配信で充足する。 |
| リポジトリ連携 | GitHub App 経由で `syadool/geosaka` を接続 | `master` への push を自動デプロイのトリガーとする。 |
| 本番ブランチ | `master` | 要件で決定済み。 |
| ビルドコマンド | `npm run build` | `tsc -b && vite build --configLoader native` を実行し、型検査を含める。 |
| 出力ディレクトリ | `dist` | Vite の既定出力先であり、現行ビルド成果物と一致する。 |
| ルートディレクトリ | `/`（リポジトリルート） | `package.json`、lockfile、`vite.config.mjs` がリポジトリ直下にある。 |
| デプロイ単位 | 1 Git commit = 1 Pages デプロイ | Pages のビルド履歴と GitHub の変更履歴を対応付け、ロールバック可能にする。 |

Cloudflare ダッシュボード上のアカウント操作および GitHub 接続は利用者が実施する。リポジトリ側では、その操作で再現可能な Node 固定ファイルと手順書を管理する。

### 2.2 実行責務の境界

| 実行場所 | 責務 | 保持する情報 |
|---|---|---|
| GitHub | ソース・lockfile・デプロイ設定を管理し、push を通知する | リポジトリ内容 |
| Cloudflare Pages ビルド環境 | 依存関係の取得、型検査、Vite ビルド、静的ファイルの CDN 配置 | ビルドログ、`dist/` |
| Cloudflare CDN | ビルド済み HTML / JS / CSS を HTTPS 配信する | 静的アセットのキャッシュ |
| 利用者のブラウザ | ゲーム状態・採点、画像と地図タイルの取得・表示 | 一時的なゲーム状態 |
| Wikimedia Commons / OpenStreetMap | 外部写真・地図タイルを提供する | 本プロジェクトの秘密情報は保持しない |

Cloudflare Pages にゲームデータや利用者情報を保存しない。したがって Pages の環境変数・Secrets・KV・D1・Functions は本公開の設計対象外とする。

### 2.3 外部リソースとクレジット

- 写真 URL はクライアントが Wikimedia Commons から直接取得する。画像の作者、ライセンス、出典 URL は既存の `src/data/spots.ts` に保持し、ゲームの結果画面で表示する。
- 地図は Leaflet を介して OpenStreetMap 標準タイルを直接取得し、attribution を常時表示する。
- Pages は画像・タイルのプロキシやキャッシュ制御を行わない。外部サービスの利用規約・利用上限は各提供者の方針に従う。
- `README.md` の写真・地図のクレジット方針は公開後も維持する。今回のデプロイ設定ではゲームコード・クレジット表示を変更しない。

## 3. 詳細設計

### 3.1 リポジトリに追加する成果物

| パス | 種別 | 内容 | 状態 |
|---|---|---|---|
| `.node-version` | Node バージョン指定 | 実装時点で Cloudflare v3 ビルド環境が利用可能な、保守中の Node 22 系の具体的パッチ版を 1 行で格納する。目安は Cloudflare 既定の 22.16.0 以降とする。 | 確定 |
| `docs/DEPLOY_CloudflarePages.md` | 利用者向け手順書 | Cloudflare ダッシュボードでの GitHub 接続、ビルド設定、公開確認、更新・失敗時確認、および Git 統合から Direct Upload へ単純に切り替えられない制約を記載する。 | 確定 |
| `docs/SPECIFICATION_DESIGN_CloudflarePages.md` | 設計書 | 本書。 | 確定 |

`.node-version` は、Vite 8 の必要条件（Node 20.19 以上または 22.12 以上）を満たすだけでなく、実装時点で Cloudflare v3 ビルド環境が利用可能な**保守中の Node 22 系の具体的パッチ版**に固定する。Vite の動作下限となるパッチ版は採用値にしない。採用候補は Cloudflare 既定の 22.16.0 以降を目安とし、実装時に Cloudflare の対応状況を確認して決定する。これにより、メジャー番号だけの曖昧な解決や Pages の既定バージョン変更によるビルド差異を防ぐ。セキュリティ上の更新が必要になった場合は、対応する Node 22 LTS の具体的パッチ版へ上げ、ローカルと Pages の両方で再検証して更新する。

`package-lock.json` は既存のままリポジトリに含める。依存関係は lockfile に従って解決し、ビルド再現性を保つ。`node_modules/` および `dist/` は成果物としてコミットしない。

### 3.2 Cloudflare ダッシュボード設定値

初回作成時、Cloudflare Pages の Git 連携画面で次を指定する。プロジェクト名は Pages URL のサブドメインになるため、既存の利用状況に応じて利用者が決める。

| 画面上の項目 | 設定値 | 備考 |
|---|---|---|
| Git プロバイダー | GitHub | Cloudflare アカウントに GitHub を連携する。 |
| リポジトリ | `syadool/geosaka` | 対象リポジトリ。 |
| プロダクション ブランチ | `master` | このブランチへの push を本番公開する。 |
| フレームワーク プリセット | Vite を選択、または Custom | 表示名に依存せず、下記のコマンドと出力先を優先して確認する。 |
| ビルドコマンド | `npm run build` | TypeScript のビルドチェックと Vite ビルドを実行する。 |
| ビルド出力ディレクトリ | `dist` | リポジトリルートからの相対パス。 |
| ルートディレクトリ | 未指定（リポジトリルート） | サブディレクトリを設定しない。 |
| Node.js バージョン | `.node-version` に固定した保守中の Node 22 系の具体的パッチ版を使用 | ダッシュボードの `NODE_VERSION` は設定しない。`.node-version` のみを正とし、二重管理をしない。 |
| Preview branch builds | 無効 | 初期値は `master` のみをビルドする。 |
| 環境変数 | 設定しない | `NODE_VERSION` を含め、ビルド・実行とも秘密情報や環境依存値を設定しない。 |

初回デプロイが成功すると、`https://<project>.pages.dev` が発行される。カスタムドメインはスコープ外とし、既定の `pages.dev` URL を公開 URL とする。

### 3.3 ビルド・デプロイ処理

```text
1. 開発者が master に変更を push
2. GitHub 連携により Cloudflare Pages が新規ビルドを起動
3. Pages が .node-version を読み、固定された保守中の Node 22 系の具体的パッチ版でビルド環境を用意
4. package-lock.json に基づいて npm 依存をインストール
5. npm run build を実行
   5-1. tsc -b による TypeScript プロジェクトビルド
   5-2. vite build --configLoader native による静的アセット生成
6. dist/ を公開対象として検出・配信
7. 成功したデプロイを production URL へ反映
8. 失敗時は直前の成功済みデプロイを公開したまま、ビルドログを確認
```

`npm run build` が非ゼロ終了した場合、当該コミットは公開しない。利用者は Cloudflare のデプロイ詳細からログを確認し、原因を修正したコミットを `master` へ push して再デプロイする。手動の wrangler アップロードは行わない。

### 3.4 ルーティング、Headers、Functions の扱い

| 対象 | 設計判断 | 根拠 |
|---|---|---|
| `_redirects` | 追加しない | 現行アプリは URL パスを持つクライアントルーティングを実装しておらず、`index.html` の単一画面だけを配信する。SPA fallback は不要。 |
| `_headers` | 追加しない | 特別な応答ヘッダーは機能要件にない。安易な CSP 追加は Wikimedia / OSM の外部取得を妨げるリスクがあるため、必要性が確認されるまで導入しない。 |
| `functions/` | 作成しない | API、認証、秘密情報、サーバー側処理が存在しない。 |
| `wrangler.toml` / `wrangler.jsonc` | 作成しない | GitHub 連携の Pages ビルドを採用し、Wrangler 直接アップロードは採用しない。 |

将来、React Router 等で `/foo` のような直接アクセス可能な画面を追加した場合は、その時点で `/* /index.html 200` の SPA fallback を `_redirects` に追加する。本公開では先行して追加しない。

### 3.5 運用・更新設計

- 通常更新: `master` にマージ／push すると Pages が自動でビルド・公開する。
- プレビューブランチ: 初期値は Preview branch builds を無効とし、`master` 以外のブランチ／PR では Pages ビルドを実行しない。PR プレビューが必要になった場合のみ設定を有効化し、プレビューのビルドも無料枠の 500 ビルド／月に算入されることを承知して運用する。
- 公開確認: デプロイ完了後、発行された `pages.dev` URL を開き、写真表示、地図タイル表示、推測、採点、結果画面までを確認する。
- 失敗時: Cloudflare のビルドログで Node バージョン、依存関係インストール、`npm run build` の順に確認する。修正前の成功済みデプロイを維持し、手動アップロードで上書きしない。
- ロールバック: Cloudflare Pages のデプロイ履歴から直近の成功済みデプロイを再公開する。Git 側も必要に応じて原因コミットを revert し、`master` の状態を整合させる。
- 利用量監視: 無料枠のビルド回数は月 500 回を上限として確認する。静的アセットの配信量は本アプリの数百 KB 規模の `dist/` に対して問題にならない前提だが、外部写真・地図タイルの利用量は別サービスの方針に従う。

## 4. 非機能要件への対応

| 要件 | 設計上の対応 | 確認方法 |
|---|---|---|
| NFR-1: 無料枠内の運用 | Pages の GitHub 連携・静的配信のみを使用し、Functions 等の追加課金対象を持ち込まない。 | デプロイ設定と Pages の利用状況を確認する。 |
| NFR-2: 既存挙動を変更しない | 追加対象は Node 固定ファイルとドキュメントのみ。ゲームの TypeScript / CSS / データには変更を加えない。 | 差分確認、`npm run build`、`npx vitest run`。 |
| NFR-3: クレジットを維持 | 既存の `README.md` と結果画面の設計を変更せず、公開後の実画面で確認する。 | 写真クレジットと OSM attribution を確認する。 |

## 5. 実装順序と検証設計

### 5.1 実装順序

1. `.node-version` を追加し、実装時点で Cloudflare v3 ビルド環境が利用可能な保守中の Node 22 系の具体的パッチ版を記載する。
2. `docs/DEPLOY_CloudflarePages.md` を作成し、ダッシュボード設定値、公開確認手順、および Git 統合で作成した Pages プロジェクトは後から Direct Upload 方式へ単純に切り替えられない制約を記載する。
3. `.node-version` と同一版の Node で `npm run build` を実行し、`dist/` が生成されることを確認する。ローカルで同一版を用意できない場合は、Node 24 でのローカルビルド成功と、Pages 上の指定版での初回ビルド成功を代替証跡とする。
4. `npx vitest run` を実行し、既存テストが全件通ることを確認する。
5. 変更をレビュー後にコミットし、利用者が `master` へ push する。
6. 利用者が Cloudflare ダッシュボードで GitHub 連携を設定し、初回ビルドと本番 URL を確認する。

### 5.2 受け入れテスト

| ID | 観点 | 手順 | 合格条件 |
|---|---|---|---|
| AT-01 | Node 固定 | `.node-version` を確認する。 | Cloudflare v3 ビルド環境で利用可能な保守中の Node 22 系の具体的パッチ版のみが記載され、Vite 8 の Node 要件を満たす。 |
| AT-02 | ローカルビルド | 原則、`.node-version` と同一版で `npm run build` を実行する。ローカルで同一版を用意できない場合は、Node 24 でのローカルビルドと Pages 上の指定版での初回ビルドを実行する。 | 原則の確認では正常終了して `dist/index.html` とアセットが生成される。代替確認では Node 24 のローカルビルドと Pages 上の指定版での初回ビルドがともに成功する。 |
| AT-03 | 回帰 | `npx vitest run` を実行する。 | 全テストが成功する。 |
| AT-04 | Pages ビルド | ダッシュボード設定後、`master` のコミットで Pages ビルドを起動する。 | `npm run build` が成功し、出力ディレクトリ `dist` が公開される。 |
| AT-05 | 公開動作 | `https://<project>.pages.dev` でゲームを開始し、写真・地図・採点を確認する。 | 5 ラウンドの開始・推測・採点・結果表示を完走できる。 |
| AT-06 | 外部クレジット | 公開画面の結果表示と地図を確認する。 | 写真クレジットと OSM attribution が確認できる。 |
| AT-07 | 自動デプロイ | 小さな変更を `master` へ push する。 | 新しい Pages デプロイが自動作成され、成功後に本番へ反映される。 |

## 6. 未決事項・将来拡張

| 項目 | 状態 | 対応方針 |
|---|---|---|
| Pages プロジェクト名 | 要決定 | 利用者がダッシュボードで決める。URL は `https://<project>.pages.dev` となる。 |
| プレビュー環境の運用 | 確定 | 初期値は Preview branch builds を無効とし、`master` のみビルドする。PR プレビューが必要になった時点で有効化し、500 ビルド／月への算入を考慮して運用する。 |
| カスタムドメイン | スコープ外 | `pages.dev` URL での公開後、必要性が生じた時点で別途設計する。 |
| セキュリティヘッダー | 要検証 | 外部画像・地図に必要な接続先を整理した上で、CSP 等を別変更として導入する。 |
| Node 22 のパッチ更新 | 運用時確認 | Cloudflare 対応状況と Vite の要件を確認し、必要時に `.node-version` を更新して検証する。 |

## 7. 要件トレーサビリティ

| 要件 | 設計対応 |
|---|---|
| FR-1 | GitHub の `master` を本番ブランチとし、Pages のビルドコマンドを `npm run build`、出力を `dist` に固定する（2.1、3.2、3.3）。 |
| FR-2 | 静的配信のみとし、写真・地図はブラウザが外部サービスへ直接アクセスする。Functions、環境変数、API キーを不要とする（1、2.2、2.3）。 |
| FR-3 | `.node-version` に Cloudflare v3 ビルド環境で利用可能な保守中の Node 22 系の具体的パッチ版を指定し、SPA fallback やヘッダー設定が不要な理由を明記する（3.1、3.4）。 |
| FR-4 | `docs/DEPLOY_CloudflarePages.md` を成果物とし、ダッシュボードの入力値、公開確認、および Git 統合から Direct Upload へ単純に切り替えられない制約を記載する（3.1、3.2、5.1）。 |
| NFR-1 | 無料枠の静的配信に限定し、ビルド回数を運用上の確認項目とする（3.5、4）。 |
| NFR-2 | ゲームコードを変更せず、ビルドと既存テストで回帰を確認する（4、5.2）。 |
| NFR-3 | 既存の README とゲーム画面のクレジット方針を維持し、公開後に確認する（2.3、5.2）。 |
