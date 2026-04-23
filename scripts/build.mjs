import { mkdir, rm, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, "src"), { recursive: true });
await copyFile(resolve(root, "index.html"), resolve(distDir, "index.html"));
await copyFile(resolve(root, "src/main.js"), resolve(distDir, "src/main.js"));

console.log("Build completed: dist/index.html generated.");
