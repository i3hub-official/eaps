import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Using your specified path
const SOURCE_IMAGE = 'static/icons/sb_logo.png'; 
const TARGET_DIR = 'static/icons';
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
    console.log(`🚀 Starting icon generation from: ${SOURCE_IMAGE}`);

    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error(`❌ Error: Source image "${SOURCE_IMAGE}" not found.`);
        return;
    }

    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    try {
        // Initialize sharp once
        const pipeline = sharp(SOURCE_IMAGE);

        const generationPromises = sizes.map(async (size) => {
            const outputPath = path.join(TARGET_DIR, `icon-${size}.png`);
            
            await pipeline
                .clone()
                .trim() // Automatically removes any existing white/transparent borders
                .resize(size, size, {
                    fit: 'contain',
                    // alpha: 0 makes the background 100% transparent
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .png()
                .toFile(outputPath);
                
            console.log(`✅ Generated: ${outputPath}`);
        });

        await Promise.all(generationPromises);
        console.log('\x1b[32m%s\x1b[0m', 'Done! Your transparent PWA icons are ready.');

    } catch (error) {
        console.error('An error occurred during generation:', error);
    }
}

generateIcons();