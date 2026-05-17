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

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * @param {Buffer} inputBuffer
 * @param {string} chromaHex RRGGBB or #RRGGBB
 * @param {number} [tolerance=18]
 * @returns {Promise<Buffer>} PNG
 */
export async function chromaKeyBufferToPngBuffer(inputBuffer, chromaHex, tolerance = 18) {
  const chroma = parseHex(chromaHex);
  const tol = Number.isFinite(tolerance) ? tolerance : 18;
  const softBand = Math.max(8, Math.round(tol * 0.8));
  const tolSoft = tol + softBand;
  const despillBand = tolSoft + Math.max(8, Math.round(tol * 0.6));
  const chromaSum = chroma.r + chroma.g + chroma.b || 1;
  const cw = {
    r: chroma.r / chromaSum,
    g: chroma.g / chromaSum,
    b: chroma.b / chromaSum,
  };

  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error("Expected RGBA");
  const px = new Uint8ClampedArray(data);

  for (let i = 0; i < px.length; i += 4) {
    const a0 = px[i + 3];
    if (a0 === 0) continue;

    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];
    const d = distRgb({ r, g, b }, chroma);

    if (d <= tol) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }

    if (d < tolSoft) {
      const keep = (d - tol) / (tolSoft - tol);
      px[i + 3] = clampByte(a0 * keep);
    }

    if (d < despillBand && px[i + 3] > 0) {
      const w = 1 - (d - tol) / (despillBand - tol);
      const amt = Math.max(0, Math.min(1, w)) * 0.65;
      const avgGB = (g + b) * 0.5;
      const avgRB = (r + b) * 0.5;
      const avgRG = (r + g) * 0.5;

      if (r > avgGB) r -= (r - avgGB) * cw.r * amt;
      if (g > avgRB) g -= (g - avgRB) * cw.g * amt;
      if (b > avgRG) b -= (b - avgRG) * cw.b * amt;

      px[i] = clampByte(r);
      px[i + 1] = clampByte(g);
      px[i + 2] = clampByte(b);
    }
  }

  return sharp(Buffer.from(px), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
