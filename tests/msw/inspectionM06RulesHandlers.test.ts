import { describe, expect, beforeEach } from "vitest";
import { fnTest } from "../fn";
import { resetMockDb, seedMasterDataIntoMockDb } from "../../msw/db";

const API_BASE = "http://localhost/api";

beforeEach(() => {
  resetMockDb();
  seedMasterDataIntoMockDb();
});

describe("MSW M06 计算规则 / 技术要求 handler", () => {
  fnTest(["M06.F05.I01"], "GET /inspection-calculation-rules 返回种子并附可读名", async () => {
    const res = await fetch(`${API_BASE}/inspection-calculation-rules?pageSize=50`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { items: Array<{ objectName?: string; parameterName?: string; algorithmType: string }>; total: number };
    expect(data.total).toBeGreaterThan(0);
    expect(data.items[0]!.objectName).toBeTruthy();
    expect(data.items[0]!.parameterName).toBeTruthy();
  });

  fnTest(["M06.F05.I02"], "POST /inspection-calculation-rules 新建", async () => {
    const res = await fetch(`${API_BASE}/inspection-calculation-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P1", inspectionParameterCode: "IP-0001", algorithmType: "manual", specimenCount: 1 }),
    });
    expect(res.status).toBe(201);
    const row = (await res.json()) as { id: string };
    expect(row.id).toBeTruthy();
  });

  fnTest(["M06.F05.I03"], "DELETE /inspection-calculation-rules/:id 删除", async () => {
    const created = await fetch(`${API_BASE}/inspection-calculation-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P1", inspectionParameterCode: "IP-0002", algorithmType: "manual", specimenCount: 1 }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-calculation-rules/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F06.I01"], "GET /inspection-technical-requirements 返回种子含牌号/型号", async () => {
    const res = await fetch(`${API_BASE}/inspection-technical-requirements?pageSize=50`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { items: Array<{ brand?: string; model?: string; judgmentStandardCode: string }>; total: number };
    expect(data.total).toBeGreaterThan(0);
    // 至少一条带牌号或型号
    expect(data.items.some((r) => (r.brand ?? "") !== "" || (r.model ?? "") !== "")).toBe(true);
  });

  fnTest(["M06.F06.I02"], "POST /inspection-technical-requirements 新建（缺判定标准 400）", async () => {
    const bad = await fetch(`${API_BASE}/inspection-technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P2", inspectionParameterCode: "IP-0086" }),
    });
    expect(bad.status).toBe(400);
    const ok = await fetch(`${API_BASE}/inspection-technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P2", inspectionParameterCode: "IP-0086", judgmentStandardCode: "GB 1499.2-2024", brand: "HRB400", minValue: 400, comparison: "≥" }),
    });
    expect(ok.status).toBe(201);
  });

  fnTest(["M06.F06.I03"], "DELETE /inspection-technical-requirements/:id 删除", async () => {
    const created = await fetch(`${API_BASE}/inspection-technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P5", inspectionParameterCode: "IP-0055", judgmentStandardCode: "GB/T 50081-2019" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-technical-requirements/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});
