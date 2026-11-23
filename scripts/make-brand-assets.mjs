// Builds the NutriGoal brand assets from the original logo artwork.
// Usage: node scripts/make-brand-assets.mjs
//   public/brand/nutrigoal-logo-original.jpg  (source, white background)
// → public/brand/nutrigoal-mark.png    (icon only, transparent)
// → public/brand/nutrigoal-logo.png    (full lockup, transparent)
// → src/app/icon.png, src/app/apple-icon.png (favicons)
import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "public/brand/nutrigoal-logo-original.jpg");

/** Make near-white pixels transparent and un-blend anti-aliased edges from white. */
async function knockOutWhite(input) {
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lightest = Math.min(r, g, b);
    const a = Math.max(0, Math.min(1, (255 - lightest) / 48));
    if (a === 0) {
      data[i + 3] = 0;
      continue;
    }
    // Recover the original colour that was blended with white: c = (c' - 255(1-a)) / a
    data[i] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - a)) / a)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - a)) / a)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - a)) / a)));
    data[i + 3] = Math.round(a * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

async function main() {
  // Icon mark (circle, leaf, arrow and star)
  const mark = await knockOutWhite(sharp(src).extract({ left: 505, top: 110, width: 370, height: 380 }));
  const markPng = await mark.png().toBuffer();
  const trimmed = await sharp(markPng).trim({ threshold: 1 }).toBuffer();
  await sharp(trimmed)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, "public/brand/nutrigoal-mark.png"));

  // Full lockup (mark + wordmark + tagline)
  const lockup = await knockOutWhite(sharp(src).extract({ left: 330, top: 105, width: 720, height: 560 }));
  const lockupPng = await lockup.png().toBuffer();
  await sharp(lockupPng).trim({ threshold: 1 }).png().toFile(path.join(root, "public/brand/nutrigoal-logo.png"));

  // Favicons
  await sharp(trimmed)
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, "src/app/icon.png"));
  await sharp(trimmed)
    .resize(150, 150, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(root, "src/app/apple-icon.png"));
  // Installable app icons (PWA)
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.78);
    const icon = await sharp(trimmed).resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
      .composite([{ input: icon, gravity: "center" }])
      .png()
      .toFile(path.join(root, `public/brand/icon-${size}.png`));
  }
  // Maskable: extra safe-zone padding on a white field
  const safe = await sharp(trimmed).resize(330, 330, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
    .composite([{ input: safe, gravity: "center" }])
    .png()
    .toFile(path.join(root, "public/brand/icon-maskable-512.png"));
  console.log("Brand assets written.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
