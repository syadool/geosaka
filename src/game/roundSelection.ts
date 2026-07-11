import { ROUND_COUNT, type Scene } from "./types";
export function shuffled<T>(items: readonly T[]): T[] { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
export function selectRounds(scenes: readonly Scene[], count = ROUND_COUNT): { rounds: Scene[]; candidates: Scene[] } { const all = shuffled(scenes); if (all.length < count) throw new Error("有効なスポットが5件未満です"); return { rounds: all.slice(0, count), candidates: all.slice(count) }; }
