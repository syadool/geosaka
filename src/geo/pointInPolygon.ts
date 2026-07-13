import type { Coordinate } from "../game/types";

export type PolygonRing = readonly [number, number][];
export type Polygon = readonly PolygonRing[];
export type MultiPolygon = readonly Polygon[];

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const EPSILON = 1e-10;

function isFiniteCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function isPointOnSegment(point: Coordinate, start: readonly [number, number], end: readonly [number, number]): boolean {
  const [x, y] = [point.lng, point.lat];
  const [x1, y1] = start;
  const [x2, y2] = end;
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  if (Math.abs(cross) > EPSILON) return false;
  return x >= Math.min(x1, x2) - EPSILON && x <= Math.max(x1, x2) + EPSILON && y >= Math.min(y1, y2) - EPSILON && y <= Math.max(y1, y2) + EPSILON;
}

function isPointInRing(point: Coordinate, ring: PolygonRing): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]!;
    const prior = ring[previous]!;
    if (isPointOnSegment(point, prior, current)) return true;

    const [x, y] = [point.lng, point.lat];
    const intersects = (prior[1] > y) !== (current[1] > y) && x < ((current[0] - prior[0]) * (y - prior[1])) / (current[1] - prior[1]) + prior[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function isPointInPolygon(point: Coordinate, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !isPointInRing(point, outer)) return false;
  return holes.every((hole) => !isPointInRing(point, hole));
}

export function isPointInMultiPolygon(point: Coordinate, multipolygon: MultiPolygon): boolean {
  if (!isFiniteCoordinate(point)) return false;
  return multipolygon.some((polygon) => isPointInPolygon(point, polygon));
}

export function getBounds(multipolygon: MultiPolygon): Bounds {
  const points = multipolygon.flatMap((polygon) => polygon.flatMap((ring) => ring));
  if (points.length === 0) throw new Error("Boundary has no coordinates");
  return points.reduce<Bounds>(
    (bounds, [lng, lat]) => ({
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity },
  );
}

export function randomCoordinateInBounds(bounds: Bounds, random: () => number = Math.random): Coordinate {
  if (![bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].every(Number.isFinite) || bounds.minLat > bounds.maxLat || bounds.minLng > bounds.maxLng) {
    throw new Error("Invalid coordinate bounds");
  }
  return {
    lat: bounds.minLat + random() * (bounds.maxLat - bounds.minLat),
    lng: bounds.minLng + random() * (bounds.maxLng - bounds.minLng),
  };
}
