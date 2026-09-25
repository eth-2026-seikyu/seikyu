#!/usr/bin/env node
// Copies contracts/deployments/sepolia.json into web/lib/deployments.sepolia.json
// so the frontend has a synced, committed snapshot of on-chain addresses.
// Fails loudly if the source file is missing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, '..');
const repoRoot = join(webRoot, '..');

const sourcePath = join(repoRoot, 'contracts', 'deployments', 'sepolia.json');
const destPath = join(webRoot, 'lib', 'deployments.sepolia.json');

if (!existsSync(sourcePath)) {
  console.error(`sync-deployments: source file not found at ${sourcePath}`);
  process.exit(1);
}

const raw = readFileSync(sourcePath, 'utf8');

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`sync-deployments: failed to parse ${sourcePath} as JSON: ${err.message}`);
  process.exit(1);
}

mkdirSync(dirname(destPath), { recursive: true });
writeFileSync(destPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

console.log(`sync-deployments: wrote ${destPath} from ${sourcePath}`);
