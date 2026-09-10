// Copies the hand-written site into dist/. There is nothing to bundle: one
// index.html and whatever static files sit beside it at the repository root.
// The copy must be byte-identical, since the test suite runs the same
// contract checks against both the source and the build output.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, '..');

const SOURCE_PATH = join(repoRoot, 'index.html');
const DIST_DIR = join(repoRoot, 'dist');

const EXCLUDED_ENTRIES = new Set(['node_modules', 'test', 'scripts', 'dist', '.git', '.github']);

function isExcluded(name) {
  return name.startsWith('.') || EXCLUDED_ENTRIES.has(name);
}

if (!existsSync(SOURCE_PATH)) {
  console.error(`Build failed: missing source file at ${SOURCE_PATH}.`);
  process.exit(1);
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

for (const name of readdirSync(repoRoot)) {
  if (isExcluded(name)) continue;
  const entryPath = join(repoRoot, name);
  if (!statSync(entryPath).isFile()) continue;
  copyFileSync(entryPath, join(DIST_DIR, name));
}

console.log(`Built dist/ from ${SOURCE_PATH}`);
