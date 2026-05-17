import { mkdir, readdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { ATLAS_TILE_ORDER } from "./atlas-tiles.config.js";
import { SKILLS_CONFIG } from "../../shared/dist/skills.config.js";
import { OTHER_CONFIG } from "../../other.config.js";
import { IMPORT_MANIFEST } from "../import-manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const workDir = join(root, "assets", "pipeline-work");
const reportPath = join(workDir, "pipeline-report.json");

function parseArgs(argv) {
  return {
    skipChroma: argv.includes("--skip-chroma"),
    skipRefine: argv.includes("--skip-refine"),
    dryRun: argv.includes("--dry-run"),
  };
}

function runNodeScript(scriptName, args = []) {
  const scriptPath = join(root, "assets", "pipelines", scriptName);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function preflightManifest() {
  const rows = IMPORT_MANIFEST;
  if (!Array.isArray(rows)) throw new Error("assets/import-manifest.js must export array");
  const knownAssetIds = new Set(rows.map((row) => row.assetId));

  const seen = new Set();
  const seenAtlasPos = new Set();
  const seenAtlasFiles = new Set();
  const seenSvgPaths = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") throw new Error(`[preflight] row ${i} must be object`);
    if (row.source !== "asset_atlas" && row.source !== "svg_icons") throw new Error(`[preflight] row ${i}: invalid source`);
    if (typeof row.assetId !== "string" || !row.assetId.trim()) throw new Error(`[preflight] row ${i}: missing assetId`);
    const normalized = row.assetId.trim();
    if (seen.has(normalized)) throw new Error(`[preflight] duplicate id in manifest: ${normalized}`);
    seen.add(normalized);
    if (row.source === "asset_atlas") {
      if (typeof row.file !== "string" || !row.file.trim()) throw new Error(`[preflight] row ${i}: missing file`);
      if (!Number.isInteger(row.atlasPosition)) throw new Error(`[preflight] row ${i}: invalid atlasPosition`);
      if (typeof row.chromaHex !== "string" || !row.chromaHex.trim()) throw new Error(`[preflight] row ${i}: missing chromaHex`);
      if (!Number.isFinite(Number(row.chromaTolerance))) throw new Error(`[preflight] row ${i}: invalid chromaTolerance`);
      if (seenAtlasPos.has(row.atlasPosition)) throw new Error(`[preflight] duplicate atlasPosition: ${row.atlasPosition}`);
      seenAtlasPos.add(row.atlasPosition);
      const f = row.file.trim();
      if (seenAtlasFiles.has(f)) throw new Error(`[preflight] duplicate file for asset_atlas: ${f}`);
      seenAtlasFiles.add(f);
    }
    if (row.source === "svg_icons") {
      if (typeof row.path !== "string" || !row.path.trim()) throw new Error(`[preflight] row ${i}: missing path`);
      const p = row.path.trim();
      if (seenSvgPaths.has(p)) throw new Error(`[preflight] duplicate path for svg_icons: ${p}`);
      seenSvgPaths.add(p);
    }
  }

  const referencedAssets = new Set([
    ...SKILLS_CONFIG.singleRuneCombos.map((row) => row.asset),
    ...SKILLS_CONFIG.dualRuneCombos.map((row) => row.asset),
    ...SKILLS_CONFIG.invokeCombos.map((row) => row.asset),
    ...SKILLS_CONFIG.extraSkillAssets.map((row) => row.asset),
    ...OTHER_CONFIG.comboRuneAssets.map((row) => row.asset),
    ...OTHER_CONFIG.appIconAssets.map((row) => row.asset),
  ]);
  for (const asset of referencedAssets) {
    if (!knownAssetIds.has(asset)) throw new Error(`[preflight] config references unknown asset: ${asset}`);
  }
}

async function preflightPackInputs(inputDir) {
  const names = (await readdir(inputDir)).filter((name) => name.endsWith(".png"));
  const available = new Set(names.map((name) => name.replace(/\.png$/i, "")));
  for (const assetId of ATLAS_TILE_ORDER) {
    if (!available.has(assetId)) throw new Error(`[preflight] missing packed input: ${assetId}.png`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = {
    startedAt: new Date().toISOString(),
    args,
    steps: [],
  };

  const track = async (name, fn) => {
    const started = Date.now();
    await fn();
    report.steps.push({ name, elapsedMs: Date.now() - started });
  };

  await track("preflight:manifest", preflightManifest);

  if (args.dryRun) {
    report.finishedAt = new Date().toISOString();
    report.ok = true;
    await mkdir(workDir, { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log("[pipeline] dry-run OK");
    return;
  }

  await track("reset:pipeline-work", async () => {
    await rm(workDir, { recursive: true, force: true });
    await mkdir(workDir, { recursive: true });
  });

  await track("import-raw", () => runNodeScript("import-raw-skill-png.mjs"));
  if (!args.skipChroma) {
    await track("chroma-to-alpha", () => runNodeScript("chroma-to-alpha.mjs"));
  }
  if (!args.skipRefine) {
    await track("refine", () => runNodeScript("refine-icon-alpha.mjs"));
  }

  const packInput = !args.skipRefine && existsSync(join(workDir, "refine")) ? join(workDir, "refine") : join(workDir, "import");
  await track("preflight:pack-inputs", () => preflightPackInputs(packInput));
  await track("pack", () => runNodeScript("build-game-atlas-sprite.mjs", args.skipRefine ? ["--from-import"] : []));

  report.finishedAt = new Date().toISOString();
  report.ok = true;
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[pipeline] done -> ${reportPath}`);
}

main().catch(async (error) => {
  try {
    await mkdir(workDir, { recursive: true });
    const report = {
      startedAt: new Date().toISOString(),
      ok: false,
      error: String(error?.stack || error),
    };
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  } catch {
    // ignore report write failure
  }
  console.error(error);
  process.exit(1);
});
