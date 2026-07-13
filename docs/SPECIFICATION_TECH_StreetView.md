# 技術選定書: GeOsaka ストリートビュー機能

作成日: 2026-07-12 / 作成者: Fable（技術選定担当、sol との対話に基づく）

## 1. 論点

terra の基本設計（[SPECIFICATION_DESIGN_StreetView.md](SPECIFICATION_DESIGN_StreetView.md)）は Google Maps Embed API（`streetview` モード、iframe埋め込み）の採用を提案した。しかし GeOsaka の既存要件定義書（[SPECIFICATION_REQUIREMENTS_GeOsaka.md](SPECIFICATION_REQUIREMENTS_GeOsaka.md) 2節・4節・6節）は、Google Street View API を「APIキーと課金登録が必須のため」MVP で明示的に不採用としており、「APIキー・課金・サーバー不要」「クローン直後に install→dev で動く」ことを非機能要件・受け入れ基準としている。

sol との対話で確認した通り、Google Maps Embed API は**利用料自体は無料枠内で収まるが、有効な Google Cloud 請求先アカウント（クレジットカード登録）と API キーの発行が必須**である。これは金額の問題ではなく、「クローンした利用者が課金アカウント登録という導入障壁を強いられる」という、既存要件が明示的に排除した性質そのものである。sol も最終的にこの指摘に同意し、Embed API 採用の撤回を推奨した。

## 2. 比較

| 方式 | 課金/登録要否 | 大阪府内カバレッジ・品質 | 実装コスト | 判定 |
|---|---|---|---|---|
| Google Maps Embed API（iframe） | Google Cloud 請求先アカウント + APIキー必須（利用自体は無料枠） | 良好（Googleの実写ストリートビュー網羅率が高い） | 中（iframe状態管理、キー運用手順） | **不採用**。既存の「APIキー・課金・アカウント登録不要」原則と矛盾するため。 |
| Mapillary 等の無料トークン方式インタラクティブ埋め込み | 開発者登録・アクセストークン発行が必要（課金なし） | 地点によりカバレッジが薄い可能性、要調査 | 中〜高（SDK導入、トークン運用、カバレッジ欠如時のフォールバック設計） | **見送り**（将来検討）。トークン取得という登録行為自体は残るため、今回のMVPでは採用しない。将来的にアプリ内没入体験を強化したい場合の拡張候補として記録するに留める。 |
| Google Maps の外部リンク（`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=lat,lng`）を新規タブで開く | **一切不要**（APIキーなし、登録なし） | 良好（Google Maps 本体のカバレッジをそのまま利用） | 低（URL生成の純粋関数のみ、iframeのライフサイクル管理が不要） | **採用**。既存要件の「APIキー・課金・サーバー不要」「クローン直後に動く」を完全に満たす。 |

## 3. 結論

- **MVP はキー不要の外部リンク方式を採用する**。ラウンド結果画面に「Google マップでストリートビューを見る」ボタンを設置し、正解座標を Google Maps の Street View 起動 URL に埋め込んで新規タブで開く。
- アプリ内埋め込み（iframe/SDK）による没入体験は得られないが、これは要件定義書が最初から明示していたトレードオフ（写真パネル方式・APIキー不要の地図ライブラリのみを使う設計思想）と一貫している。
- **APIキーを用いた高度な埋め込み体験（Google Maps Embed API や Mapillary SDK）は将来の拡張候補として記録するが、今回は実装しない。** ユーザーが課金アカウント登録・トークン発行のコストを許容する意思決定を明示的に行った場合にのみ、再度検討する（完了報告でユーザーに選択肢として提示する）。
- 座標検証・URL生成ロジック（`buildStreetViewExternalUrl` 相当）は terra の詳細設計 3.2 節の外部リンク仕様をそのまま活用できるため、設計変更コストは小さい。

## 4. terra への修正依頼（Phase 4 で反映）

1. `StreetViewPanel` から Google Maps Embed API の iframe 埋め込み・`apiKey` プロパティ・`loading`/`ready`/`unconfigured`/`failed`/`unavailable` の複雑な状態機械を削除する。
2. 状態は「未展開」→「外部リンクを開く」のシンプルな構成に単純化する（コンポーネント自体を button + リンク要素程度に縮小してもよい）。
3. `.env.example` / `VITE_GOOGLE_MAPS_EMBED_API_KEY` 関連の記述を削除する。
4. `buildStreetViewExternalUrl` のみを採用し、`buildStreetViewEmbedUrl` は削除する。
5. テスト方針も、iframeのロード/タイムアウト/エラーのテストを削除し、URL生成の単体テストとボタン押下でのリンク生成確認に簡素化する。
