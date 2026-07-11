# GeOsaka

大阪府内の写真から場所を推測する、APIキー不要の静的 Web ゲームです。React 18 + Vite + TypeScript、Leaflet と OpenStreetMap を使用します。

## 起動方法

```bash
npm install
npm run dev
```

表示されたローカル URL をブラウザで開きます。配布用の静的ファイルは次で生成します。

```bash
npm run build
```

テストは次で実行します。

```bash
npx vitest run
```

## 写真・地図のクレジット方針

- 写真は Wikimedia Commons の `Special:FilePath/<ファイル名>?width=1280` を利用し、原寸画像を読み込みません。
- 各スポットの作者、ライセンス、Commons のファイルページ URL は `src/data/spots.ts` に固定保存しています。ゲーム中はネタバレ防止のため隠し、ラウンド結果で表示します。
- 写真は各ラウンド直前にプリロードします。`onerror` またはタイムアウト時は、選出済み5件とは別に保持した未使用候補プールから差し替えます。失敗済みスポットは同一ゲーム中に再選択しません。
- 地図タイルは OpenStreetMap 標準タイルを使い、Leaflet 上で attribution を常時表示します。利用時は [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) に従ってください。

## 開発上の構成

Leaflet は `GuessMap` / `ResultMap` コンポーネントで直接扱います。地図の生成・破棄と、マーカー／線の更新は別の `useEffect` としており、ピン更新だけで地図インスタンスを作り直しません。ゲームの状態遷移は `useReducer`、距離・採点・抽選は UI 非依存の純粋関数です。
