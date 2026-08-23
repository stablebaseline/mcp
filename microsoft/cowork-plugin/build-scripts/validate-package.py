#!/usr/bin/env python3
"""
Validate the Copilot Cowork package: JSON Schema, every ASKILL-* rule from the
Cowork plugin-development page, the connector rules, the icon rules from the
Teams store validation guidelines, and the store content rules that ban emojis
and hidden characters.

  python validate-package.py [packageDir] [schemaDir]

Exit code 0 = no errors. Warnings never fail the run.
"""

import io
import json
import pathlib
import re
import struct
import sys

try:
    from jsonschema import Draft7Validator
except ImportError:
    print("pip install jsonschema", file=sys.stderr)
    raise

HERE = pathlib.Path(__file__).resolve().parent
PKG = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parent / "build"
SCHEMAS = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else HERE.parent

errors: list[str] = []
warnings: list[str] = []
checks = 0


def ok(label: str) -> None:
    global checks
    checks += 1
    print(f"  PASS  {label}")


def bad(label: str) -> None:
    errors.append(label)
    print(f"  FAIL  {label}")


def warn(label: str) -> None:
    warnings.append(label)
    print(f"  WARN  {label}")


def check(cond: bool, label: str) -> bool:
    (ok if cond else bad)(label)
    return cond


print(f"package: {PKG}\n")

# ── manifest ───────────────────────────────────────────────────────────────
print("[1] Manifest structure")
manifest_path = PKG / "manifest.json"
if not manifest_path.exists():
    bad("manifest.json exists")
    sys.exit(1)
raw = manifest_path.read_text(encoding="utf-8")
manifest = json.loads(raw)
check(raw.isascii(), "manifest.json is pure ASCII (no emoji or hidden characters)")

declared = manifest.get("manifestVersion")
check(declared == "1.28", f"manifestVersion is 1.28 (the version the Cowork docs specify), got {declared!r}")
check(
    manifest.get("$schema", "").endswith(f"/v{declared}/MicrosoftTeams.schema.json"),
    "$schema URL matches manifestVersion",
)

print("\n[2] JSON Schema validation")
for ver in ("1.28", "1.29"):
    sf = SCHEMAS / f"schema-{ver}.json"
    if not sf.exists():
        warn(f"schema-{ver}.json not found, skipped")
        continue
    schema = json.loads(sf.read_text(encoding="utf-8"))
    probe = dict(manifest)
    note = ""
    if ver != declared:
        # manifestVersion is a const per schema; normalise so the rest is still checked.
        probe["manifestVersion"] = ver
        probe["$schema"] = f"https://developer.microsoft.com/json-schemas/teams/v{ver}/MicrosoftTeams.schema.json"
        note = " (manifestVersion normalised)"
    errs = sorted(Draft7Validator(schema).iter_errors(probe), key=lambda e: list(e.path))
    if errs:
        for e in errs[:20]:
            bad(f"v{ver}: {'/'.join(map(str, e.path)) or '<root>'}: {e.message}")
    else:
        ok(f"validates against v{ver} with 0 errors{note}")

# ── ASKILL-M: manifest-level skill rules ───────────────────────────────────
print("\n[3] ASKILL-M manifest rules")
skills = manifest.get("agentSkills", [])
check(all("folder" in s for s in skills), "ASKILL-M001 every agentSkills entry has folder")
check(len(skills) <= 20, f"ASKILL-M002 agentSkills <= 20 (have {len(skills)})")
check(all(len(s["folder"]) <= 256 for s in skills), "ASKILL-M003 folder path <= 256 chars")
folders = [s["folder"] for s in skills]
check(len(set(folders)) == len(folders), "ASKILL-P008 no duplicate folder values")

# Declared paths must match a ZIP ENTRY NAME, and a zip entry is
# "tools/x.json", never "./tools/x.json". Microsoft's package service compares
# the declared string to the entry name rather than resolving it as a relative
# path, and rejects the package outright:
#
#   InvalidAgentConnector: The agent connector with ID stable-baseline has its
#   declared MCP tool description file ./tools/stable-baseline-tools.json not
#   found in the app package.
#
# This validator resolved "./" happily via lstrip and passed 365 checks on a
# package the store refused (2026-08-06). Every path check below normalises the
# prefix away, so without this guard the whole suite is blind to it.
_declared_paths = list(folders)
_conn = manifest.get("agentConnectors") or []
for _c in _conn:
    _f = ((_c.get("toolSource") or {}).get("remoteMcpServer") or {}).get("mcpToolDescription") or {}
    if isinstance(_f, dict) and isinstance(_f.get("file"), str):
        _declared_paths.append(_f["file"])
_bad_prefix = [p for p in _declared_paths if p.startswith("./") or p.startswith("/") or p.startswith("../")]
check(
    not _bad_prefix,
    "declared paths are zip-entry relative with no ./ or / prefix"
    + (f" (offending: {', '.join(_bad_prefix)})" if _bad_prefix else ""),
)
check(
    all("\\" not in p for p in _declared_paths),
    "declared paths use forward slashes (a zip entry never contains a backslash)",
)

# ── ASKILL-P: package-level skill rules ────────────────────────────────────
print("\n[4] ASKILL-P package rules")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
for entry in skills:
    rel = entry["folder"].lstrip("./")
    d = PKG / rel
    if not check(d.is_dir(), f"ASKILL-P001 {entry['folder']} exists in package"):
        continue
    sm = d / "SKILL.md"
    if not check(sm.is_file(), f"ASKILL-P002 {rel}/SKILL.md exists"):
        continue
    text = sm.read_text(encoding="utf-8")
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not check(bool(m), f"ASKILL-P003 {rel} has YAML frontmatter between --- delimiters"):
        continue
    fm = m.group(1)
    name_m = re.search(r"^name:\s*(.+?)\s*$", fm, re.M)
    check(bool(name_m), f"ASKILL-P004 {rel} frontmatter has name")
    desc_m = re.search(r"^description:\s*(.*)$", fm, re.M)
    check(bool(desc_m), f"ASKILL-P005 {rel} frontmatter has description")
    if name_m:
        nm = name_m.group(1).strip().strip("\"'")
        last = rel.rstrip("/").split("/")[-1]
        check(nm == last, f"ASKILL-P006 {rel} name '{nm}' matches folder segment '{last}'")
        check(bool(KEBAB.match(nm)) and 1 <= len(nm) <= 64, f"ASKILL-P007 {rel} name is kebab-case, 1-64 chars")
    # description length, 1-1024 per the Cowork frontmatter table
    dm = re.search(r"^description:\s*(>-|\||>)?\s*\n((?:[ \t]+.*\n?)+)", fm, re.M)
    dtext = " ".join(l.strip() for l in dm.group(2).splitlines()) if dm else (desc_m.group(1).strip() if desc_m else "")
    check(1 <= len(dtext) <= 1024, f"{rel} description is 1-1024 chars (is {len(dtext)})")
    check(text.isascii(), f"{rel} SKILL.md is pure ASCII")
    words = len(text.split())
    (ok if words <= 3000 else warn)(f"{rel} body is {words} words (Cowork target under 3000)")
    if words <= 3000:
        checks += 1
    # companion-file limits
    companions = [p for p in d.rglob("*") if p.is_file() and p.name != "SKILL.md"]
    check(len(companions) <= 20, f"{rel} has <= 20 companion files ({len(companions)})")
    for c in companions:
        check(c.stat().st_size <= 5 * 1024 * 1024, f"{rel}/{c.name} under 5 MB")
        check(not c.name.startswith("."), f"{rel}/{c.name} is not a hidden file")

# stray skill folders not declared
declared_dirs = {(PKG / e["folder"].lstrip("./")).resolve() for e in skills}
if (PKG / "skills").is_dir():
    for d in (PKG / "skills").iterdir():
        if d.is_dir() and d.resolve() not in declared_dirs:
            warn(f"skills/{d.name} exists but is not declared in agentSkills")

# ── connectors ─────────────────────────────────────────────────────────────
print("\n[5] Connector rules")
conns = manifest.get("agentConnectors", [])
check(len(conns) <= 10, f"agentConnectors <= 10 (have {len(conns)})")
ids = [c.get("id") for c in conns]
check(all(ids) and len(set(ids)) == len(ids), "connector ids present and unique")
for c in conns:
    check(bool(c.get("displayName")), f"connector {c.get('id')} has displayName")
    ts = c.get("toolSource", {})
    check(("plugin" in ts) ^ ("remoteMcpServer" in ts), f"connector {c.get('id')} has exactly one of plugin / remoteMcpServer")
    r = ts.get("remoteMcpServer")
    if not r:
        continue
    url = r.get("mcpServerUrl", "")
    check(url.lower().startswith("https://"), f"mcpServerUrl is HTTPS: {url}")
    mtd = r.get("mcpToolDescription")
    check(isinstance(mtd, dict) and set(mtd) == {"file"}, "mcpToolDescription uses the flat {file} form")
    if mtd and "file" in mtd:
        tf = PKG / mtd["file"].lstrip("./")
        if check(tf.is_file(), f"mcpToolDescription.file exists: {mtd['file']}"):
            body = tf.read_text(encoding="utf-8")
            check(body.isascii(), "tools file is pure ASCII (store bans emojis and hidden characters)")
            data = json.loads(body)
            tools = data["tools"] if isinstance(data, dict) else data
            names = [t["name"] for t in tools]
            check(len(set(names)) == len(names), f"tools file has {len(names)} uniquely named tools")
            missing_ann = [t["name"] for t in tools if not t.get("annotations")]
            check(not missing_ann, f"every tool declares annotations ({len(missing_ann)} missing)")
            no_hint = [t["name"] for t in tools if "readOnlyHint" not in (t.get("annotations") or {})]
            check(not no_hint, f"every tool declares readOnlyHint ({len(no_hint)} missing)")
            no_schema = [t["name"] for t in tools if not t.get("inputSchema")]
            check(not no_schema, f"every tool declares inputSchema ({len(no_schema)} missing)")
            # contentEncoding must sit on a top-level string, or on items of an array
            for t in tools:
                for pname, p in (t.get("inputSchema", {}).get("properties") or {}).items():
                    if p.get("contentEncoding") == "base64":
                        check(p.get("type") == "string", f"{t['name']}.{pname} contentEncoding is on a string")
                arrays = [
                    p for p in (t.get("inputSchema", {}).get("properties") or {}).values()
                    if p.get("type") == "array" and (p.get("items") or {}).get("contentEncoding") == "base64"
                ]
                check(len(arrays) <= 1, f"{t['name']} has at most one array file parameter")
    auth = r.get("authorization")
    if auth:
        if auth.get("type") == "None":
            check("referenceId" not in auth, "referenceId absent when authorization type is None")
        else:
            check(bool(auth.get("referenceId")), f"referenceId present for authorization type {auth.get('type')}")
            check(len(auth.get("referenceId", "")) <= 128, "referenceId <= 128 chars")

# ── icons ──────────────────────────────────────────────────────────────────
print("\n[6] Icons")


def png_header(p: pathlib.Path):
    b = p.read_bytes()
    assert b[:8] == b"\x89PNG\r\n\x1a\n", f"{p.name} is not a PNG"
    w, h, depth, colour = struct.unpack(">IIBB", b[16:26])
    return w, h, depth, colour, len(b)


for key, want in (("color", 192), ("outline", 32)):
    rel = manifest["icons"][key]
    p = PKG / rel.lstrip("./")
    if not check(p.is_file(), f"icons.{key} file exists: {rel}"):
        continue
    w, h, depth, colour, size = png_header(p)
    check((w, h) == (want, want), f"{rel} PNG header says {w}x{h}, spec requires {want}x{want}")
    check(colour in (4, 6), f"{rel} has an alpha channel (colour type {colour})")
    try:
        from PIL import Image

        im = Image.open(p).convert("RGBA")
        a = im.getchannel("A")
        box = a.getbbox()
        if key == "outline":
            px = im.load()
            non_white = {
                (px[x, y][0], px[x, y][1], px[x, y][2])
                for y in range(h)
                for x in range(w)
                if px[x, y][3] > 0 and px[x, y][:3] != (255, 255, 255)
            }
            check(not non_white, f"{rel} is pure white on transparent (schema: border colour must be white)")
            # visible bbox, ignoring resampling halo
            vis = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] >= 32]
            xs = [c[0] for c in vis]
            ys = [c[1] for c in vis]
            l, r_, t, b_ = min(xs), w - 1 - max(xs), min(ys), h - 1 - max(ys)
            check(max(l, r_) <= 1, f"{rel} fills the canvas horizontally (padding L={l} R={r_})")
            check(abs(t - b_) <= 1, f"{rel} vertical padding is symmetric (T={t} B={b_}), store bans extra padding")
        else:
            check(box == (0, 0, w, h), f"{rel} background is a full-bleed square, no dead border")
            accent = manifest["accentColor"].lstrip("#").upper()
            px = im.load()
            found = any(
                f"{px[x, y][0]:02X}{px[x, y][1]:02X}{px[x, y][2]:02X}" == accent
                for y in range(0, h, 2)
                for x in range(0, w, 2)
            )
            (ok if found else warn)(f"{rel} contains the declared accentColor #{accent}")
            if found:
                checks += 1
    except ImportError:
        warn("Pillow not installed, pixel checks skipped")

# ── store content rules ────────────────────────────────────────────────────
print("\n[7] Store content rules")
d = manifest["description"]
check(len(d["short"]) <= 80, f"description.short is {len(d['short'])}/80 chars")
check(len(d["full"]) <= 4000, f"description.full is {len(d['full'])}/4000 chars")
check(len(d["full"].split()) <= 500, f"description.full is {len(d['full'].split())} words (store cap 500)")
# NEVER waive this cap. On 2026-08-14 the 30-char limit was deliberately
# exceeded (name.short set to the 34-char "Stable Baseline for Copilot Cowork"
# so it would match name.full and the Partner Center name exactly) on the
# theory that Microsoft's validation would either accept it or bounce it
# loudly. It does neither: the tenant ACCEPTS the upload, the agentSkills
# still load and appear in the UI, and the agentConnectors tool source is
# silently dropped. The symptom is "plugin installed, skills listed, zero
# actions", with no error shown anywhere and no request ever reaching our
# MCP endpoint. It was diagnosable only from the server side, by noticing
# that Cowork's runtime (agent-tools.cloud) had probed us every ~2 hours for
# days and stopped dead at 23:34 UTC, the moment the over-cap package was
# installed. Cost: most of a day. name.short and name.full simply cannot be
# identical here; that is a schema fact, not a preference.
check(len(manifest["name"]["short"]) <= 30, f"name.short is {len(manifest['name']['short'])}/30 chars")
for f in d.get("features", []):
    check(len(f["title"]) <= 45 and len(f["description"]) <= 120, f"feature '{f['title']}' within length caps")
BANNED = re.compile(r"\b(if the user says|ignore (?:all |your )?(?:previous )?instructions|new instructions|do not print|answer in bold)\b", re.I)
# Bare imperatives the store names as examples. Legitimate inside a skill BODY
# (the model needs to be told a tool deletes things), but risky in a description
# a reviewer keyword-scans, so they warn rather than fail.
BANNED_SOFT = re.compile(r"\b(ignore|reset|delete)\b", re.I)
# Broader than https?:// on purpose: a bare "stablebaseline.io" or "www.x.com"
# is still a URL to a reviewer, and the old pattern let both through.
URLISH = re.compile(r"(https?://\S+|www\.\S+|\b[\w-]+\.(?:io|com|net|org|ai|dev)\b)", re.I)

# S6 binds "Short description, parameter descriptions, command descriptions,
# semantic descriptions and operation IDs", which reaches every field below.
# Checking only description.short/full let a real violation through a clean
# 369-check run: sb-author's front matter carried "delete this document".
_desc_fields = [
    ("description.short", d["short"]),
    ("description.full", d["full"]),
]
for f in d.get("features", []):
    _desc_fields.append((f"feature '{f['title']}' title", f["title"]))
    _desc_fields.append((f"feature '{f['title']}' description", f["description"]))
for c in manifest.get("agentConnectors", []):
    _desc_fields.append((f"connector '{c.get('id')}' displayName", c.get("displayName", "")))
    _desc_fields.append((f"connector '{c.get('id')}' description", c.get("description", "")))
for _sk in sorted((PKG / "skills").glob("*/SKILL.md")):
    _fm = _sk.read_text(encoding="utf-8").split("---")
    if len(_fm) > 2:
        _m = re.search(r"^description:\s*(.+?)(?=^\w+:|\Z)", _fm[1], re.S | re.M)
        if _m:
            _desc_fields.append((f"skills/{_sk.parent.name} description", " ".join(_m.group(1).split())))

# The URL ban is SCOPED, and the scope is the whole point.
#
# "Guidelines to Validate Agents" bans URLs in the SHORT description, parameter,
# command and semantic descriptions [Must fix] -- those are strings the model
# reads, where a URL is a prompt-injection surface.
#
# description.FULL is the opposite case: the Teams Store guidelines tell you to
# "Hyperlink contact details, get started, help, or sign up in app description",
# and validation ticket #5679244 raised MF-2 against us precisely BECAUSE the
# long description carried no sign-up / get-started / contact / help links.
# Banning URLs there made this validator demand the thing Microsoft rejects.
URL_EXEMPT = {"description.full"}
for label, text in _desc_fields:
    check(not BANNED.search(text), f"{label} has no banned instructional phrase")
    if label not in URL_EXEMPT:
        check(not URLISH.search(text), f"{label} contains no URL")
    if BANNED_SOFT.search(text):
        warn(f"{label} contains a bare imperative a reviewer may flag")
check(not re.search(r"\b(#1|amazing|best-in-class|the best)\b", d["full"], re.I), "description.full has no superlative claim")

# ── package layout ─────────────────────────────────────────────────────────
print("\n[8] Package layout")
for f in ("manifest.json", "color.png", "outline.png"):
    check((PKG / f).is_file(), f"{f} is at the package root")
check((PKG / "tools").is_dir(), "tools/ is at the package root")
check((PKG / "skills").is_dir(), "skills/ is at the package root")

# ── skills reference only real tools ───────────────────────────────────────
print("\n[9] Skill tool references")
# Tokens shaped like a tool name: a verb prefix followed by CamelCase, or kg_*.
TOOLISH = re.compile(
    r"^(?:kg_[a-z_]+|(?:get|list|create|update|delete|search|add|remove|insert|render|export|"
    r"start|stop|poll|preview|apply|design|auto|trace|data|duplicate|find|reorder|set|cancel|"
    r"accept|dismiss|invite|resend|grant|revoke|upsert|reactivate|purchase|quote|rebuild|reset|"
    r"trigger|edit)[A-Z]\w*)$"
)
tool_names: set[str] = set()
# Parameter names and annotation categories are legitimate backticked tokens that
# can look tool-shaped (designProfile, renderStatus, kg_admin), so collect them
# from the same file and subtract.
other_names: set[str] = set()
for c in conns:
    mtd = c.get("toolSource", {}).get("remoteMcpServer", {}).get("mcpToolDescription")
    if mtd and (PKG / mtd["file"].lstrip("./")).is_file():
        data = json.loads((PKG / mtd["file"].lstrip("./")).read_text(encoding="utf-8"))
        for t in data["tools"] if isinstance(data, dict) else data:
            tool_names.add(t["name"])
            other_names.add((t.get("annotations") or {}).get("category") or "")
            props = (t.get("inputSchema") or {}).get("properties") or {}
            other_names |= set(props)
            for p in props.values():
                other_names |= set(p.get("properties") or {})
                other_names |= set((p.get("items") or {}).get("properties") or {})
# Field names the tool descriptions themselves document in their responses.
other_names |= {"renderStatus", "designId", "sessionId", "deckId", "jobId", "iconPath", "stencilKey"}
for entry in skills:
    rel = entry["folder"].lstrip("./")
    sm = PKG / rel / "SKILL.md"
    if not sm.is_file():
        continue
    referenced = {t for t in re.findall(r"`([A-Za-z_][A-Za-z0-9_]*)`", sm.read_text(encoding="utf-8")) if TOOLISH.match(t)}
    unknown = sorted(referenced - tool_names - other_names)
    referenced &= tool_names
    check(not unknown, f"{rel} references only tools that exist ({len(referenced)} referenced{', unknown: ' + ', '.join(unknown) if unknown else ''})")

print(f"\n{'=' * 60}")
print(f"{checks} checks passed, {len(errors)} errors, {len(warnings)} warnings")
if errors:
    print("\nERRORS:")
    for e in errors:
        print(f"  - {e}")
if warnings:
    print("\nWARNINGS:")
    for w_ in warnings:
        print(f"  - {w_}")
sys.exit(1 if errors else 0)
