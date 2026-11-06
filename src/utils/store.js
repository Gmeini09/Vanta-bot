// Tiny JSON-file store. Good enough for warnings and giveaway state.
// NOTE: Railway's filesystem is ephemeral — attach a Volume and set DATA_DIR
// to its mount path if you need this to survive redeploys.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

const dir = config.dataDir;

function filePath(name) {
  return path.join(dir, `${name}.json`);
}

function ensureDir() {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch { /* ignore */ }
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
  } catch {
    return {};
  }
}

function write(name, data) {
  ensureDir();
  try {
    fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[store] could not write ${name}:`, err.message);
  }
}

module.exports = { read, write };
