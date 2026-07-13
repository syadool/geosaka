export const ROUND_COUNT = 5;
export type Coordinate = { lat: number; lng: number };
export type Difficulty = "easy" | "normal" | "hard";
export type PhotoCredit = { author: string; licenseName: string; sourceUrl: string };
export type SpotData = { id: string; nameJa: string; latitude: number; longitude: number; photoUrl: string; photoAlt: string; credit: PhotoCredit; descriptionJa: string; difficulty: Difficulty };
export type SceneDisplay =
  | { kind: "photo"; imageUrl: string; alt: string }
  | { kind: "streetview"; panoId: string; alt: string };
export type SceneReveal = { nameJa: string; descriptionJa: string; credit?: PhotoCredit };
export type Scene = { id: string; location: Coordinate; display: SceneDisplay; reveal: SceneReveal; difficulty: Difficulty };
export type RoundResult = { roundNumber: number; scene: Scene; guess: Coordinate; answer: Coordinate; distanceKm: number; score: number };
export type GamePhase = "title" | "round" | "roundResult" | "finalResult" | "fatalError";
export type SceneSource = "photo" | "streetview";
export type GameState = { phase: GamePhase; source: SceneSource; roundIndex: number; scenes: Scene[]; candidatePool: Scene[]; failedIds: string[]; currentGuess: Coordinate | null; results: RoundResult[]; error: string | null };
