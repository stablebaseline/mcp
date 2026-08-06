#!/usr/bin/env node
/**
 * Generate tools/stable-baseline-tools.json for the Copilot Cowork package.
 *
 * The file is the `mcpToolDescription.file` target. Microsoft's agent-connectors
 * page says it "must match the schema returned by your MCP server's tools/list
 * response", so this script GENERATES it from the live endpoint rather than
 * letting a hand-maintained copy drift (gap G8).
 *
 * `tools/list` needs no auth on cloud-serve, so no secret is required. A neutral
 * User-Agent matters: cloud-serve/core/clientPolicy.ts hides the 16 billing
 * tools when the UA contains "chatgpt", "openai" or "claude", and we want the
 * surface Cowork actually receives.
 *
 * Two transforms are applied on top of the live response. Both are recorded in
 * the run report so the divergence from live is never silent:
 *
 *   1. ASCII-ONLY  Microsoft store validation bans "URLs, emojis, or hidden
 *      characters" in tool and parameter descriptions (Must fix). The live
 *      definitions carry 5 emoji, 2 invisible U+FE0F variation selectors and
 *      several typographic punctuation marks. Each emoji gets a hand-written
 *      plain-English replacement so no meaning is lost; punctuation is mapped
 *      to ASCII.
 *
 *   2. contentEncoding  Cowork rewrites any TOP-LEVEL string parameter carrying
 *      `contentEncoding: "base64"` into a workspace file path, resolves the
 *      bytes itself and re-injects the base64. Without the keyword the model has
 *      to inline the payload. Four top-level string parameters take file bytes
 *      and none declared it.
 *
 * Both transforms belong in supabase/functions/cloud-serve/toolDefinitions.ts.
 * Until that is patched and deployed, the runtime surface Cowork discovers still
 * differs from this file. See README-BUILD.md, "What still needs a human".
 *
 * Usage:
 *   node build-tools-json.mjs [outFile]
 *   node build-tools-json.mjs --check [outFile]   exit 1 if the file is stale
 *   node build-tools-json.mjs --curated [outFile] intersect with the server's
 *                                                 COPILOT_TOOL_ALLOWLIST
 *
 * --curated exists because tools/list is unauthenticated, so this script cannot
 * present the Cowork connector's OAuth client_id and therefore always receives
 * the FULL surface. Once that client_id is added to COPILOT_CONNECTOR_CLIENT_IDS
 * in core/clientPolicy.ts and deployed, Cowork receives the curated set instead,
 * and this flag reproduces it by reading the allowlist straight out of the repo.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MCP_URL = "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp";
const UA = "stable-baseline-cowork-package-build/3.0";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(HERE, "..", "build", "tools", "stable-baseline-tools.json");
// Repo path to the server's own per-client policy, the single source of truth
// for the curated Copilot surface. Override with SB_REPO if the checkout moves.
const CLIENT_POLICY = path.join(
  process.env.SB_REPO || "D:/Orixian/Dev/OWorld/clouddocs",
  "supabase/functions/cloud-serve/core/clientPolicy.ts",
);

// ── 1a. Emoji removals, hand written so the sentence still reads ────────────
// Each entry is checked: if `from` is absent from the live text the script
// fails loudly rather than shipping an emoji it did not know about.
// The five emoji / hidden-character replacements that used to live here are
// GONE because they were fixed at the SOURCE instead. toolDefinitions.ts no
// longer contains any emoji or U+FE0F, so the live tools/list is already clean
// and there is nothing left for this table to rewrite.
//
// Fixing it in the generator only ever sanitised the packaged ARTEFACT. Cowork
// discovers tools from the live server at runtime, so the model and any
// reviewer calling tools/list still saw the emoji. The table is kept as an
// empty, still-enforced list: if a banned character reappears upstream the
// ASCII assertion below fails the build rather than silently shipping it.
const PHRASE_FIXES = [];

// ── 1b. Typographic punctuation to ASCII, applied everywhere ────────────────
const PUNCT = [
  [/—/g, "-"],   // em dash
  [/–/g, "-"],   // en dash
  [/…/g, "..."], // ellipsis
  [/→/g, "->"],  // rightwards arrow
  [/•/g, "-"],   // bullet
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
  [/ /g, " "],   // non-breaking space
];

// ── 2. Top-level string parameters that carry file bytes ────────────────────
// Only TOP-LEVEL parameters are rewritten by Cowork; nested ones are passed
// through unchanged. That is why designDeckInWhiteboard.attachments and
// designIllustrationInWhiteboard.attachments are NOT listed: their base64 sits
// at items[].data, i.e. inside an object inside an array, which Cowork does not
// rewrite. Those two take a public `url` instead.
const BASE64_PARAMS = [
  ["editWhiteboardImageRegion", "maskBase64"],
  ["insertWhiteboardImage", "imageBase64"],
  ["insertImageInDocument", "imageBase64"],
  ["traceImage", "imageBase64"],
];

async function fetchLiveTools() {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "user-agent": UA,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  if (!res.ok) throw new Error(`tools/list returned HTTP ${res.status}`);
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  let envelope;
  if (ct.includes("text/event-stream")) {
    const line = text.split("\n").find((l) => l.startsWith("data: "));
    if (!line) throw new Error("no data: frame in SSE response");
    envelope = JSON.parse(line.slice(6));
  } else {
    envelope = JSON.parse(text);
  }
  const tools = envelope?.result?.tools;
  if (!Array.isArray(tools) || tools.length === 0) throw new Error("tools/list returned no tools");
  return tools;
}

function walkStrings(node, fn) {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return node.map((v) => walkStrings(v, fn));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walkStrings(v, fn);
    return out;
  }
  return node;
}

function nonAscii(obj) {
  const hits = new Map();
  const scan = (n) => {
    if (typeof n === "string") {
      for (const ch of n) if (ch.codePointAt(0) > 127) hits.set(ch, (hits.get(ch) || 0) + 1);
    } else if (Array.isArray(n)) n.forEach(scan);
    else if (n && typeof n === "object") Object.values(n).forEach(scan);
  };
  scan(obj);
  return hits;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const curated = args.includes("--curated");
  const outFile = path.resolve(args.find((a) => !a.startsWith("--")) || DEFAULT_OUT);

  let tools = await fetchLiveTools();
  const liveCount = tools.length;
  const report = { phraseFixes: [], punct: 0, contentEncoding: [], dropped: 0 };

  if (curated) {
    // Node 24 strips TypeScript types natively, so the policy module imports as-is.
    const { COPILOT_TOOL_ALLOWLIST } = await import(pathToFileURL(CLIENT_POLICY).href);
    const before = tools.length;
    tools = tools.filter((t) => COPILOT_TOOL_ALLOWLIST.has(t.name));
    report.dropped = before - tools.length;
    const missing = [...COPILOT_TOOL_ALLOWLIST].filter((n) => !tools.some((t) => t.name === n));
    if (missing.length) {
      throw new Error(`allowlist names ${missing.join(", ")} are not in the live tools/list`);
    }
  }

  // 1a. Targeted emoji phrase replacements.
  const byName = new Map(tools.map((t) => [t.name, t]));
  for (const fix of PHRASE_FIXES) {
    const tool = byName.get(fix.tool);
    // In --curated mode some targets are legitimately filtered out.
    if (!tool && curated) continue;
    if (!tool) throw new Error(`PHRASE_FIXES targets unknown tool '${fix.tool}'`);
    let applied = 0;
    const patched = walkStrings(tool, (s) => {
      if (!s.includes(fix.from)) return s;
      applied += 1;
      return s.split(fix.from).join(fix.to);
    });
    if (applied === 0) {
      throw new Error(
        `PHRASE_FIXES entry for '${fix.tool}' did not match. The live description changed; ` +
          `re-read it and update the fix rather than shipping an unreviewed string.`,
      );
    }
    Object.assign(tool, patched);
    report.phraseFixes.push(`${fix.tool} (${applied})`);
  }

  // 1b. Punctuation.
  tools = tools.map((t) =>
    walkStrings(t, (s) => {
      let out = s;
      for (const [re, rep] of PUNCT) {
        const before = out;
        out = out.replace(re, rep);
        if (out !== before) report.punct += 1;
      }
      return out;
    }),
  );

  // 2. contentEncoding on top-level file parameters.
  const byName2 = new Map(tools.map((t) => [t.name, t]));
  for (const [toolName, param] of BASE64_PARAMS) {
    const tool = byName2.get(toolName);
    if (!tool && curated) continue;
    if (!tool) throw new Error(`BASE64_PARAMS targets unknown tool '${toolName}'`);
    const prop = tool.inputSchema?.properties?.[param];
    if (!prop) throw new Error(`BASE64_PARAMS: ${toolName} has no top-level parameter '${param}'`);
    if (prop.type !== "string") {
      throw new Error(`BASE64_PARAMS: ${toolName}.${param} is '${prop.type}', not 'string'`);
    }
    prop.contentEncoding = "base64";
    report.contentEncoding.push(`${toolName}.${param}`);
  }

  // Guard: the package must be pure ASCII.
  const stray = nonAscii(tools);
  if (stray.size > 0) {
    const list = [...stray].map(([c, n]) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} x${n}`);
    throw new Error(`non-ASCII characters remain after sanitising: ${list.join(", ")}`);
  }

  // Guard: names must be unique and non-empty.
  const names = tools.map((t) => t.name);
  if (new Set(names).size !== names.length) throw new Error("duplicate tool names in tools/list");

  const body = JSON.stringify({ tools }, null, 2) + "\n";

  if (check) {
    const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
    if (current !== body) {
      console.error(`STALE: ${outFile} differs from the live tools/list. Re-run without --check.`);
      process.exit(1);
    }
    console.log(`up to date: ${names.length} tools`);
    return;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, body);
  console.log(`wrote ${outFile}`);
  console.log(`  tools from live tools/list : ${liveCount}`);
  console.log(`  surface                    : ${curated ? `curated (${report.dropped} dropped, ${names.length} kept)` : `full (${names.length})`}`);
  console.log(`  emoji phrase fixes         : ${report.phraseFixes.join(", ")}`);
  console.log(`  punctuation substitutions  : ${report.punct}`);
  console.log(`  contentEncoding added to   : ${report.contentEncoding.join(", ")}`);
  console.log(`  bytes                      : ${Buffer.byteLength(body)}`);
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
