#!/usr/bin/env node
// scripts/bump-versions.mjs
//
// Bump versions across all three publishable packages in lockstep.
//
// Usage:
//   node scripts/bump-versions.mjs patch        # 0.1.0 → 0.1.1 in all 3
//   node scripts/bump-versions.mjs minor        # 0.1.5 → 0.2.0
//   node scripts/bump-versions.mjs major        # 0.2.3 → 1.0.0
//   node scripts/bump-versions.mjs --set 0.5.2  # explicit version
//   node scripts/bump-versions.mjs patch --tag  # also create + push the 3 tags
//
// Why lockstep: all three packages derive from the same OpenAPI spec, so
// they should always release together at the same version. Asymmetric
// versions across surfaces would imply genuinely different feature sets,
// which we don't have today.

import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const TARGETS = [
  { kind: "json", path: "packages/sdk-typescript/package.json", tagPrefix: "sdk-ts-v" },
  { kind: "json", path: "packages/cli/package.json", tagPrefix: "cli-v" },
  { kind: "toml", path: "packages/sdk-python/pyproject.toml", tagPrefix: "sdk-py-v" },
];

const args = process.argv.slice(2);
const tagAndPush = args.includes("--tag");
const setIdx = args.indexOf("--set");
const explicitVersion = setIdx >= 0 ? args[setIdx + 1] : null;
const bumpType = explicitVersion ? null : args.find((a) => ["patch", "minor", "major"].includes(a));

if (!explicitVersion && !bumpType) {
  console.error("Usage: bump-versions.mjs [patch|minor|major | --set X.Y.Z] [--tag]");
  process.exit(1);
}

function bump(v, kind) {
  const [maj, min, pat] = v.split(".").map(Number);
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "major") return `${maj + 1}.0.0`;
  throw new Error("bad bump kind");
}

async function readVersion(target) {
  const text = await readFile(join(repoRoot, target.path), "utf8");
  if (target.kind === "json") {
    return JSON.parse(text).version;
  } else {
    const m = text.match(/^version\s*=\s*"([^"]+)"/m);
    if (!m) throw new Error(`no version field in ${target.path}`);
    return m[1];
  }
}

async function writeVersion(target, newVersion) {
  const text = await readFile(join(repoRoot, target.path), "utf8");
  let updated;
  if (target.kind === "json") {
    const obj = JSON.parse(text);
    obj.version = newVersion;
    // Preserve trailing newline if present.
    const hasTrailingNewline = text.endsWith("\n");
    updated = JSON.stringify(obj, null, 2) + (hasTrailingNewline ? "\n" : "");
  } else {
    updated = text.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
  }
  await writeFile(join(repoRoot, target.path), updated);
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

async function main() {
  const versions = await Promise.all(TARGETS.map(readVersion));
  const distinct = new Set(versions);
  if (distinct.size > 1) {
    console.warn(
      `! versions are out of lockstep: ${TARGETS.map((t, i) => `${t.path}=${versions[i]}`).join(", ")}`
    );
  }

  const baseVersion = explicitVersion || versions[0];
  const newVersion = explicitVersion ? explicitVersion : bump(baseVersion, bumpType);

  console.log(`Bumping all 3 packages to ${newVersion} (was ${baseVersion})`);

  for (const target of TARGETS) {
    await writeVersion(target, newVersion);
    console.log(`  ✓ ${target.path}`);
  }

  if (tagAndPush) {
    git(["add", ...TARGETS.map((t) => t.path)]);
    git(["commit", "-m", `release: bump to v${newVersion}`]);

    for (const target of TARGETS) {
      const tag = `${target.tagPrefix}${newVersion}`;
      git(["tag", tag]);
      console.log(`  + tag ${tag}`);
    }

    git(["push", "origin", "main"]);
    git(["push", "origin", "--tags"]);
    console.log(`\nPushed main + 3 tags. Watch the workflows fire.`);
  } else {
    console.log(
      `\nFiles updated. Now: \`git add -A && git commit && git push && (git tag X && git push --tags)\`,\n` +
        `or rerun with --tag to do it all at once.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
