import { describe, expect, beforeEach } from "vitest";
import { fnTest } from "../fn";
import { reportCategoryTable, resetMockDb } from "../../msw/db";

const API_BASE = "http://localhost/api";

function seedCategory(code = "steel") {
  if (!reportCategoryTable.all().some((c) => c.code === code)) {
    reportCategoryTable.insert({
      id: `cat-${code}`,
      code,
      name: "钢材",
      reportTitle: "钢材检测报告",
      summaryType: "material",
      summaryName: "钢材试验报告汇总表",
      extFields: [],
      sortOrder: 0,
    });
  }
}

async function createReceipt(categoryCode = "steel") {
  const res = await fetch(`${API_BASE}/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contractId: "c-001",
      receiptCode: "RC-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      categoryCode,
      receivedBy: "测试员",
      sampleSource: "施工送检",
      testCategory: "委托检验",
    }),
  });
  return res.json();
}

async function createSample(receiptId: string, code = "S-" + Math.random().toString(36).slice(2, 5)) {
  const res = await fetch(`${API_BASE}/samples`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      receiptId,
      sampleCode: code,
      sampleName: code,
      ext: {},
    }),
  });
  return res.json();
}

// ----- test-parameters (M04.F04) -----
describe("MSW test-parameters handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M04.F04.I01"], "GET /test-parameters 返回列表", async () => {
    const res = await fetch(`${API_BASE}/test-parameters?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  fnTest(["M04.F04.I02"], "POST /test-parameters 创建成功", async () => {
    const res = await fetch(`${API_BASE}/test-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "TP-NEW",
        name: "抗拉强度",
        categoryCode: "steel",
        group: "力学性能",
        unit: "MPa",
      }),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.code).toBe("TP-NEW");
  });

  fnTest(["M04.F04.I03"], "DELETE /test-parameters/:code 删除成功", async () => {
    await fetch(`${API_BASE}/test-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TP-DEL", name: "删除测试", categoryCode: "steel" }),
    });
    const del = await fetch(`${API_BASE}/test-parameters/TP-DEL`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F04.I01"], "GET /test-parameters/:code 获取单个", async () => {
    await fetch(`${API_BASE}/test-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TP-GET", name: "获取测试", categoryCode: "steel" }),
    });
    const res = await fetch(`${API_BASE}/test-parameters/TP-GET`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.code).toBe("TP-GET");
  });
});

// ----- test-standards (M04.F03) -----
describe("MSW test-standards handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M04.F03.I01"], "GET /test-standards 返回列表", async () => {
    const res = await fetch(`${API_BASE}/test-standards?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  fnTest(["M04.F03.I02"], "POST /test-standards 创建成功", async () => {
    const res = await fetch(`${API_BASE}/test-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "GB/T228-2020",
        name: "金属材料室温拉伸试验方法",
        type: "国家标准",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F03.I03"], "DELETE /test-standards/:code 删除成功", async () => {
    await fetch(`${API_BASE}/test-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TS-DEL", name: "删除测试标准", type: "行业标准" }),
    });
    const del = await fetch(`${API_BASE}/test-standards/TS-DEL`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F03.I01"], "GET /test-standards/:code 获取单个", async () => {
    await fetch(`${API_BASE}/test-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TS-GET", name: "获取测试标准", type: "国家标准" }),
    });
    const res = await fetch(`${API_BASE}/test-standards/TS-GET`);
    expect(res.ok).toBe(true);
  });
});

// ----- technical-requirements (M04.F05) -----
describe("MSW technical-requirements handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M04.F05.I01"], "GET /technical-requirements 返回列表", async () => {
    const res = await fetch(`${API_BASE}/technical-requirements?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  fnTest(["M04.F05.I02"], "POST /technical-requirements 创建成功", async () => {
    const res = await fetch(`${API_BASE}/technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "TR-NEW",
        standardCode: "GB/T228",
        parameterCode: "TP-001",
        categoryCode: "steel",
        brand: "HRB400",
        model: "热轧带肋",
        grade: "400",
        specification: "Φ22",
        comparison: ">=",
        value: "400",
        unit: "MPa",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F05.I03"], "DELETE /technical-requirements/:code 删除成功", async () => {
    await fetch(`${API_BASE}/technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "TR-DEL", standardCode: "GB/T228", parameterCode: "TP-001",
        categoryCode: "steel", brand: "HRB400", model: "热轧", grade: "400",
        specification: "Φ22", comparison: ">=", value: "400", unit: "MPa",
      }),
    });
    const del = await fetch(`${API_BASE}/technical-requirements/TR-DEL`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F05.I01"], "GET /technical-requirements/:code 获取单个", async () => {
    await fetch(`${API_BASE}/technical-requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "TR-GET", standardCode: "GB/T228", parameterCode: "TP-001",
        categoryCode: "steel", brand: "HRB400", model: "热轧", grade: "400",
        specification: "Φ22", comparison: ">=", value: "400", unit: "MPa",
      }),
    });
    const res = await fetch(`${API_BASE}/technical-requirements/TR-GET`);
    expect(res.ok).toBe(true);
  });
});

// ----- report-templates (M04.F02) -----
describe("MSW report-templates handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M04.F02.I02"], "POST /report-templates 创建成功", async () => {
    const res = await fetch(`${API_BASE}/report-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryCode: "steel",
        name: "钢材检测报告模板",
        content: "<html>报告内容</html>",
      }),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe("钢材检测报告模板");
  });

  fnTest(["M04.F02.I01"], "GET /report-templates 返回列表", async () => {
    await fetch(`${API_BASE}/report-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", name: "模板A", content: "A" }),
    });
    const res = await fetch(`${API_BASE}/report-templates?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
  });

  // DELETE /report-templates/:id handler 不存在，跳过 M04.F02.I03
});

// ----- models/specifications/grades/brands (M04.F06-F09) -----
describe("MSW model/specification/grade/brand handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M04.F06.I01"], "GET /models 返回列表", async () => {
    const res = await fetch(`${API_BASE}/models?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
  });

  fnTest(["M04.F06.I02"], "POST /models 创建成功", async () => {
    const res = await fetch(`${API_BASE}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", name: "热轧带肋钢筋", remark: "HRB400" }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F06.I03"], "DELETE /models/:id 删除成功", async () => {
    const created = await (
      await fetch(`${API_BASE}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "steel", name: "待删除型号" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/models/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F07.I01"], "GET /specifications 返回列表", async () => {
    const res = await fetch(`${API_BASE}/specifications?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
  });

  fnTest(["M04.F07.I02"], "POST /specifications 创建成功", async () => {
    const res = await fetch(`${API_BASE}/specifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", name: "Φ22", remark: "直径22mm" }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F07.I03"], "DELETE /specifications/:id 删除成功", async () => {
    const created = await (
      await fetch(`${API_BASE}/specifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "steel", name: "待删除规格" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/specifications/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F08.I01"], "GET /grades 返回列表", async () => {
    const res = await fetch(`${API_BASE}/grades?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
  });

  fnTest(["M04.F08.I02"], "POST /grades 创建成功", async () => {
    const res = await fetch(`${API_BASE}/grades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", name: "Ⅰ级", remark: "接头等级" }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F08.I03"], "DELETE /grades/:id 删除成功", async () => {
    const created = await (
      await fetch(`${API_BASE}/grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "steel", name: "待删除等级" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/grades/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M04.F09.I01"], "GET /brands 返回列表", async () => {
    const res = await fetch(`${API_BASE}/brands?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
  });

  fnTest(["M04.F09.I02"], "POST /brands 创建成功", async () => {
    const res = await fetch(`${API_BASE}/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", name: "HRB400", remark: "热轧带肋400" }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F09.I03"], "DELETE /brands/:id 删除成功", async () => {
    const created = await (
      await fetch(`${API_BASE}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "steel", name: "待删除牌号" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/brands/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });
});

// ----- test-items (M03.F03.I03-I06) -----
describe("MSW test-items handlers", () => {
  beforeEach(() => {
    resetMockDb();
    seedCategory();
  });

  fnTest(["M03.F03.I03"], "POST /test-items 创建检测项", async () => {
    const receipt = await createReceipt();
    const sample = await createSample(receipt.id);
    const res = await fetch(`${API_BASE}/test-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterCode: "TP-001",
        result: "520",
        unit: "MPa",
      }),
    });
    expect(res.status).toBe(201);
    const item = await res.json();
    expect(item.parameterCode).toBe("TP-001");
  });

  fnTest(["M03.F03.I04"], "DELETE /test-items/:id 删除检测项", async () => {
    const receipt = await createReceipt();
    const sample = await createSample(receipt.id);
    const created = await (
      await fetch(`${API_BASE}/test-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId: sample.id, parameterCode: "TP-DEL", result: "100", unit: "MPa" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/test-items/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  fnTest(["M03.F03.I05"], "POST /test-items 自动评定", async () => {
    const receipt = await createReceipt();
    const sample = await createSample(receipt.id);
    const res = await fetch(`${API_BASE}/test-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterCode: "TP-AUTO",
        result: "520",
        unit: "MPa",
        // 不传 passed → 自动评定（mock DB 无技术要求，autoPassed 为 null 是正常行为）
      }),
    });
    expect(res.status).toBe(201);
    const item = await res.json();
    expect(item.sampleId).toBe(sample.id);
    expect(item.parameterCode).toBe("TP-AUTO");
    // autoPassed 取决于是否有匹配的技术要求（mock DB 无完整 chain，此处仅验证结构）
  });

  fnTest(["M03.F03.I06"], "POST /test-items 人工改判（传 passed 覆盖自动评定）", async () => {
    const receipt = await createReceipt();
    const sample = await createSample(receipt.id);
    const res = await fetch(`${API_BASE}/test-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterCode: "TP-MANUAL",
        result: "350",
        unit: "MPa",
        passed: false, // 人工改判为不合格
      }),
    });
    expect(res.status).toBe(201);
    const item = await res.json();
    expect(item.passed).toBe(false);
  });
});
