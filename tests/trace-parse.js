#!/usr/bin/env node
/**
 * trace-parse.js — 解析 vitest JSON 输出，写入 .state/trace.json
 * 用法: node tests/trace-parse.js
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const outFile = ".state/trace.json";

function parseFns(name) {
  const m = String(name).match(/\[fn: ([^\]]+)\]/);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

try {
  const stdout = execSync("npx vitest run --reporter=json", {
    encoding: null,
    maxBuffer: 100 * 1024 * 1024,
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  // Find last } to extract JSON (handles any trailing text)
  const text = stdout.toString("utf8");
  const lastBrace = text.lastIndexOf("}");
  const jsonStr = text.substring(0, lastBrace + 1);
  const data = JSON.parse(jsonStr);

  const tests = [];
  for (const file of data.testResults ?? []) {
    for (const r of file.assertionResults ?? []) {
      const inert = r.status === "skipped";
      const fns = inert ? [] : parseFns(r.fullName);
      const testName = String(r.fullName).replace(/\s*\[fn: [^\]]+\]/, "");
      tests.push({ test: testName, fns, inert });
    }
  }

  mkdirSync(".state", { recursive: true });
  writeFileSync(outFile, JSON.stringify({ schema: 1, tests }, null, 2) + "\n");
  console.error(`trace-parse: wrote ${tests.length} entries → ${outFile}`);
} catch (err) {
  console.error("trace-parse error:", err.message);
  process.exit(1);
}
