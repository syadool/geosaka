import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath = "src/data/osakaBoundary.generated.ts"] = process.argv.slice(2);
if (!inputPath) throw new Error("Usage: node scripts/prepare-osaka-boundary.mjs <N03 GeoJSON> [output]");

const source = JSON.parse(await readFile(inputPath, "utf8"));
const features = source.type === "FeatureCollection" ? source.features : [];
const toleranceMeters = 200;
const featuresInOsaka = features.filter((feature) => feature.properties?.N03_001 === "大阪府");

function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}

function simplify(points, tolerance) {
  if (points.length <= 3) return points;
  let maxDistance = tolerance;
  let index = 0;
  const end = points.length - 1;
  for (let current = 1; current < end; current += 1) {
    const distance = perpendicularDistance(points[current], points[0], points[end]);
    if (distance > maxDistance) {
      index = current;
      maxDistance = distance;
    }
  }
  if (index === 0) return [points[0], points[end]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function simplifyRing(ring) {
  const latitudeScale = 111_320;
  const projected = ring.map(([lng, lat]) => [lng * latitudeScale * Math.cos((lat * Math.PI) / 180), lat * latitudeScale]);
  const reduced = simplify(projected, toleranceMeters);
  return reduced.map(([x, y]) => [x / (latitudeScale * Math.cos((y / latitudeScale * Math.PI) / 180)), y / latitudeScale]);
}

const polygons = featuresInOsaka.flatMap((feature) => {
  const geometry = feature.geometry;
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates.map(simplifyRing)];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon.map(simplifyRing));
  return [];
});
if (polygons.length === 0) throw new Error("No Osaka polygon found in input GeoJSON");

const output = `// Generated from N03 administrative boundary data.\nexport const OSAKA_BOUNDARY = ${JSON.stringify(polygons)} as const;\nexport const OSAKA_BOUNDARY_YEAR = 2025;\nexport const OSAKA_BOUNDARY_SIMPLIFICATION_METERS = ${toleranceMeters};\n`;
await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${polygons.length} polygons to ${outputPath}`);
