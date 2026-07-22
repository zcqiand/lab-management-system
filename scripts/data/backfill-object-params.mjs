#!/usr/bin/env node
/**
 * backfill-object-params.mjs —— 一次性回填（不进 gate/build）
 *
 * 读取 raw/_capability_rows.json（parse_capability_pdf.py 产出）与既有
 * data/master-data/inspection-parameters.csv / inspection-object-parameters.csv，
 * 以 Additive 方式重写这两张 CSV：
 *   - 保留既有 15 参数（原样）；PDF 参数按名称去重，同名复用旧码，否则分配新码 IP-0001..
 *   - 保留既有项目-参数关联；追加 PDF 关联（必备=QUALIFIED / 可选=RESTRICTED），(object,param) 去重。
 *   - object-parameters 输出为 3 列（去 sortOrder），(object,param) 字典序排序，保证可重复。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = resolve(ROOT, "data", "master-data");
const ROWS = resolve(ROOT, "raw", "_capability_rows.json");
const PARAMS_CSV = resolve(DATA, "inspection-parameters.csv");
const OBJPARAMS_CSV = resolve(DATA, "inspection-object-parameters.csv");

function readLines(p) {
  return readFileSync(p, "utf-8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
}

const rows = JSON.parse(readFileSync(ROWS, "utf-8")); // { objCode: {required:[], optional:[]} }

// 既有参数：原样保留，建 name->code
const paramLines = readLines(PARAMS_CSV);
const paramHeader = paramLines[0];
const existingParamLines = paramLines.slice(1);
const nameToCode = new Map();
for (const line of existingParamLines) {
  const c = line.split(",");
  nameToCode.set(c[1], c[0]); // name -> code
}

// 既有关联：保留 (object,param,qual)，建去重键
const opLines = readLines(OBJPARAMS_CSV);
const opHeader = opLines[0].split(",");
const iObj = opHeader.indexOf("inspectionObjectCode");
const iParam = opHeader.indexOf("inspectionParameterCode");
const iQual = opHeader.indexOf("qualificationLevel");
const links = []; // {object, param, qual}
const seen = new Set();
for (const line of opLines.slice(1)) {
  const c = line.split(",");
  const key = `${c[iObj]}|${c[iParam]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  links.push({ object: c[iObj], param: c[iParam], qual: c[iQual] });
}

// 新参数分配
const newParams = []; // {code,name}
let counter = 0;
function codeFor(name) {
  if (nameToCode.has(name)) return nameToCode.get(name);
  counter += 1;
  const code = `IP-${String(counter).padStart(4, "0")}`;
  nameToCode.set(name, code);
  newParams.push({ code, name });
  return code;
}

// 确定性：按 object 码排序遍历；每个 object 先 required 后 optional
const objCodes = Object.keys(rows).sort();
for (const obj of objCodes) {
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

// 写 inspection-parameters.csv：既有原样 + 新参数
const paramOut = [paramHeader, ...existingParamLines];
for (const p of newParams) {
  // code,name,rawName,canonicalName,methodText,unit,sourceType
  paramOut.push([p.code, p.name, p.name, p.name, "见对应标准条款", "", "official"].join(","));
}
writeFileSync(PARAMS_CSV, paramOut.join("\n") + "\n", "utf-8");

// 写 inspection-object-parameters.csv：3 列，(object,param) 字典序
links.sort((a, b) => (a.object === b.object ? (a.param < b.param ? -1 : a.param > b.param ? 1 : 0) : a.object < b.object ? -1 : 1));
const opOut = ["inspectionObjectCode,inspectionParameterCode,qualificationLevel"];
for (const l of links) opOut.push([l.object, l.param, l.qual].join(","));
writeFileSync(OBJPARAMS_CSV, opOut.join("\n") + "\n", "utf-8");

console.log(`参数主表: ${existingParamLines.length} 既有 + ${newParams.length} 新增 = ${existingParamLines.length + newParams.length}`);
console.log(`项目-参数关联: ${links.length}`);
