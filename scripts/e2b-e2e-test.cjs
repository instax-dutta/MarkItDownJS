#!/usr/bin/env node
/**
 * E2B User-POV Integration Test for MarkItDownJS.
 */
const { Sandbox } = require("e2b");
const { execSync } = require("child_process");
const { readFileSync, mkdtempSync, existsSync, unlinkSync, rmSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");

const API_KEY = process.env.E2B_API_KEY;
if (!API_KEY) { console.error("E2B_API_KEY required"); process.exit(1); }

async function run(sandbox, label, cmd, opts = {}) {
  const r = await sandbox.commands.run(cmd, opts);
  console.log(`  [${label}] exit=${r.exitCode}`);
  const out = r.stdout || "";
  const err = r.stderr || "";
  if (out) console.log(`  [${label}] out:\n${out.substring(0, 6000)}`);
  if (err) console.log(`  [${label}] err:\n${err.substring(0, 2000)}`);
  return { ok: r.exitCode === 0, out, err };
}

const PKGS = ["shared", "ast", "core", "html", "csv", "json"];

function packLocally() {
  const tmpDir = mkdtempSync(join(tmpdir(), "e2b-pkgs-"));
  const tarballs = {};
  for (const pkg of PKGS) {
    const dir = join(__dirname, "..", "packages", pkg);
    if (!existsSync(dir)) throw new Error(`Package dir not found: ${dir}`);
    const out = execSync(`pnpm pack --pack-destination ${tmpDir}`, { cwd: dir, encoding: "utf8" });
    const tgzLine = out.split("\n").find(l => l.includes(".tgz"));
    if (!tgzLine) throw new Error(`Could not find .tgz for ${pkg}`);
    const tgzPath = tgzLine.trim();
    tarballs[pkg] = readFileSync(tgzPath).toString("base64");
    console.log(`  ${pkg}: ${tgzPath} (${tarballs[pkg].length} bytes)`);
    unlinkSync(tgzPath);
  }
  rmSync(tmpDir, { recursive: true, force: true });
  return tarballs;
}

async function runWithSandbox() {
  console.log("\n=== Pack locally ===\n");
  const tarballs = packLocally();

  console.log("\n=== E2B sandbox ===\n");
  const sandbox = await Sandbox.create({ apiKey: API_KEY });
  console.log("Sandbox ID:", sandbox.sandboxId);

  try {
    let r = await run(sandbox, "mkdir", "mkdir -p /tmp/e2b /tmp/myapp");
    if (!r.ok) throw new Error("mkdir failed");

    for (const [name, b64] of Object.entries(tarballs)) {
      r = await run(sandbox, `up-${name}`,
        `echo ${b64} | base64 -d > /tmp/e2b/${name}.tgz`, { timeout: 60000 });
      if (!r.ok) throw new Error(`Upload failed for ${name}`);
    }

    r = await run(sandbox, "init", "cd /tmp/myapp && npm init -y 2>&1");
    if (!r.ok) throw new Error("npm init failed");

    for (const name of PKGS) {
      r = await run(sandbox, `inst-${name}`,
        `cd /tmp/myapp && npm install /tmp/e2b/${name}.tgz 2>&1 | tail -5`,
        { timeout: 60000 });
      if (!r.ok) throw new Error(`npm install failed for ${name}: ${r.err}`);
    }

    // Install linkedom (dependency of @markitdownjs/shared for HTML parsing)
    r = await run(sandbox, "install-linkedom",
      "cd /tmp/myapp && npm install linkedom@^0.18.12 2>&1 | tail -3",
      { timeout: 60000 });
    if (!r.ok) throw new Error("linkedom install failed");

    // Write user app as an .mjs file (avoids shell escaping issues)
    const userApp = [
      'import { MarkItDown, DefaultConverterRegistry } from "@markitdownjs/core";',
      'import { HtmlConverter } from "@markitdownjs/html";',
      'import { JsonConverter } from "@markitdownjs/json";',
      'import { CsvConverter } from "@markitdownjs/csv";',
      '',
      'const registry = new DefaultConverterRegistry();',
      'registry.register(new HtmlConverter());',
      'registry.register(new JsonConverter());',
      'registry.register(new CsvConverter());',
      '',
      'const md = new MarkItDown({ registry });',
      '',
      'async function testAll() {',
      '  let allPass = true;',
      '',
      '  try {',
      '    const r = await md.convert({ data: "<h1>Hello</h1><p>World</p>", mimeType: "text/html" });',
      '    console.log("HTML out:", JSON.stringify(r.markdown));',
      '    const ok = r.markdown.includes("Hello") && r.markdown.includes("World");',
      '    console.log("HTML: " + (ok ? "PASS" : "FAIL"));',
      '    if (!ok) allPass = false;',
      '  } catch(e) { console.log("HTML err:", e.message, e.stack); allPass = false; }',
      '',
      '  try {',
      '    const r = await md.convert({ data: JSON.stringify({ name: "test" }), mimeType: "application/json" });',
      '    const ok = r.markdown.includes("test");',
      '    console.log("JSON: " + (ok ? "PASS" : "FAIL"));',
      '    if (!ok) allPass = false;',
      '  } catch(e) { console.log("JSON err:", e.message); allPass = false; }',
      '',
      '  try {',
      '    const r = await md.convert({ data: "name,age\\nAlice,30\\nBob,25", mimeType: "text/csv" });',
      '    const ok = r.markdown.includes("Alice") && r.markdown.includes("Bob");',
      '    console.log("CSV: " + (ok ? "PASS" : "FAIL"));',
      '    if (!ok) allPass = false;',
      '  } catch(e) { console.log("CSV err:", e.message); allPass = false; }',
      '',
      '  process.exit(allPass ? 0 : 1);',
      '}',
      'testAll();',
    ].join("\n");

    // Write app file via base64
    const b64 = Buffer.from(userApp).toString("base64");
    r = await run(sandbox, "write-app",
      `echo ${b64} | base64 -d > /tmp/myapp/app.mjs`);
    if (!r.ok) throw new Error("Failed to write app");

    // Run and capture output
    r = await run(sandbox, "run-app",
      "cd /tmp/myapp && node app.mjs > /tmp/out.txt 2>&1; echo EXIT=$?");
    r = await run(sandbox, "read-out", "cat /tmp/out.txt 2>&1");
    const out = r.out || "";
    console.log("\n" + out);

    if (out.includes("HTML: PASS") && out.includes("JSON: PASS") && out.includes("CSV: PASS")) {
      console.log("\n=== ALL CONVERSIONS PASSED ===");
    } else {
      throw new Error("Some conversions failed");
    }
  } finally {
    try { await sandbox.kill(); } catch {}
  }
}

runWithSandbox()
  .then(() => process.exit(0))
  .catch(e => { console.error("FAIL:", e.message); process.exit(1); });
