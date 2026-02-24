import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Find where the dependency is installed, then point to its CLI entry:
const PKG_JSON_PATH = require.resolve("interactive_lccjs/package.json");
const PKG_ROOT = path.dirname(PKG_JSON_PATH);
const LCC_CLI = path.join(PKG_ROOT, "src", "core", "lcc.js");

/**
 * Runs ILCC .a assembly by invoking interactive_lccjs's CLI:
 * node ./src/core/lcc.js yourfile.a
 */
export function runILCC(sourceCode) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ilcc-"));
  const asmPath = path.join(tmpDir, "prog.a");

  fs.writeFileSync(asmPath, sourceCode, "utf-8");

  const proc = spawnSync(process.execPath, [LCC_CLI, asmPath], {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024
  });

  // cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  return {
    stdout: (proc.stdout || "").replace(/\r\n/g, "\n"),
    stderr: (proc.stderr || "").replace(/\r\n/g, "\n"),
    exitCode: proc.status ?? 0
  };
}
