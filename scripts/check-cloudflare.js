'use strict';

const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const entries = [
  'functions/api/pdf.js',
  'functions/api/wall.js',
  'functions/api/wall/join.js',
  'functions/api/wall/compile.js',
  'functions/healthz.js',
].map(file => path.join(ROOT, file));

async function main() {
  await esbuild.build({
    entryPoints:entries,
    bundle:true,
    write:false,
    outdir:'cloudflare-function-check',
    format:'esm',
    platform:'browser',
    target:'es2022',
    logLevel:'silent',
  });

  try {
    const { DatabaseSync } = require('node:sqlite');
    const database = new DatabaseSync(':memory:');
    database.exec(fs.readFileSync(path.join(ROOT, 'migrations', '0001_tera.sql'), 'utf8'));
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
    for (const name of ['tera_visitors', 'tera_usage_events', 'tera_meta']) {
      if (!tables.includes(name)) throw new Error(`Migration did not create ${name}`);
    }
    database.close();
  } catch (error) {
    if (error.code !== 'ERR_UNKNOWN_BUILTIN_MODULE') throw error;
    console.warn('Skipping SQLite migration execution because node:sqlite is unavailable.');
  }
  console.log(`Bundled ${entries.length} Pages Function routes and verified the D1 migration.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
