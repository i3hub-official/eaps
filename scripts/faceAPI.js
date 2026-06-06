// scripts/download-models.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, '..', 'static', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log(`📁 Created directory: ${modelsDir}`);
}

// Updated base URL
const baseUrl = 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    // Follow redirects manually
    const requestUrl = new URL(url);
    const options = {
      hostname: requestUrl.hostname,
      path: requestUrl.pathname,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(options, (response) => {
      // Handle redirects (302)
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        console.log(`   Redirecting to: ${redirectUrl}`);
        downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(outputPath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('🚀 Starting face-api model downloads...\n');
  
  for (const file of files) {
    const url = `${baseUrl}/${file}`;
    const outputPath = path.join(modelsDir, file);
    
    console.log(`📥 Downloading ${file}...`);
    
    try {
      await downloadFile(url, outputPath);
    } catch (error) {
      console.error(`❌ Error downloading ${file}:`, error.message);
    }
  }
  
  console.log('\n✨ All models downloaded successfully!');
  console.log(`📂 Models saved to: ${modelsDir}`);
}

downloadAll().catch(console.error);