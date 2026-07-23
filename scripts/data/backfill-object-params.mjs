#!/usr/bin/env node
/**
 * backfill-object-params.mjs —— 一次性重建（不进 gate/build）
 *
 * 读取 raw/_capability_rows.json（parse_capability_pdf.py 产出），**清空后纯 PDF 重建**
 * data/master-data/inspection-parameters.csv 与 inspection-object-parameters.csv：
 *   - 不保留任何旧参数/旧关联（消除 初凝/终凝时间 vs 凝结时间 等语义冗余）。
 *   - 参数按名称去重，码 IP-0001.. 按首次出现顺序分配（object 码字典序遍历，required 先于 optional）。
 *   - object-parameters 3 列（无 sortOrder），(object,param) 字典序，保证 build 字节可重复。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = resolve(ROOT, "data", "master-data");
const ROWS = resolve(ROOT, "raw", "_capability_rows.json");
const PARAMS_CSV = resolve(DATA, "inspection-parameters.csv");
const OBJPARAMS_CSV = resolve(DATA, "inspection-object-parameters.csv");

const rows = JSON.parse(readFileSync(ROWS, "utf-8")); // { objCode: {required:[], optional:[]} }

const nameToCode = new Map();
const params = []; // {code,name}
let counter = 0;
function codeFor(name) {
  if (nameToCode.has(name)) return nameToCode.get(name);
  counter += 1;
  const code = `IP-${String(counter).padStart(4, "0")}`;
  nameToCode.set(name, code);
  params.push({ code, name });
  return code;
}

const links = []; // {object, param, qual}
const seen = new Set();
for (const obj of Object.keys(rows).sort()) {
  const { required = [], optional = [] } = rows[obj];
  for (const [level, names] of [["QUALIFIED", required], ["RESTRICTED", optional]]) {
    for (const name of names) {
      if (name.includes(",")) throw new Error(`参数名含 ASCII 逗号，破坏 CSV：「${name}」`);
      const code = codeFor(name);
      const key = `${obj}|${code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ object: obj, param: code, qual: level });
    }
  }
}

// inspection-parameters.csv（纯 PDF）
const paramOut = ["code,name,rawName,canonicalName,methodText,unit,sourceType"];
for (const p of params) {
  paramOut.push([p.code, p.name, p.name, p.name, "见对应标准条款", "", "official"].join(","));
}
writeFileSync(PARAMS_CSV, paramOut.join("\n") + "\n", "utf-8");

// inspection-object-parameters.csv（3 列，字典序）
links.sort((a, b) => (a.object === b.object ? (a.param < b.param ? -1 : a.param > b.param ? 1 : 0) : a.object < b.object ? -1 : 1));
const opOut = ["inspectionObjectCode,inspectionParameterCode,qualificationLevel"];
for (const l of links) opOut.push([l.object, l.param, l.qual].join(","));
writeFileSync(OBJPARAMS_CSV, opOut.join("\n") + "\n", "utf-8");

console.log(`参数主表(纯 PDF): ${params.length}`);
console.log(`项目-参数关联: ${links.length}`);
