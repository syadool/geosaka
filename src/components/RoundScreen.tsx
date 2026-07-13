import type { Coordinate, Scene } from "../game/types";
import { GuessMap } from "./GuessMap";
import { PhotoViewer } from "./PhotoViewer";
import { GoogleGuessMap } from "./GoogleGuessMap";
import { StreetViewViewer } from "./StreetViewViewer";
import type { GoogleMapsApi } from "../maps/googleTypes";

type Props = { scene: Scene; round: number; total: number; guess: Coordinate | null; score: number; onGuess: (point: Coordinate) => void; onConfirm: () => void; onPhotoFailure: () => void; googleMaps?: GoogleMapsApi | null };

export function RoundScreen({ scene, round, total, guess, score, onGuess, onConfirm, onPhotoFailure, googleMaps }: Props) {
  const isStreetView = scene.display.kind === "streetview";
  const viewer = scene.display.kind === "streetview" ? (
    googleMaps ? <StreetViewViewer googleMaps={googleMaps} panoId={scene.display.panoId} coordinate={scene.location} title={scene.display.alt} onFailure={onPhotoFailure} /> : <div className="scene-unavailable" role="alert">ストリートビューを準備できません。</div>
  ) : <PhotoViewer src={scene.display.imageUrl} alt={scene.display.alt} onFailure={onPhotoFailure} />;
  const map = scene.display.kind === "streetview" ? (
    googleMaps ? <GoogleGuessMap googleMaps={googleMaps} guess={guess} onGuess={onGuess} /> : <div className="map-unavailable" role="alert">地図を準備できません。</div>
  ) : <GuessMap guess={guess} onGuess={onGuess} />;

  return <main className="game-screen"><header className="game-header"><a className="wordmark" href="/">GE<span>O</span>SAKA</a><div className="round-chip">ROUND <b>{String(round).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}</div><div className="score-chip"><small>RUNNING SCORE</small><b>{score.toLocaleString()}</b></div></header><section className="round-grid"><div className="scene-column"><div className="scene-label"><span>{isStreetView ? "LIVE PANORAMA / OSAKA PREF." : "LIVE PHOTO / OSAKA PREF."}</span><i>{scene.difficulty}</i></div>{viewer}</div><aside className="guess-panel"><div><p className="panel-kicker">PINPOINT THE PLACE</p><h2>ここは、<br /><em>どこや？</em></h2><p className="hint">{isStreetView ? "道を歩いて手がかりを探し、地図に答えを置いてください。" : "地図をタップして、あなたの答えを置いてください。"}</p></div>{map}<p className={`pin-status ${guess ? "placed" : ""}`}>{guess ? "ピンを置きました。これで勝負しますか？" : "まだピンがありません"}</p><button className="primary-button confirm" disabled={!guess} onClick={onConfirm}>推測を確定する <b>↗</b></button></aside></section></main>;
}
