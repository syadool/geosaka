# 基本設計・詳細設計書: GeOsaka レスポンシブデザイン改修

作成日: 2026-07-13  
作成者: Codex（ソフトウェア設計担当）  
対象: 大阪の場所当てゲーム「GeOsaka」レスポンシブデザイン改修  
関連要件: docs/SPECIFICATION_REQUIREMENTS_ResponsiveDesign.md  
関連設計: docs/SPECIFICATION_DESIGN_GeOsaka.md

## 1. 設計方針と制約

本改修は、既存のゲーム進行、採点、地図操作、画像・ストリートビューの失敗処理を変更せず、画面の幅・高さ・向きに応じて表示領域と操作領域を調整する CSS 中心の改修とする。既存コンポーネントには .title-screen、.game-screen、.round-grid、.result-screen、.final-screen などのレイアウトフックが既に存在するため、原則として JSX の構造は維持する。

設計上の制約は以下のとおりとする。

| 制約 | 設計への反映 |
|---|---|
| NFR-1 デスクトップのデグレ禁止 | 1280px 以上は現行のサイズ、配色、2カラム比率、余白を基準として維持する。新しい狭幅用メディアクエリを 1279px 以下に限定する。 |
| NFR-2 挙動不変 | App.tsx、各画面コンポーネントの props、state、イベント、ゲームロジックを変更しない。必要な変更は index.html の viewport 属性と CSS に限定する。 |
| NFR-3 依存追加なし | CSS のメディアクエリ、カスタムプロパティ、env() のみを使用し、新規ライブラリや CSS フレームワークを追加しない。 |
| NFR-4 性能への影響軽微 | 既存の背景、画像、Leaflet、Google Maps の処理は変更しない。追加するのは静的 CSS ルールのみとする。 |

現行コードでは、狭幅用ルールが max-width:780px に集約され、vh ベースの高さ指定と safe-area の指定がない。今回の設計ではこの一段の上書きを、幅と向きを組み合わせた段階的なルールへ置き換える。

## 2. 現状構造と変更範囲

### 2.1 現行の画面構造

| 画面 | 実装コンポーネント | レイアウト上の主な class | 現状の構造 |
|---|---|---|---|
| タイトル | src/components/TitleScreen.tsx | .title-screen、.orb、.title-screen h1、.title-copy、.title-button、.howto、.legal-links | 1つの full-screen main に、タイトル、説明、開始ボタン、遊び方、規約リンクを縦積みする。 |
| ラウンド | src/components/RoundScreen.tsx | .game-screen、.game-header、.round-grid、.scene-column、.photo-viewer / .street-view-viewer、.guess-panel、.map-canvas、.confirm | ヘッダーの下にシーンと推測パネルを配置し、デスクトップでは2カラム、現行 780px 以下では1カラムにする。 |
| ラウンド結果 | src/components/RoundResultScreen.tsx | .result-screen、.result-hero、.result-map、.reveal、.credit、.next-button | 得点・距離、結果地図、場所の説明、クレジット、次ボタンを縦方向に配置する。.next-button は現状 float:right。 |
| 最終結果 | src/components/FinalResultScreen.tsx | .final-screen、.final-total、.breakdown | full-screen の結果見出し、合計点、5ラウンドの内訳、再プレイボタンを配置する。 |

### 2.2 変更対象と非変更対象

| ファイル | 扱い | 変更内容 |
|---|---|---|
| src/index.css | 変更対象 | 共通 full-screen 高さ、safe-area、ボタンのタップ領域、タイトル、ラウンド、結果、最終結果の幅・高さ・レイアウトを調整する。 |
| src/feature.css | 変更対象 | ストリートビュー表示領域、表示失敗領域、規約リンクのレスポンシブ調整を src/index.css と同じブレークポイント体系で行う。 |
| index.html | 変更対象 | iOS 等で safe-area を利用できるよう viewport meta に viewport-fit=cover を追加する。 |
| src/components/TitleScreen.tsx | 参照のみ | 既存 class で調整可能。JSX、props、イベントは変更しない。 |
| src/components/RoundScreen.tsx | 参照のみ | 既存 class でシーン、地図、確定ボタンを調整可能。viewer/map の選択処理は変更しない。 |
| src/components/RoundResultScreen.tsx | 参照のみ | 既存 class で結果地図、説明、クレジット、次ボタンを調整可能。結果遷移は変更しない。 |
| src/components/FinalResultScreen.tsx | 参照のみ | 既存 class で最終結果を調整可能。再プレイ処理は変更しない。 |
| src/App.tsx | 参照のみ | 画面遷移、ゲーム state、Google Maps の選択は変更しない。 |

追加 className は不要と判断する。現行 JSX に、4画面と必要な部品を識別できる class が揃っているためである。実装時に既存 class だけでは対象を分離できない箇所が見つかった場合も、構造変更ではなく、最小限の className 追加に限定する。

## 3. 基本設計

### 3.1 ブレークポイント体系

幅だけでは 932×430 のスマホ横を iPad 相当と誤分類するため、基本の幅帯に加えて、短い横画面を高さ・向きで上書きする。

| 帯 | 条件 | 対象例 | ラウンドの基本方針 |
|---|---|---|---|
| スマホ縦 | max-width: 767px、通常は portrait | 320×568、375×812、430×932 | 1カラム。シーン → 地図 → sticky 確定ボタンの順。 |
| タブレット縦 | 768px〜1279px かつ portrait | 768×1024、810×1080、834×1194 | 1カラム。シーンと地図の双方に iPad 用の面積を確保する。 |
| タブレット横 | 768px〜1279px かつ landscape | 1024×768、1194×834 | 2カラム。シーンを主領域、推測パネルを副領域とする。 |
| スマホ横の上書き | max-width:1099px、max-height:600px、landscape | 932×430 | 2カラムを維持しつつ、シーン・地図の高さ、見出し、余白を縮小する。 |
| デスクトップ | min-width:1280px | 1280×800 以上 | 現行レイアウトを基準として維持する。 |

768px〜1279px をタブレット／狭幅タブレット帯とする。要件の「768〜1099px 程度」だけで切ると、受入対象の iPad 横 1194×834 がデスクトップ用ルールへ移り、iPad 向けの比率調整を適用できないためである。1280px をデスクトップ境界に固定することで、NFR-1 の基準幅と受入対象を一致させる。

ブレークポイントは CSS のメディアクエリに直接記述する。CSS カスタムプロパティをメディアクエリの閾値として利用する設計にはしない。

### 3.2 ビューポート単位の適用方針

画面全体やビューアの高さは、以下の順でフォールバックを記述する。

~~~css
min-height: 100vh;
min-height: 100svh;
min-height: 100dvh;
~~~

100vh は未対応ブラウザ向けのフォールバック、100svh はブラウザ UI が表示されている状態でも見切れにくい安定値、100dvh はアドレスバーの展開・収納後の表示領域に追従する値として扱う。現行の min-height:100vh は残すため、デスクトップや旧ブラウザでの基本挙動を維持する。

ビューアは 69vh / 48vh の単独指定を廃止し、各帯で svh を先に設定してから dvh を上書きする。高さが極端に低いスマホ横では、dvh の割合だけに依存せず min-height と上下の画面構造を縮小して、シーンと地図の双方を同時に視認できるようにする。

### 3.3 safe-area の適用方針

index.html の viewport meta に viewport-fit=cover を追加し、次の領域で safe-area を吸収する。

~~~css
env(safe-area-inset-top, 0px)
env(safe-area-inset-right, 0px)
env(safe-area-inset-bottom, 0px)
env(safe-area-inset-left, 0px)
~~~

- .title-screen、.final-screen、.game-screen、.result-screen、.fatal の上下左右 padding に inset を加算する。
- .game-screen の下部 padding に bottom inset を加え、sticky の .confirm が画面端のホームインジケータと重ならないようにする。
- .confirm の sticky offset は bottom: max(12px, env(safe-area-inset-bottom, 0px)) とする。ボタン自身の高さは 44px 以上、通常状態では 52px を目安とする。
- 左右 inset は full-screen の画面 padding に加算する。横向き iPhone の notch がある場合も、タイトル、地図、リンクが端に接しないことを保証する。
- safe-area が 0 の環境では従来の余白値と同じになるよう、max() と fallback 値を使用する。

### 3.4 共通レイアウト方針

- html、body、#root は少なくとも画面高を満たす。body は overflow-x:hidden とし、背景装飾や box-shadow が横スクロール領域を作らないようにする。
- 画面の min-height は維持し、内容が短い横画面や最終結果で縦に収まらない場合は overflow-y:auto を許可する。内容を overflow:hidden で切り捨てない。
- box-sizing:border-box は現行どおり維持する。幅指定には minmax(0, ...)、width:min(...,100%) を使い、グリッド子要素の長い地名やリンクが横方向へ押し広げないようにする。
- 主要操作の見た目のフォントサイズは原則維持し、タップ領域は padding と min-height で 44×44 CSS px 以上にする。
- デスクトップの配色、フォント、背景グリッド、orb、影の表現は変更しない。小画面では orb の寸法とタイトルの文字サイズだけを縮小する。

### 3.5 画面別レイアウト基本設計

#### 3.5.1 タイトル画面

| デバイス帯 | レイアウト方針 |
|---|---|
| スマホ縦 | 画面内側 padding を 24px 前後に縮小する。h1 は 320px 幅でも一行の GEOSAKA が収まるサイズにし、説明文、開始ボタン、HOW TO、規約リンクを縦に配置する。HOW TO は2列相当で折り返す。 |
| スマホ横 | 上下 padding と各要素の margin を縮小し、h1、コピー、開始ボタン、HOW TO、規約リンクが 430px 高に収まることを優先する。収まらない場合は縦スクロールを許可する。 |
| iPad縦 | 世界観を保った大きめの見出しを維持し、画面中央寄せを基本とする。左右の余白を 32〜48px 程度にし、タイトルが 768px 幅の中央領域からはみ出さないようにする。 |
| iPad横 | デスクトップに近い大きさを維持するが、横幅いっぱいに引き伸ばさず、既存の max-width と padding を使う。背景グリッドと orb は表示する。 |
| デスクトップ | 現行値を維持する。 |

#### 3.5.2 ラウンド画面

| デバイス帯 | レイアウト方針 |
|---|---|
| スマホ縦 | .round-grid を1カラムとし、シーン → 推測パネル内の地図 → pin status → sticky 確定ボタンの順に流す。ビューアは概ね 48dvh、地図は概ね 40dvh を基準にする。 |
| スマホ横 | .round-grid を2カラムに戻し、シーンと地図を同時に画面内へ置く。見出し・説明・地図・ボタンを短い高さに合わせて縮小し、シーン側と地図側が同じ画面高で視認できるようにする。 |
| iPad縦 | .round-grid は1カラムとする。768px 幅では現行デスクトップの minmax(330px,.8fr) を使わず、シーンと地図をそれぞれ横幅いっぱいに配置する。 |
| iPad横 | 2カラムを維持する。シーンをおよそ 1.25、推測パネルを 0.85 の比率とし、現行より副領域に必要な 280px 以上の幅を確保する。 |
| デスクトップ | 現行の minmax(0,1.55fr) minmax(330px,.8fr)、69vh 系の見た目を基準として維持する。 |

#### 3.5.3 ラウンド結果画面

| デバイス帯 | レイアウト方針 |
|---|---|
| スマホ縦 | .result-hero を1カラム相当へ変更し、得点の下に距離を配置する。結果地図は横幅いっぱいの 240px 以上、.reveal は1カラム、クレジットは上罫線付きで下段に置く。次ボタンは float を解除して通常フローの全幅ボタンとする。 |
| スマホ横 | 結果ヒーローは横並びを基本とし、得点文字を dvh に合わせて縮小する。結果地図を短い矩形にし、説明と次ボタンが横幅からあふれないようにする。 |
| iPad縦 | 結果地図を十分な高さで表示し、.reveal は番号＋説明の2列、クレジットは下段へ送る。 |
| iPad横 | 結果地図と .reveal の情報量を保ち、番号・場所説明・クレジットの3領域を利用可能な幅に合わせて配置する。次ボタンは右寄せの通常フローとする。 |
| デスクトップ | .result-hero、.reveal の3列、.next-button の右 float を現行基準として維持する。 |

#### 3.5.4 最終結果画面

| デバイス帯 | レイアウト方針 |
|---|---|
| スマホ縦 | GAME OVER、合計点、内訳、再プレイボタンを1列で配置する。内訳の距離列は狭幅では省略しても点数と場所名が残る設計とする。内容が1画面に収まらない場合は縦スクロールする。 |
| スマホ横 | 見出し、合計点、内訳の行間を縮小し、短い高さに合わせる。内訳が収まらない場合は縦スクロールを許可し、行を切り捨てない。 |
| iPad縦 | 大きな見出しと合計点を維持しつつ、内訳を画面幅内に収める。4列の内訳は維持できる幅を確保する。 |
| iPad横 | 現行の横方向の情報密度を維持し、再プレイボタンを内訳の直下に配置する。 |
| デスクトップ | 現行の見出し、合計点、内訳、ボタンの比率を維持する。 |

## 4. 詳細設計

### 4.1 index.html

#### 変更内容

現状:

~~~html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
~~~

変更後:

~~~html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
~~~

safe-area の実効値を有効にするための属性追加だけとする。lang、theme-color、title、script の読み込みは変更しない。

### 4.2 src/index.css 共通セレクタ

以下は現行セレクタ単位の変更仕様である。記載した数値は実装時の基準値であり、デスクトップ用の現行値を上書きしない範囲で適用する。

| セレクタ | 現状（before） | 変更後（after） |
|---|---|---|
| body | margin:0; min-width:320px と背景のみ | overflow-x:hidden を追加する。横スクロール抑止以外の背景、margin、min-width は維持する。 |
| html, body, #root | #root の高さ方針なし | min-height:100% を指定し、画面の min-height が viewport 全体を基準にできるようにする。 |
| .title-screen, .final-screen | min-height:100vh; overflow:hidden; padding:clamp(28px,7vw,110px) | 100vh → 100svh → 100dvh の fallback を追加する。四辺の padding に safe-area inset を加算し、overflow-x:hidden、狭幅帯では overflow-y:auto とする。デスクトップ時の通常 padding 値は維持する。 |
| .game-screen, .result-screen | min-height:100vh; padding:22px clamp(18px,4vw,64px) 44px | 100vh → 100svh → 100dvh を追加する。左右 padding と下 padding に safe-area inset を加算する。 |
| .fatal | min-height:100vh; padding:30px | full-screen 高さの fallback を追加し、左右・下の safe-area を padding に加算する。 |
| .primary-button | padding は 17px 22px、高さの下限なし | min-height:44px を追加する。スマホの主要ボタンは狭幅メディアクエリで min-height:52px とし、文字の見た目は大きく変更しない。 |
| .wordmark | inline のリンク | min-height:44px; display:inline-flex; align-items:center を追加し、ヘッダーのリンクもタップ可能領域を確保する。フォント、色、letter-spacing は維持する。 |

safe-area を加算する padding は、例えば左右で次の形を基準とする。

~~~css
padding-inline-start: max(18px, calc(var(--page-inline) + env(safe-area-inset-left, 0px)));
padding-inline-end: max(18px, calc(var(--page-inline) + env(safe-area-inset-right, 0px)));
padding-bottom: max(44px, calc(44px + env(safe-area-inset-bottom, 0px)));
~~~

--page-inline は各画面の既存 clamp() 値を表すための補助変数として使ってよいが、メディアクエリの条件には使わない。

### 4.3 src/index.css タイトル・最終結果

| セレクタ | 現状（before） | 変更後（after） |
|---|---|---|
| .title-screen h1, .final-screen h1 | font-size:clamp(72px,15vw,210px)、letter-spacing:-.11em。狭幅で max-width のみ。 | max-width:100%; overflow-wrap:normal を追加する。スマホ縦は font-size:clamp(56px,17vw,110px)、スマホ横は clamp(52px,11vw,84px)、iPad は clamp(88px,14vw,160px) を目安にする。狭幅の letter-spacing は -.08em〜-.1em とし、320px で GEOSAKA が収まることを確認する。 |
| .title-screen h1 | margin 20px 0 34px | スマホ縦は margin:16px 0 24px、スマホ横は margin:10px 0 16px。iPad・デスクトップは現行を基準にする。 |
| .title-copy | max-width:520px; line-height:1.9 | スマホでは max-width:100%、font-size:clamp(14px,4.2vw,18px)、line-height:1.7〜1.8 とする。コピーの文言と改行は変更しない。 |
| .title-button | margin-top:30px; width:min(320px,100%) | スマホ縦は margin-top を 24px 前後に縮小し、min-height:52px を追加する。width と shadow の表現は維持する。 |
| .howto | 横方向 flex、gap:22px、margin-top:clamp(52px,9vh,100px) | スマホ縦は gap:8px 12px、margin-top:36px 程度にする。必要に応じて strong を行全体に置き、項目は2列で折り返す。スマホ横は margin-top と gap をさらに縮小する。文言は変更しない。 |
| .legal-links | font:11px、margin-top:28px、リンクに高さ指定なし | flex-wrap:wrap を明示し、各 a を display:inline-flex; align-items:center; min-height:44px とする。リンク文字サイズは維持し、上下余白のみ調整する。 |
| .orb-one, .orb-two | vw と vh による大きさ、画面ごとの差なし | スマホ縦・横で幅と blur を縮小する。背景 grid は残し、orb は width/height の縮小だけで世界観を維持する。 |
| .final-total | flex 横並び、合計点の文字サイズが大きい | スマホ縦では flex-wrap:wrap または縦積みにし、strong のサイズを clamp(56px,18vw,100px) 程度へ縮小する。/25,000 が画面外へ出ないことを優先する。 |
| .breakdown | 行は 42px 1fr auto 90px の4列 | スマホでは 32px minmax(0,1fr) auto とし、em を非表示にする。iPad では4列を維持し、長い場所名には minmax(0,1fr) を使う。 |

### 4.4 src/index.css ラウンド画面

| セレクタ | 現状（before） | 変更後（after） |
|---|---|---|
| .round-grid | grid-template-columns:minmax(0,1.55fr) minmax(330px,.8fr)、gap と padding-top は幅依存 | デスクトップでは現行値を維持する。スマホ縦・iPad縦は grid-template-columns:1fr。iPad横は minmax(0,1.25fr) minmax(280px,.85fr)、スマホ横は minmax(0,1.1fr) minmax(240px,.9fr) とする。全帯で子要素の min-width:0 を保証する。 |
| .game-header | flex-wrap は max-width:780px のみ | スマホ・タブレットで flex-wrap:wrap を適用する。wordmark、round-chip、score-chip の順序は変えず、score は右寄せを維持する。 |
| .photo-viewer | min-height:min(69vh,720px) | デスクトップは現行値を維持する。スマホ縦は min-height:min(48svh,420px) の後に min-height:min(48dvh,420px)、iPad縦は min(50svh,540px)、iPad横は min(70svh,620px) とする。 |
| .guess-panel | min-height:600px、flex column | スマホ縦・iPad縦では min-height:0 とし、縦フローの自然な高さにする。iPad横はシーン領域と揃えるため min-height:min(70dvh,620px) を目安にする。 |
| .map-canvas | height:320px; min-height:260px | スマホ縦は height:clamp(240px,40svh,360px) の後に dvh 版を指定する。スマホ横は height:min(54dvh,260px); min-height:200px、iPad縦は clamp(320px,34dvh,420px)、iPad横は clamp(260px,44dvh,360px) とする。 |
| .pin-status | margin:16px 0 | スマホ横は上下 margin を縮小する。スマホ縦では通常値を維持し、sticky ボタンとの間隔が確保されるようにする。文言は変更しない。 |
| .confirm | margin-top:auto; width:100%。狭幅では position:sticky; bottom:12px | スマホ縦・スマホ横では position:sticky を維持し、bottom:max(12px,env(safe-area-inset-bottom,0px)) に変更する。min-height:52px、z-index:3 を設定し、画面下 padding と組み合わせる。iPad縦では sticky を維持して到達性を確保し、iPad横では通常フローまたは短い sticky とする。 |
| .scene-label | 固定の 10px 文字と margin-bottom:12px | スマホ横だけ margin-bottom を 6〜8px に縮小する。文字の内容、difficulty 表示は変更しない。 |

スマホ縦の実装ルールは、既存の max-width:780px ブロックに追加するのではなく、max-width:767px の専用ブロックとして記述する。780px の境界で iPad 縦がスマホ縦へ落ちる状態を解消する。

### 4.5 src/index.css ラウンド結果

| セレクタ | 現状（before） | 変更後（after） |
|---|---|---|
| .result-hero | flex 横並び、gap:34px、幅に応じた wrap | スマホ縦は display:grid; grid-template-columns:1fr; gap:16px とし、得点の下に距離を置く。スマホ横・iPad は横並びを維持し、gap のみ帯に合わせる。 |
| .result-score strong | clamp(58px,10vw,130px) | スマホ縦は clamp(58px,18vw,100px)、スマホ横は clamp(48px,13vw,82px)。iPad・デスクトップは現行を基準にする。 |
| .distance | 左罫線、padding-left:28px | スマホ縦は左罫線を上罫線に変更し、border-left:0; border-top:1px solid var(--line); padding:14px 0 0 とする。横並び可能な帯では現行の左罫線を維持する。 |
| .result-map | height:clamp(260px,38vw,450px) | スマホ縦は height:clamp(240px,40dvh,360px)、スマホ横は height:min(54dvh,280px)、iPad は height:clamp(300px,42dvh,450px) を目安とする。 |
| .reveal | grid-template-columns:auto 1.2fr .8fr、gap:25px | スマホ縦は grid-template-columns:1fr、gap:16px。番号、説明、credit の順を維持する。iPad縦は番号＋説明の2列、credit は全幅下段。iPad横は3領域を minmax() で縮小可能にする。 |
| .reveal-number | 75px | スマホ縦は font-size:54px 程度、スマホ横は 48px 程度へ縮小する。番号の内容は変更しない。 |
| .credit | 左罫線、左 padding、grid | スマホ縦・iPad縦では上罫線、上 padding、左 padding 0 とし、横幅を全域使用する。リンクの高さは 44px 以上を確保する。 |
| .next-button | float:right; width:min(280px,100%) | max-width:1279px では float:none; display:block; margin-left:auto とし、スマホ縦では width:100%; min-height:52px とする。1280px 以上は現行の float と width を維持する。 |

### 4.6 src/feature.css

| セレクタ | 現状（before） | 変更後（after） |
|---|---|---|
| .street-view-viewer | min-height:min(69vh,720px) | .photo-viewer と同じ fallback とデバイス帯別の高さを適用する。ストリートビュー canvas の position:absolute; inset:0 は変更しない。 |
| .scene-unavailable | min-height:min(69vh,720px); padding:30px | viewer と同じ高さ体系を適用する。狭幅では padding:20px 程度にし、メッセージが横にはみ出さないよう max-width:100% を保証する。 |
| .map-unavailable | min-height:320px | .map-canvas と同じデバイス帯の最小高さを適用する。メッセージの role と表示内容は変更しない。 |
| .panorama-badge | left/bottom 固定 18px/17px | スマホでは left:12px; bottom:max(12px,env(safe-area-inset-bottom,0px)) とする。badge の文言は変更しない。 |
| .legal-links | display:flex; gap:18px; margin-top:28px; font:11px、リンクの高さなし | flex-wrap:wrap、狭幅の margin 調整、各リンク min-height:44px; display:inline-flex; align-items:center を追加する。 |
| @media(max-width:780px) | viewer を 48vh、legal margin のみ調整 | max-width:780px の一括ルールを廃止し、src/index.css の phone/tablet 帯と同じ条件で viewer、unavailable、badge、legal を調整する。 |

.street-view-viewer と .scene-unavailable は RoundScreen.tsx の viewer 分岐で使用されるため、写真表示と同じ高さ設計にする。ストリートビュー API の読み込み、canvas、失敗 callback は変更しない。

### 4.7 メディアクエリの記述順

src/index.css と src/feature.css は、既存のデスクトップ基準ルールを先に置き、次の順で狭い帯の上書きを記述する。

~~~text
共通ルール（現行デスクトップ値を基準）
  ↓
max-width: 767px                         スマホ縦の基本
  ↓
min-width: 768px and max-width: 1279px
and orientation: portrait                iPad縦
  ↓
min-width: 768px and max-width: 1279px
and orientation: landscape               iPad横
  ↓
max-width: 1099px and max-height: 600px
and orientation: landscape               スマホ横の高さ最適化
~~~

スマホ横のルールを最後に置くことで、932×430 がタブレット横の2カラムを継承したうえで、短い高さ向けの見出し・地図・余白を適用できる。min-width:1280px に一致する追加ルールは作らない。

### 4.8 マークアップとロジックの扱い

#### 変更しないもの

- TitleScreen の onStart、busy、streetViewMode と表示文言。
- RoundScreen の onGuess、onConfirm、onPhotoFailure、map/viewer の選択処理。
- RoundResultScreen の onNext、結果地図、距離、クレジット、Street View link の処理。
- FinalResultScreen の合計点計算、内訳表示、onRestart。
- App.tsx の reducer、phase 分岐、Google Maps API のロード処理。

#### 必要な最小変更

- index.html の viewport meta に viewport-fit=cover を追加する。
- CSS セレクタだけでは調整対象を区別できない場合に限り、該当要素へ className を追加する。その場合も props、state、イベント、DOM の順序は変更しない。

現行 class で要件を満たせる見込みが高いため、標準実装では React コンポーネントの変更は発生しない。

## 5. 検証設計

### 5.1 ビューポート一覧

以下の全サイズで、タイトル、ラウンド、ラウンド結果、最終結果の4画面を確認する。

| 区分 | ビューポート | 主な検証目的 |
|---|---:|---|
| 最小スマホ縦 | 320×568 | h1、コピー、ボタン、HOW TO、legal links の横はみ出しがない。 |
| 標準スマホ縦 | 375×812 | ラウンドの写真、地図、sticky 確定ボタンが自然な縦フローになる。 |
| 大型スマホ縦 | 430×932 | 余白とビューアが過大にならず、結果・最終結果が崩れない。 |
| スマホ横 | 932×430 | シーンと地図が同時に視認でき、短い高さで操作できる。 |
| iPad縦 | 768×1024 | 780px 境界による誤分類がなく、1カラムのシーン・地図が成立する。 |
| iPad縦・大型 | 810×1080、834×1194 | 1カラムの余白、viewer、地図のサイズが過大にならない。 |
| iPad横 | 1024×768 | 2カラムの比率、地図の操作領域、確定ボタンの到達性を確認する。 |
| iPad横・大型 | 1194×834 | タブレット横用比率が適用され、狭すぎる副領域や過剰な引き伸ばしがない。 |
| デスクトップ基準 | 1280×800 | 現行デザインとの目視比較を行い、デグレがない。 |

### 5.2 画面別確認観点

#### タイトル画面

- 320px 幅で GEOSAKA、コピー、開始ボタンが左右にはみ出さない。
- 開始ボタンの disabled / busy 表示が現行どおり機能する。
- HOW TO の項目と利用規約・プライバシーリンクが読め、リンクのタップ領域が 44×44px 以上ある。
- スマホ横で背景装飾がコンテンツを隠さず、必要時の縦スクロールで内容が確認できる。

#### ラウンド画面

- スマホ縦でシーン → 地図 → pin status → 確定の順になっている。
- 地図をタップしてピンを置く、確定する、確定ボタンが無効な状態で処理されない、の挙動が変わらない。
- スマホ縦で確定ボタンが safe-area の下に隠れず、スクロール中も到達可能である。
- 932×430 でシーンと地図が両方見え、地図操作後に確定ボタンへ到達できる。
- iPad縦は1カラム、iPad横は2カラムで、round-grid の子要素が横幅を押し広げない。
- 写真表示失敗、ストリートビュー表示失敗、地図表示失敗の表示領域が同じ帯の高さ方針に従う。

#### ラウンド結果画面

- 得点、距離、結果地図、スポット名、説明、クレジット、次ボタンが重ならない。
- スマホ縦の距離ブロックが得点に重ならず、次ボタンが float の回り込みで狭くならない。
- 次のラウンドへ／最終結果を見るのイベントが現行どおり動作する。
- 外部クレジットリンクが 44px 以上のタップ領域を持ち、target / rel の挙動を変更しない。

#### 最終結果画面

- 合計点、/ 25,000、5件の内訳、再プレイボタンが 320px 幅で横にはみ出さない。
- 必要な場合に縦スクロールでき、内訳の行が overflow:hidden で切れない。
- 再プレイで既存のゲーム開始処理が呼ばれ、表示のために state を変更していない。

### 5.3 機械的な確認

ブラウザの各 viewport で次を確認する。

~~~js
document.documentElement.scrollWidth <= window.innerWidth
~~~

上記が true であることを全対象 viewport で確認する。併せて、主要要素の getBoundingClientRect() の right が viewport 幅を超えないこと、sticky ボタンの bottom が safe-area を含む画面下端より上にあることを確認する。

### 5.4 ビルド・既存挙動確認

1. npm run build を実行し、TypeScript と Vite のビルドが成功することを確認する。
2. tests/ 配下の既存テストを実行し、CSS と viewport meta の変更でゲームロジックのテスト結果が変わらないことを確認する。
3. 開発サーバーでタイトル → ラウンド → ピン配置 → 確定 → ラウンド結果 → 最終結果 → 再プレイの一巡を実行する。
4. API キーなしの写真モードと、設定されている場合のストリートビューモードの両方で、対象 viewer の高さと失敗表示を確認する。
5. 1280×800 以上のスクリーンショットを改修前と比較し、配色、フォント、背景、2カラム比率、結果の3列構造に意図しない差がないことを目視確認する。

## 6. 実装受け入れ条件

- ブレークポイントが 767px / 768px / 1279px / 1280px の境界で意図どおり切り替わり、768×1024 はタブレット縦、1024×768 と 1194×834 はタブレット横として表示される。
- 932×430 は短い横画面用の高さ最適化が適用され、シーンと地図が同時に視認できる。
- full-screen と viewer の主要高さに 100dvh / dvh が適用され、100vh / vh の fallback が残っている。
- title、final、game、result、fatal の画面と sticky 確定ボタンに safe-area が反映される。
- 全受入 viewport で横スクロール、要素の見切れ、意図しない重なりがない。
- 主要ボタン、wordmark、規約リンク、クレジットリンクのタップ領域が 44×44px 以上である。
- 1280px 以上の現行デザインに意図しない変更がない。
- React のゲームロジック、props/state、イベント、画面遷移、外部リソースの扱いが不変である。
- 新規依存がなく、ビルドと既存テストが成功する。

## 7. 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-07-13 | レスポンシブデザイン改修の基本設計・詳細設計を作成。ブレークポイント、dvh/svh、safe-area、画面別レイアウト、CSS変更単位、検証手順を確定した。 |

