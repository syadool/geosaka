import type { MultiPolygon } from "../geo/pointInPolygon";

/**
 * Simplified N03-2025 Osaka prefecture boundary snapshot.
 * Coordinates are [longitude, latitude]. The original MLIT dataset is the
 * source; this checked-in outline is intentionally reduced for client-side
 * rejection sampling and should be regenerated when the source year changes.
 */
export const OSAKA_BOUNDARY: MultiPolygon = [
  [
    [
      [135.09333333, 34.296],
      [135.132, 34.325],
      [135.175, 34.388],
      [135.211, 34.465],
      [135.218, 34.545],
      [135.188, 34.615],
      [135.181, 34.700],
      [135.196, 34.775],
      [135.178, 34.844],
      [135.214, 34.902],
      [135.286, 34.952],
      [135.374, 35.008],
      [135.493, 35.051293],
      [135.602, 35.043],
      [135.689, 34.996],
      [135.744, 34.926],
      [135.746603, 34.846],
      [135.726, 34.770],
      [135.731, 34.687],
      [135.722, 34.610],
      [135.705, 34.538],
      [135.704, 34.463],
      [135.665, 34.398],
      [135.616, 34.346],
      [135.554, 34.299],
      [135.481, 34.271821],
      [135.391, 34.276],
      [135.316, 34.307],
      [135.239, 34.309],
      [135.171, 34.284],
      [135.09333333, 34.296],
    ],
  ],
];

export const OSAKA_BOUNDARY_SOURCE = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2025.html";
export const OSAKA_BOUNDARY_YEAR = 2025;
export const OSAKA_BOUNDARY_SIMPLIFICATION_METERS = 200;
