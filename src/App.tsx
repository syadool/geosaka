import { useCallback, useReducer } from "react";
import { TitleScreen } from "./components/TitleScreen";
import { RoundScreen } from "./components/RoundScreen";
import { RoundResultScreen } from "./components/RoundResultScreen";
import { FinalResultScreen } from "./components/FinalResultScreen";
import { gameReducer, initialState } from "./game/gameReducer";
import { selectRounds } from "./game/roundSelection";
import { ROUND_COUNT } from "./game/types";
import { StaticPhotoSceneProvider } from "./scene/StaticPhotoSceneProvider";
import { getTotalScore } from "./scoring/score";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const start = useCallback(async () => { try { const scenes = await new StaticPhotoSceneProvider().getAvailableScenes(); const selected = selectRounds(scenes); dispatch({ type: "START", scenes: selected.rounds, candidatePool: selected.candidates }); } catch { dispatch({ type: "FATAL", message: "ゲームの準備に失敗しました。" }); } }, []);
  if (state.phase === "fatalError") return <main className="fatal"><p>GEOSAKA</p><h1>{state.error}</h1><button className="primary-button" onClick={() => dispatch({ type: "RESET" })}>タイトルへ戻る</button></main>;
  if (state.phase === "title") return <TitleScreen onStart={start} />;
  if (state.phase === "round") { const scene = state.scenes[state.roundIndex]; return <RoundScreen scene={scene} round={state.roundIndex + 1} total={ROUND_COUNT} guess={state.currentGuess} score={getTotalScore(state.results)} onGuess={(guess) => dispatch({ type: "SET_GUESS", guess })} onConfirm={() => dispatch({ type: "CONFIRM" })} onPhotoFailure={() => dispatch({ type: "IMAGE_FAILED" })} />; }
  if (state.phase === "roundResult") return <RoundResultScreen result={state.results[state.results.length - 1]!} final={state.roundIndex === ROUND_COUNT - 1} onNext={() => dispatch({ type: "NEXT" })} />;
  return <FinalResultScreen results={state.results} onRestart={start} />;
}
