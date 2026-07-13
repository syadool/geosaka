import { describe, expect, it } from "vitest";
import { getBounds, isPointInMultiPolygon, randomCoordinateInBounds, type MultiPolygon } from "../src/geo/pointInPolygon";

const square: MultiPolygon = [[[[135, 34], [136, 34], [136, 35], [135, 35], [135, 34]]]];

describe("point in polygon", () => {
  it("accepts inside and boundary points and rejects outside points", () => {
    expect(isPointInMultiPolygon({ lat: 34.5, lng: 135.5 }, square)).toBe(true);
    expect(isPointInMultiPolygon({ lat: 34, lng: 135.5 }, square)).toBe(true);
    expect(isPointInMultiPolygon({ lat: 35.5, lng: 135.5 }, square)).toBe(false);
  });

  it("supports holes", () => {
    const withHole: MultiPolygon = [[
      [[135, 34], [136, 34], [136, 35], [135, 35], [135, 34]],
      [[135.4, 34.4], [135.6, 34.4], [135.6, 34.6], [135.4, 34.6], [135.4, 34.4]],
    ]];
    expect(isPointInMultiPolygon({ lat: 34.3, lng: 135.3 }, withHole)).toBe(true);
    expect(isPointInMultiPolygon({ lat: 34.5, lng: 135.5 }, withHole)).toBe(false);
  });

  it("calculates bounds and injects randomness", () => {
    expect(getBounds(square)).toEqual({ minLat: 34, maxLat: 35, minLng: 135, maxLng: 136 });
    expect(randomCoordinateInBounds(getBounds(square), () => 0.25)).toEqual({ lat: 34.25, lng: 135.25 });
  });
});
