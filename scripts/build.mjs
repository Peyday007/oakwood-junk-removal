// Copies the hand-written site into dist/. There is nothing to bundle: the
// index.html and the static files and directories that belong to the site,
// copied recursively so an asset directory is carried into dist/ whole. The
// copy must be byte-identical, since the test suite runs the same contract
// checks against both the source and the build output.
//
// dist/ is what gets deployed, so it holds the site and nothing else. At the
// repository root that is decided by an allowlist rather than a denylist: a
// root file is published only if it is site content, so a file added to the
// repository later — a licence, a tsconfig, notes, a manifest — stays
// unpublished by default instead of silently appearing at a public URL. The
// old denylist had the opposite default and only knew about three names.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, '..');

const SOURCE_PATH = join(repoRoot, 'index.html');
const DIST_DIR = join(repoRoot, 'dist');

// Directories at the repository root that are never site content, whatever
// they contain.
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'test', 'scripts', 'dist', '.git', '.github']);

// The only files publishable from the repository root: the page itself and
// the handful of well-known files a static site serves from its root. Adding
// a name here is a deliberate decision to publish it, and test/dist-contents
// .test.js keeps its own copy of this list so the decision has to be made in
// both places.
const SITE_ROOT_FILES = new Set([
  'index.html',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'CNAME',
]);

// Decides whether one directory entry is copied. At the repository root the
// rule is the allowlist above for files, and "any directory that isn't
// repository machinery" for directories. Below the root everything is site
// content already, because it lives inside a published asset directory.
function isPublished(name, srcDir, isDirectory) {
  if (name.startsWith('.')) return false;
  if (srcDir !== repoRoot) return true;
  return isDirectory ? !EXCLUDED_DIRECTORIES.has(name) : SITE_ROOT_FILES.has(name);
}

if (!existsSync(SOURCE_PATH)) {
  console.error(`Build failed: missing source file at ${SOURCE_PATH}.`);
  process.exit(1);
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

// Recursively copies every published entry from srcDir into destDir, so a
// subdirectory added beside index.html later is carried into dist/ instead of
// being skipped the way a non-file entry was before.
function copyDir(srcDir, destDir) {
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    const isDirectory = statSync(srcPath).isDirectory();
    if (!isPublished(name, srcDir, isDirectory)) continue;
    const destPath = join(destDir, name);
    if (isDirectory) {
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
    const srcPath = join(srcDir, name);
    const isDirectory = statSync(srcPath).isDirectory();
    if (!isPublished(name, srcDir, isDirectory)) continue;
    const destPath = join(destDir, name);
    if (isDirectory) {
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
