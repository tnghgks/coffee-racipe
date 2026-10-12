// Bundles the service worker (src/sw/sw.ts) into public/sw.js. Runs before `next build` and `next start`
// tests; the output is generated, not committed.
import { build } from "esbuild";

await build({
  entryPoints: ["src/sw/sw.ts"],
  outfile: "public/sw.js",
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "warning",
});
