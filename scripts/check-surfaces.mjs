#!/usr/bin/env node
// scripts/check-surfaces.mjs
//
// Consistency guard for the multi-surface release pipeline.
// Run before pushing — wired to `.husky/pre-push`.
//
// Verifies the public repo is internally consistent and matches what's
// actually deployed at api.stablebaseline.io. Hard-fails the push if any
// surface has drifted, preventing accidental releases of stale types.
//
// Uses execFileSync (no shell) to avoid command injection. All git args
// are hardcoded — no user input is interpolated.

import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const PROD_OPENAPI_URL =
  "https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/openapi.json";
const PROD_MCP_URL =
  "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp";
const DISCOVERY_URL = "https://stablebaseline.io/.well-known/mcp.json";

const failures = [];
const warnings = [];

const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

async function readJson(relPath) {
  return JSON.parse(await readFile(join(repoRoot, relPath), "utf8"));
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// ─── Check 1: dist/ folders are gitignored ───────────────────────────────
async function checkDistGitignored() {
  const gi = await readFile(join(repoRoot, ".gitignore"), "utf8");
  if (!/^dist\/?$/m.test(gi)) {
    fail("[gitignore] dist/ is not gitignored — build artefacts may end up in git");
  }
}

// ─── Check 2: openapi.json matches live production spec ──────────────────
async function checkOpenapiInSync() {
  let liveSpec;
  try {
    const res = await fetch(PROD_OPENAPI_URL);
    if (!res.ok) {
      fail(`[openapi] live spec unreachable (${res.status})`);
      return;
    }
    liveSpec = await res.json();
  } catch (err) {
    fail(`[openapi] live spec fetch failed: ${err.message}`);
    return;
  }

  let repoSpec;
  try {
    repoSpec = await readJson("openapi.json");
  } catch {
    fail("[openapi] repo openapi.json missing — run `npm run codegen:openapi`");
    return;
  }

  const livePaths = Object.keys(liveSpec.paths || {}).length;
  const repoPaths = Object.keys(repoSpec.paths || {}).length;

  if (livePaths !== repoPaths) {
    fail(
      `[openapi] path count mismatch: live=${livePaths}, repo=${repoPaths}. ` +
        `Run \`npm run codegen:openapi\` then \`cd packages/sdk-typescript && npm run codegen && npm run build\` and commit.`
    );
  }

  if (liveSpec.info?.version !== repoSpec.info?.version) {
    warn(
      `[openapi] info.version differs: live=${liveSpec.info?.version}, repo=${repoSpec.info?.version}.`
    );
  }
}

// ─── Check 3: MCP endpoint returns 401 (not 405/404) ─────────────────────
async function checkMcpEndpointAuthRequired() {
  try {
    const res = await fetch(PROD_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-protocol-version": "2025-03-26",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    if (res.status === 405) {
      fail(`[mcp] endpoint returned 405 — likely SPA fallback again, check api. vs app. routing`);
    } else if (res.status === 404) {
      fail(`[mcp] endpoint returned 404 — function may not be deployed`);
    } else if (res.status !== 401) {
      warn(`[mcp] endpoint returned ${res.status} — expected 401 (auth required)`);
    }
  } catch (err) {
    warn(`[mcp] reachability check failed: ${err.message}`);
  }
}

// ─── Check 4: .well-known/mcp.json discovery URL ─────────────────────────
async function checkDiscoveryEndpoint() {
  try {
    const res = await fetch(DISCOVERY_URL);
    if (!res.ok) {
      fail(`[discovery] ${DISCOVERY_URL} returned ${res.status}`);
      return;
    }
    const disc = await res.json();
    if (disc.endpoint?.includes("app.stablebaseline.io")) {
      fail(
        `[discovery] mcp.json endpoint points at app.stablebaseline.io — must be api. (app. is SPA-only and returns 405 on POST)`
      );
    } else if (!disc.endpoint?.includes("api.stablebaseline.io")) {
      fail(`[discovery] mcp.json endpoint missing api.stablebaseline.io: ${disc.endpoint}`);
    }
  } catch (err) {
    warn(`[discovery] check failed: ${err.message}`);
  }
}

// ─── Check 5: registry/server.json description ≤100 chars ────────────────
async function checkRegistryServerJson() {
  let reg;
  try {
    reg = await readJson("registry/server.json");
  } catch {
    return;
  }
  const desc = reg.description ?? "";
  if (desc.length > 100) {
    fail(
      `[registry] registry/server.json description is ${desc.length} chars (max 100, hard registry validation rule)`
    );
  }
}

// ─── Check 6: package versions ≥ most recent matching tag ────────────────
function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

function mostRecentTagFor(prefix) {
  const all = git(["tag", "--list", `${prefix}*`, "--sort=-v:refname"]);
  return all.split("\n").filter(Boolean)[0] || "";
}

async function checkVersionsAgainstTags() {
  const checks = [
    { manifest: "packages/sdk-typescript/package.json", prefix: "sdk-ts-v", kind: "json" },
    { manifest: "packages/cli/package.json", prefix: "cli-v", kind: "json" },
    { manifest: "packages/sdk-python/pyproject.toml", prefix: "sdk-py-v", kind: "toml" },
  ];

  for (const { manifest, prefix, kind } of checks) {
    let version;
    try {
      if (kind === "json") {
        version = (await readJson(manifest)).version;
      } else {
        const txt = await readFile(join(repoRoot, manifest), "utf8");
        version = txt.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
      }
    } catch {
      continue;
    }
    if (!version) continue;

    const lastTag = mostRecentTagFor(prefix);
    if (!lastTag) continue;
    const lastTagVer = lastTag.slice(prefix.length);

    if (compareSemver(version, lastTagVer) < 0) {
      fail(
        `[version] ${manifest} version ${version} < most recent tag ${lastTag}. Bump and commit before tagging.`
      );
    }
  }
}

// ─── Check 7: package-lock.json is committed ─────────────────────────────
// Every public surface that states a tool count must state the SAME one, and it
// must be the number the server actually advertises.
//
// This drifted to five different numbers in public at once: 196 in the README
// and the discovery manifest, 184 in llms-install and all three package
// READMEs, 163 in the GitHub repo description, and 161 in the MCP Registry.
// Nothing caught it because this script only ever diffed OpenAPI PATH counts,
// which is a different number that happens to look similar.
//
// The count is read from the live tools/list rather than from any file here, so
// the server is the source of truth and a doc can only ever be wrong.
async function checkToolCountsInDocs() {
  let liveCount;
  try {
    const res = await fetch(PROD_MCP_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    const text = await res.text();
    // The endpoint answers SSE unless it honours our Accept header.
    const line = text.startsWith("data:")
      ? text.split("\n").find((l) => l.startsWith("data:"))?.slice(5).trim()
      : text;
    liveCount = JSON.parse(line).result.tools.length;
  } catch (err) {
    warn(`[tool-count] could not read live tools/list: ${err.message}`);
    return;
  }

  const files = [
    "README.md",
    "llms-install.md",
    "packages/cli/README.md",
    "packages/cli/package.json",
    "packages/sdk-python/README.md",
    "packages/sdk-typescript/README.md",
    "packages/sdk-typescript/package.json",
  ];

  // Only a number that PRECEDES the word "tools", plus the shields.io badge
  // slug. Deliberately not the reverse direction: "196 tools across 18
  // categories" and "196 tools / 11 prompts" both put an unrelated number just
  // after the word, and matching those reports the category and prompt counts
  // as wrong tool counts.
  const patterns = [
    /(\d{2,4})\s+(?:MCP\s+)?tools\b/gi,
    /MCP%20tools-(\d{2,4})-/gi,
  ];

  for (const rel of files) {
    let body;
    try {
      body = await readFile(join(repoRoot, rel), "utf8");
    } catch {
      continue; // file removed; not this check's business
    }
    const seen = new Set();
    for (const re of patterns) {
      for (const m of body.matchAll(re)) seen.add(Number(m[1]));
    }
    for (const n of seen) {
      if (n !== liveCount) {
        fail(`[tool-count] ${rel} says ${n} tools; the server advertises ${liveCount}`);
      }
    }
  }
}

async function checkLockfileCommitted() {
  if (!git(["ls-files", "package-lock.json"])) {
    fail("[lockfile] package-lock.json not committed — CI `npm ci` will fail");
  }
}

// ─── Run all checks ──────────────────────────────────────────────────────
async function main() {
  console.log("Checking surface consistency...\n");

  await Promise.all([
    checkDistGitignored(),
    checkOpenapiInSync(),
    checkMcpEndpointAuthRequired(),
    checkDiscoveryEndpoint(),
    checkRegistryServerJson(),
    checkVersionsAgainstTags(),
    checkLockfileCommitted(),
    checkToolCountsInDocs(),
  ]);

  for (const w of warnings) console.warn("  ! " + w);
  for (const f of failures) console.error("  X " + f);

  if (failures.length === 0) {
    const wstr = warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : "";
    console.log(`\nOK — all surface checks passed${wstr}`);
    process.exit(0);
  } else {
    console.error(
      `\nFAIL — ${failures.length} check${failures.length > 1 ? "s" : ""} failed. ` +
        `Push blocked. Fix above issues, or bypass with \`git push --no-verify\` if intentional.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("check-surfaces fatal error:", err);
  process.exit(2);
});
