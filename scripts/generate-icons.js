import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'static/eaps.svg';
const TARGET_DIR = 'static/icons';

// Sizes referenced in vite.config.ts manifest, plus common extras for
// apple-touch-icon / favicons. Naming matches the manifest: icon-{size}x{size}.png
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// Background used for maskable icons (matches manifest theme_color/background_color)
const MASKABLE_BG = { r: 0, g: 0, b: 0, alpha: 1 };

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
        // --- Standard "any" purpose icons (transparent background) ---
        const anyIconPromises = sizes.map(async (size) => {
            const outputPath = path.join(TARGET_DIR, `icon-${size}x${size}.png`);

            await sharp(SOURCE_IMAGE)
                .trim() // removes existing white/transparent borders
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated: ${outputPath}`);
        });

        await Promise.all(anyIconPromises);

        // --- Maskable icon (512x512) ---
        // Maskable icons get cropped into circles/squircles/etc by the OS, so
        // artwork must sit inside a safe zone (~80% of the canvas, centered)
        // with a solid background that fills the full square.
        const maskableSize = 512;
        const safeZoneRatio = 0.8;
        const contentSize = Math.round(maskableSize * safeZoneRatio);
        const padding = Math.round((maskableSize - contentSize) / 2);

        const maskableOutputPath = path.join(TARGET_DIR, `icon-maskable-512x512.png`);

        const resizedContent = await sharp(SOURCE_IMAGE)
            .trim()
            .resize(contentSize, contentSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        await sharp({
            create: {
                width: maskableSize,
                height: maskableSize,
                channels: 4,
                background: MASKABLE_BG
            }
        })
            .composite([{ input: resizedContent, top: padding, left: padding }])
            .png()
            .toFile(maskableOutputPath);

        console.log(`✅ Generated: ${maskableOutputPath}`);

        console.log('\x1b[32m%s\x1b[0m', '\nDone! Icons match vite.config.ts manifest.');
        console.log(
            '\x1b[33m%s\x1b[0m',
            '⚠️  Note: screenshots (desktop-wide.png / mobile-narrow.png) are real UI captures, not generated from the logo — you\'ll need to add those to static/screenshots/ separately.'
        );
    } catch (error) {
        console.error('An error occurred during generation:', error);
    }
}

generateIcons();