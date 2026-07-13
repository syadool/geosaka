import type { Coordinate, Scene } from "../game/types";
import { OSAKA_BOUNDARY } from "../data/osakaBoundary";
import { getBounds, isPointInMultiPolygon, randomCoordinateInBounds, type MultiPolygon } from "../geo/pointInPolygon";
import { createStreetViewSearchClient, NoPanoramaError, TransientStreetViewError } from "../maps/googleStreetViewService";
import { toCoordinate } from "../maps/googleTypes";
import type { GoogleMapsApi } from "../maps/googleTypes";
import type { SceneProvider } from "./types";

export const REPLACEMENT_RESERVE = 3;
export const SCENE_POOL_SIZE = 5 + REPLACEMENT_RESERVE;
export const MAX_ATTEMPTS_PER_SCENE = 20;

type StreetViewSceneProviderOptions = {
  googleMaps: GoogleMapsApi;
  boundary?: MultiPolygon;
  random?: () => number;
  sceneCount?: number;
};

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.lat.toFixed(5)},${coordinate.lng.toFixed(5)}`;
}

export class SceneGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneGenerationError";
  }
}

export class StreetViewSceneProvider implements SceneProvider {
  private readonly googleMaps: GoogleMapsApi;
  private readonly boundary: MultiPolygon;
  private readonly random: () => number;
  private readonly sceneCount: number;

  constructor(options: StreetViewSceneProviderOptions) {
    this.googleMaps = options.googleMaps;
    this.boundary = options.boundary ?? OSAKA_BOUNDARY;
    this.random = options.random ?? Math.random;
    this.sceneCount = options.sceneCount ?? SCENE_POOL_SIZE;
  }

  async getAvailableScenes(): Promise<readonly Scene[]> {
    const searchClient = createStreetViewSearchClient(this.googleMaps);
    const bounds = getBounds(this.boundary);
    const scenes: Scene[] = [];
    const usedPanos = new Set<string>();
    const usedCoordinates = new Set<string>();

    for (let index = 0; index < this.sceneCount; index += 1) {
      scenes.push(await this.createScene(searchClient, bounds, usedPanos, usedCoordinates, index));
    }
    return scenes;
  }

  private async createScene(
    searchClient: ReturnType<typeof createStreetViewSearchClient>,
    bounds: ReturnType<typeof getBounds>,
    usedPanos: Set<string>,
    usedCoordinates: Set<string>,
    sequence: number,
  ): Promise<Scene> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_SCENE; attempt += 1) {
      const seed = randomCoordinateInBounds(bounds, this.random);
      if (!isPointInMultiPolygon(seed, this.boundary)) continue;

      try {
        const panorama = await searchClient.getPanorama({ location: seed, radius: 500 });
        const panoId = panorama.pano;
        const latLng = panorama.location?.latLng;
        if (!panoId || !latLng) continue;
        const location = toCoordinate(latLng);
        const key = coordinateKey(location);
        if (usedPanos.has(panoId) || usedCoordinates.has(key) || !isPointInMultiPolygon(location, this.boundary)) continue;

        usedPanos.add(panoId);
        usedCoordinates.add(key);
        return {
          id: `streetview-${sequence + 1}-${panoId}`,
          location,
          display: { kind: "streetview", panoId, alt: "大阪府内の街並みを見回すストリートビュー" },
          reveal: { nameJa: "大阪府内のランダム地点", descriptionJa: "大阪府境内からランダムに選ばれた地点です。" },
          difficulty: "normal",
        };
      } catch (error) {
        if (error instanceof NoPanoramaError || error instanceof TransientStreetViewError) continue;
        throw error;
      }
    }
    throw new SceneGenerationError("Could not find a Street View panorama within the attempt limit");
  }
}
