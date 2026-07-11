import type { Scene } from "../game/types";
export interface SceneProvider { getAvailableScenes(): Promise<readonly Scene[]> }
