import { describe, expect, it } from "vitest";
import { calculateDistanceKm } from "../src/scoring/haversine";
import { calculateRoundScore } from "../src/scoring/score";
describe("scoring", () => { it("awards 5000 within 100m and decays after", () => { expect(calculateRoundScore(0.1)).toBe(5000); expect(calculateRoundScore(0.101)).toBeLessThan(5000); expect(calculateRoundScore(10)).toBeLessThan(calculateRoundScore(3)); }); it("calculates zero distance", () => expect(calculateDistanceKm({ lat: 34.7, lng: 135.5 }, { lat: 34.7, lng: 135.5 })).toBe(0)); });
