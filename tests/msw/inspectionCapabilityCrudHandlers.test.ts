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

  fnTest(["M06.F02.I02"], "PUT /inspection-objects/:id 更新自定义项目且 code 不可变", async () => {
    const created = await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "OBJ-CUST-1", inspectionSpecialtyCode: "SP01", sourceProjectNo: "1", sourceProjectName: "x", name: "临时项目", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-objects/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CHANGED", name: "改名项目" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string };
    expect(data.code).toBe("OBJ-CUST-1");
    expect(data.name).toBe("改名项目");
  });

  fnTest(["M06.F02.I02"], "PUT /inspection-objects/:id 改 inspectionSpecialtyCode 到不存在专项返回 400", async () => {
    const created = await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "OBJ-CUST-2", inspectionSpecialtyCode: "SP01", sourceProjectNo: "1", sourceProjectName: "x", name: "y", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-objects/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionSpecialtyCode: "SP-NOPE" }),
    });
    expect(res.status).toBe(400);
  });

  fnTest(["M06.F02.I03"], "DELETE /inspection-objects/:id 删除未被引用的自定义项目", async () => {
    const created = await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "OBJ-CUST-3", inspectionSpecialtyCode: "SP01", sourceProjectNo: "1", sourceProjectName: "x", name: "z", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-objects/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F02.I03"], "DELETE /inspection-objects/:id 官方项目拒绝", async () => {
    const res = await fetch(`${API_BASE}/inspection-objects/insp-obj-OBJ-SP01-P1`, { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  fnTest(["M06.F02.I03"], "DELETE /inspection-objects/:id 被引用时硬拒绝并返回计数", async () => {
    const created = await fetch(`${API_BASE}/inspection-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "OBJ-CUST-4", inspectionSpecialtyCode: "SP01", sourceProjectNo: "1", sourceProjectName: "x", name: "w", isOfficial: false, enabled: true }),
    });
    const row = (await created.json()) as { id: string; code: string };
    // 制造引用：关联一个官方参数 IP-CEM003
    await fetch(`${API_BASE}/inspection-object-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: row.code, inspectionParameterCode: "IP-CEM003" }),
    });
    const res = await fetch(`${API_BASE}/inspection-objects/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { references: number };
    expect(data.references).toBeGreaterThanOrEqual(1);
  });

  fnTest(["M06.F03.I02"], "PUT /inspection-parameters/:id 更新自定义参数且 code 不可变", async () => {
    const created = await fetch(`${API_BASE}/inspection-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "IP-CUST-1", name: "临时参数", sourceType: "custom" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-parameters/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CHANGED", name: "改名参数", unit: "kN" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string; unit: string };
    expect(data.code).toBe("IP-CUST-1");
    expect(data.name).toBe("改名参数");
    expect(data.unit).toBe("kN");
  });

  fnTest(["M06.F03.I03"], "DELETE /inspection-parameters/:id 删除未被引用的自定义参数", async () => {
    const created = await fetch(`${API_BASE}/inspection-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "IP-CUST-2", name: "可删参数", sourceType: "custom" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-parameters/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F03.I03"], "DELETE /inspection-parameters/:id 官方参数拒绝", async () => {
    const res = await fetch(`${API_BASE}/inspection-parameters/insp-param-IP-CEM003`, { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  fnTest(["M06.F03.I03"], "DELETE /inspection-parameters/:id 被引用时硬拒绝并返回计数", async () => {
    // IP-CEM003 已被种子数据中多个项目引用
    const res = await fetch(`${API_BASE}/inspection-parameters/insp-param-IP-CEM003`, { method: "DELETE" });
    expect(res.status).toBe(400);
    // 官方参数会先被 isOfficial(sourceType) 拦截，这里验证官方参数无论如何不可删
    const data = (await res.json()) as { message: string };
    expect(data.message).toContain("官方");
  });

  fnTest(["M06.F03.I03"], "DELETE /inspection-parameters/:id 自定义参数被引用计数分支", async () => {
    // 上面那条用例删除官方 IP-CEM003，会在 sourceType === 'official' 守卫处先返回，
    // 真正的引用计数分支（objectParameter + standardParameter）从未被覆盖。
    // 这里建一个自定义参数 + 一条对象引用，专门走引用计数分支。
    const paramRes = await fetch(`${API_BASE}/inspection-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "IP-REFCUST-1", name: "引用参数", sourceType: "custom" }),
    });
    expect(paramRes.status).toBe(201);
    const paramRow = (await paramRes.json()) as { code: string };
    // 制造引用：将 OBJ-SP01-P1（种子项目）挂到该自定义参数上
    const linkRes = await fetch(`${API_BASE}/inspection-object-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P1", inspectionParameterCode: paramRow.code }),
    });
    expect(linkRes.status).toBe(201);
    const res = await fetch(`${API_BASE}/inspection-parameters/insp-param-${paramRow.code}`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { references: number; message: string };
    expect(data.references).toBeGreaterThanOrEqual(1);
    expect(data.message).toContain("引用");
  });

  fnTest(["M06.F04.I02"], "PUT /inspection-standards/:id 更新自定义标准且 code 不可变", async () => {
    const created = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB-TCUST-2026", name: "临时标准", status: "active" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-standards/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CHANGED", name: "改名标准", status: "draft" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string; status: string };
    expect(data.code).toBe("GB-TCUST-2026");
    expect(data.name).toBe("改名标准");
    expect(data.status).toBe("draft");
  });

  fnTest(["M06.F04.I03"], "DELETE /inspection-standards/:id 删除未被引用的自定义标准", async () => {
    const created = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB-TDEL-2026", name: "可删标准", status: "active" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-standards/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F04.I03"], "DELETE /inspection-standards/:id 官方标准（带 sourceDocumentId）拒绝", async () => {
    // GB 175-2023 是种子标准，带 sourceDocumentId（id 含空格，先 GET 取真实 id 再 DELETE）
    const list = await fetch(`${API_BASE}/inspection-standards?keyword=GB 175`);
    const listData = (await list.json()) as { items: Array<{ id: string; code: string }> };
    const target = listData.items.find((it) => it.code.includes("GB 175")) ?? listData.items[0];
    const res = await fetch(`${API_BASE}/inspection-standards/${target.id}`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { message: string };
    expect(data.message).toContain("官方");
  });

  fnTest(["M06.F04.I02"], "PUT /inspection-standards/:id 兼容含 / 与空格的标准编码", async () => {
    // 业务编码可含 `/`（如 GB/T 228.1-2021）和空格；前端按字面 id 拼 URL，不做编码。
    // MSW path-to-regexp 的 :id 仅匹配 [^/]+，含 `/` 时会裂段导致 404，故路由需特殊处理。
    await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB/T SLASH-2026", name: "斜杠标准", status: "active" }),
    });
    const res = await fetch(`${API_BASE}/inspection-standards/insp-std-GB/T SLASH-2026`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "改名" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string };
    expect(data.code).toBe("GB/T SLASH-2026");
    expect(data.name).toBe("改名");
  });

  fnTest(["M06.F04.I03"], "DELETE /inspection-standards/:id 兼容含 / 与空格的标准编码", async () => {
    await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB/T DEL-2026", name: "可删斜杠标准", status: "active" }),
    });
    const res = await fetch(`${API_BASE}/inspection-standards/insp-std-GB/T DEL-2026`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F04.I02"], "PUT /inspection-standards 接受 sourceDocumentId", async () => {
    const created = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB/T FORM-2026", name: "表单测试标准", status: "active" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-standards/${encodeURIComponent(row.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceDocumentId: "raw/standards/pdf/x.pdf" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sourceDocumentId?: string };
    expect(data.sourceDocumentId).toBe("raw/standards/pdf/x.pdf");
  });

  fnTest(["M06.F04.I01"], "GET /inspection-standards 按检测项目过滤", async () => {
    // 种子里 OBJ-SP01-P1（水泥）关联了 GB 175-2023 等标准
    const res = await fetch(`${API_BASE}/inspection-standards?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&pageSize=100`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { items: Array<{ code: string }> };
    expect(data.items.length).toBeGreaterThan(0);
    // 每条都被该项目关联（间接校验 JOIN）
    const links = await fetch(`${API_BASE}/inspection-object-standards?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&pageSize=200`).then((r) => r.json()) as { items: Array<{ inspectionStandardCode: string }> };
    const linked = new Set(links.items.map((l) => l.inspectionStandardCode));
    for (const s of data.items) expect(linked.has(s.code)).toBe(true);
  });

  fnTest(["M06.F04.I01"], "GET /inspection-standards 按检测专项过滤", async () => {
    const res = await fetch(`${API_BASE}/inspection-standards?inspectionSpecialtyCode=SP01&pageSize=200`);
    const data = (await res.json()) as { items: Array<{ code: string }> };
    // SP01 项目集合
    const objs = await fetch(`${API_BASE}/inspection-objects?inspectionSpecialtyCode=SP01&pageSize=200`).then((r) => r.json()) as { items: Array<{ code: string }> };
    const objCodes = new Set(objs.items.map((o) => o.code));
    const links = await fetch(`${API_BASE}/inspection-object-standards?pageSize=500`).then((r) => r.json()) as { items: Array<{ inspectionObjectCode: string; inspectionStandardCode: string }> };
    const expected = new Set(links.items.filter((l) => objCodes.has(l.inspectionObjectCode)).map((l) => l.inspectionStandardCode));
    const got = new Set(data.items.map((s) => s.code));
    expect(got).toEqual(expected);
  });

  fnTest(["M06.F03.I01"], "GET /inspection-parameters 按检测标准过滤", async () => {
    const res = await fetch(`${API_BASE}/inspection-parameters?inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&pageSize=100`);
    const data = (await res.json()) as { items: Array<{ code: string }> };
    expect(data.items.length).toBeGreaterThan(0);
    const sp = await fetch(`${API_BASE}/inspection-standard-parameters?inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&pageSize=200`).then((r) => r.json()) as { items: Array<{ inspectionParameterCode: string }> };
    const expected = new Set(sp.items.map((x) => x.inspectionParameterCode));
    for (const p of data.items) expect(expected.has(p.code)).toBe(true);
  });

  fnTest(["M06.F03.I01"], "GET /inspection-parameters 多条件取交集", async () => {
    // 同时给 inspectionObjectCode 与 inspectionStandardCode：结果须既被该项目关联、又被该标准关联
    const res = await fetch(`${API_BASE}/inspection-parameters?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&pageSize=100`);
    const data = (await res.json()) as { items: Array<{ code: string }> };
    const byObj = await fetch(`${API_BASE}/inspection-object-parameters?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&pageSize=200`).then((r) => r.json()) as { items: Array<{ inspectionParameterCode: string }> };
    const byStd = await fetch(`${API_BASE}/inspection-standard-parameters?inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&pageSize=200`).then((r) => r.json()) as { items: Array<{ inspectionParameterCode: string }> };
    const inter = new Set([...byObj.items.map((x) => x.inspectionParameterCode)].filter((c) => byStd.items.some((y) => y.inspectionParameterCode === c)));
    const got = new Set(data.items.map((p) => p.code));
    expect(got).toEqual(inter);
  });

  fnTest(["M06.F02.I06"], "DELETE /inspection-object-parameters 按复合键删除", async () => {
    // 先建一条自定义关联
    await fetch(`${API_BASE}/inspection-objects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "OBJ-LINK-1", inspectionSpecialtyCode: "SP01", sourceProjectNo: "1", sourceProjectName: "x", name: "link", isOfficial: false, enabled: true }) });
    await fetch(`${API_BASE}/inspection-parameters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "IP-LINK-1", name: "link param", sourceType: "custom" }) });
    await fetch(`${API_BASE}/inspection-object-parameters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionObjectCode: "OBJ-LINK-1", inspectionParameterCode: "IP-LINK-1" }) });
    const res = await fetch(`${API_BASE}/inspection-object-parameters?inspectionObjectCode=OBJ-LINK-1&inspectionParameterCode=IP-LINK-1`, { method: "DELETE" });
    expect(res.status).toBe(204);
    // 再删一次 → 404
    const again = await fetch(`${API_BASE}/inspection-object-parameters?inspectionObjectCode=OBJ-LINK-1&inspectionParameterCode=IP-LINK-1`, { method: "DELETE" });
    expect(again.status).toBe(404);
  });

  fnTest(["M06.F02.I04"], "DELETE /inspection-object-standards 按复合键 + role 删除", async () => {
    await fetch(`${API_BASE}/inspection-object-standards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P1", inspectionStandardCode: "GB 175-2023", role: "TESTING" }) });
    // 种子里可能已有；重复 POST 会 400，忽略。直接尝试删
    const res = await fetch(`${API_BASE}/inspection-object-standards?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&role=TESTING`, { method: "DELETE" });
    expect([204, 404]).toContain(res.status);
    // role 缺失 → 400
    const bad = await fetch(`${API_BASE}/inspection-object-standards?inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}&inspectionStandardCode=${encodeURIComponent("GB 175-2023")}`, { method: "DELETE" });
    expect(bad.status).toBe(400);
  });

  fnTest(["M06.F02.I07"], "DELETE /inspection-specialty-objects 按复合键删除", async () => {
    await fetch(`${API_BASE}/inspection-specialty-objects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionSpecialtyCode: "SP01", inspectionObjectCode: "OBJ-SP01-P1" }) });
    const res = await fetch(`${API_BASE}/inspection-specialty-objects?inspectionSpecialtyCode=SP01&inspectionObjectCode=${encodeURIComponent("OBJ-SP01-P1")}`, { method: "DELETE" });
    expect([204, 404]).toContain(res.status);
  });

  fnTest(["M06.F04.I04"], "DELETE /inspection-standard-parameters 按复合键删除", async () => {
    await fetch(`${API_BASE}/inspection-standard-parameters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionStandardCode: "GB 175-2023", inspectionParameterCode: "IP-CEM003" }) });
    const res = await fetch(`${API_BASE}/inspection-standard-parameters?inspectionStandardCode=${encodeURIComponent("GB 175-2023")}&inspectionParameterCode=IP-CEM003`, { method: "DELETE" });
    expect([204, 404]).toContain(res.status);
  });
});
