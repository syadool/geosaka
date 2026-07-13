import { describe, expect, it, vi } from "vitest";
import type { Coordinate } from "../src/game/types";
import type { GoogleMapsApi, GoogleStreetViewPanoramaData } from "../src/maps/googleTypes";
import { StreetViewSceneProvider } from "../src/scene/StreetViewSceneProvider";
import type { MultiPolygon } from "../src/geo/pointInPolygon";

const boundary: MultiPolygon = [[[[135, 34], [136, 34], [136, 35], [135, 35], [135, 34]]]];

function panorama(pano: string, location: Coordinate): GoogleStreetViewPanoramaData {
  return { pano, location: { latLng: location } };
}

function createGoogle(statuses: string[], data: GoogleStreetViewPanoramaData[]): GoogleMapsApi {
  let index = 0;
  const getPanorama = vi.fn((_request: unknown, callback: (data: GoogleStreetViewPanoramaData | null, status: string) => void) => {
    const current = index++;
    callback(data[current] ?? null, statuses[current] ?? "ZERO_RESULTS");
  });
  class StreetViewService {
    getPanorama = getPanorama;
  }
  return {
    StreetViewService,
    StreetViewPreference: { NEAREST: "nearest" },
    StreetViewSource: { GOOGLE: "google", OUTDOOR: "outdoor" },
    StreetViewStatus: { OK: "OK", ZERO_RESULTS: "ZERO_RESULTS", UNKNOWN_ERROR: "UNKNOWN_ERROR" },
  } as unknown as GoogleMapsApi;
}

describe("StreetViewSceneProvider", () => {
  it("retries unavailable panoramas and stores the returned panorama coordinate", async () => {
    const googleMaps = createGoogle(
      ["ZERO_RESULTS", "OK"],
      [null as unknown as GoogleStreetViewPanoramaData, panorama("pano-a", { lat: 34.7, lng: 135.5 })],
    );
    const scenes = await new StreetViewSceneProvider({ googleMaps, boundary, sceneCount: 1, random: () => 0.5 }).getAvailableScenes();
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.location).toEqual({ lat: 34.7, lng: 135.5 });
    expect(scenes[0]?.display).toMatchObject({ kind: "streetview", panoId: "pano-a" });
  });

  it("retries a transient Street View error", async () => {
    const googleMaps = createGoogle(
      ["UNKNOWN_ERROR", "OK"],
      [null as unknown as GoogleStreetViewPanoramaData, panorama("pano-b", { lat: 34.6, lng: 135.4 })],
    );
    const scenes = await new StreetViewSceneProvider({ googleMaps, boundary, sceneCount: 1, random: () => 0.5 }).getAvailableScenes();
    expect(scenes[0]?.display).toMatchObject({ kind: "streetview", panoId: "pano-b" });
  });

  it("keeps searching when the first twenty candidates have no panorama", async () => {
    const unavailableCount = 20;
    const googleMaps = createGoogle(
      [...Array(unavailableCount).fill("ZERO_RESULTS"), "OK"],
      [...Array(unavailableCount).fill(null), panorama("pano-after-dry-run", { lat: 34.7, lng: 135.5 })] as GoogleStreetViewPanoramaData[],
    );

    const scenes = await new StreetViewSceneProvider({ googleMaps, boundary, sceneCount: 1, random: () => 0.5 }).getAvailableScenes();

    expect(scenes[0]?.display).toMatchObject({ kind: "streetview", panoId: "pano-after-dry-run" });
  });

  it("does not reuse panorama ids within one pool", async () => {
    const googleMaps = createGoogle(
      ["OK", "OK", "OK"],
      [panorama("same", { lat: 34.4, lng: 135.4 }), panorama("same", { lat: 34.5, lng: 135.5 }), panorama("next", { lat: 34.6, lng: 135.6 })],
    );
    const scenes = await new StreetViewSceneProvider({ googleMaps, boundary, sceneCount: 2, random: () => 0.5 }).getAvailableScenes();
    expect(scenes.map((scene) => scene.display.kind === "streetview" ? scene.display.panoId : "")).toEqual(["same", "next"]);
  });
});
