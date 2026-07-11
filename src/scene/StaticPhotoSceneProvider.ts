import { spots } from "../data/spots";
import type { Scene } from "../game/types";
import { validateSpot } from "./validateSpot";
import type { SceneProvider } from "./types";

export class StaticPhotoSceneProvider implements SceneProvider {
  async getAvailableScenes(): Promise<readonly Scene[]> {
    return spots.filter(validateSpot).map((spot) => ({ id: spot.id, location: { lat: spot.latitude, lng: spot.longitude }, display: { kind: "photo", imageUrl: spot.photoUrl, alt: spot.photoAlt }, reveal: { nameJa: spot.nameJa, descriptionJa: spot.descriptionJa, credit: spot.credit }, difficulty: spot.difficulty }));
  }
}
