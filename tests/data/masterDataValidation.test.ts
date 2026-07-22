import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import type {
  InspectionSpecialty,
  InspectionObject,
  InspectionParameter,
  InspectionStandard,
  InspectionObjectParameter,
  InspectionObjectStandard,
  InspectionStandardParameter,
  InspectionSpecialtyObject,
} from "../../src/types/inspection";
import { fnTest } from "../fn";

const PROJECT_ROOT = resolve(__dirname, "..", "..");
const DATA_DIR = resolve(PROJECT_ROOT, "data", "master-data");
const GEN_DIR = resolve(PROJECT_ROOT, "src", "data", "generated");

/** 主数据按类型分文件存放：每个类型一个 JSON 文件（裸数组）。 */
const FILES = {
  inspectionSpecialties: "inspection-specialty.json",
  inspectionObjects: "inspection-object.json",
  inspectionParameters: "inspection-parameter.json",
  inspectionStandards: "inspection-standard.json",
  inspectionObjectParameters: "inspection-object-parameter.json",
  inspectionObjectStandards: "inspection-object-standard.json",
  inspectionStandardParameters: "inspection-standard-parameter.json",
  inspectionSpecialtyObjects: "inspection-specialty-object.json",
} as const;

interface MasterData {
  inspectionSpecialties: InspectionSpecialty[];
  inspectionObjects: InspectionObject[];
  inspectionParameters: InspectionParameter[];
  inspectionStandards: InspectionStandard[];
  inspectionObjectParameters: InspectionObjectParameter[];
  inspectionObjectStandards: InspectionObjectStandard[];
  inspectionStandardParameters: InspectionStandardParameter[];
  inspectionSpecialtyObjects: InspectionSpecialtyObject[];
}

function loadMasterData(): MasterData {
  const data = {} as MasterData;
  for (const [key, file] of Object.entries(FILES) as [keyof MasterData, string][]) {
    const path = resolve(GEN_DIR, file);
    if (!existsSync(path)) {
      throw new Error(`未找到生成数据：${path}；请先运行 scripts/data/build-master-data.mjs`);
    }
    data[key] = JSON.parse(readFileSync(path, "utf-8"));
  }
  return data;
}

const TOTAL_SOURCE_PROJECT_ROWS = 93;
const TOTAL_SPECIALTIES = 9;

describe("M06 主数据校验（red-first 锁数据契约）", () => {
  fnTest(["M06.F01.I01"], "官方 9 个检测专项齐全", () => {
    const data = loadMasterData();
    expect(data.inspectionSpecialties).toHaveLength(TOTAL_SPECIALTIES);
    const codes = data.inspectionSpecialties.map((s) => s.code).sort();
    expect(codes[0]).toBe("SP01");
    expect(codes[codes.length - 1]).toBe(`SP0${TOTAL_SPECIALTIES}`);
  });

  fnTest(["M06.F02.I01"], "官方 9 专项 93 来源行全部至少映射一个 InspectionObject", () => {
    const data = loadMasterData();
    // 拆分后对象数 ≥ 93。
    expect(data.inspectionObjects.length).toBeGreaterThanOrEqual(TOTAL_SOURCE_PROJECT_ROWS);
    // 每个专项下的来源行号必须全部被对象覆盖。
    const seenSourceRows = new Set(
      data.inspectionObjects.map((o) => `${o.inspectionSpecialtyCode}#${o.sourceProjectNo}`),
    );
    const expected = new Set<string>();
    for (let sp = 1; sp <= 9; sp++) {
      const spCode = `SP0${sp}`;
      const rowCount = [23, 9, 7, 5, 13, 3, 19, 5, 9][sp - 1]!;
      for (let i = 1; i <= rowCount; i++) {
        expected.add(`${spCode}#${i}`);
      }
    }
    expect(seenSourceRows).toEqual(expected);
  });

  fnTest(["M06.F02.I01"], "来源行 `*` 必落为资质可选标记", () => {
    const data = loadMasterData();
    const optionalRows = data.inspectionObjects.filter((o) => o.isOptionalForQualification);
    // 附件2 中带 * 的资质可选项目 38 个；对象拆分后可能略多。
    expect(optionalRows.length).toBeGreaterThanOrEqual(38);
    // 必须包含至少一个 SP01 资质可选项目。
    const sp01Optional = optionalRows.filter((o) => o.inspectionSpecialtyCode === "SP01");
    expect(sp01Optional.length).toBeGreaterThan(0);
  });

  fnTest(["M06.F02.I07"], "InspectionSpecialtyObject 多对多无悬空引用", () => {
    const data = loadMasterData();
    const sp = new Set(data.inspectionSpecialties.map((s) => s.code));
    const ob = new Set(data.inspectionObjects.map((o) => o.code));
    for (const rel of data.inspectionSpecialtyObjects) {
      expect(sp.has(rel.inspectionSpecialtyCode)).toBe(true);
      expect(ob.has(rel.inspectionObjectCode)).toBe(true);
    }
    // 同一专项+项目组合只允许一条关联。
    const seen = new Set<string>();
    for (const rel of data.inspectionSpecialtyObjects) {
      const key = `${rel.inspectionSpecialtyCode}#${rel.inspectionObjectCode}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  fnTest(["M06.F02.I06"], "InspectionObjectParameter 两端齐全且无重复", () => {
    const data = loadMasterData();
    const ob = new Set(data.inspectionObjects.map((o) => o.code));
    const pa = new Set(data.inspectionParameters.map((p) => p.code));
    const seen = new Set<string>();
    for (const rel of data.inspectionObjectParameters) {
      expect(ob.has(rel.inspectionObjectCode)).toBe(true);
      expect(pa.has(rel.inspectionParameterCode)).toBe(true);
      const key = `${rel.inspectionObjectCode}#${rel.inspectionParameterCode}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  fnTest(["M06.F02.I04", "M06.F02.I05"], "InspectionObjectStandard 角色仅 TESTING/JUDGMENT 且同一项目标准允许两角色", () => {
    const data = loadMasterData();
    const st = new Set(data.inspectionStandards.map((s) => s.code));
    const ob = new Set(data.inspectionObjects.map((o) => o.code));
    const byPair = new Map<string, Set<string>>();
    for (const rel of data.inspectionObjectStandards) {
      expect(["TESTING", "JUDGMENT"]).toContain(rel.role);
      expect(st.has(rel.inspectionStandardCode)).toBe(true);
      expect(ob.has(rel.inspectionObjectCode)).toBe(true);
      const key = `${rel.inspectionObjectCode}#${rel.inspectionStandardCode}`;
      const roles = byPair.get(key) ?? new Set<string>();
      roles.add(rel.role);
      byPair.set(key, roles);
    }
    // 至少存在一对项目-标准同时承担两个角色。
    const hasDual = [...byPair.values()].some((roles) => roles.size === 2);
    expect(hasDual).toBe(true);
  });

  fnTest(["M06.F04.I04"], "InspectionStandardParameter 两端齐全", () => {
    const data = loadMasterData();
    const st = new Set(data.inspectionStandards.map((s) => s.code));
    const pa = new Set(data.inspectionParameters.map((p) => p.code));
    for (const rel of data.inspectionStandardParameters) {
      expect(st.has(rel.inspectionStandardCode)).toBe(true);
      expect(pa.has(rel.inspectionParameterCode)).toBe(true);
    }
  });

  fnTest(["M06.F01.I01"], "源 CSV 文件存在", () => {
    const expectedFiles = [
      "inspection-specialties.csv",
      "inspection-objects.csv",
      "inspection-parameters.csv",
      "inspection-standards.csv",
      "inspection-object-parameters.csv",
      "inspection-object-standards.csv",
      "inspection-standard-parameters.csv",
      "inspection-specialty-objects.csv",
    ];
    for (const name of expectedFiles) {
      expect(existsSync(resolve(DATA_DIR, name))).toBe(true);
    }
  });

  fnTest(["M06.F01.I01"], "主数据按类型分文件存放，每个为非空数组", () => {
    for (const file of Object.values(FILES)) {
      const path = resolve(GEN_DIR, file);
      expect(existsSync(path)).toBe(true);
      const arr = JSON.parse(readFileSync(path, "utf-8"));
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
    }
  });

  it("脚本可重复生成且与上一产物字节一致", () => {
    const before = Object.fromEntries(
      Object.values(FILES).map((f) => [f, readFileSync(resolve(GEN_DIR, f))] as const),
    );
    const res = spawnSync("node", [resolve(PROJECT_ROOT, "scripts", "data", "build-master-data.mjs")], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });
    expect(res.status).toBe(0);
    for (const f of Object.values(FILES)) {
      const after = readFileSync(resolve(GEN_DIR, f));
      expect(after.equals(before[f])).toBe(true);
    }
  });
});
