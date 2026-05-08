#!/usr/bin/env node
// scripts/install-git-hooks.mjs
//
// Installs the pre-push hook that runs `npm run check:surfaces`.
// Wired into npm's `prepare` lifecycle, so `npm install` automatically
// installs the hook.

import { writeFile, mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const hookDir = join(repoRoot, ".git", "hooks");

// Skip silently if .git doesn't exist (e.g. running inside a tarball install)
if (!existsSync(join(repoRoot, ".git"))) {
  process.exit(0);
}

const PRE_PUSH = `#!/usr/bin/env sh
# Auto-installed by scripts/install-git-hooks.mjs.
# Verifies surface consistency before pushing tags or main.
# Bypass with: git push --no-verify

node "$(git rev-parse --show-toplevel)/scripts/check-surfaces.mjs"
`;

await mkdir(hookDir, { recursive: true });
await writeFile(join(hookDir, "pre-push"), PRE_PUSH);
try {
  await chmod(join(hookDir, "pre-push"), 0o755);
} catch {
  // chmod is no-op on Windows; ignore
}
console.log("✓ git pre-push hook installed → runs `npm run check:surfaces`");
