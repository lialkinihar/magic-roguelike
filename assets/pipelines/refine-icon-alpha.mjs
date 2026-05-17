import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const importDir = join(root, "assets", "pipeline-work", "import");
const refineDir = join(root, "assets", "pipeline-work", "refine");

async function main() {
  if (!existsSync(importDir)) throw new Error(`Missing import dir: ${importDir}`);
  await mkdir(refineDir, { recursive: true });
  const files = (await readdir(importDir)).filter((name) => name.endsWith(".png"));
  for (const file of files) {
    await writeFile(join(refineDir, file), await readFile(join(importDir, file)));
  }
  console.log(`[refine] copied ${files.length} file(s) to assets/pipeline-work/refine`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
