/**
 * Хромакей → PNG RGBA. Используется chroma-to-alpha.mjs и import-raw-skill-png.mjs.
 */
import sharp from "sharp";

export function parseHex(s) {
  const h = String(s).replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex color: ${s}`);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function distRgb(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * @param {Buffer} inputBuffer
 * @param {string} chromaHex RRGGBB или #RRGGBB
 * @param {number} [tolerance=18]
 * @returns {Promise<Buffer>} PNG
 */
export async function chromaKeyBufferToPngBuffer(inputBuffer, chromaHex, tolerance = 18) {
  const chroma = parseHex(chromaHex);
  const tol = Number.isFinite(tolerance) ? tolerance : 18;
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error("Expected RGBA");
  const px = new Uint8ClampedArray(data);
  for (let i = 0; i < px.length; i += 4) {
    const p = { r: px[i], g: px[i + 1], b: px[i + 2] };
    if (distRgb(p, chroma) <= tol) {
      px[i + 3] = 0;
    }
  }
  return sharp(Buffer.from(px), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
