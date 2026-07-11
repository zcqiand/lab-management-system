import { describe, expect, beforeEach } from "vitest";
import { fnTest } from "../fn";
import { reportCategoryTable, resetMockDb } from "../../msw/db";

const API_BASE = "http://localhost/api";

describe("MSW org-info handlers", () => {
  beforeEach(() => {
    resetMockDb();
  });

  fnTest(["M01.F01.I01"], "GET /org-info 返回机构信息（已初始化）", async () => {
    // 先 PUT 初始化
    await fetch(`${API_BASE}/org-info`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "测试实验室", address: "测试地址" }),
    });
    const res = await fetch(`${API_BASE}/org-info`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("name");
  });

  fnTest(["M01.F01.I01"], "PUT /org-info 更新机构信息", async () => {
    const res = await fetch(`${API_BASE}/org-info`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "测试实验室",
        address: "测试地址",
        contact: "测试联系人",
        phone: "010-12345678",
      }),
    });
    expect(res.ok).toBe(true);
  });
});

describe("MSW category-standards handlers (M04.F03.I04)", () => {
  beforeEach(() => {
    resetMockDb();
    if (!reportCategoryTable.all().some((c) => c.code === "steel")) {
      reportCategoryTable.insert({
        id: "cat-steel",
        code: "steel",
        name: "钢材",
        reportTitle: "钢材检测报告",
        summaryType: "material",
        summaryName: "钢材汇总表",
        extFields: [],
        sortOrder: 0,
      });
    }
  });

  fnTest(["M04.F03.I04"], "POST /category-standards 创建类别-标准关联", async () => {
    const res = await fetch(`${API_BASE}/category-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryCode: "steel",
        standardCode: "GB/T228",
        remark: "室温拉伸试验",
      }),
    });
    expect(res.status).toBe(201);
  });

  fnTest(["M04.F03.I04"], "GET /category-standards 返回列表", async () => {
    await fetch(`${API_BASE}/category-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: "steel", standardCode: "GB/T228-2020" }),
    });
    const res = await fetch(`${API_BASE}/category-standards?page=1&pageSize=50`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  fnTest(["M04.F03.I04"], "DELETE /category-standards/:id 删除关联", async () => {
    const created = await (
      await fetch(`${API_BASE}/category-standards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "steel", standardCode: "GB/T-DEL" }),
      })
    ).json();
    const del = await fetch(`${API_BASE}/category-standards/${created.id}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(204);
  });
});

describe("MSW report-category CRUD (M04.F01.I02/I03)", () => {
  beforeEach(() => {
    resetMockDb();
    reportCategoryTable.reset();
  });

  fnTest(["M04.F01.I02"], "POST /report-categories 创建类别", async () => {
    const res = await fetch(`${API_BASE}/report-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "concrete",
        name: "混凝土",
        reportTitle: "混凝土检测报告",
        summaryType: "concrete",
        summaryName: "混凝土汇总表",
        extFields: [],
        sortOrder: 5,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.code).toBe("concrete");
  });

  fnTest(["M04.F01.I03"], "DELETE /report-categories/:code 删除类别", async () => {
    // First create
    await fetch(`${API_BASE}/report-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "to-delete",
        name: "待删除",
        reportTitle: "测试",
        summaryType: "material",
        summaryName: "测试汇总",
        extFields: [],
        sortOrder: 99,
      }),
    });
    const del = await fetch(`${API_BASE}/report-categories/to-delete`, {
      method: "DELETE",
    });
    expect(del.status).toBe(204);
  });
});
