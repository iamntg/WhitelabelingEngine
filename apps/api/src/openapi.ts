import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

/**
 * Writes the OpenAPI document to disk. Run with `pnpm openapi`.
 *
 * Generated from the same Zod schemas the routes validate with, so the document
 * cannot describe an endpoint that no longer matches its implementation.
 */

const outPath = resolve(process.argv[2] ?? 'openapi.json');
const app = await buildApp(loadConfig());
await app.ready();

const document = app.swagger();
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outPath}`);
await app.close();
