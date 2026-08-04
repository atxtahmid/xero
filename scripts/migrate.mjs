#!/usr/bin/env node
/**
 * Xero folder restructure migration script.
 *
 * Run this ONCE from the bot's root (where `src/` lives):
 *   node migrate.mjs
 *
 * What it does:
 * 1. Reads mapping.json (old path -> new path, relative to src/).
 * 2. Builds a full map of every .ts file under src/ (explicit moves +
 *    identity for anything not listed + drops anything mapped to null).
 * 3. For every file, rewrites every relative import/export path so it
 *    still resolves correctly at the file's NEW location, then writes it
 *    to that new location.
 * 4. Deletes now-empty old directories.
 *
 * This does NOT change any logic — every import is recalculated purely
 * from directory depth, nothing else. It is deliberately conservative:
 * anything it can't confidently resolve is left untouched and printed as
 * a warning at the end for manual review, rather than guessed at.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(process.cwd(), "src");
const MAPPING_PATH = path.join(__dirname, "mapping.json");

if (!fs.existsSync(SRC_ROOT)) {
  console.error(`Could not find ${SRC_ROOT}. Run this from the bot's root directory (where src/ lives).`);
  process.exit(1);
}

const explicitMapping = JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (entry.name.endsWith(".ts")) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

const allFiles = walk(SRC_ROOT);

// Build the full old->new map (identity for anything not explicitly listed).
const fullMap = new Map();
for (const relPath of allFiles) {
  if (Object.prototype.hasOwnProperty.call(explicitMapping, relPath)) {
    const target = explicitMapping[relPath];
    fullMap.set(relPath, target); // target may be null (drop)
  } else {
    fullMap.set(relPath, relPath); // unchanged
  }
}

// Helper: resolve a relative import specifier (as written in source, with
// a trailing .js) from an importing file's OLD location to the OLD
// relative-to-src path of the target .ts file.
function resolveOldImportTarget(importingRelPath, specifier) {
  if (!specifier.startsWith(".")) return null; // not a relative import
  const importingDir = path.dirname(importingRelPath);
  let targetNoExt = specifier.replace(/\.js$/, "");
  let resolved = path.normalize(path.join(importingDir, targetNoExt)).split(path.sep).join("/");
  return `${resolved}.ts`;
}

const IMPORT_RE = /((?:^|\n)\s*(?:import|export)(?:[^'"]*?)from\s+["'])(\.[^"']+)(["'])/g;

const warnings = [];
const results = []; // { oldPath, newPath, content }

for (const relPath of allFiles) {
  const newPath = fullMap.get(relPath);
  if (newPath === null) continue; // dropped file

  const absOld = path.join(SRC_ROOT, relPath);
  let content = fs.readFileSync(absOld, "utf8");

  content = content.replace(IMPORT_RE, (whole, prefix, specifier, quote) => {
    const oldTargetTs = resolveOldImportTarget(relPath, specifier);
    if (!oldTargetTs) return whole;

    if (!fullMap.has(oldTargetTs)) {
      warnings.push(`${relPath}: could not resolve import "${specifier}" (looked for ${oldTargetTs}) — left unchanged`);
      return whole;
    }

    const newTarget = fullMap.get(oldTargetTs);
    if (newTarget === null) {
      warnings.push(`${relPath}: imports "${specifier}", which points to a file being DROPPED — left unchanged, please check manually`);
      return whole;
    }

    const newImportingDir = path.dirname(newPath);
    let newRel = path.relative(newImportingDir, newTarget).split(path.sep).join("/");
    if (!newRel.startsWith(".")) newRel = "./" + newRel;
    newRel = newRel.replace(/\.ts$/, ".js");

    return `${prefix}${newRel}${quote}`;
  });

  results.push({ oldPath: relPath, newPath, content });
}

// Write everything to new locations first, then remove old files that
// actually moved, then clean up empty directories.
for (const { newPath, content } of results) {
  const absNew = path.join(SRC_ROOT, newPath);
  fs.mkdirSync(path.dirname(absNew), { recursive: true });
  fs.writeFileSync(absNew, content, "utf8");
}

for (const { oldPath, newPath } of results) {
  if (oldPath !== newPath) {
    const absOld = path.join(SRC_ROOT, oldPath);
    if (fs.existsSync(absOld)) fs.unlinkSync(absOld);
  }
}

// Explicitly dropped files
for (const [oldPath, newPath] of Object.entries(explicitMapping)) {
  if (newPath === null) {
    const absOld = path.join(SRC_ROOT, oldPath);
    if (fs.existsSync(absOld)) fs.unlinkSync(absOld);
  }
}

// Remove now-empty directories (repeat a few passes for nested empties).
function removeEmptyDirs(dir) {
  let changed = false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (removeEmptyDirs(full)) changed = true;
    }
  }
  if (fs.readdirSync(dir).length === 0 && dir !== SRC_ROOT) {
    fs.rmdirSync(dir);
    changed = true;
  }
  return changed;
}
for (let i = 0; i < 5; i++) removeEmptyDirs(SRC_ROOT);

console.log(`Migrated ${results.length} files.`);
console.log(`Moved: ${results.filter(r => r.oldPath !== r.newPath).length}`);
console.log(`Dropped: ${Object.values(explicitMapping).filter(v => v === null).length}`);
if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(" - " + w);
} else {
  console.log("\nNo warnings — every import resolved cleanly.");
}
