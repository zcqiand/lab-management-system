import { describe, expect, beforeAll, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fnTest } from "../fn";
import { resetMockDb, seedMasterDataIntoMockDb } from "../../msw/db";

const API_BASE = "http://localhost/api";
const PROJECT_ROOT = resolve(__dirname, "..", "..");

function buildMasterData(): void {
  const res = spawnSync("node", [resolve(PROJECT_ROOT, "scripts", "data", "build-master-data.mjs")], {
    cwd: PROJECT_ROOT,
    stdio: "pipe",
  });
  if (res.status !== 0) {
    throw new Error(`生成主数据失败：${res.stderr?.toString() ?? ""}`);
  }
}

beforeAll(() => {
  buildMasterData();
});

beforeEach(() => {
  resetMockDb();
  seedMasterDataIntoMockDb();
});

describe("MSW 检测能力 M06 handler", () => {
  fnTest(["M06.F01.I01"], "GET /inspection-specialties 返回 9 个专项", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialties?page=1&pageSize=20`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { code: string }[]; total: number };
    expect(data.total).toBe(9);
    expect(data.items[0]?.code).toBe("SP01");
  });

  fnTest(["M06.F02.I01"], "GET /inspection-objects 按专项筛选", async () => {
    const res = await fetch(`${API_BASE}/inspection-objects?page=1&pageSize=20&inspectionSpecialtyCode=SP01`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { inspectionSpecialtyCode: string }[]; total: number };
    expect(data.items.every((o) => o.inspectionSpecialtyCode === "SP01")).toBe(true);
  });

  fnTest(["M06.F03.I01"], "GET /inspection-parameters 返回列表", async () => {
    const res = await fetch(`${API_BASE}/inspection-parameters?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { code: string }[]; total: number };
    expect(data.items.length).toBeGreaterThan(0);
  });

  fnTest(["M06.F04.I01"], "GET /inspection-standards 返回列表", async () => {
    const res = await fetch(`${API_BASE}/inspection-standards?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { code: string }[]; total: number };
    expect(data.items.length).toBeGreaterThan(0);
  });

  fnTest(["M06.F02.I04"], "GET /inspection-object-standards?role=TESTING 仅返回检测依据", async () => {
    const res = await fetch(`${API_BASE}/inspection-object-standards?page=1&pageSize=20&role=TESTING`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { role: string }[]; total: number };
    expect(data.items.every((o) => o.role === "TESTING")).toBe(true);
  });

  fnTest(["M06.F02.I05"], "GET /inspection-object-standards?role=JUDGMENT 仅返回判定依据", async () => {
    const res = await fetch(`${API_BASE}/inspection-object-standards?page=1&pageSize=20&role=JUDGMENT`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { role: string }[]; total: number };
    expect(data.items.every((o) => o.role === "JUDGMENT")).toBe(true);
  });

  fnTest(["M06.F02.I06"], "GET /inspection-object-parameters?inspectionObjectCode=OBJ-SP01-P1 返回水泥资质参数", async () => {
    const res = await fetch(
      `${API_BASE}/inspection-object-parameters?page=1&pageSize=20&inspectionObjectCode=OBJ-SP01-P1`,
    );
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { qualificationLevel: string }[] };
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]?.qualificationLevel).toBe("QUALIFIED");
  });

  fnTest(["M06.F02.I07"], "GET /inspection-specialty-objects 返回多对多关联", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialty-objects?page=1&pageSize=20&inspectionSpecialtyCode=SP01`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { inspectionObjectCode: string }[]; total: number };
    expect(data.total).toBeGreaterThan(0);
    expect(data.items.every((r) => r.inspectionObjectCode.startsWith("OBJ-SP01-"))).toBe(true);
  });

  fnTest(["M06.F04.I04"], "GET /inspection-standard-parameters 返回标准-参数关联", async () => {
    const res = await fetch(
      `${API_BASE}/inspection-standard-parameters?page=1&pageSize=20&inspectionStandardCode=GB/T%2050081-2019`,
    );
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { items: { inspectionParameterCode: string }[] };
    expect(data.items.length).toBeGreaterThan(0);
  });
});
