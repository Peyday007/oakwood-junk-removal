// Guards what the build publishes, by listing dist/ rather than by naming a
// few files that must not be there. dist/ is the directory a visitor reaches,
// so every entry in it has to be something the site is meant to serve — and a
// file added to the repository later (a licence, a tsconfig, a manifest, a
// set of notes) must fail this suite if the build starts publishing it,
// without anyone remembering to add its name here first.
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

// The complete set of files the site is allowed to serve from its root. This
// deliberately duplicates the allowlist in scripts/build.mjs instead of
// importing it: a test that asked the build what it publishes could never
// catch the build publishing the wrong thing. Publishing a new root file is
// therefore a decision made in two places, on purpose.
const PUBLISHABLE_ROOT_FILES = new Set([
  'index.html',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'CNAME',
]);

// Every path under dist/, relative to dist/ and with forward slashes, so an
// assertion failure names the offending entry the way a URL would.
function listEntries(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const relativePath = relative(DIST_DIR, path).split(/[\\/]/).join('/');
    if (statSync(path).isDirectory()) {
      entries.push({ path: relativePath, isDirectory: true });
      entries.push(...listEntries(path));
    } else {
      entries.push({ path: relativePath, isDirectory: false });
    }
  }
  return entries;
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

test('every file at the top level of dist/ is something the site serves', () => {
  const published = listEntries(DIST_DIR)
    .filter((entry) => !entry.isDirectory && !entry.path.includes('/'))
    .map((entry) => entry.path);

  const unexpected = published.filter((name) => !PUBLISHABLE_ROOT_FILES.has(name)).sort();

  assert.deepStrictEqual(
    unexpected,
    [],
    `dist/ publishes ${unexpected.join(', ')}, which the site does not serve. A file ` +
      `that exists for the repository — a manifest, a lockfile, a licence, notes — must ` +
      `not be reachable at a public URL. If one of these really is site content, add it ` +
      `to the allowlist in scripts/build.mjs and to PUBLISHABLE_ROOT_FILES here.`,
  );
});

test('every directory at the top level of dist/ came from the repository root', () => {
  const publishedDirectories = listEntries(DIST_DIR)
    .filter((entry) => entry.isDirectory && !entry.path.includes('/'))
    .map((entry) => entry.path);

  const unexpected = publishedDirectories
    .filter((name) => {
      const source = join(repoRoot, name);
      return !(existsSync(source) && statSync(source).isDirectory());
    })
    .sort();

  assert.deepStrictEqual(
    unexpected,
    [],
    `dist/ contains ${unexpected.join(', ')}, which is not a directory at the ` +
      `repository root, so the build invented it.`,
  );
});

test('dist/ publishes none of the repository files that used to leak into it', () => {
  const published = listEntries(DIST_DIR)
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.path);

  const leaked = ['package.json', 'package-lock.json', 'README.md'].filter((name) =>
    published.includes(name),
  );

  assert.deepStrictEqual(
    leaked,
    [],
    `dist/ must not publish ${leaked.join(', ')}: a deployed visitor could fetch the ` +
      `repository's dependency list or its internal notes at a public URL.`,
  );
});
