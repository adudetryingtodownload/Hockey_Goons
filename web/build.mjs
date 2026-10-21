// Builds the browser game: bundles the TypeScript engine (types stripped) and the art into one HTML file.
//   node web/build.mjs
// Outputs:
//   dist/hockey-goons.html       open this in a browser
//   dist/artifact.html           the same page without the document wrapper, for publishing

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const order = ["rng", "data", "engine", "shop", "ai", "run"];
const exportsList = [
  "GOON_BY_ID", "GEAR_BY_ID", "GOON_COST", "GEAR_COST", "COACH_COST", "ROLL_COST", "WINS_TO_CHAMPIONSHIP", "LOSSES_TO_END",
  "LINEUP_SLOTS", "MAX_COACHES", "startRun", "playRound", "buyGoon", "buyGear", "buyCoach", "sell", "move", "roll", "freeze",
  "goonStats", "levelForCopies", "saveRun", "loadRun", "GOONS",
];

let engine = "";
for (const name of order) {
  let code = readFileSync(join(root, "src", `${name}.ts`), "utf8");
  code = stripTypeScriptTypes(code, { mode: "strip" });
  code = code.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?/gm, "");
  code = code.replace(/^export\s+(?=(const|function|let|class|async))/gm, "");
  engine += `\n// ---- ${name}.ts ----\n${code}`;
}
engine = `window.HG = (() => {\n${engine}\nreturn { ${exportsList.join(", ")} };\n})();`;

const assets = {};
for (const file of readdirSync(join(root, "web", "assets"))) {
  if (!file.endsWith(".webp")) continue;
  assets[file.replace(".webp", "")] = `data:image/webp;base64,${readFileSync(join(root, "web", "assets", file)).toString("base64")}`;
}

const template = readFileSync(join(root, "web", "game.html"), "utf8");
const page = template.replace("/*@@ENGINE@@*/", () => engine).replace("/*@@ASSETS@@*/", () => JSON.stringify(assets));

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "artifact.html"), page);
writeFileSync(join(root, "dist", "hockey-goons.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
console.log(`Built dist/hockey-goons.html (${(page.length / 1024).toFixed(0)} KB)`);
