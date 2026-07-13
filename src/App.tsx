import { useCallback, useReducer, useState } from "react";
import { TitleScreen } from "./components/TitleScreen";
import { RoundScreen } from "./components/RoundScreen";
import { RoundResultScreen } from "./components/RoundResultScreen";
import { FinalResultScreen } from "./components/FinalResultScreen";
import { gameReducer, initialState } from "./game/gameReducer";
import { selectRounds } from "./game/roundSelection";
import { ROUND_COUNT } from "./game/types";
import { StaticPhotoSceneProvider } from "./scene/StaticPhotoSceneProvider";
import { StreetViewSceneProvider } from "./scene/StreetViewSceneProvider";
import { getGoogleMapsApiKey } from "./config/maps";
import { loadGoogleMaps } from "./maps/googleMapsLoader";
import type { GoogleMapsApi } from "./maps/googleTypes";
import { getTotalScore } from "./scoring/score";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [googleMaps, setGoogleMaps] = useState<GoogleMapsApi | null>(null);
  const [starting, setStarting] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      if (!apiKey) {
        setGoogleMaps(null);
        const scenes = await new StaticPhotoSceneProvider().getAvailableScenes();
        const selected = selectRounds(scenes);
        dispatch({ type: "START", source: "photo", scenes: selected.rounds, candidatePool: selected.candidates });
        return;
      }

      const maps = await loadGoogleMaps(apiKey);
      const scenes = await new StreetViewSceneProvider({ googleMaps: maps }).getAvailableScenes();
      const selected = selectRounds(scenes);
      setGoogleMaps(maps);
      dispatch({ type: "START", source: "streetview", scenes: selected.rounds, candidatePool: selected.candidates });
    } catch (error) {
      console.error("GeOsaka game preparation failed", error instanceof Error ? error.message : "unknown error");
      dispatch({ type: "FATAL", message: apiKey ? "ストリートビューの準備に失敗しました。設定を確認して再試行してください。" : "ゲームの準備に失敗しました。" });
    } finally {
      setStarting(false);
    }
  }, [apiKey, starting]);
  if (state.phase === "fatalError") return <main className="fatal"><p>GEOSAKA</p><h1>{state.error}</h1><button className="primary-button" onClick={() => dispatch({ type: "RESET" })}>タイトルへ戻る</button></main>;
  if (state.phase === "title") return <TitleScreen onStart={start} busy={starting} streetViewMode={Boolean(apiKey)} />;
  if (state.phase === "round") { const scene = state.scenes[state.roundIndex]; return <RoundScreen scene={scene} round={state.roundIndex + 1} total={ROUND_COUNT} guess={state.currentGuess} score={getTotalScore(state.results)} googleMaps={state.source === "streetview" ? googleMaps : null} onGuess={(guess) => dispatch({ type: "SET_GUESS", guess })} onConfirm={() => dispatch({ type: "CONFIRM" })} onPhotoFailure={() => dispatch({ type: "IMAGE_FAILED" })} />; }
  if (state.phase === "roundResult") return <RoundResultScreen result={state.results[state.results.length - 1]!} final={state.roundIndex === ROUND_COUNT - 1} googleMaps={state.source === "streetview" ? googleMaps : null} onNext={() => dispatch({ type: "NEXT" })} />;
  return <FinalResultScreen results={state.results} onRestart={start} />;
}
