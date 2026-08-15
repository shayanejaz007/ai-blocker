#!/usr/bin/env node
/**
 * Regenerate every raster brand asset from a single source mark.
 *
 * Usage:
 *   node scripts/build-brand-assets.mjs                      # rebuild from the built-in SVG mark
 *   node scripts/build-brand-assets.mjs ./my-logo.png        # use a custom mark (e.g. a Higgsfield export)
 *
 * Writes:
 *   app/icon.png                 32×32   favicon fallback
 *   app/apple-icon.png           180×180 iOS home screen
 *   public/brand/logo-mark-512.png
 *   app/opengraph-image.png      1200×630 link preview
 *   app/twitter-image.png        1200×630
 *
 * Requires: npm i -D sharp
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("This script needs sharp:  npm i -D sharp");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const custom = process.argv[2];
const source = custom
  ? path.resolve(process.cwd(), custom)
  : path.join(root, "public/brand/logo-mark-transparent.svg");

if (!existsSync(source)) {
  console.error(`Source mark not found: ${source}`);
  process.exit(1);
}

await mkdir(path.join(root, "public/brand"), { recursive: true });
const buf = await readFile(source);

const square = async (size, out, background = { r: 8, g: 8, b: 16, alpha: 1 }) => {
  const png = await sharp(buf)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background })
    .png()
    .toBuffer();
  await writeFile(path.join(root, out), png);
  console.log(`  ${out}  ${size}×${size}`);
};

console.log(`Building brand assets from ${path.relative(root, source)}`);
await square(32, "app/icon.png");
await square(180, "app/apple-icon.png");

// Transparent 512 for general reuse
await writeFile(
  path.join(root, "public/brand/logo-mark-512.png"),
  await sharp(buf).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
);
console.log("  public/brand/logo-mark-512.png  512×512");

// ── Social card ──
const W = 1200, H = 630;
const mark = await sharp(buf)
  .resize(200, 200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#2c135c"/>
      <stop offset="100%" stop-color="#080810"/>
    </radialGradient>
    <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="${W / 2}" y="318" text-anchor="middle" fill="#ffffff"
        font-family="Inter, Poppins, sans-serif" font-size="60" font-weight="700">
    Detect AI. Verify authenticity.
  </text>
  <text x="${W / 2}" y="374" text-anchor="middle" fill="#a1a1aa"
        font-family="Inter, Poppins, sans-serif" font-size="29">
    Deepfake and AI-image detection you can act on.
  </text>
</svg>`);

const card = await sharp(bg)
  .composite([{ input: mark, top: 110, left: Math.round(W / 2 - 100) }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(path.join(root, "app/opengraph-image.png"), card);
await writeFile(path.join(root, "app/twitter-image.png"), card);
console.log(`  app/opengraph-image.png  ${W}×${H}`);
console.log(`  app/twitter-image.png    ${W}×${H}`);
console.log("Done. Restart next dev to pick up new icons.");
