export const SCORE_DECAY_KM = 4;
export function calculateRoundScore(distanceKm: number, k = SCORE_DECAY_KM): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("Invalid distance");
  if (distanceKm <= 0.1) return 5000;
  return Math.min(5000, Math.max(0, Math.round(5000 * Math.exp(-distanceKm / k))));
}
export const getTotalScore = (results: readonly { score: number }[]): number => results.reduce((sum, result) => sum + result.score, 0);
