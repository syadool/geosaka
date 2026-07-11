import { expect, it } from "vitest";
import { gameReducer, initialState } from "../src/game/gameReducer";
import { StaticPhotoSceneProvider } from "../src/scene/StaticPhotoSceneProvider";
it("replaces a failed scene from candidates and never puts its id back", async () => { const all = [...await new StaticPhotoSceneProvider().getAvailableScenes()]; const state = gameReducer(initialState, { type: "START", scenes: all.slice(0, 5), candidatePool: all.slice(5) }); const next = gameReducer(state, { type: "IMAGE_FAILED" }); expect(next.scenes[0].id).not.toBe(all[0].id); expect(next.failedIds).toContain(all[0].id); expect(next.candidatePool.map((x) => x.id)).not.toContain(next.scenes[0].id); });
