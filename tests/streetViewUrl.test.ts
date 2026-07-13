import { expect, it } from "vitest";
import { buildStreetViewExternalUrl } from "../src/utils/streetViewUrl";

it("builds a keyless Google Maps Street View URL from a valid coordinate", () => {
  const value = buildStreetViewExternalUrl({ lat: 34.6873, lng: 135.5262 });
  expect(value).not.toBeNull();

  const url = new URL(value!);
  expect(url.origin).toBe("https://www.google.com");
  expect(url.pathname).toBe("/maps/@");
  expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("map_action")).toBe("pano");
  expect(url.searchParams.get("viewpoint")).toBe("34.6873,135.5262");
  expect(url.searchParams.get("fov")).toBe("90");
  expect(url.searchParams.get("pitch")).toBe("0");
  expect(url.searchParams.has("key")).toBe(false);
});

it.each([
  { lat: 91, lng: 135 },
  { lat: -91, lng: 135 },
  { lat: 34, lng: 181 },
  { lat: 34, lng: -181 },
  { lat: Number.NaN, lng: 135 },
  { lat: 34, lng: Number.POSITIVE_INFINITY },
])("rejects an invalid coordinate: %#", (coordinate) => {
  expect(buildStreetViewExternalUrl(coordinate)).toBeNull();
});
