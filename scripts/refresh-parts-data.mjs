// Rebuilds the bundled datasets behind the "stores near you" list:
//   src/lib/parts/data/store-locations.json — US locations of AutoZone,
//     O'Reilly and Advance Auto Parts (from OpenStreetMap, ODbL)
//   src/lib/parts/data/zip-centroids.json   — US zip-code centroids (US Census
//     Gazetteer ZCTA file, public domain)
//
// Usage:
//   node scripts/refresh-parts-data.mjs <dir-with-raw-files>
//     (reads stores_autozone.json / stores_oreilly.json / stores_advance.json
//      and zcta.zip produced by a one-time Overpass + Census fetch)
//
// The runtime never calls Overpass — this dataset is rebuilt manually when
// store counts drift noticeably (log entry in docs/BACKLOG.md).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const rawDir = process.argv[2];
if (!rawDir || !existsSync(rawDir)) {
  fail("Usage: node scripts/refresh-parts-data.mjs <dir-with-raw-files>");
}

// --- store locations ---------------------------------------------------------

const BRAND_KEYS = ["autozone", "oreilly", "advance"];
const locations = {};

for (const key of BRAND_KEYS) {
  const file = path.join(rawDir, `stores_${key}.json`);
  if (!existsSync(file)) fail(`missing ${file}`);
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const seen = new Set();
  const points = [];
  for (const element of parsed.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    // Continental US + AK/HI/PR guard against stray worldwide matches.
    if (lat < 17 || lat > 72 || lon < -180 || lon > -60) continue;
    const k = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    points.push([Number(lat.toFixed(4)), Number(lon.toFixed(4))]);
  }
  locations[key] = points;
  console.log(`${key}: ${points.length} locations`);
}

// --- zip centroids -----------------------------------------------------------

const zctaZip = path.join(rawDir, "zcta.zip");
if (!existsSync(zctaZip)) fail(`missing ${zctaZip}`);
// Windows ships bsdtar (reads zip archives) at System32; fall back to PATH tar.
const tarBinary = existsSync("C:\\Windows\\System32\\tar.exe")
  ? "C:\\Windows\\System32\\tar.exe"
  : "tar";
const csvDir = path.join(rawDir, "zcta-extracted");
mkdirSync(csvDir, { recursive: true });
execFileSync(tarBinary, ["-xf", zctaZip, "-C", csvDir]);
const csvName = readdirSync(csvDir).find((name) => name.endsWith(".csv") || name.endsWith(".txt"));
if (!csvName) fail("no csv inside the gazetteer zip");
const csv = readFileSync(path.join(csvDir, csvName), "utf8");

const lines = csv.split(/\r?\n/);
// The Gazetteer is tab-separated (some years comma) — accept both.
const header = lines[0].split(/\t|,/).map((h) => h.trim().replace(/"/g, ""));
const geoidCol = header.indexOf("GEOID");
const latCol = header.findIndex((h) => h.startsWith("INTPTLAT"));
const lonCol = header.findIndex((h) => h.startsWith("INTPTLON"));
if (geoidCol < 0 || latCol < 0 || lonCol < 0) fail(`unexpected gazetteer header: ${header.join(",")}`);

const centroids = {};
let count = 0;
for (const line of lines.slice(1)) {
  if (!line) continue;
  const cols = line.split(/\t|,/);
  const zip = cols[geoidCol]?.trim();
  const lat = Number.parseFloat(cols[latCol]);
  const lon = Number.parseFloat(cols[lonCol]);
  if (!/^\d{5}$/.test(zip) || Number.isNaN(lat) || Number.isNaN(lon)) continue;
  centroids[zip] = [Number(lat.toFixed(3)), Number(lon.toFixed(3))];
  count += 1;
}
console.log(`zips: ${count} centroids`);

// --- write -------------------------------------------------------------------

const outDir = path.join(repoRoot, "src", "lib", "parts", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "store-locations.json"),
  JSON.stringify(locations),
);
writeFileSync(
  path.join(outDir, "zip-centroids.json"),
  JSON.stringify(centroids),
);
console.log("written to src/lib/parts/data/");
