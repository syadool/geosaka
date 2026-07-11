import type { Coordinate } from "../game/types";
const R = 6371.0088;
const radians = (n: number) => n * Math.PI / 180;
export function calculateDistanceKm(a: Coordinate, b: Coordinate): number {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) throw new Error("Invalid coordinate");
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
