# 基本設計・詳細設計書: GeOsaka ストリートビュー機能

作成日: 2026-07-12  
更新日: 2026-07-12  
作成者: terra（ソフトウェア設計担当）  
対象: GeOsaka（React 18 + Vite + TypeScript の静的サイト）  
対応要件: [SPECIFICATION_REQUIREMENTS_StreetView.md](SPECIFICATION_REQUIREMENTS_StreetView.md)  
技術選定: [SPECIFICATION_TECH_StreetView.md](SPECIFICATION_TECH_StreetView.md)

## 1. 設計結論

ストリートビューは、**ラウンド結果画面でのみ**正解地点の周辺を確認する補助機能として提供する。画面内への iframe / SDK 埋め込みは行わず、キー不要の Google Maps Street View URL を**新規タブ**で開くリンク方式を採用する。

これにより、既存の「APIキー・課金・アカウント登録・サーバー不要」「クローン直後に動作」の原則を守る。推測フェーズ、ゲーム状態、出題データ、採点ロジックには変更を加えない。

外部リンク URL は Google Maps URLs の Street View 起動形式を使う。`api=1`、`map_action=pano`、`viewpoint={lat},{lng}` を指定する。Google Maps URLs は API キーを必要とせず、モバイルではアプリ、その他ではブラウザで表示できる。[公式ドキュメント](https://developers.google.com/maps/documentation/urls/get-started)

### 1.1 技術選定の反映

| 方式 | 判定 | 理由 |
|---|---|---|
| Google Maps Embed API iframe | **不採用** | Google Cloud の請求先アカウント登録と API キーが必要となり、既存要件に反する。 |
| Maps JavaScript API / Street View Static API | 不採用 | API キーと請求先登録を必要とする。 |
| Mapillary 等のトークン方式 | 見送り | 開発者登録・トークン発行が必要で、MVP の導入障壁を増やす。 |
| Google Maps Street View 外部リンク | **採用** | API キー、登録、課金、追加依存が不要。Google Maps 本体の Street View を直接利用できる。 |

### 1.2 確定事項・未決事項

| 区分 | 内容 |
|---|---|
| 確定 | `RoundResultScreen` の正解情報ブロック付近に「Google マップでストリートビューを見る」リンクを置く。 |
| 確定 | リンクは `target="_blank" rel="noopener noreferrer"` で開く。アプリ内に iframe、ローディング、タイムアウト処理を持ち込まない。 |
| 確定 | 正解座標は既存 `RoundResult.answer` を使う。`SceneProvider`、`Scene`、`RoundResult`、reducer の型・遷移は変えない。 |
| 確定 | 座標が不正ならリンクを生成せず、「ストリートビューのリンクを作成できません」を表示する。ゲームの進行には影響させない。 |
| 候補 | `fov=90`、`pitch=0` を URL に指定する。`heading` のスポット別最適化は MVP の対象外。 |
| 要検証 | 実装後、少なくとも都市部・公園・山間部の3地点で、Google Maps が近傍パノラマへ適切に遷移すること。 |

## 2. 基本設計

### 2.1 配置と画面遷移

`RoundResultScreen` の既存 `reveal` ブロック直後、次ラウンドボタンの前に `StreetViewLink` を配置する。正解の名称・解説が表示済みの結果画面だけに存在するため、推測中の手がかりにはならない。

```text
[ROUND]
  写真 + 推測地図 + 確定
  ※ StreetViewLink は描画しない

     確定
       ↓
[ROUND_RESULT]
  スコア / 距離 / 結果地図 / 正解の名称・解説・クレジット
  └─「Google マップでストリートビューを見る」
       └─ 別タブまたは端末の Google Maps アプリで周辺パノラマを表示
```

このリンクはブラウザ標準の新規タブ遷移を使う。React の `useState`、`useEffect`、reducer アクションは不要であり、ラウンド遷移時の状態リセットも発生しない。

### 2.2 コンポーネント責務と依存方向

```text
RoundResultScreen
  ├─ ResultMap                     既存: 推測と正解の地図
  └─ StreetViewLink                追加: 正解座標への外部リンク表示
       └─ streetViewUrl.ts         追加: URL生成・座標検証の純粋関数
            └─ RoundResult.answer 既存の座標
```

| ファイル | 変更 | 責務 |
|---|---|---|
| `src/components/RoundResultScreen.tsx` | 修正 | `StreetViewLink` を結果情報の後に配置し、`result.answer` とスポット名を渡す。 |
| `src/components/StreetViewLink.tsx` | 追加 | URL が有効な場合は外部リンク、無効な場合は非操作の案内を表示する。 |
| `src/utils/streetViewUrl.ts` | 追加 | 座標検証と Google Maps Street View URL の生成だけを行う。React・環境変数・外部通信に依存しない。 |
| `tests/streetViewUrl.test.ts` | 追加 | URL の座標、必須パラメータ、不正座標時の `null` を検証する。 |
| `tests/StreetViewLink.test.tsx` | 追加 | 有効座標では安全な新規タブリンク、不正座標では案内が表示されることを検証する。 |

**追加しないもの:** `.env.example`、`VITE_GOOGLE_MAPS_EMBED_API_KEY`、Vite 環境変数型、Google SDK、iframe、Cloudflare Pages のキー設定、課金・キー監視手順。

### 2.3 UI・アクセシビリティ設計

有効な URL を生成できる場合は次のリンクを表示する。

```tsx
<a
  className="street-view-link"
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={`${placeName} 周辺のストリートビューを Google マップで開く`}
>
  Google マップでストリートビューを見る <span aria-hidden="true">↗</span>
</a>
```

- 視覚ラベルは「Google マップでストリートビューを見る」とし、別タブで開くことを矢印と補足文で示す。
- `aria-label` にスポット名と遷移先を含め、リンク単体でも目的を理解できるようにする。
- `rel="noopener noreferrer"` を必須とし、遷移先から `window.opener` を参照できないようにする。
- `street-view-link` は既存の `primary-button` と調和するネオンオレンジの外観にするが、`<a>` の意味論を保つ。キーボードフォーカスを明瞭に表示し、タップ目標は 44px 以上とする。
- 375px 幅では横幅 100% の1行ボタンとして、次ラウンドボタンの直前に表示する。

不正座標の場合はリンクを表示せず、`role="status"` の簡潔な案内を表示する。正解地点データは起動時検証済みであるため通常は到達しない防御的な分岐であり、詳細な座標値や内部エラーを利用者に見せない。

## 3. 詳細設計

### 3.1 Props

```ts
type StreetViewLinkProps = {
  coordinate: Coordinate;
  placeName: string;
};
```

`RoundResultScreen` は既存の正解座標をそのまま渡す。

```tsx
<StreetViewLink
  coordinate={result.answer}
  placeName={result.scene.reveal.nameJa}
/>
```

### 3.2 URL 生成

URL 生成は `URL` と `URLSearchParams` で行い、文字列連結・手動エンコードは行わない。座標は `Number.isFinite` と緯度 `-90..90`、経度 `-180..180` を検証し、不正なら `null` を返す。

```ts
export function buildStreetViewExternalUrl(
  coordinate: Coordinate,
): string | null;
```

| 要素 | 値 |
|---|---|
| ベース URL | `https://www.google.com/maps/@` |
| 必須パラメータ | `api=1`, `map_action=pano`, `viewpoint={lat},{lng}` |
| 任意パラメータ | `fov=90`, `pitch=0` |

`viewpoint` には正解座標を渡す。Google Maps は指定地点の最寄りパノラマを表示するため、正確な地点に撮影画像がない場合は近傍の街路画像が開くことがある。この挙動は「正解地点付近の実写・周辺風景を確認する」という機能目的に沿う。

### 3.3 処理フローと異常系

```text
RoundResultScreen を表示
  ↓
StreetViewLink が result.answer を検証
  ├─ 有効 → Maps URL を生成し、安全な外部リンクを表示
  └─ 無効 → 操作不可の案内を表示

利用者がリンクをクリック
  ↓
Google Maps を別タブまたは対応アプリで開く
```

- アプリはリンク先のネットワーク状態、Street View の撮影有無、Google Maps 側の表示失敗を監視・制御しない。
- それらの失敗は外部サービス側で扱われ、GeOsaka の結果画面・得点・次ラウンド操作は常に継続できる。
- 新規タブがポップアップ設定で阻害された場合でも、リンクは通常の利用者クリックで開くため、ブラウザのポップアップブロック対象にしない。
- URL・スポット名は JSX の `href` / テキストとして渡し、HTML 文字列の組み立てや `window.open` の直接呼び出しはしない。

## 4. テスト・受け入れ設計

### 4.1 自動テスト

| 対象 | 観点 |
|---|---|
| `streetViewUrl.test.ts` | 有効座標で `api=1`、`map_action=pano`、`viewpoint`、`fov`、`pitch` を含む URL が生成される。範囲外・非有限値は `null`。 |
| `StreetViewLink.test.tsx` | 有効座標でリンクが表示され、`href`、`target="_blank"`、`rel="noopener noreferrer"`、アクセシブルな名称を持つ。不正座標でリンクが出ない。 |
| `RoundResultScreen` 統合テスト | `StreetViewLink` に正解座標が渡ること、`RoundScreen` にリンクが出ないことを確認する。 |
| 回帰 | `npm run test` と `npm run build` を環境変数なしで実行する。 |

外部 Google Maps には自動テストで通信しない。手動確認では、都市部・公園・山間部の3スポットをリンクで開き、Google Maps が起動し、Street View または同サービスの画像なし案内が表示されることを確認する。

### 4.2 受け入れ基準への対応

| 要件受け入れ基準 | 設計上の担保 |
|---|---|
| 結果画面のリンクから正解座標付近の Google Maps Street View を開ける | 結果画面限定の安全な外部リンクを提供する。画像有無の判定は Google Maps 側に委ねる。 |
| 座標が不正でもリンク生成できない場合、結果画面はクラッシュせず通常表示を維持する | 不正座標時はリンクを表示せず案内のみとし、他の表示・操作に影響させない。 |
| APIキー・環境変数なしでアプリが動く | API キー、環境変数、外部 SDK を一切使用しない。 |
| 既存テストが通る | reducer・SceneProvider・RoundScreen を変更せず、純粋関数と小さな表示コンポーネントを追加する。 |
| 推測フェーズが変わらない | `RoundScreen`、ゲーム遷移、採点ロジックは変更対象外。 |

## 5. 実装順序

1. `streetViewUrl.ts` と URL 生成の単体テストを追加する。
2. `StreetViewLink.tsx` と表示・安全属性のテストを追加する。
3. `RoundResultScreen.tsx` と `index.css` に最小限の統合変更を加える。
4. 環境変数を設定せずに `npm run test` と `npm run build` を実行する。
5. 3地点で外部リンクの手動確認を行う。

## 6. 変更対象外

- `src/components/RoundScreen.tsx`、`PhotoViewer.tsx`、`GuessMap.tsx` の推測時 UI
- `src/game/gameReducer.ts` とゲーム phase 遷移
- `src/game/types.ts` の `Scene` / `RoundResult` 定義
- `src/scene/StaticPhotoSceneProvider.ts` と `src/data/spots.ts`
- API キー、課金アカウント、iframe / SDK 埋め込み、360度ビューアの独自実装、パノラマ ID の保存
