// Guards what the build publishes. dist/ is the directory a visitor reaches,
// so it must hold the site and nothing that exists only for the repository.
//
// The guard is a statement of what the site IS, not a list of the files it
// must not contain: the whole of dist/ is listed and compared against
// PUBLISHED_SITE below. A denylist only ever catches the files someone
// thought of — the next CONTRIBUTING.md, linter config or deploy note added
// at the repository root would be copied into dist/ and served at a public
// URL with nothing failing. Comparing the full listing inverts that: anything
// unexpected fails here, and a person decides whether it is site content or
// repository machinery.
//
// Runs against the build output produced by `npm run build`, which `npm test`
// runs first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..');
const DIST_DIR = join(repoRoot, 'dist');

// Every file the deployed site consists of, as a path relative to dist/.
// This is the list to edit when the site genuinely gains a file — and
// editing it is the point: it is the moment someone confirms the new file is
// meant to be public.
const PUBLISHED_SITE = ['index.html'];

// Names that must never appear here, kept as their own assertion so the leak
// this suite exists to prevent fails with a message that says what it is
// rather than only that a listing differed.
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

test('dist/ publishes the site and nothing else', () => {
  const published = listFiles(DIST_DIR).sort();
  const expected = [...PUBLISHED_SITE].sort();

  const unexpected = published.filter((file) => !expected.includes(file));
  const absent = expected.filter((file) => !published.includes(file));

  assert.deepStrictEqual(
    published,
    expected,
    [
      unexpected.length > 0
        ? `dist/ publishes ${unexpected.join(', ')}, which the site is not expected to ` +
          `contain — a visitor could fetch it at that path. If it is repository ` +
          `machinery, stop scripts/build.mjs from copying it; if it really is site ` +
          `content, add it to PUBLISHED_SITE in this file.`
        : '',
      absent.length > 0
        ? `dist/ is missing ${absent.join(', ')}, which the site is expected to contain: ` +
          `the build did not publish part of the site.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
});
