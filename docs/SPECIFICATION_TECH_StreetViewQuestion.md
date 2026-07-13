# 技術選定書: GeOsaka ランダム地点ストリートビュー出題

作成日: 2026-07-13 / 作成者: Fable（技術選定担当、sol との対話に基づく）
対応要件: [SPECIFICATION_REQUIREMENTS_StreetViewQuestion.md](SPECIFICATION_REQUIREMENTS_StreetViewQuestion.md)
対象設計書: [SPECIFICATION_DESIGN_StreetViewQuestion.md](SPECIFICATION_DESIGN_StreetViewQuestion.md)（本書の結論により**要改訂**）

## 1. 結論サマリ

luna の初版設計（Maps Embed API iframe + Street View Metadata API の二重リクエスト構成）は**不採用**とし、以下に変更する。

| 項目 | 結論 |
|---|---|
| パノラマ表示 | **Maps JavaScript API の `StreetViewPanorama`** |
| 地点の実在確認 | **`StreetViewService.getPanorama`**（確認と表示を一体化、Metadata API 併用は不要） |
| 道路移動 | **許可する（ユーザー決定）**。ただし住所・道路名・地名表示はオフにする |
| 推測・結果地図（APIキー有効時） | **Google Maps（Maps JavaScript API）へ切替**（規約上の必須要件、下記 2.1） |
| 推測・結果地図（APIキー無し時） | 既存 Leaflet + OSM を維持（写真出題モード） |
| 地点生成 | 大阪府境の簡略化ポリゴン（国土数値情報 N03 由来）内での棄却サンプリング |
| 正解座標 | `getPanorama` が返す**実パノラマ座標**（生成した乱数座標ではない） |
| APIローダー | 公式 `@googlemaps/js-api-loader` + `@types/google.maps`（devDependency） |
| APIキー | `VITE_GOOGLE_MAPS_API_KEY`。HTTPリファラー制限 + API制限で保護。未設定時は写真出題へフォールバック |

## 2. 主要な判断と理由

### 2.1 Embed API iframe 不採用 → Maps JavaScript API 採用

- **規約（決定打）**: Google Maps Platform 利用規約 3.2.3(e) は、Street View 画像と非 Google 地図（Leaflet/OSM）を同一画面・同一アプリで併用することを禁止している。現行の RoundScreen はパノラマと OSM 推測地図を横並びにする構成のため、Embed/JS API のどちらを選んでも **APIキー有効時は GuessMap / ResultMap を Google Maps に切り替える必要がある**。Google 由来のパノラマ座標を OSM 地図上に描画することも避ける。
- **ネタバレ制御**: JS API は `addressControl: false`、`showRoadLabels: false` で住所・道路名を非表示にできる。Embed iframe にはこの制御がなく、地理当てゲームとして成立しない。道路移動を許可しても、これらのラベル制御は JS API でしか実現できない。
- **リクエスト構成**: `getPanorama`（radius 検索）で「実在確認＋パノラマ特定」が1回で済み、Metadata API の二重リクエスト・二重エラー処理が不要になる。
- **費用**: `StreetViewService` の検索は無料。パノラマ表示は月5,000ロード無料、地図表示は月10,000ロード無料。1ゲームあたり概ねパノラマ5〜8ロード＋地図10ロード程度であり、月約1,000ゲーム規模まで無料枠内。個人プロジェクトとして十分。

### 2.2 道路移動あり（ユーザー決定）

- ユーザー決定により、GeoGuessr 本来の「周囲を移動して手がかりを探す」体験を採用する。`clickToGo: true`、`linksControl: true`（移動矢印を表示）とする。
- ネタバレ防止のため `addressControl: false`、`showRoadLabels: false` は維持する。
- 採点の正解座標は**初期パノラマの座標で固定**する。移動しても正解は変わらない（移動は手がかり探索の手段であり、現在地が正解になるわけではない）。
- 移動による追加課金の有無（パノラマ遷移が新規ロードとして課金されるか）は、APIキー設定後の検証項目とする。

### 2.3 大阪府境ポリゴン（矩形判定から変更）

- 矩形バウンディングボックスは奈良・京都・兵庫の市街地を広く含み、「大阪府内のランダム地点」という要件の体験を損なうため、**簡略化ポリゴンによる判定に変更**する。
- データ出所: 国土数値情報「行政区域データ」(N03) から大阪府を抽出し、府単位に結合した MultiPolygon を誤差目標200m程度で簡略化して同梱する（gzip後50KB以下目標）。実行時の外部取得はしない。
- 出典表記: 「国土数値情報（行政区域データ）（国土交通省）を加工して作成」を README または結果画面近傍に明示する。
- **リリース前確認事項**: N03 の原典は国土地理院の測量成果であり、座標入り派生データの公開には申請が必要な場合がある。公開前に国土地理院の利用手続ナビで確認する（実装のブロッカーではなく公開ゲート）。
- 判定は二段構成: 乱数座標のポリゴン内判定（棄却サンプリング）→ `getPanorama` が返した実パノラマ座標も再度ポリゴン内判定。

### 2.4 探索パラメータ

```ts
{
  location: seed,
  radius: 500,          // 1000mは不採用。NEAREST の公式推奨範囲(≤1km)内で安全側
  preference: "nearest",
  sources: ["google", "outdoor"],  // 積集合: Google公式かつ屋外パノラマに限定
}
```

- 探索枠はシーンプール全体で共有し、要求シーン数 × 40 試行を上限とする。棄却が一時的に偏っても特定シーンだけで打ち切らず、radius は 500m のまま維持する。
- pano ID をセッション内で重複排除する。座標・pano ID は永続化しない。

### 2.5 実装上の注意（solの指摘）

- React StrictMode 下で `StreetViewPanorama` の二重生成を防ぐ（ref 管理、生成は1回だけ）。候補検索段階ではビューアを生成せず、表示中ラウンドのみ生成。シーン差し替えは同一インスタンスへの `setPano`/`setPosition` で行う。
- ローダーは `@googlemaps/js-api-loader` の `importLibrary("streetView")` / `importLibrary("maps")` を使い、Promise をモジュール単位で共有。`v: "quarterly"`、`language: "ja"`、`region: "JP"`。APIキー未設定時はローダーを一切呼ばない。
- APIキー有効時の実行時障害（REQUEST_DENIED等）は写真/OSM モードへ黙って切り替えず、エラー表示または再試行とする（設定不備を隠さない）。
- Maps JavaScript API の利用ポリシー上、公開サイトには利用規約・プライバシーポリシーの掲示が必要。公開前に簡易ページを追加する。

## 3. 不採用案の記録

| 案 | 不採用理由 |
|---|---|
| Maps Embed API iframe + Metadata API（luna初版） | 住所・道路名の非表示制御ができずネタバレを防げない。二重リクエスト構成が複雑。規約上どのみち推測地図のGoogle化が必要で、Embedの「無料・無制限」の利点だけでは JS API の制御性に勝らない |
| 矩形バウンディングボックス判定 | 隣接府県の市街地（Street View 濃密地帯）が高確率で混入し、「大阪府内」の体験を損なう。Street View 有無による自然絞り込みは府外排除の代替にならない |
| 手描き20〜60頂点ポリゴン | 境界の直線化で隣接府県混入が再発しやすい。N03由来の簡略化データの方が品質・出所とも明確 |
| Metadata API 単体（正解=乱数座標のまま） | 表示パノラマと採点正解がズレて公平性を欠く。実パノラマ座標を正解にする方式に変更 |
| Mapillary 等の代替サービス | カバレッジ・SDK成熟度の面でGoogleに劣り、トークン登録も結局必要。APIキー導入が許可された今回は比較優位なし |

## 4. luna への設計書改訂依頼（Phase 4 で反映）

1. Embed API iframe / `buildStreetViewEmbedUrl` / Metadata API クライアント（`metadataClient.ts`）を削除し、`StreetViewService.getPanorama` + `StreetViewPanorama` 構成に差し替える。
2. `StreetViewViewer` を iframe ではなく JS API のパノラマコンテナ（div + ref）として再設計。道路移動あり（`clickToGo: true`, `linksControl: true`）、`addressControl: false`, `showRoadLabels: false`, フルスクリーン等の不要コントロールはオフ。StrictMode 対応・単一インスタンス・`setPano` 差し替えを明記。
3. 地点生成を「矩形」から「N03由来簡略化ポリゴン + 棄却サンプリング + 実パノラマ座標の二段判定」に変更。ポリゴンデータの生成手順（前処理スクリプトまたは手順書）と出典表記を設計に含める。
4. 正解座標を `getPanorama` の実パノラマ座標に変更（`Scene.location` = 実パノラマ座標）。
5. **APIキー有効時は GuessMap / ResultMap を Google Maps 版（`GoogleGuessMap` / `GoogleResultMap`）に切り替える**設計を追加。Leaflet 版はAPIキー無し（写真）モード専用に残す。結果画面の `StreetViewLink`（Google Mapsへの外部リンク）は両モードで維持可。
6. `@googlemaps/js-api-loader` と `@types/google.maps` を依存に追加。ローダーモジュール（Promise共有）を設計に含める。
7. 探索パラメータ（radius 500m / nearest / google+outdoor / 要求シーン数 × 40 の共有探索枠 / pano ID重複排除）を反映。
8. テスト方針を更新: Google API はモジュール境界（ローダー・`getPanorama` ラッパー）でモックする。iframe 関連テストは削除。

## 5. 残リスク・公開前ゲート

- 国土数値情報派生ポリゴンの公開可否確認（国土地理院 利用手続ナビ）。
- Google由来座標のポリゴン内判定（point-in-polygon）への利用可否は規約解釈に幅があるため、懸念が残る場合はGoogleサポートに確認。
- 利用規約・プライバシーポリシーページの追加（Maps JS API ポリシー要件）。
- パノラマ遷移（道路移動）の課金カウント実測。
- リファラー制限がローカル開発（127.0.0.1）と `geosaka.pages.dev` の双方で機能することの確認。
