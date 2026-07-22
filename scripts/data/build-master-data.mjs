#!/usr/bin/env node
/**
 * build-master-data.mjs
 *
 * 读取 data/master-data/*.csv，按类型分文件生成 src/data/generated/*.json
 * （每个类型一个裸数组文件，如 inspection-specialty.json）。
 * 该脚本必须可重复执行且产物字节一致（被 tests/data/masterDataValidation.test.ts
 * 校验）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const DATA_DIR = resolve(PROJECT_ROOT, "data", "master-data");
const GEN_DIR = resolve(PROJECT_ROOT, "src", "data", "generated");

/** payload 键 → 输出文件名（每个类型一个文件，裸数组）。 */
const FILES = {
  inspectionSpecialties: "inspection-specialty.json",
  inspectionObjects: "inspection-object.json",
  inspectionParameters: "inspection-parameter.json",
  inspectionStandards: "inspection-standard.json",
  inspectionObjectParameters: "inspection-object-parameter.json",
  inspectionObjectStandards: "inspection-object-standard.json",
  inspectionStandardParameters: "inspection-standard-parameter.json",
  inspectionSpecialtyObjects: "inspection-specialty-object.json",
};

function readCsv(name) {
  const path = resolve(DATA_DIR, name);
  if (!existsSync(path)) throw new Error(`缺少源 CSV：${path}`);
  const text = readFileSync(path, "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] === undefined ? "" : cells[i];
    });
    return row;
  });
}

function bool(v, fallback) {
  if (v === undefined || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return fallback;
}

function num(v, fallback) {
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback) {
  if (v === undefined) return fallback;
  const s = String(v);
  return s.length === 0 ? fallback : s;
}

function build() {
  const specialties = readCsv("inspection-specialties.csv").map((r, i) => ({
    code: r.code,
    officialNo: r.officialNo,
    name: r.name,
    isOfficial: bool(r.isOfficial, true),
    enabled: bool(r.enabled, true),
    sortOrder: num(r.sortOrder, i + 1),
  }));

  const objects = readCsv("inspection-objects.csv").map((r, i) => ({
    code: r.code,
    inspectionSpecialtyCode: r.inspectionSpecialtyCode,
    sourceProjectNo: r.sourceProjectNo,
    sourceProjectName: r.sourceProjectName,
    name: r.name,
    isOptionalForQualification: bool(r.isOptionalForQualification, false),
    isOfficial: bool(r.isOfficial, true),
    enabled: bool(r.enabled, true),
    sortOrder: num(r.sortOrder, i + 1),
  }));

  const parameters = readCsv("inspection-parameters.csv").map((r, i) => ({
    code: r.code,
    name: r.name,
    rawName: str(r.rawName, r.name),
    canonicalName: str(r.canonicalName, r.name),
    methodText: str(r.methodText, undefined),
    aliases: [],
    unit: str(r.unit, undefined),
    sourceType: str(r.sourceType, "official"),
    sortOrder: num(r.sortOrder, i + 1),
  }));

  const standards = readCsv("inspection-standards.csv").map((r, i) => ({
    code: r.code,
    name: r.name,
    version: str(r.version, undefined),
    status: str(r.status, "active"),
    sourceDocumentId: str(r.sourceDocumentId, undefined),
    sortOrder: num(r.sortOrder, i + 1),
  }));

  const objectParameters = readCsv("inspection-object-parameters.csv").map((r) => ({
    inspectionObjectCode: r.inspectionObjectCode,
    inspectionParameterCode: r.inspectionParameterCode,
    qualificationLevel: str(r.qualificationLevel, "QUALIFIED"),
  }));

  const objectStandards = readCsv("inspection-object-standards.csv").map((r) => ({
    inspectionObjectCode: r.inspectionObjectCode,
    inspectionStandardCode: r.inspectionStandardCode,
    role: r.role,
  }));

  const standardParameters = readCsv("inspection-standard-parameters.csv").map((r) => ({
    inspectionStandardCode: r.inspectionStandardCode,
    inspectionParameterCode: r.inspectionParameterCode,
    clause: str(r.clause, undefined),
    methodName: str(r.methodName, undefined),
    unit: str(r.unit, undefined),
  }));

  const specialtyObjects = readCsv("inspection-specialty-objects.csv").map((r) => ({
    inspectionSpecialtyCode: r.inspectionSpecialtyCode,
    inspectionObjectCode: r.inspectionObjectCode,
  }));

  return {
    inspectionSpecialties: specialties,
    inspectionObjects: objects,
    inspectionParameters: parameters,
    inspectionStandards: standards,
    inspectionObjectParameters: objectParameters,
    inspectionObjectStandards: objectStandards,
    inspectionStandardParameters: standardParameters,
    inspectionSpecialtyObjects: specialtyObjects,
  };
}

function main() {
  const payload = build();
  mkdirSync(GEN_DIR, { recursive: true });
  for (const [key, file] of Object.entries(FILES)) {
    const out = resolve(GEN_DIR, file);
    writeFileSync(out, JSON.stringify(payload[key], null, 2) + "\n", "utf-8");
    process.stdout.write(`wrote ${out}\n`);
  }
}

main();
