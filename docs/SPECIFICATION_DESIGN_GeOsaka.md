# 基本設計・詳細設計書: GeOsaka

作成日: 2026-07-11  
作成者: terra（ソフトウェア設計担当）  
対象: GeoGuessr 大阪版 Web ゲーム「GeOsaka」MVP

## 1. 設計方針とアーキテクチャ概要

GeOsaka は、ビルド済み静的ファイルだけで動作するシングルプレイヤーゲームとする。ゲーム進行、スポット選出、採点はすべてブラウザ内で完結し、サーバー、アカウント、API キーおよび環境変数を必要としない。

外部リソースは、地図表示用の OpenStreetMap タイルと、写真表示用の Wikimedia Commons 画像を利用する。両者の失敗をゲーム全体の停止に波及させないため、画像および地図のエラーは各表示コンポーネントで局所的に扱う。

```text
利用者
  │
  ▼
UI層（タイトル / ラウンド / 結果 / 最終結果）
  │             │
  │             ├── GuessMap / ResultMap（Leaflet 直使用 + OSM タイル）
  │             └── 写真ビューア（拡大・パン、画像状態表示）
  ▼
ゲーム状態・ゲームロジック層
  ├── ラウンド抽選
  ├── 推測確定・状態遷移
  ├── 距離計算（Haversine）
  └── スコア計算
  ▼
SceneProvider 抽象層
  ├── StaticPhotoSceneProvider（MVP: 同梱スポットデータ + Wikimedia）
  └── StreetViewSceneProvider（将来候補）
  ▼
静的スポットデータ / 外部画像
```

画面実装には React 18 + Vite + TypeScript を使用する。地図は API キーを要しない Leaflet を `GuessMap` / `ResultMap` 内で直接使用し、地図ライブラリ固有の処理は各コンポーネントに隔離する。

### 1.1 画面遷移

```text
[TITLE]
  └─「ゲームを始める」→ ラウンド5件を非復元抽選 → [ROUND 1]

[ROUND n]
  ├─地図クリック → 推測ピン更新（同画面）
  └─「推測を確定」→ 採点・結果生成 → [ROUND_RESULT n]

[ROUND_RESULT n]
  ├─「次のラウンドへ」 (n < 5) → [ROUND n+1]
  └─「結果を見る」 (n = 5) → [FINAL_RESULT]

[FINAL_RESULT]
  └─「もう一度遊ぶ」→ 状態初期化・再抽選 → [ROUND 1]
```

ブラウザ再読み込み時は進行中ゲームを復元せずタイトル画面へ戻す。将来、任意のローカル保存を追加する場合も、ゲーム状態のシリアライズ可能な構造を維持する。

## 2. モジュール構成

| モジュール | 主な責務 | 依存方向 |
|---|---|---|
| `app` / 画面ルーター | 表示対象画面の選択、アプリ全体の初期化 | UI、ゲーム状態 |
| `game` | ゲーム開始、ラウンド遷移、採点実行、合計算出 | `scene`、`scoring` |
| `scene` | シーン供給の抽象化とスポットデータの検証 | `data` |
| `scoring` | Haversine 距離・スコア計算 | なし |
| `components/GuessMap` | Leaflet を直接用い、推測用地図、推測ピン、クリックイベントを描画・管理する | `game`、Leaflet |
| `components/ResultMap` | Leaflet を直接用い、推測・正解ピン、接続線、表示範囲を描画・管理する | `game`、Leaflet |
| `ui` | 各画面、画像ビューア、ボタン、ローディング、エラー表示 | `game`、地図コンポーネント |
| `data` | 静的スポットデータ | なし |

### 2.1 SceneProvider 抽象化

ゲームロジックは、画像が静的写真かパノラマかを知ってはならない。ゲーム開始時に `SceneProvider` から候補シーンを取得し、その後は `Scene` の共通情報だけを使用する。

```ts
type Coordinate = { lat: number; lng: number };

type PhotoCredit = {
  author: string;
  licenseName: string;
  sourceUrl: string;
};

type Scene = {
  id: string;
  location: Coordinate;
  display: {
    kind: "photo" | "panorama";
    imageUrl?: string;
    alt: string; // 地名を含めず、推測前のヒント漏れを防ぐ
  };
  reveal: {
    nameJa: string;
    descriptionJa: string;
    credit?: PhotoCredit;
  };
  difficulty?: "easy" | "normal" | "hard";
};

interface SceneProvider {
  getAvailableScenes(): Promise<readonly Scene[]>;
}
```

- `StaticPhotoSceneProvider`: 同梱したスポットデータを `Scene` に変換する MVP 実装。ネットワーク取得を伴わず、画像 URL の読み込みは UI 層が担う。
- `StreetViewSceneProvider`: 将来実装候補。`getAvailableScenes()` の戻り値契約を保ち、パノラマ識別子等の供給情報は `display` の拡張フィールドとして閉じ込める。
- Provider が有効なシーンを 5 件返せない場合、ゲームを開始せず、ユーザーに再読み込みを案内する。

### 2.2 Leaflet のコンポーネント内隔離

地図の汎用アダプターは設けない。`GuessMap` と `ResultMap` が Leaflet を直接使用し、各コンポーネントの `useEffect` と DOM `ref` の中に、地図インスタンス生成、タイルレイヤー・マーカー・ポリラインの追加、イベント登録を閉じ込める。

- `GuessMap` はマウス／タップによる地図クリックイベントを登録し、座標値だけを親コンポーネントへ通知する。描画済みの推測ピンは props に同期させる。
- `ResultMap` は結果 props から推測ピン、正解ピン、両地点を結ぶ線を描画し、両地点を含む bounds へ表示範囲を調整する。クリックイベントは登録しない。
- `useEffect` の cleanup で、登録した Leaflet イベントを解除し、地図インスタンスを `remove()` して破棄する。再描画や画面遷移で古いインスタンス・イベントが残らないことを保証する。
- OSM タイルの attribution は各コンポーネントが設定し、常時表示する。

## 3. データモデル

### 3.1 スポットデータスキーマ

スポットデータはビルド成果物に同梱する TypeScript モジュール `spots.ts` とし、`satisfies readonly SpotData[]` で型を検査する。MVP では 15 件以上を登録し、各 ID は不変・一意とする。`photoUrl` は原寸 URL ではなく、表示サイズに見合う幅の Wikimedia Commons サムネイル URL（`upload.wikimedia.org`）を使用する。表示前に名称や説明を出さない。

```ts
type Difficulty = "easy" | "normal" | "hard";

type SpotData = {
  id: string;                 // 例: "dotonbori-glico"
  nameJa: string;             // 結果画面でのみ表示
  latitude: number;           // WGS84, -90..90
  longitude: number;          // WGS84, -180..180
  photoUrl: string;           // Wikimedia Commons の画像直リンク
  photoAlt: string;           // 地名・固有名詞を含めない説明
  credit: {
    author: string;
    licenseName: string;      // 例: "CC BY-SA 4.0"
    sourceUrl: string;        // Commons のファイルページ等
  };
  descriptionJa: string;      // 結果画面用の一言解説
  difficulty?: Difficulty;
};
```

データ登録時の検証規則は以下とする。

- `id` の重複を禁止する。
- 緯度経度は大阪府内または大阪府を明確に表す地点であることを人手確認する。
- `photoUrl`、`credit.author`、`credit.licenseName`、`credit.sourceUrl` は必須とする。
- `sourceUrl` は利用者がライセンス・出典を確認できるページを指す。
- `photoAlt`、ファイル名、画像 URL に地名が露出する可能性があるため、UI 上は URL・ファイル名を推測前に表示しない。
- `photoUrl` は適切なサムネイル幅の URL とし、原寸画像 URL を登録しない。CORS を前提とする加工は行わず、通常の `<img>` 表示だけに用いる。
- 各ラウンドの表示直前に `Image` オブジェクトで当該 `photoUrl` をプリロードする。プリロード成功後に写真を表示し、`onerror` または設定時間内に完了しないタイムアウトを失敗として扱う。

### 3.2 実行時データモデル

```ts
type Guess = Coordinate;

type RoundResult = {
  roundNumber: number;        // 1..5
  sceneId: string;
  guess: Guess;
  answer: Coordinate;
  distanceKm: number;
  score: number;              // 0..5000 の整数
};

type GamePhase = "title" | "round" | "roundResult" | "finalResult" | "fatalError";

type GameState = {
  phase: GamePhase;
  roundIndex: number;         // round 時は 0..4
  scenes: readonly Scene[];   // 5件、重複なし
  currentGuess: Guess | null;
  results: readonly RoundResult[];
  error: { code: string; message: string } | null;
};
```

`RoundResult` には採点時点の座標・距離・点数を保存し、元データ更新後でもそのゲーム中の結果表示が変わらないようにする。

## 4. スコアリング詳細設計

### 4.1 距離計算

正解座標と推測座標の距離は Haversine 公式で求める。地球半径は `R = 6371.0088 km` を用いる。

```text
Δφ = radians(lat2 - lat1)
Δλ = radians(lng2 - lng1)
a  = sin²(Δφ / 2) + cos(radians(lat1)) × cos(radians(lat2)) × sin²(Δλ / 2)
c  = 2 × atan2(√a, √(1-a))
distanceKm = R × c
```

入力座標は地点作成時に検証するが、計算関数も非有限値を拒否する。浮動小数点の丸めは表示時にのみ行い、採点は未丸め距離で行う。

### 4.2 点数計算

減衰係数は **`k = 4.0 km`** と確定する。

```text
if distanceKm <= 0.1:
  score = 5000
else:
  score = round(5000 × exp(-distanceKm / 4.0))
```

0 未満になることはないが、防御的に `0..5000` にクランプする。境界の 100 m は `distanceKm <= 0.1` とし、距離 0 m を含める。

#### k = 4.0 km の根拠

大阪府は中心市街地でランドマークが密集し、府域全体ではおおむね 60 km 規模に広がる。`k=4.0` は近隣を当てる精度を十分に差別化しつつ、府内の大きな外しを低得点にする狭域ゲーム向けの設定である。

| 誤差距離 | 通常計算の点数（概算） | 意図 |
|---:|---:|---|
| 0.1 km 以下 | 5,000 | 位置を正確に特定した満点 |
| 1 km | 3,894 | 同一エリアを高精度で推測 |
| 3 km | 2,362 | 近隣区・駅周辺を外した水準 |
| 5 km | 1,433 | 市街地では明確な誤差 |
| 10 km | 410 | 府内だが大きく外した水準 |
| 30 km | 3 | 府内の反対側相当で実質無得点 |

`k=3` は 5 km で約944点となり難度が高すぎ、`k=5` は 10 km で約677点となり誤差の差別化がやや弱い。よって、5 ラウンドで「場所を絞れた」達成感と大阪の局所性を両立する中間値 `4.0` を採用する。将来の難易度モード追加時は定数を設定として注入し、既存の標準モードは維持する。

距離表示は `distanceKm < 1` の場合はメートル（四捨五入した整数）、それ以外は km（小数第2位まで）とする。合計点は各ラウンドで整数化済みの点数を加算し、最大 25,000 点とする。

## 5. 状態管理とゲームロジック詳細設計

### 5.1 状態遷移と操作制約

| 現在状態 | 操作 / イベント | 処理 | 次状態 |
|---|---|---|---|
| `title` | 開始 | Provider 取得、5件非復元抽選、状態初期化 | `round` |
| `round` | 地図クリック | `currentGuess` をクリック座標で置換 | `round` |
| `round` | 推測確定 | ピン未選択なら処理せず案内。選択済みなら採点・結果追加 | `roundResult` |
| `roundResult` | 次へ | `roundIndex + 1`、`currentGuess = null` | `round` |
| `roundResult` | 最終結果へ | 5件目の後、合計値を導出 | `finalResult` |
| `finalResult` | 再プレイ | 全ゲーム状態を破棄し、再抽選 | `round` |
| 任意 | 致命的初期化失敗 | エラー内容を保持 | `fatalError` |

確定操作は二重送信防止のため、クリック直後から状態遷移完了まで無効化する。`roundResult` では推測ピンを編集できない。ブラウザの戻る操作は MVP で履歴連動させず、アプリ状態を変更しない。

### 5.2 ゲーム開始・抽選

1. `SceneProvider.getAvailableScenes()` を取得する。
2. 形式不正・重複 ID・画像 URL 不備のデータを除外し、除外件数を開発時に記録する。
3. 有効シーンが 5 件未満なら `fatalError` とする。
4. Fisher-Yates シャッフル等の偏りのない方式でシャッフルし、先頭 5 件を選ぶ。
5. 同一ゲーム内での重複は許可しない。再プレイでは前ゲームと同じスポットを含んでよい。

画像失敗による代替は、採点の正解情報を見せないためラウンド画面でのみ行う。失敗したシーンを未使用の有効シーンに差し替え、差し替え後も 5 ラウンドを維持する。代替候補がない場合は、そのラウンドを中止してゲームを安全に終了するのではなく、再試行またはタイトルへ戻る導線を提示する。

### 5.3 純粋関数として分離するロジック

- `validateSpot(spot): ValidationResult`
- `selectRounds(scenes, count = 5): Scene[]`
- `calculateDistanceKm(answer, guess): number`
- `calculateRoundScore(distanceKm, k = 4.0): number`
- `createRoundResult(scene, guess, roundNumber): RoundResult`
- `getTotalScore(results): number`

これらは UI・地図ライブラリ・DOM に依存させず、境界値を含む単体テスト対象とする。最低限、0 m、100 m、100 m 超過、1 km、非常に遠い距離、同一ラウンドの二重確定拒否を検証する。

## 6. UI レイアウト設計

### 6.1 共通ビジュアル方針

大阪の夜景・道頓堀のネオンを想起させる深い紺〜黒を基調に、アクセントとして朱赤・ネオンピンク・琥珀色を限定的に使う。過剰な装飾ではなく、情報階層と操作の現在地を色で示す。見出しは太めで個性のある日本語 Web フォントを**候補**、本文は可読性の高いサンセリフを**候補**とする。コントラスト比とキーボード操作可能なフォーカス表示を確保する。

### 6.2 デスクトップ（基準幅 1024 px 以上）

```text
┌──────────────────────────────────────────────────────────────┐
│ GeOsaka                         ROUND 2 / 5   現在の得点      │
├───────────────────────────────┬──────────────────────────────┤
│                               │ 推測する場所                 │
│        写真ビューア           │ ┌──────────────────────────┐ │
│  ローディング / 拡大 / パン    │ │          地図            │ │
│                               │ └──────────────────────────┘ │
│                               │ [推測を確定]                 │
└───────────────────────────────┴──────────────────────────────┘
```

- 写真領域を主役とし、概ね横幅の 60〜65% を割り当てる。
- 地図は最低 360 px 程度の操作可能幅・高さを確保する。
- 確定ボタンはピン未配置時は無効状態にし、理由をテキストでも示す。
- 結果画面は上部に結果地図（推測・正解・接続線）、下部に距離・得点・スポット解説・クレジット・次ボタンを配置する。

### 6.3 モバイル（375 px 幅以上）

```text
┌─────────────────────────┐
│ GeOsaka   ROUND 2 / 5   │
├─────────────────────────┤
│       写真ビューア       │
│   タップで拡大表示       │
├─────────────────────────┤
│       推測用地図          │
├─────────────────────────┤
│ [   推測を確定する   ]   │
└─────────────────────────┘
```

- 1 列に積み、写真→地図→確定ボタンの順とする。
- 確定ボタンは画面下部に追従表示することを**候補**とし、地図操作中も誤タップしにくい余白を設ける。
- タップ目標は原則 44 × 44 CSS px 以上とする。
- 写真の拡大表示はモーダルまたは全画面オーバーレイを**候補**とし、閉じる操作と Esc 相当の戻る操作を用意する。
- 結果の地図は縦長にせず、必要な両ピンと接続線を収めるよう bounds を自動調整する。

### 6.4 地図・クレジット表示

- 推測用地図は大阪府周辺を初期表示し、初期ズーム値は実装時に調整可能な設定値にする。
- 結果地図では推測ピンと正解ピンを視覚的に区別し、接続線を描画する。アイコンだけに依存せず、凡例またはラベルを表示する。
- OSM タイルの attribution を常時表示する。
- 写真クレジットはネタバレ防止のため結果画面以降にだけ表示し、作者、ライセンス名、出典への外部リンクを含める。外部リンクは新しいタブで安全に開く設定を**候補**とする。

## 7. エラー処理・回復設計

| 事象 | 検知箇所 | 利用者への表示 | 回復・内部処理 |
|---|---|---|---|
| 写真のプリロード中 | 写真ビューア | スケルトンと「写真を読み込み中」 | 各ラウンド直前にサムネイル URL をプリロードし、成功まで確定不可 |
| 写真読み込み失敗 | プリロード時または `<img>` の `onerror` | 「写真を表示できません」 | 未使用の代替スポットへ自動差替えし、差替え先も同じ手順でプリロードする。なければ再試行・タイトルへ戻る |
| 写真のタイムアウト | プリロード監視 | 遅延を説明し再試行を提示 | 設定時間内に読み込み完了しなければ失敗として扱い、`onerror` と同じ差替え処理へ進む |
| 地図タイル失敗 | `GuessMap` / `ResultMap` | 地図が読めない旨と再試行 | 既存ピン状態を保持し、地図を再初期化する。推測が不可能なら確定不可 |
| スポットデータ不正 | Provider / 起動時検証 | 「ゲームを開始できません」 | 不正レコード除外後も5件未満なら開始中止、詳細は開発用ログ |
| Provider 取得失敗 | ゲーム開始 | 「準備に失敗しました」 | タイトルから再試行。部分的なゲーム開始はしない |
| 推測未選択で確定 | 確定操作 | 「地図をタップしてピンを置いてください」 | 状態を変更しない |
| 予期しない例外 | 最上位エラー境界の候補 | 簡潔な障害表示 | タイトルへ戻る/再読み込み導線。技術選定後にエラー境界を実装 |

各ラウンドは表示直前のプリロード成功をもって開始可能とする。`onerror` またはタイムアウトで失敗を検知した時点で、失敗 URL や Commons のファイル名を利用者向け文言に含めない。失敗済み ID はそのゲームで再選択しない。外部リソースに失敗しても、完了済みラウンド結果は失わない。

## 8. ディレクトリ構成

React 18 + Vite + TypeScript を使用する。状態管理は `useReducer` を採用し、スタイルは素の CSS とカスタムプロパティで管理する。テストは Vitest と React Testing Library（RTL）を使用する。

```text
GeOsaka/
├── docs/
│   ├── SPECIFICATION_REQUIREMENTS_GeOsaka.md
│   └── SPECIFICATION_DESIGN_GeOsaka.md
├── public/                         # ローカル静的アセット
├── src/
│   ├── main.tsx                    # Vite のエントリポイント
│   ├── App.tsx                     # 画面選択・最上位エラー処理
│   ├── index.css                   # グローバルスタイル、デザイントークン
│   ├── components/
│   │   ├── TitleScreen.tsx
│   │   ├── RoundScreen.tsx
│   │   ├── RoundResultScreen.tsx
│   │   ├── FinalResultScreen.tsx
│   │   ├── PhotoViewer.tsx
│   │   ├── GuessMap.tsx             # Leaflet を useEffect + ref で直接管理
│   │   └── ResultMap.tsx            # Leaflet を useEffect + ref で直接管理
│   ├── game/
│   │   ├── types.ts                # GameState, RoundResult 等
│   │   ├── gameReducer.ts           # useReducer 用の状態遷移
│   │   ├── gameService.ts           # 開始・確定・再プレイのオーケストレーション
│   │   └── roundSelection.ts
│   ├── scene/
│   │   ├── types.ts                # Scene, SceneProvider
│   │   ├── StaticPhotoSceneProvider.ts
│   │   └── validateSpot.ts
│   ├── scoring/
│   │   ├── haversine.ts
│   │   └── score.ts
│   ├── data/
│   │   └── spots.ts                # satisfies readonly SpotData[] の静的データ
│   └── utils/
│       └── formatDistance.ts
├── tests/
│   ├── scoring.test.ts
│   ├── roundSelection.test.ts
│   ├── gameReducer.test.ts
│   ├── RoundScreen.test.tsx         # RTL: ピン未選択時の確定不可、確定から結果遷移
│   └── App.test.tsx                 # RTL: 5ラウンド完走後の合計表示
├── index.html                       # Vite の HTML エントリ
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md                        # 起動方法・クレジット方針
```

`components` は表示とユーザー入力の通知に集中し、採点や抽選を直接実装しない。Leaflet 固有の型・イベントは `GuessMap` と `ResultMap` に閉じ込め、`game` には座標値だけを渡す。これにより、地図コンポーネントの実装詳細からゲーム規則と採点テストを分離できる。

## 9. 実装・検証の受け入れ観点

- 15 件以上の有効スポットから、毎ゲーム重複なしの 5 件を選べる。
- タイトルから 5 ラウンドを完走し、最終結果の合計が各ラウンド点の和と一致する。
- 100 m 以下を 5,000 点、100 m 超過を指数減衰点とし、距離増加に対して点数が単調非増加である。
- 結果画面でのみ、スポット名・解説・写真の作者、ライセンス、出典リンクが見える。
- OSM attribution が地図上に表示される。
- 375 px 幅でも写真、地図、ピン配置、確定、次ラウンドへの操作ができる。
- 画像または地図が失敗しても、利用者に再試行または復帰先が提示され、無反応な画面に留まらない。
- 選定後のビルドコマンドが警告なく成功し、生成物だけを静的ホスティングへ配置して動作する。
