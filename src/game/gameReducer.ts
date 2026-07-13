import { ROUND_COUNT, type Coordinate, type GameState, type RoundResult, type Scene } from "./types";
import { calculateDistanceKm } from "../scoring/haversine";
import { calculateRoundScore } from "../scoring/score";

export const initialState: GameState = { phase: "title", source: "photo", roundIndex: 0, scenes: [], candidatePool: [], failedIds: [], currentGuess: null, results: [], error: null };
export type GameAction =
  | { type: "START"; source?: GameState["source"]; scenes: Scene[]; candidatePool: Scene[] }
  | { type: "SET_GUESS"; guess: Coordinate }
  | { type: "CONFIRM" }
  | { type: "NEXT" }
  | { type: "IMAGE_FAILED" }
  | { type: "FATAL"; message: string }
  | { type: "RESET" };

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "RESET") return initialState;
  if (action.type === "FATAL") return { ...state, phase: "fatalError", error: action.message };
  if (action.type === "START") return { ...initialState, phase: "round", source: action.source ?? "photo", scenes: action.scenes, candidatePool: action.candidatePool };
  if (action.type === "SET_GUESS" && state.phase === "round") return { ...state, currentGuess: action.guess };
  if (action.type === "IMAGE_FAILED" && state.phase === "round") {
    const failed = state.scenes[state.roundIndex];
    const candidate = state.candidatePool.find((scene) => !state.failedIds.includes(scene.id) && scene.id !== failed.id);
    const failedIds = [...state.failedIds, failed.id];
    if (!candidate) return { ...state, phase: "fatalError", error: "表示できる出題地点が不足しています。タイトルからやり直してください。", failedIds };
    const scenes = [...state.scenes]; scenes[state.roundIndex] = candidate;
    return { ...state, scenes, candidatePool: state.candidatePool.filter((scene) => scene.id !== candidate.id), failedIds, currentGuess: null };
  }
  if (action.type === "CONFIRM" && state.phase === "round" && state.currentGuess) {
    const scene = state.scenes[state.roundIndex], distanceKm = calculateDistanceKm(scene.location, state.currentGuess);
    const result: RoundResult = { roundNumber: state.roundIndex + 1, scene, guess: state.currentGuess, answer: scene.location, distanceKm, score: calculateRoundScore(distanceKm) };
    return { ...state, phase: "roundResult", results: [...state.results, result] };
  }
  if (action.type === "NEXT" && state.phase === "roundResult") return state.roundIndex === ROUND_COUNT - 1 ? { ...state, phase: "finalResult" } : { ...state, phase: "round", roundIndex: state.roundIndex + 1, currentGuess: null };
  return state;
}
