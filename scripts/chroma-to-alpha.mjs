/**
 * Убирает ровный фон-хромакей: пиксели близкие к заданному RGB → alpha 0.
 *
 * Примеры:
 *   node scripts/chroma-to-alpha.mjs --hex fc03f8 assets/foo.png
 *   node scripts/chroma-to-alpha.mjs --hex #fc03f8 --dir assets/visuals/raster/skills-source
 *   npm run icons:chroma -- --hex fc03f8 --dir assets/visuals/raster/skills-source
 *
 * Опции:
 *   --hex RRGGBB или #RRGGBB  (обязательно)
 *   --tolerance N   допуск по расстоянию в RGB (по умолчанию 18)
 *   --in-place      перезаписать файлы (по умолчанию для --dir)
 *   --out path.png  один выходной файл (если один входной)
 */
import { readFile, writeFile } from "fs/promises";
import { existsSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";
import { chromaKeyBufferToPngBuffer } from "./chroma-key-lib.mjs";

function parseArgs(argv) {
  const out = { hex: null, tolerance: 18, inPlace: false, outFile: null, files: [], dir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--hex" && argv[i + 1]) {
      out.hex = argv[++i];
    } else if (a === "--tolerance" && argv[i + 1]) {
      out.tolerance = Number(argv[++i]);
    } else if (a === "--in-place") {
      out.inPlace = true;
    } else if (a === "--out" && argv[i + 1]) {
      out.outFile = argv[++i];
    } else if (a === "--dir" && argv[i + 1]) {
      out.dir = argv[++i];
    } else if (!a.startsWith("-")) {
      out.files.push(a);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.hex) {
    console.error("Usage: node scripts/chroma-to-alpha.mjs --hex RRGGBB [--tolerance N] (--dir DIR | file.png ...)");
    process.exit(1);
  }
  const tol = Number.isFinite(args.tolerance) ? args.tolerance : 18;

  let targets = [...args.files];
  if (args.dir) {
    if (!existsSync(args.dir)) throw new Error(`Directory not found: ${args.dir}`);
    for (const name of readdirSync(args.dir)) {
      if (name.toLowerCase().endsWith(".png")) targets.push(join(args.dir, name));
    }
  }
  targets = [...new Set(targets)].filter((p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });

  if (targets.length === 0) {
    console.error("No PNG files to process.");
    process.exit(1);
  }

  const inPlace = args.inPlace || !!args.dir;
  if (targets.length > 1 && args.outFile) {
    throw new Error("--out is only valid with a single input file");
  }

  for (const inputPath of targets) {
    const buf = await readFile(inputPath);
    const outBuf = await chromaKeyBufferToPngBuffer(buf, args.hex, tol);
    const dest = inPlace ? inputPath : args.outFile || inputPath.replace(/\.png$/i, ".chroma.png");
    await writeFile(dest, outBuf);
    console.log("OK", basename(inputPath), "→", dest);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
