import fs from "fs-extra";
import axios from "axios";

const UNI_JSON_URL =
  "https://raw.githubusercontent.com/AdioleDivine/nigerian-universities/main/uni.json";

const OUTPUT_DIR = "./uni-icons";

await fs.ensureDir(OUTPUT_DIR);

/**
 * Sanitize a university name into a safe filename.
 */
function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Extract the bare domain from a URL string.
 * e.g. "https://www.atbu.edu.ng/web/front" → "www.atbu.edu.ng"
 */
function extractDomain(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Try to download an image from a URL into <OUTPUT_DIR>/<fileName>.png
 * Returns true on success, false otherwise.
 */
async function tryDownload(url, fileName) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UniIconBot/1.0)",
      },
    });

    if (res.status < 200 || res.status >= 300) return false;

    const buffer = Buffer.from(res.data);

    // Reject tiny responses or HTML error pages
    if (buffer.length < 200) return false;
    const preview = buffer.toString("utf8", 0, 100).toLowerCase();
    if (preview.includes("<html") || preview.includes("<!doctype")) return false;

    await fs.writeFile(`${OUTPUT_DIR}/${fileName}.png`, buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a prioritised list of image sources for a university.
 *
 * Priority:
 *  1. The direct logo URL from the JSON  (most reliable)
 *  2. Google Favicon service             (good quality, always returns something)
 *  3. DuckDuckGo favicon service
 *  4. /favicon.ico on the university domain
 */
function buildSources(uni) {
  const sources = [];
  const domain = extractDomain(uni.web);

  if (uni.logo) {
    sources.push(uni.logo);
  }

  if (domain) {
    sources.push(
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`
    );
  }

  return sources;
}

/**
 * Write a plain-text placeholder when no image could be fetched.
 */
async function writePlaceholder(uni, fileName) {
  const initials = uni.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  await fs.writeFile(
    `${OUTPUT_DIR}/${fileName}.txt`,
    `PLACEHOLDER: ${uni.name} (${uni.acronym ?? initials})`
  );
}

async function main() {
  console.log("Fetching university list…");
  const { data } = await axios.get(UNI_JSON_URL);
  console.log(`Found ${data.length} universities.\n`);

  let downloaded = 0;
  let placeholders = 0;

  for (const uni of data) {
    if (!uni.name) continue;

    const fileName = sanitize(uni.name);
    const sources = buildSources(uni);

    process.stdout.write(`[${uni.acronym ?? "?"}] ${uni.name} … `);

    let success = false;
    for (const url of sources) {
      success = await tryDownload(url, fileName);
      if (success) break;
    }

    if (success) {
      console.log("✅");
      downloaded++;
    } else {
      await writePlaceholder(uni, fileName);
      console.log("⚠️  placeholder written");
      placeholders++;
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`   ✅ Downloaded : ${downloaded}`);
  console.log(`   ⚠️  Placeholders: ${placeholders}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
