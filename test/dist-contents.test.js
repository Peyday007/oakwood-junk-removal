// Guards what the build publishes. dist/ is the directory a visitor reaches,
// so it must hold the site and nothing that exists only for the repository:
// the dependency manifest, its lockfile, and the project's own notes are not
// public documents. Runs against the build output produced by `npm run build`,
// which `npm test` runs first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..');
const DIST_DIR = join(repoRoot, 'dist');

// Names the build must not copy out of the repository root: publishing any of
// them exposes the repository's dependency list or its internal notes at a
// public URL. They are repository-only at the root specifically — the same
// name inside a future asset directory would be site content, which is why
// this checks the top level of dist/ rather than every depth.
const REPOSITORY_ONLY_FILES = ['package.json', 'package-lock.json', 'README.md'];

// Every file under dist/, as a path relative to dist/ and with forward
// slashes, so an assertion failure names the offending file the way a URL
// would.
function listFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...listFiles(path));
    } else {
      files.push(relative(DIST_DIR, path).split(/[\\/]/).join('/'));
    }
  }
  return files;
}

test('the build produced a dist/ directory to inspect', () => {
  assert.ok(
    existsSync(DIST_DIR) && statSync(DIST_DIR).isDirectory(),
    `Missing dist/. Run "npm run build" before running the tests — this suite ` +
      `checks what the build publishes.`,
  );
});

test('dist/ contains the site itself', () => {
  assert.ok(existsSync(join(DIST_DIR, 'index.html')), 'expected the build to publish index.html');
});

test('dist/ publishes no repository-only files', () => {
  const published = listFiles(DIST_DIR);
  const offenders = published.filter((file) => REPOSITORY_ONLY_FILES.includes(file));

  assert.deepStrictEqual(
    offenders,
    [],
    `dist/ must not publish ${offenders.join(', ')}: a deployed visitor could fetch ` +
      `the repository's dependency list or its internal notes at a public URL.`,
  );
});
