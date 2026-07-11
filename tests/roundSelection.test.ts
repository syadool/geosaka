import { expect, it } from "vitest";
import { selectRounds } from "../src/game/roundSelection";
import { StaticPhotoSceneProvider } from "../src/scene/StaticPhotoSceneProvider";
it("selects five unique rounds and preserves a separate replacement pool", async () => { const scenes = await new StaticPhotoSceneProvider().getAvailableScenes(); const { rounds, candidates } = selectRounds(scenes); expect(rounds).toHaveLength(5); expect(new Set(rounds.map((s) => s.id)).size).toBe(5); expect(candidates.some((s) => rounds.some((r) => r.id === s.id))).toBe(false); });
