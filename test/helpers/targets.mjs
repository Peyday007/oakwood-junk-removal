// Loads the two mandatory targets every test in this suite runs against:
// the hand-written source page, and the build output it must still match.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const helpersDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(helpersDir, '..', '..');

const SOURCE_PATH = join(repoRoot, 'index.html');
const BUILT_PATH = join(repoRoot, 'dist', 'index.html');

function readTarget(label, path) {
  const raw = readFileSync(path, 'utf8');
  return { label, path, raw, root: parse(raw) };
}

/**
 * Returns the list of targets the suite runs against: the source index.html
 * and the built dist/index.html. Both are mandatory — a build that produced
 * nothing must fail the suite, not silently shrink it to one target.
 */
export function getTargets() {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source file at ${SOURCE_PATH}. The project's index.html must exist.`);
  }

  if (!existsSync(BUILT_PATH)) {
    throw new Error(
      `Missing dist/index.html. Run "npm run build" before running the tests — ` +
        `the suite checks the built output alongside the source page, and both ` +
        `targets are mandatory.`,
    );
  }

  return [readTarget('source (index.html)', SOURCE_PATH), readTarget('build output (dist/index.html)', BUILT_PATH)];
}
