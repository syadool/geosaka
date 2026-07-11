# 技術選定書: GeOsaka の Cloudflare Pages（無料枠）公開

作成日: 2026-07-11 / 作成: Fable（sol との対話による合意、dev-pipeline Phase 3）

## 1. 結論サマリ

| 論点 | 決定 |
|---|---|
| デプロイ方式 | Cloudflare Pages 無料枠 + GitHub 連携（ユーザー決定済み） |
| Node バージョン固定 | `.node-version` に**保守中の Node 22 系の具体的パッチ版**を記載（実装時点で Cloudflare v3 ビルド環境で利用可能な版を選定）。ダッシュボードの `NODE_VERSION` 環境変数は設定せず、リポジトリの `.node-version` のみを正とする |
| プレビューブランチビルド | **初期値は無効**（`master` のみビルド）。PR プレビューが必要になったら有効化し、無料枠 500 ビルド/月への算入を承知の上で運用 |
| wrangler.toml | 追加しない（GitHub 連携では不要。direct upload 併用予定なし） |
| ビルドコマンド | 現行 `npm run build`（`tsc -b && vite build --configLoader native`）をそのまま使用 |
| `_redirects` / `_headers` | 追加しない（下記の根拠） |

## 2. 判断理由

### Node バージョン（案A: 具体的パッチ版を採用）

- Cloudflare Pages v3 ビルド環境は `.node-version` を正式サポート。公式ドキュメントの例はフルバージョン表記であり、メジャーのみ（`22`）の解決は公式に保証された契約ではないため、再現性の観点から具体的パッチ版に固定する。
- Vite 8 の要件は Node 20.19+ / 22.12+。22.12.0 は「動く下限」であって推奨運用版ではないため、保守中のより新しい 22 系パッチ版を選ぶ。
- `.node-version` とダッシュボード `NODE_VERSION` の二重管理は事故のもとなので、リポジトリ側のみを正とする。
- **AC-1 の検証方法（合意による要件更新）**: `.node-version` と同一版でのローカル build 確認を原則とし、困難な場合（ローカルは Node v24.14.1）は「Node 24 でのローカル build 成功 + Pages 上の指定版での初回ビルド成功」を代替証跡とする。

### プレビューブランチ（初期無効を採用）

- Pages の Git 連携は既定で production 以外のブランチもプレビューデプロイ対象になる。要件は「master への push による公開」のみなので、無料枠のビルド回数（500/月）を守るためにも Preview branch builds は無効で開始する。

### 不採用案

- **wrangler direct upload**: ユーザーが GitHub 連携を選択。なお Git 統合で作成した Pages プロジェクトは後から direct upload 方式へ単純に切り替えられない点を手順書に明記する。
- **`.node-version` にメジャーのみ（`22`）**: 公式保証がなく再現性を損なうため不採用。
- **`NODE_VERSION` 環境変数 / package.json engines**: 二重管理・情報源分散を避けるため不採用。
- **`_redirects`**: SPA ルーティングを持たない単一ページのため不要。
- **`_headers`（CSP 等）**: 初回公開スコープ外。導入するなら Wikimedia Commons・OSM タイルの接続先を整理した別変更として行う。
- **Workers Static Assets への移行**: 今回の規模と決定済み要件を覆す利点なし。将来 API・認証・D1 が必要になった時点で再検討。

## 3. 実装への注意点（sol 指摘）

- Git 統合 → Direct Upload の切り替え不可の制約を手順書へ明記すること。
- 公開後の実機確認（写真・地図・5ラウンド完走・クレジット表示）は必須。
