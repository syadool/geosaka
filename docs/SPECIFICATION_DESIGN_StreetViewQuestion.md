# 基本設計・詳細設計書: GeOsaka ランダム地点ストリートビュー出題

作成日: 2026-07-13  
作成者: luna（ソフトウェア設計担当）  
対象: GeOsaka（React 18 + Vite + TypeScript の静的サイト）  
対応要件: [SPECIFICATION_REQUIREMENTS_StreetViewQuestion.md](SPECIFICATION_REQUIREMENTS_StreetViewQuestion.md)  
技術選定: [SPECIFICATION_TECH_StreetViewQuestion.md](SPECIFICATION_TECH_StreetViewQuestion.md)

## 1. 設計方針

### 1.1 目的

既存の写真パネル方式に加えて、API キーが設定されたビルドでは、大阪府内のランダムな道路地点を Street View パノラマで出題する。

出題地点の探索、パノラマの表示、推測地図、結果地図は、API キー有効時には Google Maps JavaScript API に統一する。API キー未設定時は、既存の静的写真と Leaflet + OpenStreetMap の組み合わせをそのまま使用する。

この切替により、Google 由来のパノラマと非 Google 地図を同一ゲーム画面で混在させない。ゲームの採点、ラウンド数、推測操作、既存の写真方式は維持する。

### 1.2 確定事項

| 項目 | 設計 |
|---|---|
| パノラマ表示 | Maps JavaScript API の `StreetViewPanorama` |
| パノラマ検索 | `StreetViewService.getPanorama` |
| 道路移動 | 許可。`clickToGo: true`、`linksControl: true` |
| ネタバレ制御 | `addressControl: false`、`showRoadLabels: false` |
| API ローダー | `@googlemaps/js-api-loader`。`importLibrary("maps")` / `importLibrary("streetView")` の共有 Promise |
| API バージョン | `quarterly`。言語 `ja`、地域 `JP` |
| ランダム範囲 | 国土数値情報 N03 由来の大阪府簡略化 MultiPolygon 内 |
| パノラマ検索条件 | `radius: 500`、`preference: "nearest"`、`sources: ["google", "outdoor"]` |
| 正解座標 | `getPanorama` が返した実パノラマ座標 |
| 重複排除 | セッション内の pano ID で排除。座標・pano ID は永続化しない |
| API キー未設定 | 写真出題へフォールバック。Google API ローダーは呼ばない |
| API キー設定後の実行時障害 | 写真方式へ黙って切り替えず、再試行またはエラー表示 |

### 1.3 既存機能との関係

既存の結果画面の `StreetViewLink` は、API キーの有無にかかわらず正解地点付近を Google Maps で開くリンクとして維持する。ランダム地点の結果画面でも、`RoundResult.answer` に保存した実パノラマ座標を渡す。

既存の写真出題では、`StaticPhotoSceneProvider`、`PhotoViewer`、Leaflet の `GuessMap` / `ResultMap` を使用する。ランダム地点出題では、それぞれ Street View 用 Provider、ビューア、Google Maps 用地図コンポーネントへ切り替える。

## 2. 基本設計

### 2.1 システム構成

```text
App
  │ APIキー判定
  ├─ 未設定
  │    └─ StaticPhotoSceneProvider
  │         └─ spots.ts
  │              └─ PhotoViewer + Leaflet GuessMap / ResultMap
  │
  └─ 設定済み
       ├─ googleMapsLoader（共有 Promise）
       ├─ StreetViewSceneProvider
       │    ├─ OsakaBoundary（N03由来簡略化ポリゴン）
       │    ├─ 乱数地点生成
       │    └─ StreetViewService.getPanorama
       └─ StreetViewViewer + GoogleGuessMap / GoogleResultMap
```

### 2.2 ゲーム開始フロー

```text
[TITLE]
  │ ゲーム開始
  ▼
APIキー判定
  ├─ なし → StaticPhotoSceneProvider → 既存5件抽選 → [ROUND]
  │
  └─ あり → Google Maps API ロード
              ├─ maps / streetView を importLibrary
              ├─ StreetViewSceneProvider を初期化
              ├─ 8件（5ラウンド + 3予備）を生成
              └─ [ROUND]
```

ランダム方式では、タイトル画面に準備中状態を表示する。必要な Scene を揃えられない場合はゲームを開始せず、`fatalError` に遷移する。API キーが設定されている状態で初期化に失敗した場合、静的写真へ自動的に切り替えない。

### 2.3 ラウンドフロー

```text
[ROUND]
  ├─ StreetViewPanorama を表示
  │    ├─ 初期地点: Provider が取得した実パノラマ
  │    ├─ 道路移動: 許可
  │    └─ 住所・道路名: 非表示
  ├─ GoogleGuessMap で推測地点を選択
  ├─ 推測を確定
  │    └─ 実パノラマ座標との距離・スコアを計算
  └─ [ROUND_RESULT]

[ROUND_RESULT]
  ├─ GoogleResultMap で推測地点、正解地点、直線を表示
  ├─ 正解地点の一般説明を表示
  ├─ StreetViewLink を表示
  └─ 次ラウンド / 最終結果
```

道路移動中に表示される現在のパノラマは、ゲームの正解座標を変更しない。移動は周囲を調べるための手段であり、採点対象はラウンド開始時に確定した初期パノラマの座標である。

### 2.4 モジュール構成

| ファイル / モジュール | 区分 | 責務 |
|---|---|---|
| `src/config/maps.ts` | 追加 | API キー、モード判定、Google API 設定値 |
| `src/maps/googleMapsLoader.ts` | 追加 | Maps JavaScript API のロードと共有 Promise |
| `src/maps/googleStreetViewService.ts` | 追加 | `StreetViewService.getPanorama` の Promise ラッパー |
| `src/maps/googleMapTypes.ts` | 追加 | Google Maps API とアプリ内部型の境界 |
| `src/scene/StreetViewSceneProvider.ts` | 追加 | 座標生成、パノラマ検索、Scene 作成、重複排除 |
| `src/data/osakaBoundary.ts` | 追加 | N03 由来の簡略化 MultiPolygon の静的データ |
| `src/geo/pointInPolygon.ts` | 追加 | 緯度経度のポリゴン内判定 |
| `src/components/StreetViewViewer.tsx` | 追加 | `StreetViewPanorama` の生成・更新・破棄 |
| `src/components/GoogleGuessMap.tsx` | 追加 | Google Maps 上の推測地図と推測マーカー |
| `src/components/GoogleResultMap.tsx` | 追加 | Google Maps 上の結果マーカーと直線 |
| `src/components/RoundScreen.tsx` | 修正 | Scene 種別に応じたビューアと推測地図の切替 |
| `src/components/RoundResultScreen.tsx` | 修正 | Scene 種別に応じた結果地図、クレジット表示 |
| `src/App.tsx` | 修正 | API キー、Provider、地図モードの初期化 |
| `src/game/types.ts` | 修正 | 写真 / Street View Scene の判別可能な型 |
| `src/index.css` | 修正 | パノラマ・Google 地図コンテナとエラー表示 |
| `.env.example` | 追加 | API キー設定名の例 |
| `public/terms.html` | 追加 | Google Maps 利用規約等への案内 |
| `public/privacy.html` | 追加 | プライバシーポリシー |

### 2.5 依存関係

```text
runtime dependency
  @googlemaps/js-api-loader

development dependency
  @types/google.maps
```

Google API の型は `@types/google.maps` から取得する。Google API の実行時ロードは `@googlemaps/js-api-loader` に限定し、`<script>` タグを手動で追加しない。

## 3. データ設計

### 3.1 Scene 型

写真方式とランダム方式を同じゲーム Reducer で扱えるよう、表示情報を判別可能な union にする。

```ts
type SceneDisplay =
  | {
      kind: "photo";
      imageUrl: string;
      alt: string;
    }
  | {
      kind: "streetview";
      panoId: string;
      alt: string;
    };

type SceneReveal = {
  nameJa: string;
  descriptionJa: string;
  credit?: PhotoCredit;
};

type Scene = {
  id: string;
  location: Coordinate;
  display: SceneDisplay;
  reveal: SceneReveal;
  difficulty: Difficulty;
};
```

ランダム Scene の `location` は、`getPanorama` が返す `StreetViewPanoramaData.location.latLng` を `{ lat, lng }` に変換した実パノラマ座標とする。生成に使用した seed 座標ではない。

`display.panoId` は現在のゲームセッション中にパノラマを再表示するためにメモリ上で保持する。永続化、URL クエリへの保存、localStorage への保存は行わない。

### 3.2 ランダム Scene の値

```ts
const scene: Scene = {
  id: `streetview-${sequence}`,
  location: panoramaCoordinate,
  display: {
    kind: "streetview",
    panoId: panorama.pano,
    alt: "大阪府内の街並みを見回すストリートビュー",
  },
  reveal: {
    nameJa: "大阪府内のランダム地点",
    descriptionJa: "大阪府境内からランダムに選ばれた地点です。",
  },
  difficulty: "normal",
};
```

ランダム地点には写真クレジットがないため、`reveal.credit` は設定しない。結果画面では `credit` の有無を確認して表示を分岐する。

### 3.3 実行時ゲームデータ

```ts
type SceneSource = "photo" | "streetview";

type GameState = {
  phase: GamePhase;
  source: SceneSource;
  roundIndex: number;
  scenes: Scene[];
  candidatePool: Scene[];
  failedIds: string[];
  currentGuess: Coordinate | null;
  results: RoundResult[];
  error: string | null;
};
```

`RoundResult` の既存構造は維持する。

```ts
type RoundResult = {
  roundNumber: number;
  scene: Scene;
  guess: Coordinate;
  answer: Coordinate;
  distanceKm: number;
  score: number;
};
```

`CONFIRM` 時の `answer` は `scene.location` をコピーする。道路移動後のパノラマ座標やビューアの現在位置は `RoundResult` に反映しない。

## 4. Google Maps API ローダー設計

### 4.1 設定値

```ts
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || null;

const GOOGLE_MAPS_OPTIONS = {
  version: "quarterly",
  language: "ja",
  region: "JP",
} as const;
```

API キーが空文字、空白のみ、未定義の場合は `source = "photo"` とし、Google API ローダーを一切呼ばない。

追加する Vite 型定義:

```ts
interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 4.2 共有 Promise

```ts
type GoogleMapsLibraries = {
  maps: typeof google.maps;
  streetView: typeof google.maps;
};

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsLibraries>;
```

実装方針:

1. API キーを検証する。
2. モジュールスコープの `loaderPromise` があれば再利用する。
3. なければ `setOptions({ apiKey, ...GOOGLE_MAPS_OPTIONS })` を1回だけ行う。
4. `importLibrary("maps")` と `importLibrary("streetView")` を同じ Promise にまとめる。
5. 解決したライブラリを `App`、Scene Provider、Google 地図コンポーネントへ渡す。

React StrictMode や再レンダーでロード処理を重複させない。API キーをエラーやログへ出力しない。

### 4.3 API エラー

ローダー失敗、API キー拒否、対象 API 未有効化は `GoogleMapsInitializationError` に変換する。API キーが設定済みの状態でこのエラーが発生した場合は `fatalError` へ遷移し、写真方式へ黙って戻さない。

## 5. 大阪府ポリゴンと地点生成

### 5.1 境界データ

国土数値情報「行政区域データ」（N03）から大阪府を抽出し、府単位に結合した MultiPolygon を前処理で生成する。

```ts
type PolygonRing = readonly [number, number][]; // [longitude, latitude]
type Polygon = readonly PolygonRing[];

type OsakaMultiPolygon = {
  type: "MultiPolygon";
  coordinates: readonly Polygon[];
  source: "N03";
  simplificationToleranceMeters: number;
};
```

データの条件:

- 座標順は GeoJSON と同じ `[longitude, latitude]`。
- 外周と穴を保持する。
- 簡略化誤差の目標は 200m 程度。
- gzip 後 50KB 以下を目標とする。
- 実行時に外部から取得しない。ビルド成果物に同梱する。
- 生成物の出典と加工内容を README または利用規約ページから確認できるようにする。

候補ファイルは `src/data/osakaBoundary.ts` とし、原典からの変換手順は `scripts/prepare-osaka-boundary.mjs` または `docs/` の作業手順に残す。原典の再配布条件・派生データ公開可否は公開前ゲートで確認する。

### 5.2 Point-in-Polygon

```ts
export function isPointInOsaka(
  coordinate: Coordinate,
  boundary: OsakaMultiPolygon,
): boolean;
```

実装は外部ライブラリに依存しない ray casting とする。MultiPolygon の各 Polygon を順に評価し、外周内かつ穴の外にある場合だけ `true` を返す。

- 緯度経度の入力順は `{ lat, lng }`。
- ポリゴン配列の入力順は `[lng, lat]`。
- 境界線上は `true` とする。
- 非有限値は `false` とする。
- 判定は seed 座標と実パノラマ座標の両方に適用する。

### 5.3 乱数座標

```ts
export function randomCoordinateInBounds(
  bounds: Bounds,
  random: () => number = Math.random,
): Coordinate;
```

ポリゴンの外接矩形内で乱数を生成し、`isPointInOsaka` が `true` になるまで棄却する。乱数関数はテストで注入する。

ポリゴンの外接矩形は前処理時に算出し、次の形式で同梱する。

```ts
type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};
```

### 5.4 Scene Provider

```ts
type StreetViewSceneProviderOptions = {
  google: GoogleMapsLibraries;
  boundary: OsakaMultiPolygon;
  random?: () => number;
};

interface SceneProvider {
  getAvailableScenes(): Promise<readonly Scene[]>;
}
```

動的 Provider は 5 ラウンド分に加えて 3 件の予備候補、合計 8 件を生成する。1 Scene の最大試行回数は 20 回とする。

1候補の処理:

```text
1. 大阪府ポリゴン外接矩形から seed を生成
2. seed が大阪府ポリゴン外なら棄却
3. StreetViewService.getPanorama を次の条件で呼ぶ
     location: seed
     radius: 500
     preference: nearest
     sources: [google, outdoor]
4. ZERO_RESULTS / 不正データなら候補を棄却
5. 返却された pano ID がセッション内で使用済みなら棄却
6. 返却された実パノラマ座標が大阪府ポリゴン外なら棄却
7. pano ID、実パノラマ座標から Scene を作成
```

採用する `StreetViewPanoramaData` の必須条件:

- `pano` が存在する。
- `location?.latLng` が存在する。
- `location.latLng.lat()` / `lng()` が有限値である。
- 実パノラマ座標が大阪府ポリゴン内である。
- `pano` が当該セッションの既採用 ID に含まれない。

20回以内に有効な地点を作れない場合は、その Scene の生成を失敗とする。8件を揃えられない場合はゲーム開始を中止し、設定エラーまたは一時的な取得失敗として表示する。

## 6. `getPanorama` ラッパー詳細設計

### 6.1 内部インターフェース

Google API を直接呼ぶ箇所を1モジュールへ閉じ込め、Provider のテストでは差し替え可能にする。

```ts
type PanoramaSearchRequest = {
  location: Coordinate;
  radius: 500;
  preference: "nearest";
  sources: readonly ["google", "outdoor"];
};

interface StreetViewSearchClient {
  getPanorama(
    request: PanoramaSearchRequest,
  ): Promise<google.maps.StreetViewPanoramaData>;
}
```

実装では Google API の enum を使う。

```ts
service.getPanorama({
  location: request.location,
  radius: 500,
  preference: google.maps.StreetViewPreference.NEAREST,
  sources: [
    google.maps.StreetViewSource.GOOGLE,
    google.maps.StreetViewSource.OUTDOOR,
  ],
});
```

コールバック形式の API は Promise 化し、`StreetViewStatus.ZERO_RESULTS` は `NoPanoramaError`、その他の失敗は `StreetViewSearchError` に変換する。

### 6.2 エラー処理

| 状態 | 処理 |
|---|---|
| `OK` かつ必須データあり | 実パノラマ座標と pano ID を採用 |
| `ZERO_RESULTS` | seed を破棄して次の試行 |
| `UNKNOWN_ERROR` | seed を再利用せず次の試行 |
| API キー拒否 / API 未有効化 | Provider を失敗させ、写真へ切替えずエラー表示 |
| 応答データ欠落 | 候補を破棄して次の試行 |
| 20回超過 | Scene 生成失敗 |

エラー内容に API キー、pano ID の一覧、Google API の内部レスポンス全文を含めない。

## 7. StreetViewPanorama 詳細設計

### 7.1 Props

```ts
type StreetViewViewerProps = {
  google: GoogleMapsLibraries;
  panoId: string;
  coordinate: Coordinate;
  title: string;
  onFailure: () => void;
};
```

### 7.2 初期化オプション

```ts
const PANORAMA_OPTIONS: google.maps.StreetViewPanoramaOptions = {
  addressControl: false,
  showRoadLabels: false,
  clickToGo: true,
  linksControl: true,
  fullscreenControl: false,
  motionTrackingControl: false,
  enableCloseButton: false,
  panControl: true,
  zoomControl: true,
  visible: true,
};
```

`addressControl` と `showRoadLabels` は推測前の住所・道路名・地名の露出を避けるため必須とする。道路移動に必要な矢印とクリック移動は有効にする。

### 7.3 React ライフサイクル

`StreetViewPanorama` は DOM コンテナ1個に対して1インスタンスだけ生成する。

```text
StreetViewViewer mount
  ├─ containerRef を確認
  ├─ panoramaRef が空なら new StreetViewPanorama(container, options)
  ├─ status_changed / pano_changed のリスナーを登録
  └─ setPano(initialPanoId), setPosition(initialCoordinate)

scene の変更
  ├─ 同じ panoramaRef を利用
  ├─ setPano(nextPanoId)
  └─ setPosition(nextCoordinate)

unmount
  ├─ 登録リスナーを解除
  └─ コンポーネントの参照を破棄
```

React StrictMode の開発時再実行に備え、ローダー Promise、container ref、panorama ref、初期化中 Promise を分離して管理する。非同期ロード完了後にコンポーネントが破棄されていた場合はインスタンスを生成しない。

実装上のルール:

- `useEffect` のたびに `new StreetViewPanorama` を呼ばない。
- `scene` の変更で DOM を差し替えない。
- `panoId` の変更は同じインスタンスの `setPano` で反映する。
- 道路移動で発生する `pano_changed` から `RoundResult.answer` を更新しない。
- コンポーネントが再マウントされた場合だけ、古い参照を破棄して新しいコンテナに作成する。

### 7.4 読み込み状態と失敗

状態は `loading` / `ready` / `failed` とする。

```text
scene 変更
  ├─ loading に戻す
  ├─ setPano / setPosition
  ├─ StreetViewPanorama の status_changed を待つ
  ├─ OK → ready
  └─ 一定時間内に成功しない / UNKNOWN_ERROR → failed
```

初期 Scene または差し替え Scene の読み込みタイムアウトは15秒とする。失敗 callback は1 Sceneにつき1回だけ呼び、Reducer の `IMAGE_FAILED` へ接続する。候補プールが空なら `fatalError` とする。

## 8. Google Maps 地図コンポーネント

### 8.1 共通方針

API キー有効時の Street View 画面では、推測地図と結果地図も Google Maps JavaScript API を使う。Leaflet / OpenStreetMap は API キーなしの写真モードだけで利用する。

Google 地図コンポーネントは API ローダーから受け取った `google.maps` を使い、コンポーネント内で Google Map インスタンスを1回だけ作成する。マーカーとポリラインは props の変更時に更新し、地図本体を作り直さない。

### 8.2 `GoogleGuessMap`

```ts
type GoogleGuessMapProps = {
  google: GoogleMapsLibraries;
  guess: Coordinate | null;
  onGuess: (point: Coordinate) => void;
};
```

責務:

- 大阪府中心を初期表示する。
- Google Maps の `click` イベントから `{ lat, lng }` を親へ返す。
- 推測地点が変わったら既存マーカーの位置だけ更新する。
- 正解地点を表示しない。
- API ロード中と初期化失敗をコンポーネント内で表示する。

推測地図の Google Maps attribution / Google ロゴ / 必須表示は API の標準表示に任せ、CSS で隠さない。

### 8.3 `GoogleResultMap`

```ts
type GoogleResultMapProps = {
  google: GoogleMapsLibraries;
  guess: Coordinate;
  answer: Coordinate;
};
```

責務:

- 推測地点と実パノラマ座標にマーカーを置く。
- 2点を `Polyline` で結ぶ。
- 両地点を含む `LatLngBounds` へ fit する。
- クリックイベントは登録しない。
- `answer` は `RoundResult.answer` のみを使用し、道路移動後の現在位置は使わない。

### 8.4 モードによる表示切替

```tsx
const isStreetView = scene.display.kind === "streetview";

const sceneViewer = isStreetView
  ? <StreetViewViewer ... />
  : <PhotoViewer ... />;

const guessMap = isStreetView
  ? <GoogleGuessMap ... />
  : <GuessMap ... />;
```

結果画面も `result.scene.display.kind` で `GoogleResultMap` / `ResultMap` を選択する。動的方式で Google Maps API が壊れた場合に、パノラマだけ Google、地図だけ Leaflet になる状態を作らない。

## 9. 画面・状態遷移詳細

### 9.1 `App.tsx`

起動時またはタイトル画面で次の処理を行う。

```text
start()
  ├─ apiKey なし
  │    └─ StaticPhotoSceneProvider
  │         └─ selectRounds → START(source="photo")
  │
  └─ apiKey あり
       ├─ loadGoogleMaps(apiKey)
       ├─ StreetViewSceneProvider(google, boundary)
       ├─ getAvailableScenes()
       ├─ selectRounds → START(source="streetview")
       └─ google namespace を App の表示コンテキストへ保持
```

`google` は画面コンポーネントへ Props または React Context で渡す。Google Maps 型と API キーを各画面が直接取得しないようにする。

### 9.2 Reducer

既存の `START`、`SET_GUESS`、`CONFIRM`、`NEXT`、`IMAGE_FAILED`、`RESET` を維持する。変更点は次のとおり。

- `START` 時に `source` を保存する。
- `CONFIRM` は `scene.location` を answer として保存する。
- `IMAGE_FAILED` は写真 / Street View を問わず `candidatePool` から差し替える。
- `NEXT` では次の Scene の初期ビューを表示し、推測ピンをリセットする。
- `pano_changed` は Reducer に Action を送らない。

候補プールは本番5件と重複しない3件で構成する。差し替え済み Scene を候補プールへ戻さない。

### 9.3 結果画面

ランダム地点では次を表示する。

- 見出し: `大阪府内のランダム地点`
- 説明: `大阪府境内からランダムに選ばれた地点です。`
- クレジット: 表示しない
- 結果地図: `GoogleResultMap`
- 外部リンク: 既存 `StreetViewLink`。`result.answer` を使用

写真方式では既存の地点名、説明、作者、ライセンス、Commons リンクを維持する。

## 10. API キー・公開設定

### 10.1 ローカル / Cloudflare Pages

| 環境 | 設定 |
|---|---|
| ローカル | `.env.local` に `VITE_GOOGLE_MAPS_API_KEY=...` |
| Git 管理 | `.env.example` の空キーだけを追跡。実キーは追跡しない |
| Cloudflare Pages | ビルド環境変数 `VITE_GOOGLE_MAPS_API_KEY` に設定 |
| API キーなしビルド | 写真出題 + Leaflet / OpenStreetMap |

`VITE_` 変数はクライアントへ埋め込まれる公開値である。HTTP リファラー制限と API 制限を設定し、秘密情報として扱わない。

### 10.2 Google Cloud 設定

必要な API:

1. Maps JavaScript API

API キー:

- アプリケーション制限: 本番 Pages URL、ローカル開発 URL
- API 制限: Maps JavaScript API
- 日次上限・利用監視を設定

API キー有効時のリファラー違反、API 未有効化、請求設定エラーは設定エラーとして表示する。

### 10.3 規約・プライバシー

公開サイトには Google Maps Platform の利用規約とプライバシーポリシーへの導線を設ける。

- `public/terms.html`: Google Maps Platform 利用規約、地図データ表示、出典の案内
- `public/privacy.html`: Google Maps の読み込み、外部通信、ログを保存しないことの説明
- タイトル画面または共通フッターから両ページへリンク
- Google のロゴ、attribution、標準コントロールを隠さない
- N03 派生ポリゴンの出典と加工内容を README または利用規約ページに記載

## 11. エラー設計

| 層 | エラー | 処理 |
|---|---|---|
| 設定 | API キーなし | 写真モードで開始 |
| 設定 | API キー拒否 / API 未有効化 | `fatalError`。写真へ切替えない |
| ローダー | Maps API のロード失敗 | `fatalError` または再試行 |
| 地点生成 | seed が府外 | 利用者に見せず再抽選 |
| 地点検索 | `ZERO_RESULTS` | 次の seed を試す |
| 地点検索 | 返却 pano が重複 | 次の seed を試す |
| 地点検索 | 実パノラマ座標が府外 | 次の seed を試す |
| 地点生成 | 1 Scene 20回超過 | Scene 生成失敗 |
| ビューア | パノラマ読み込み失敗 / timeout | 予備 Scene に差し替え |
| ビューア | 予備なし | `fatalError` |
| Google 地図 | 初期化失敗 | 現在画面を壊さずエラー表示。確定操作は無効化 |
| 写真 | 既存写真読み込み失敗 | 従来の候補差し替え |

ユーザー向けエラーに API キー、pano ID、内部レスポンスを表示しない。開発用ログにも API キーを出力しない。

## 12. テスト設計

### 12.1 ポリゴン・座標

| 対象 | 観点 |
|---|---|
| `pointInPolygon.test.ts` | 大阪府内の既知点を `true` にする |
| `pointInPolygon.test.ts` | 隣接府県・海上の点を `false` にする |
| `pointInPolygon.test.ts` | MultiPolygon、穴、境界上、非有限値を処理する |
| `randomLocation.test.ts` | 固定乱数で外接矩形内の座標を再現する |
| `randomLocation.test.ts` | ポリゴン外を棄却し、内側だけを返す |

### 12.2 Google API 境界

Google API へ実通信しない。ローダー、`getPanorama` ラッパー、Map / Panorama コンストラクタをモックする。

- `loadGoogleMaps` が同じ Promise を返し、ライブラリを二重ロードしない。
- API キー未設定時にローダーが呼ばれない。
- `getPanorama` に radius 500、nearest、google + outdoor が渡る。
- `ZERO_RESULTS` が次の候補へ進む。
- 実パノラマ座標と pano ID が Scene に保存される。
- seed 座標ではなく、返却された実パノラマ座標が `Scene.location` になる。
- 返却座標の府外判定で候補が棄却される。
- 同一 pano ID が再利用されない。

### 12.3 `StreetViewViewer`

- StrictMode 相当の再実行でも同一コンテナへ Panorama を二重生成しない。
- `panoId` 変更時に `setPano` / `setPosition` が呼ばれ、インスタンスが再生成されない。
- `clickToGo`、`linksControl` が有効である。
- `addressControl`、`showRoadLabels`、不要なフルスクリーン操作が無効である。
- パノラマ移動イベントで `RoundResult.answer` が変わらない。
- 読み込み失敗または timeout で failure callback が一度だけ呼ばれる。

### 12.4 Google 地図

- `GoogleGuessMap` のクリック座標が親へ通知される。
- 推測マーカーは更新されるが、正解座標を表示しない。
- `GoogleResultMap` が2地点、Polyline、fitBounds を設定する。
- API キー有効時に Leaflet コンポーネントがレンダーされない。
- API キーなしの写真モードで既存 Leaflet コンポーネントが使われる。

### 12.5 回帰テスト

- 写真方式の既存テスト全件
- ピン未選択時の確定ボタン無効
- CONFIRM から結果画面への遷移
- Haversine 距離とスコア
- 5ラウンド完走と最終結果
- ランダム地点のクレジットなし結果表示
- `StreetViewLink` の安全な外部リンク

実行コマンド:

```text
npm run test
npm run build
```

API キーなしの `npm run build` は必須とする。API キーありの検証は、HTTP リファラー制限を設定したローカルまたは Cloudflare Pages 環境で行う。

## 13. 受け入れ基準との対応

| 基準 | 設計上の担保 |
|---|---|
| API キーありでランダム地点パノラマを表示 | ポリゴン内 seed と `getPanorama` の実パノラマを使う Provider |
| 既存15スポットに限定されない | 動的 Provider は `spots.ts` を参照せず、毎回 seed を生成 |
| パノラマなし地点でクラッシュしない | `ZERO_RESULTS` を棄却し、最大20回まで再試行 |
| API キーなしで既存ゲームを遊べる | StaticPhotoSceneProvider と Leaflet / OpenStreetMap へフォールバック |
| 道路移動ができる | `StreetViewPanorama` の `clickToGo` / `linksControl` |
| 住所・道路名を出さない | `addressControl: false` / `showRoadLabels: false` |
| 正解が表示パノラマと一致する | `getPanorama` の実パノラマ座標と pano ID を Scene に保存 |
| Google パノラマと非 Google 地図を混在させない | API キー有効時は GoogleGuessMap / GoogleResultMap に切替 |
| 結果画面が壊れない | credit optional、結果地図と StreetViewLink を Scene 種別で分岐 |
| 既存テストが通る | Reducer、採点式、写真 Provider の基本契約を維持 |

## 14. 実装順序

1. `@googlemaps/js-api-loader` と `@types/google.maps` を依存へ追加する。
2. `.env.example`、Vite 環境変数型、API キー判定を追加する。
3. N03 の原典から大阪府 MultiPolygon を生成し、簡略化データと出典を追加する。
4. `pointInPolygon.ts` と座標生成の純粋関数、テストを追加する。
5. Google Maps ローダーと `getPanorama` ラッパー、モックテストを追加する。
6. `StreetViewSceneProvider`、pano ID 重複排除、実座標確定、再試行を追加する。
7. `Scene` 型、Reducer、App の `source` 切替を更新する。
8. `StreetViewViewer` を実装し、StrictMode、道路移動、失敗差し替えをテストする。
9. `GoogleGuessMap` / `GoogleResultMap` を実装する。
10. `RoundScreen` / `RoundResultScreen` を Scene 種別で切り替える。
11. 規約・プライバシーポリシーの簡易ページと出典表記を追加する。
12. API キーなし回帰、API キーあり手動確認、公開前ゲート確認を行う。

## 15. 変更対象外

- `calculateDistanceKm` と `calculateRoundScore` の計算式
- 5ラウンド、推測確定、結果、最終結果の基本フロー
- 写真方式の `StaticPhotoSceneProvider` と既存スポットの出題ルール
- API キーなし時の Leaflet / OpenStreetMap 利用
- Google Maps 内部のストリートビュー画像、道路リンク、標準 attribution の改変
- ユーザーアカウント、ランキング、サーバーサイド API、ゲーム履歴保存
- ランダム地点の難易度推定
- 大阪府境ポリゴンを実行時に外部サービスから取得する処理

## 16. 未決事項・公開前ゲート

| 区分 | 項目 | 対応 |
|---|---|---|
| 公開前ゲート | N03 派生ポリゴンの公開可否・利用手続 | 国土地理院の利用手続ナビ等で確認し、出典を明記 |
| 公開前ゲート | Google Maps 利用規約・プライバシーポリシー導線 | `public/terms.html` / `public/privacy.html` を追加して確認 |
| 要検証 | 実パノラマ座標のポリゴン内判定を公開データに適用する扱い | 懸念が残る場合は Google サポートへ確認 |
| 要検証 | 道路移動で追加のパノラマロードが発生するか | API キー設定後に利用量を実測 |
| 要検証 | `127.0.0.1` と Pages 本番 URL のリファラー制限 | 両環境で API キーあり動作を確認 |
| 要検証 | radius 500 / google + outdoor の大阪府内カバレッジ | 100〜200回の生成試験で成功率を確認 |
| 候補 | 予備候補を3件から増やす | 実際のパノラマ失敗率を見て判断 |
| 候補 | ポリゴン簡略化誤差を200mより小さくする | ファイルサイズと境界精度を比較して判断 |
