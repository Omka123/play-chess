import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = path.join(process.cwd(), "node_modules", "stockfish");
const output = path.join(process.cwd(), "public", "engine");
await mkdir(output, { recursive: true });
for (const name of ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"]) await copyFile(path.join(root, "bin", name), path.join(output, name));
await copyFile(path.join(root, "Copying.txt"), path.join(output, "COPYING.txt"));
await writeFile(path.join(output, "SOURCE.txt"), "Stockfish.js 19.0.1 by Nathan Rugg and contributors. GPL-3.0.\nCorresponding source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\nPackage: https://www.npmjs.com/package/stockfish/v/19.0.1\n");
console.log("Prepared local Stockfish browser engine and license.");
