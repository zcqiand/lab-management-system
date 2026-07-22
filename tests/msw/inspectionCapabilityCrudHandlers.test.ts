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

describe("MSW 检测能力 M06 CRUD handler", () => {
  fnTest(["M06.F01.I02"], "POST /inspection-specialties 创建自定义专项", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "SP10",
        officialNo: "十",
        name: "扩展专项",
        isOfficial: false,
        enabled: true,
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { code: string; isOfficial: boolean };
    expect(data.code).toBe("SP10");
    expect(data.isOfficial).toBe(false);
  });

  fnTest(["M06.F01.I03"], "DELETE /inspection-specialties/:id 拒绝删除官方专项", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialties/insp-sp-SP01`, { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  fnTest(["M06.F02.I02"], "POST /inspection-objects 创建自定义项目", async () => {
    const res = await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "OBJ-CUSTOM-1",
        inspectionSpecialtyCode: "SP01",
        sourceProjectNo: "X1",
        sourceProjectName: "自定义项目",
        name: "自定义项目",
        isOptionalForQualification: false,
        isOfficial: false,
        enabled: true,
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F02.I06"], "POST /inspection-object-parameters 关联资质参数", async () => {
    const res = await fetch(`${API_BASE}/inspection-object-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionObjectCode: "OBJ-SP01-P1",
        inspectionParameterCode: "IP-CON002",
        qualificationLevel: "QUALIFIED",
        sortOrder: 99,
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F02.I04"], "POST /inspection-object-standards 关联检测依据（TESTING）", async () => {
    const res = await fetch(`${API_BASE}/inspection-object-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionObjectCode: "OBJ-SP01-P4",
        inspectionStandardCode: "GB 1499.2-2024",
        role: "TESTING",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F02.I05"], "POST /inspection-object-standards 关联判定依据（JUDGMENT）", async () => {
    const res = await fetch(`${API_BASE}/inspection-object-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionObjectCode: "OBJ-SP01-P4",
        inspectionStandardCode: "GB 1499.2-2024",
        role: "JUDGMENT",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F02.I07"], "POST /inspection-specialty-objects 多对多关联", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialty-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionSpecialtyCode: "SP03",
        inspectionObjectCode: "OBJ-SP01-P1",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F03.I02"], "POST /inspection-parameters 创建自定义参数", async () => {
    const res = await fetch(`${API_BASE}/inspection-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "IP-CUSTOM-1",
        name: "自定义参数",
        rawName: "自定义参数",
        canonicalName: "自定义参数",
        aliases: [],
        unit: "%",
        sourceType: "custom",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F04.I02"], "POST /inspection-standards 创建自定义标准", async () => {
    const res = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "GB/T CUSTOM-2026",
        name: "自定义标准",
        version: "2026",
        status: "active",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F04.I04"], "POST /inspection-standard-parameters 关联", async () => {
    const res = await fetch(`${API_BASE}/inspection-standard-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionStandardCode: "GB/T 50081-2019",
        inspectionParameterCode: "IP-STE001",
        clause: "6.1",
        methodName: "万能试验机",
        unit: "MPa",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M06.F01.I02"], "PUT /inspection-specialties/:id 更新自定义专项且 code 不可变", async () => {
    // 先建一个自定义专项
    const created = await fetch(`${API_BASE}/inspection-specialties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP99", officialNo: "九十九", name: "临时专项", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-specialties/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CHANGED", name: "改名专项", enabled: false }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string; enabled: boolean };
    expect(data.code).toBe("SP99"); // code 不可变
    expect(data.name).toBe("改名专项");
    expect(data.enabled).toBe(false);
  });

  fnTest(["M06.F01.I02"], "PUT /inspection-specialties/:id 不存在返回 404", async () => {
    const res = await fetch(`${API_BASE}/inspection-specialties/insp-sp-NOPE`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });
    expect(res.status).toBe(404);
  });

  fnTest(["M06.F01.I03"], "DELETE /inspection-specialties/:id 删除未被引用的自定义专项", async () => {
    const created = await fetch(`${API_BASE}/inspection-specialties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP98", name: "可删专项", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-specialties/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F01.I03"], "DELETE /inspection-specialties/:id 被引用时硬拒绝并返回计数", async () => {
    // SP01 是官方专项且被多个项目引用；先建一个自定义项目挂在 SP01 下制造引用
    // 但官方专项会先被 isOfficial 拦截；改用自定义专项 SP97 + 自定义项目引用
    const sp = await fetch(`${API_BASE}/inspection-specialties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP97", name: "引用专项", isOfficial: false, enabled: true }),
    });
    const spRow = (await sp.json()) as { id: string };
    await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "OBJ-SP97-P1", inspectionSpecialtyCode: "SP97", sourceProjectNo: "1", sourceProjectName: "x", name: "引用项目", isOfficial: false, enabled: true }),
    });
    const res = await fetch(`${API_BASE}/inspection-specialties/${spRow.id}`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { references: number };
    expect(data.references).toBeGreaterThanOrEqual(1);
  });
});
