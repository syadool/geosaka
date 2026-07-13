import type { Coordinate } from "../game/types";

function isValidCoordinate({ lat, lng }: Coordinate): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function buildStreetViewExternalUrl(coordinate: Coordinate): string | null {
  if (!isValidCoordinate(coordinate)) return null;

  const url = new URL("https://www.google.com/maps/@");
  url.searchParams.set("api", "1");
  url.searchParams.set("map_action", "pano");
  url.searchParams.set("viewpoint", `${coordinate.lat},${coordinate.lng}`);
  url.searchParams.set("fov", "90");
  url.searchParams.set("pitch", "0");
  return url.toString();
}
