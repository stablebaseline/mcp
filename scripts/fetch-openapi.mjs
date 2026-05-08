#!/usr/bin/env node
/* eslint-disable no-console */
// Fetches the live OpenAPI spec from production and writes it to a shared
// location consumed by the TypeScript SDK, the Python SDK, and the CLI.
//
//   node scripts/fetch-openapi.mjs
//
// Outputs:
//   openapi.json
//   packages/sdk-typescript/openapi.json (copy)
//   packages/sdk-python/openapi.json (copy)
//   packages/cli/openapi.json (copy)

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENDPOINT =
  process.env.SB_OPENAPI_URL ||
  "https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/openapi.json";

const TARGETS = [
  path.join(ROOT, "openapi.json"),
  path.join(ROOT, "packages/sdk-typescript/openapi.json"),
  path.join(ROOT, "packages/sdk-python/openapi.json"),
  path.join(ROOT, "packages/cli/openapi.json"),
];

console.log(`→ Fetching ${ENDPOINT}`);
const res = await fetch(ENDPOINT);
if (!res.ok) {
  console.error(`Fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const spec = await res.json();
const pretty = JSON.stringify(spec, null, 2);

for (const target of TARGETS) {
  const dir = path.dirname(target);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(target, pretty + "\n", "utf8");
  console.log(`  wrote ${path.relative(ROOT, target)}`);
}

console.log(`\nDone. Spec version: ${spec.info?.version ?? "?"} · paths: ${Object.keys(spec.paths ?? {}).length}`);
