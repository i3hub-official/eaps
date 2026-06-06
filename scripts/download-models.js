// scripts/download-models.js
// Downloads @vladmandic/human model files into static/models/
// Only the four models needed for face detection + recognition (enrollment & verify).
//
// Usage:  node scripts/download-models.js
// Add to package.json:  "postinstall": "node scripts/download-models.js"

import fs   from 'fs';
import path from 'path';
import https from 'https';
import http  from 'http';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const modelsDir  = path.join(__dirname, '..', 'static', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log(`📁 Created: ${modelsDir}`);
}

// ── Model source ──────────────────────────────────────────────────────────────
// vladmandic/human-models is the official model repo.
// We use jsDelivr (CDN mirror) for reliable redirects and high availability.
const BASE = 'https://raw.githubusercontent.com/vladmandic/human-models/main/models';

// ── Files needed for face detection + recognition only ────────────────────────
// blazeface  → detects face bounding boxes
// facemesh   → 468-point face mesh (needed for descriptor pipeline)
// iris       → iris landmarks (improves alignment)
// faceres    → 128-d face descriptor (HSE FaceRes) — the one stored in DB
const MODEL_FILES = [
  // BlazeFace (face detector)
  'blazeface.json',
  'blazeface.bin',

  // FaceMesh
  'facemesh.json',
  'facemesh.bin',

  // Iris
  'iris.json',
  'iris.bin',

  // FaceRes (descriptor / recognition)
  'faceres.json',
  'faceres.bin',
];

// ── Downloader (follows redirects, retries once) ──────────────────────────────
function download(url, dest, retries = 3) {
  return new Promise((resolve, reject) => {
    const file   = fs.createWriteStream(dest);
    const lib    = url.startsWith('https') ? https : http;

    const req = lib.get(url, { headers: { 'User-Agent': 'mouau-etest-model-downloader/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest, retries).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        if (retries > 0) {
          console.warn(`   ⚠ HTTP ${res.statusCode} — retrying (${retries} left)…`);
          return setTimeout(() => download(url, dest, retries - 1).then(resolve).catch(reject), 1500);
        }
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });

    req.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      if (retries > 0) {
        console.warn(`   ⚠ Network error — retrying (${retries} left)…`);
        return setTimeout(() => download(url, dest, retries - 1).then(resolve).catch(reject), 1500);
      }
      reject(err);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Downloading @vladmandic/human models for face recognition…\n');

  let ok = 0, skip = 0, fail = 0;

  for (const file of MODEL_FILES) {
    const dest = path.join(modelsDir, file);

    // Skip if already present and non-empty
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`⏭  Exists: ${file}`);
      skip++;
      continue;
    }

    const url = `${BASE}/${file}`;
    process.stdout.write(`📥 ${file}… `);

    try {
      await download(url, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`✅ (${kb} KB)`);
      ok++;
    } catch (err) {
      console.log(`❌ FAILED`);
      console.error(`   ${err.message}`);
      fail++;
    }
  }

  console.log(`\n── Summary ──────────────────────────────────────────`);
  console.log(`   ✅ Downloaded : ${ok}`);
  console.log(`   ⏭  Skipped   : ${skip}`);
  if (fail) console.log(`   ❌ Failed    : ${fail}`);
  console.log(`   📂 Location  : ${modelsDir}`);

  if (fail > 0) {
    console.error('\n⚠  Some models failed. Re-run the script to retry.');
    process.exit(1);
  } else {
    console.log('\n✨ All models ready.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });