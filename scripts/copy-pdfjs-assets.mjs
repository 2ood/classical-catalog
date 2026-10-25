// Copies the PDF.js decoder assets (JBIG2/JPEG 2000 wasm, cMaps, standard
// fonts, ICC profiles) into public/pdfjs so ScoreViewer can load them from
// our own origin. Runs on postinstall, so it always matches pdfjs-dist.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfjsDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
const outDir = path.join(import.meta.dirname, "..", "public", "pdfjs");

fs.rmSync(outDir, { recursive: true, force: true });
for (const dir of ["wasm", "cmaps", "standard_fonts", "iccs"]) {
  fs.cpSync(path.join(pdfjsDir, dir), path.join(outDir, dir), {
    recursive: true,
  });
}
console.log(`Copied PDF.js assets to ${path.relative(process.cwd(), outDir)}`);
