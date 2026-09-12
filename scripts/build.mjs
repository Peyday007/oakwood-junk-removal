// Copies the hand-written site into dist/. There is nothing to bundle: the
// index.html and whatever static files and directories sit beside it at the
// repository root, copied recursively so a future asset directory is carried
// into dist/ the same as a top-level file is today. The copy must be
// byte-identical, since the test suite runs the same contract checks against
// both the source and the build output.
//
// dist/ is what gets deployed, so it holds the site and nothing else. What
// makes an entry site content is stated below as a rule rather than as a list
// of the files that happen to be in the way today: everything at the root is
// the site, except the machinery the repository runs on itself. A new static
// file or asset directory dropped beside index.html is therefore published
// without anyone editing this script — and test/dist-contents.test.js holds
// the matching statement of what dist/ is expected to contain, so a new file
// that reaches dist/ fails the suite until someone says it belongs there.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, '..');

const SOURCE_PATH = join(repoRoot, 'index.html');
const DIST_DIR = join(repoRoot, 'dist');

// The repository's own machinery, at any depth: the toolchain it installs,
// the suite that guards it, the script that builds it, the output of that
// build, and the version-control and CI directories. None of it is the site.
const REPOSITORY_DIRECTORIES = new Set(['node_modules', 'test', 'scripts', 'dist', '.git', '.github']);

// Files that exist for the repository rather than for a visitor: the
// dependency manifest, its lockfile, and the project's own notes. They are
// repository documents at the root specifically — a file of the same name
// inside an asset directory is part of the site and is published.
const REPOSITORY_ROOT_FILES = new Set(['package.json', 'package-lock.json', 'README.md']);

/**
 * True when an entry belongs to the site a visitor is served, false when it
 * belongs to the repository that produces it. Dotted entries — editor state,
 * .gitignore, CI configuration — are repository machinery wherever they sit.
 */
function isSiteEntry(name, srcDir) {
  if (name.startsWith('.') || REPOSITORY_DIRECTORIES.has(name)) return false;
  if (srcDir === repoRoot && REPOSITORY_ROOT_FILES.has(name)) return false;
  return true;
}

if (!existsSync(SOURCE_PATH)) {
  console.error(`Build failed: missing source file at ${SOURCE_PATH}.`);
  process.exit(1);
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

// Recursively copies every site entry from srcDir into destDir, so a
// subdirectory added beside index.html later is carried into dist/ instead of
// being skipped the way a non-file entry was before.
function copyDir(srcDir, destDir) {
  for (const name of readdirSync(srcDir)) {
    if (!isSiteEntry(name, srcDir)) continue;
    const srcPath = join(srcDir, name);
    const destPath = join(destDir, name);
    if (statSync(srcPath).isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(repoRoot, DIST_DIR);

// Self-check: walks the same source tree the copy just read and confirms
// every file it should have produced actually exists in dist/. This is what
// turns "the copy silently dropped something" into a failed build, since
// nothing else in the suite asserts dist/ completeness.
function findMissing(srcDir, destDir) {
  const missing = [];
  for (const name of readdirSync(srcDir)) {
    if (!isSiteEntry(name, srcDir)) continue;
    const srcPath = join(srcDir, name);
    const destPath = join(destDir, name);
    if (statSync(srcPath).isDirectory()) {
      missing.push(...findMissing(srcPath, destPath));
    } else if (!existsSync(destPath)) {
      missing.push(relative(repoRoot, srcPath));
    }
  }
  return missing;
}

const missing = findMissing(repoRoot, DIST_DIR);
if (missing.length > 0) {
  console.error(`Build failed: dist/ is missing files the copy should have produced: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Built dist/ from ${SOURCE_PATH}`);
