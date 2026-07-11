# 技術選定書: GeOsaka

作成日: 2026-07-11 / 作成者: Fable（sol との対話により合意）

## 採用スタック（結論）

| 領域 | 採用 | 不採用案と理由 |
|---|---|---|
| UI フレームワーク | **React 18 + Vite + TypeScript** | Svelte（この規模では差が小さく、Leaflet/テスト周辺の成熟度で React 優位）、Preact（互換確認の手間）、vanilla TS（状態と DOM 同期の自前実装が増える） |
| 地図 | **Leaflet を直接使用**（`GuessMap` / `ResultMap` コンポーネント内で `useEffect` + `ref` によりラップ） | react-leaflet（地図2種・ピン1本+線1本の規模では宣言的利点が小さく、依存と React バージョン互換リスクを増やすだけ。生成/破棄・イベント解除をコンポーネント内に閉じ込める） |
| 地図タイル | OpenStreetMap 標準タイル + attribution 常時表示 | Google Maps（APIキー必須のため要件違反） |
| 状態管理 | **useReducer（+ 必要に応じ Context）** | Redux / Zustand（単一ゲーム・線形遷移で不要）。抽選・距離・採点は Reducer 外の純粋関数に分離 |
| スタイリング | **素の CSS + カスタムプロパティ（デザイントークン）**、必要なら CSS Modules | Tailwind（高品質化は可能だが、没個性回避が明示要件のため、大阪のネオン・夜景の表現を CSS で直接管理する利点が大きい） |
| テスト | **Vitest（純粋ロジック: Haversine・100m境界・スコア減衰・抽選・Reducer）+ React Testing Library の統合テスト2〜3本**（ピン未選択で確定不可 / 確定→結果遷移 / 完走で合計表示） | Playwright（MVP では導入しない。実機相当の地図操作・外部画像失敗まで検証したくなった段階で追加） |
| スポットデータ形式 | **TS モジュール（`spots.ts`、`satisfies readonly SpotData[]`）** | JSON（ランタイムスキーマ検証が別途必要。非開発者編集・外部生成に移る段階で切替）。ただし `validateSpot` は TS 採用でも残す |

## 写真（Wikimedia Commons ホットリンク）の運用方針

MVP では許容するが恒久的に安定した配信とは見なさない。対策:

- 原寸ではなく適切な幅のサムネイル URL を使う（性能・帯域）
- 各ラウンド直前に画像をプリロードする
- `onerror` + タイムアウトを設け、失敗時は未使用スポットへ差し替える
- ライセンス・作者・Commons ファイルページ URL をデータに固定保存する
- CORS 前提の画像加工はせず、通常の `<img>` 表示に留める
- 将来はライセンス条件を満たした上でセルフホストを検討

## 対話の経緯（要約）

- sol の当初推奨は react-leaflet と「RTL + 余力があれば Playwright 1本」。
- Fable が (a) 素の Leaflet 直ラップによる依存削減、(b) テストを Vitest + RTL 2〜3本に絞り Playwright 不採用、を提案し、sol が両点に**合意**。
- その他の論点（React+Vite、useReducer、素のCSS、TSモジュール）は当初から一致。
