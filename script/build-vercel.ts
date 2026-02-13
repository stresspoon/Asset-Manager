import { execSync } from "child_process";
import { mkdirSync, cpSync, writeFileSync, existsSync } from "fs";

const OUTPUT = ".vercel/output";

// Step 1: Build frontend with Vite
console.log("Building frontend...");
execSync("npx vite build", { stdio: "inherit" });

// Step 2: Bundle API with esbuild
console.log("Bundling API...");
mkdirSync(`${OUTPUT}/functions/api.func`, { recursive: true });
execSync(
  `npx esbuild api/index.ts --bundle --platform=node --format=esm --outfile=${OUTPUT}/functions/api.func/index.mjs --target=node20 --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"`,
  { stdio: "inherit" },
);

// Step 3: Copy static files
console.log("Assembling output...");
mkdirSync(`${OUTPUT}/static`, { recursive: true });
if (existsSync("dist/public")) {
  cpSync("dist/public", `${OUTPUT}/static`, { recursive: true });
}

// Step 4: Write config files
writeFileSync(
  `${OUTPUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  `${OUTPUT}/functions/api.func/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
);

console.log("Build complete!");
