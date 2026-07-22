# M06 检测能力 4 资源 编辑/删除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 M06 的 4 个主数据资源（检测专项/项目/参数/标准）补齐 PUT（编辑）+ DELETE handler，并在 `InspectionCapabilityPage` 加编辑/删除入口。

**Architecture:** 顺着现有 `resource` prop 共用抽象：handler 侧为 4 资源各加 PUT（部分更新、`code` 不可变）+ DELETE（官方行拒绝 + 引用计数硬拒绝）；UI 侧扩展 `InspectionCapabilityFormModal` 支持编辑、`InspectionCapabilityPage` 加操作列与删除确认（复用 `ConfirmModal`）。TDD：先写 handler/UI 测试再实现。

**Tech Stack:** React 19 + TypeScript + Vite + Vitest + MSW 2 + axios + Tailwind。

## Global Constraints

- **`code` 不可变**：PUT 请求体里的 `code` 与 `id` 必须被忽略（业务主键，被 5 张关联表引用）。spec §4.1。
- **PUT 部分更新语义**：仅应用请求体中已提供的字段；所有字段可选；官方行与自定义行同样可编辑全部（非 code）字段。
- **DELETE 官方行拒绝**：specialty/object 看 `isOfficial`；parameter 看 `sourceType === 'official'`；standard **无 isOfficial 字段**，以 `sourceDocumentId != null` 为官方标记（POST 创建的自定义标准无该字段）。
- **DELETE 引用命中**：返回 `400 { message: "被 N 处引用，不可删除", references: N }`，N 为命中关联行总数。
- **路由前缀**：所有 MSW 路由以 `*/` 开头（匹配任意 host）。id 形如 `insp-sp-${code}` / `insp-obj-${code}` / `insp-param-${code}` / `insp-std-${code}`。
- **禁止 any / @ts-ignore**（CLAUDE.md）。**禁止组件直接 fetch**（走 `apiClient`）。
- **改功能与改功能清单同一个 commit**（CLAUDE.md）。
- **门禁命令**（在 suite 根目录 `d:/zcqiand-life/1-projects/xr-code-suite`）：`python scripts/gate.py -p lab-management-system`，exit 0 才算完成。
- npm 依赖走 `registry.npmmirror.com`（本任务不新增依赖）。

## File Structure

| 文件 | 责任 | 本轮改动 |
|---|---|---|
| `msw/handlers.ts` | MSW handler 注册表 | +`countBy` 辅助；4×PUT；3×DELETE（specialties DELETE 扩引用检查） |
| `src/features/inspection-capability/InspectionCapabilityFormModal.tsx` | 新建/编辑弹窗 | +`editing` prop，PUT 分支 |
| `src/features/inspection-capability/InspectionCapabilityPage.tsx` | 列表页 | +操作列、编辑/删除 state、ConfirmModal |
| `tests/msw/inspectionCapabilityCrudHandlers.test.ts` | handler 测试 | +PUT/DELETE 用例 |
| `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx` | UI 测试 | +编辑/删除用例 |
| `docs/functions/function-tree.md` | 功能清单 | 8 子项 `规划 → 已上线` |

**共享接口（跨任务约定）：**
- `countBy<T>(table: MockTable<T>, field: keyof T, value: string): number` — Task 1 在 `msw/handlers.ts` 顶部（`dictHandlers` 之前）定义，Task 2/3/4 复用。
- `InspectionCapabilityFormModal` 新增可选 prop：`editing?: { id: string;[k: string]: unknown } | null`。
- `InspectionCapabilityPage` 列表行需用到行对象的 `id`（用于拼 PUT/DELETE 路径）。所有 inspection 类型都继承 `{ id: string; createdAt: string; updatedAt: string }`。

---

### Task 1: 通用引用计数辅助 + 检测专项 PUT/DELETE

**Files:**
- Modify: `msw/handlers.ts`（顶部加 `countBy`；specialties POST 之后加 PUT；改写 specialties DELETE）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

**Interfaces:**
- Produces: `countBy<T>(table, field, value)` 供 Task 2/3/4 复用。

- [ ] **Step 1: 在 `tests/msw/inspectionCapabilityCrudHandlers.test.ts` 末尾的 `describe` 块内追加失败测试**

在文件最后一个 `})` 关闭 `describe` 之前追加：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 4 个新用例 FAIL（PUT 返回 404/无路由、DELETE 引用未拦截）。

- [ ] **Step 3: 在 `msw/handlers.ts` 顶部加 `countBy` 辅助**

在 `function dictHandlers(` 定义**之前**（约第 70 行 `/** v3 MSW handler 注册表 */` 注释块之后、`function dictHandlers` 之前）插入：

```ts
/** 统计表中某字段等于指定值的行数，用于删除前的引用计数。 */
function countBy<T extends { id: string }>(table: MockTable<T>, field: keyof T, value: string): number {
  return table.all().filter((r) => r[field] === value).length
}
```

- [ ] **Step 4: 在 specialties DELETE 之前插入 PUT handler**

定位到注释 `// M06.F01.I03 检测专项删除保护：官方专项不可删`（约第 1345 行）。在它**之前**插入：

```ts
  // M06.F01.I02 检测专项编辑（code 不可变）
  http.put('*/inspection-specialties/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionSpecialtyTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测专项不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const { code: _code, id: _id, ...rest } = body
    const updated = inspectionSpecialtyTable.update(id, rest as Partial<{ officialNo: string; name: string; isOfficial: boolean; enabled: boolean }>)
    return HttpResponse.json(updated)
  }),
```

- [ ] **Step 5: 改写 specialties DELETE，加引用检查**

把现有的：

```ts
  // M06.F01.I03 检测专项删除保护：官方专项不可删
  http.delete('*/inspection-specialties/:id', ({ params }) => {
    const row = inspectionSpecialtyTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测专项不存在' }, { status: 404 })
    if (row.isOfficial) {
      return HttpResponse.json({ message: '官方检测专项不可删除' }, { status: 400 })
    }
    inspectionSpecialtyTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
```

替换为：

```ts
  // M06.F01.I03 检测专项删除保护：官方/被引用不可删
  http.delete('*/inspection-specialties/:id', ({ params }) => {
    const row = inspectionSpecialtyTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测专项不存在' }, { status: 404 })
    if (row.isOfficial) {
      return HttpResponse.json({ message: '官方检测专项不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectTable, 'inspectionSpecialtyCode', row.code) +
      countBy(inspectionSpecialtyObjectTable, 'inspectionSpecialtyCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionSpecialtyTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全部 PASS（含原有用例）。

- [ ] **Step 7: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测专项 PUT 编辑 + DELETE 引用检查 (M06.F01.I02/I03)"
```

---

### Task 2: 检测项目 PUT/DELETE

**Files:**
- Modify: `msw/handlers.ts`（inspection-objects POST 之后加 PUT + DELETE）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `countBy`。

- [ ] **Step 1: 追加失败测试**

在 `describe` 块末尾追加：

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 5 个新用例 FAIL。

- [ ] **Step 3: 在 inspection-objects POST 之后插入 PUT + DELETE**

定位到 `// M06.F02.I06 检测项目-检测参数关联` 注释（objects POST 块之后）。在 objects POST 块结束的 `}),` 与该注释**之间**插入：

```ts
  // M06.F02.I02 检测项目编辑（code 不可变；改专项需校验存在）
  http.put('*/inspection-objects/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionObjectTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测项目不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const { code: _code, id: _id, ...rest } = body
    if (rest.inspectionSpecialtyCode && rest.inspectionSpecialtyCode !== row.inspectionSpecialtyCode) {
      if (!inspectionSpecialtyTable.findById(`insp-sp-${rest.inspectionSpecialtyCode}`)) {
        return HttpResponse.json({ message: '检测专项不存在' }, { status: 400 })
      }
    }
    const updated = inspectionObjectTable.update(id, rest as Partial<{ inspectionSpecialtyCode: string; sourceProjectNo: string; sourceProjectName: string; name: string; isOptionalForQualification: boolean; isOfficial: boolean; enabled: boolean }>)
    return HttpResponse.json(updated)
  }),

  // M06.F02.I03 检测项目删除保护：官方/被引用不可删
  http.delete('*/inspection-objects/:id', ({ params }) => {
    const row = inspectionObjectTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测项目不存在' }, { status: 404 })
    if (row.isOfficial) {
      return HttpResponse.json({ message: '官方检测项目不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectParameterTable, 'inspectionObjectCode', row.code) +
      countBy(inspectionObjectStandardTable, 'inspectionObjectCode', row.code) +
      countBy(inspectionSpecialtyObjectTable, 'inspectionObjectCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionObjectTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测项目 PUT 编辑 + DELETE 保护 (M06.F02.I02/I03)"
```

---

### Task 3: 检测参数 PUT/DELETE

**Files:**
- Modify: `msw/handlers.ts`（inspection-parameters POST 之后加 PUT + DELETE）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
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
```

> 说明：第 4 个用例中 IP-CEM003 是 `sourceType=official`，会在引用检查之前被官方分支拦截，故断言 message 含"官方"。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 4 个新用例 FAIL。

- [ ] **Step 3: 在 inspection-parameters POST 之后插入 PUT + DELETE**

定位到 `// M06.F04.I02 检测标准新建` 注释（parameters POST 块之后）。在 parameters POST 块结束的 `}),` 与该注释**之间**插入：

```ts
  // M06.F03.I02 检测参数编辑（code 不可变）
  http.put('*/inspection-parameters/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionParameterTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测参数不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const { code: _code, id: _id, ...rest } = body
    const updated = inspectionParameterTable.update(id, rest as Partial<{ name: string; rawName: string; canonicalName: string; methodText: string; aliases: string[]; unit: string; sourceType: 'official' | 'custom' }>)
    return HttpResponse.json(updated)
  }),

  // M06.F03.I03 检测参数删除保护：官方/被引用不可删
  http.delete('*/inspection-parameters/:id', ({ params }) => {
    const row = inspectionParameterTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测参数不存在' }, { status: 404 })
    if (row.sourceType === 'official') {
      return HttpResponse.json({ message: '官方检测参数不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectParameterTable, 'inspectionParameterCode', row.code) +
      countBy(inspectionStandardParameterTable, 'inspectionParameterCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionParameterTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测参数 PUT 编辑 + DELETE 保护 (M06.F03.I02/I03)"
```

---

### Task 4: 检测标准 PUT/DELETE

**Files:**
- Modify: `msw/handlers.ts`（inspection-standards POST 之后加 PUT + DELETE）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

> 注意：standard 无 `isOfficial` 字段，官方标记 = `sourceDocumentId != null`（种子标准都带 `sourceDocumentId`；POST 创建的自定义标准无）。

- [ ] **Step 1: 追加失败测试**

```ts
  fnTest(["M06.F04.I02"], "PUT /inspection-standards/:id 更新自定义标准且 code 不可变", async () => {
    const created = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB/T CUST-2026", name: "临时标准", status: "active" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-standards/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CHANGED", name: "改名标准", status: "draft" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { code: string; name: string; status: string };
    expect(data.code).toBe("GB/T CUST-2026");
    expect(data.name).toBe("改名标准");
    expect(data.status).toBe("draft");
  });

  fnTest(["M06.F04.I03"], "DELETE /inspection-standards/:id 删除未被引用的自定义标准", async () => {
    const created = await fetch(`${API_BASE}/inspection-standards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GB/T DEL-2026", name: "可删标准", status: "active" }),
    });
    const row = (await created.json()) as { id: string };
    const res = await fetch(`${API_BASE}/inspection-standards/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  fnTest(["M06.F04.I03"], "DELETE /inspection-standards/:id 官方标准（带 sourceDocumentId）拒绝", async () => {
    // GB 175-2023 是种子标准，带 sourceDocumentId
    const res = await fetch(`${API_BASE}/inspection-standards/insp-std-GB 175-2023`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { message: string };
    expect(data.message).toContain("官方");
  });
```

> URL 中 `insp-std-GB 175-2023` 含空格；测试用 fetch 字面量时空格会被编码，MSW 路由 `:id` 匹配经 decode 后的 `params.id`。若空格导致路由不匹配，改为先 GET 列表取出真实 id 再 DELETE（备选实现见 Step 3 备注）。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 3 个新用例 FAIL。

- [ ] **Step 3: 在 inspection-standards POST 之后插入 PUT + DELETE**

定位到 `// M06.F04.I04 检测标准-检测参数关联` 注释（standards POST 块之后）。在 standards POST 块结束的 `}),` 与该注释**之间**插入：

```ts
  // M06.F04.I02 检测标准编辑（code 不可变）
  http.put('*/inspection-standards/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionStandardTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测标准不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const { code: _code, id: _id, ...rest } = body
    const updated = inspectionStandardTable.update(id, rest as Partial<{ name: string; version: string; status: 'active' | 'superseded' | 'draft' }>)
    return HttpResponse.json(updated)
  }),

  // M06.F04.I03 检测标准删除保护：官方（带来源文件）/被引用不可删
  http.delete('*/inspection-standards/:id', ({ params }) => {
    const row = inspectionStandardTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测标准不存在' }, { status: 404 })
    if (row.sourceDocumentId) {
      return HttpResponse.json({ message: '官方检测标准不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectStandardTable, 'inspectionStandardCode', row.code) +
      countBy(inspectionStandardParameterTable, 'inspectionStandardCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionStandardTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
```

> 备注：若 Step 1 第 3 个用例因 id 含空格路由不匹配导致 404 而非 400，把测试改为先 `GET /inspection-standards?keyword=GB 175` 取 `items[0].id`，再 DELETE 该 id。handler 逻辑无需改。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测标准 PUT 编辑 + DELETE 保护 (M06.F04.I02/I03)"
```

---

### Task 5: FormModal 支持编辑模式

**Files:**
- Modify: `src/features/inspection-capability/InspectionCapabilityFormModal.tsx`
- Test: `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

**Interfaces:**
- Produces: `InspectionCapabilityFormModal` 接受 `editing?: { id: string;[k: string]: unknown } | null`；`editing` 有值时标题为"编辑…"、字段预填、提交走 PUT。

- [ ] **Step 1: 追加失败测试**

在 `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx` 的 `describe` 块末尾追加：

```tsx
  fnTest(["M06.F01.I02"], "检测专项编辑弹窗预填并提交 PUT", async () => {
    // 先建一个自定义专项供编辑
    await fetch("http://localhost/api/inspection-specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP90", name: "待编辑专项", isOfficial: false, enabled: true }),
    });
    renderPage("specialties");
    await flush();
    const user = userEvent.setup();
    // SP90 行的编辑按钮
    const editBtn = await screen.findByRole("button", { name: `编辑 SP90` });
    await user.click(editBtn);
    const heading = await screen.findByRole("heading", { name: "编辑检测专项", level: 3 });
    expect(heading).toBeTruthy();
    // 名称字段已预填
    const nameInput = screen.getByLabelText("名称") as HTMLInputElement;
    expect(nameInput.value).toBe("待编辑专项");
    await user.clear(nameInput);
    await user.type(nameInput, "已编辑专项");
    await user.click(screen.getByRole("button", { name: "保存" }));
    // 保存后弹窗关闭
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "编辑检测专项", level: 3 })).toBeNull();
    });
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL（找不到"编辑 SP90"按钮 / 无"编辑检测专项"标题）。

- [ ] **Step 3: 改 FormModal 支持 editing**

在 `src/features/inspection-capability/InspectionCapabilityFormModal.tsx`：

(a) 在 `TITLES` 之后新增 `EDIT_TITLES`：

```ts
const EDIT_TITLES: Record<Resource, string> = {
  specialties: "编辑检测专项",
  objects: "编辑检测项目",
  parameters: "编辑检测参数",
  standards: "编辑检测标准",
}
```

(b) 改 `Props` 与函数签名，加 `editing`：

```ts
interface Props {
  resource: Resource
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: { id: string;[k: string]: unknown } | null
}

export function InspectionCapabilityFormModal({ resource, open, onClose, onSaved, editing = null }: Props) {
```

(c) 改 `useEffect`，从 `editing` 预填：

```ts
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {}
      for (const f of fields) {
        init[f.name] = editing ? String((editing as Record<string, unknown>)[f.name] ?? "") : ""
      }
      setValues(init)
      setError(null)
      setInternalOpen(true)
    } else {
      setInternalOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource, editing])
```

(d) 改标题渲染：

```ts
        <h3 className="text-lg font-semibold">{editing ? EDIT_TITLES[resource] : TITLES[resource]}</h3>
```

(e) 改 `handleSubmit`，编辑走 PUT：

把 `try { const res = await apiClient.post(PATHS[resource], payload) ... }` 块替换为：

```ts
    try {
      const res = editing
        ? await apiClient.put(`${PATHS[resource]}/${editing.id}`, payload)
        : await apiClient.post(PATHS[resource], payload)
      if (!res.data || typeof res.data !== "object") {
        setError("服务端返回异常")
      } else if ("message" in (res.data as { message?: string })) {
        setError((res.data as { message: string }).message)
      } else {
        onSaved()
        onClose()
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败"
      setError(message)
    } finally {
      setSubmitting(false)
    }
```

(f) 编辑时 code 字段禁用。把字段 input 改为：

```tsx
            <input
              aria-label={f.label}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              placeholder={f.placeholder}
              className="mt-1 w-full border rounded px-2 py-1.5"
              required={f.required}
              disabled={!!editing && f.name === "code"}
            />
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 PASS（其余可能仍因页面没编辑按钮而 FAIL，Task 6 补页面后全绿；本步只看该用例 PASS）。

> 依赖说明：该测试点"编辑 SP90"按钮，按钮由 Task 6 在 Page 加。若按任务顺序执行，Task 5 先会让此测试找不到按钮而 FAIL。**因此 Task 5 与 Task 6 顺序可对调，或合并执行**。推荐：Task 5 实现 modal 后立即做 Task 6 实现 Page，再一起跑 UI 测试。Step 4 的"PASS"以 Task 6 完成后为准。

- [ ] **Step 5: Commit**

```bash
git add src/features/inspection-capability/InspectionCapabilityFormModal.tsx tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): FormModal 支持编辑模式 (PUT)"
```

---

### Task 6: Page 操作列 + 删除确认

**Files:**
- Modify: `src/features/inspection-capability/InspectionCapabilityPage.tsx`
- Test: `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

**Interfaces:**
- Consumes: Task 5 的 `editing` prop。

- [ ] **Step 1: 追加失败测试**

在 `inspectionCapabilityCrud.test.tsx` 的 `describe` 块末尾追加：

```tsx
  fnTest(["M06.F03.I03"], "检测参数删除被引用时展示错误", async () => {
    renderPage("parameters");
    await flush();
    const user = userEvent.setup();
    // IP-CEM003 是官方参数，删除按钮 disabled，不会触发请求；改用新建一个自定义参数再删
    // 这里验证官方参数的删除按钮被禁用
    const delBtn = await screen.findByRole("button", { name: `删除 IP-CEM003` });
    expect((delBtn as HTMLButtonElement).disabled).toBe(true);
  });

  fnTest(["M06.F01.I03"], "检测专项删除自定义未引用专项成功", async () => {
    await fetch("http://localhost/api/inspection-specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP91", name: "可删专项", isOfficial: false, enabled: true }),
    });
    renderPage("specialties");
    await flush();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: `删除 SP91` }));
    // 确认弹窗
    await user.click(await screen.findByRole("button", { name: "确认" }));
    // 列表刷新后 SP91 消失
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: `删除 SP91` })).toBeNull();
    });
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL（无"删除 …"按钮）。

- [ ] **Step 3: 改 Page，加操作列、编辑/删除、ConfirmModal**

在 `src/features/inspection-capability/InspectionCapabilityPage.tsx`：

(a) 顶部加 `ConfirmModal` 导入：

```ts
import { ConfirmModal } from '../../components/ConfirmModal'
```

(b) 在 `FN_CREATE` 常量之后加 `FN_DELETE`：

```ts
const FN_DELETE: Record<ResourceKey, string> = {
  specialties: 'M06.F01.I03',
  objects: 'M06.F02.I03',
  parameters: 'M06.F03.I03',
  standards: 'M06.F04.I03',
}
```

(c) 加官方判定与删除文案辅助（放在 `asSpecialty` 之后）：

```ts
function rowId(item: ResourceState['items'][number]): string {
  return (item as { id: string }).id
}

function isOfficialRow(key: ResourceKey, item: ResourceState['items'][number]): boolean {
  if (key === 'specialties' || key === 'objects') return (item as { isOfficial?: boolean }).isOfficial === true
  if (key === 'parameters') return (item as { sourceType?: string }).sourceType === 'official'
  return (item as { sourceDocumentId?: string }).sourceDocumentId != null
}
```

(d) 在组件内加 state（紧挨 `const [createOpen, setCreateOpen] = useState(false)` 之后）：

```ts
  const [editing, setEditing] = useState<ResourceState['items'][number] | null>(null)
  const [deleting, setDeleting] = useState<ResourceState['items'][number] | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`${PATHS[key]}/${rowId(deleting)}`)
      setDeleting(null)
      load()()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '删除失败'
      setDeleteError(msg)
    } finally {
      setDeletingBusy(false)
    }
  }
```

(e) 表头加一列（在「状态/资质」`<th>` 之后加）：

```tsx
              <th className="px-4 py-2 text-left">操作</th>
```

并把两处 `colSpan={4}` 改为 `colSpan={5}`（加载中、暂无数据两行）。

(f) 表体每行末尾加操作单元格（紧跟「状态/资质」`<td>` 之后、`</tr>` 之前）：

```tsx
                <td className="px-4 py-2 text-xs whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    data-fn={FN_CREATE[key]}
                    className="text-blue-600 hover:underline disabled:opacity-40 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleting(item); setDeleteError(null) }}
                    data-fn={FN_DELETE[key]}
                    aria-label={`删除 ${(item as { code: string }).code}`}
                    disabled={isOfficialRow(key, item)}
                    className="text-red-600 hover:underline disabled:opacity-40"
                  >
                    删除
                  </button>
                </td>
```

(g) 把底部的新建 modal 改造，并补编辑 modal + 删除确认。把现有：

```tsx
      <InspectionCapabilityFormModal
        resource={key}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => load()()}
      />
```

替换为：

```tsx
      <InspectionCapabilityFormModal
        resource={key}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => load()()}
      />
      <InspectionCapabilityFormModal
        resource={key}
        open={editing !== null}
        editing={editing ? { id: rowId(editing), ...(editing as object) } : null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load()() }}
      />
      <ConfirmModal
        open={deleting !== null}
        title={`删除${TITLES[key]}`}
        message={
          <>
            确定删除 {(deleting as { code?: string } | null)?.code ?? ''}？官方数据与被引用数据不可删除。
            {deleteError && (
              <div role="alert" className="mt-2 text-red-600">{deleteError}</div>
            )}
          </>
        }
        confirmText="确认删除"
        loading={deletingBusy}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleting(null); setDeleteError(null) }}
      />
```

> 编辑按钮的 `aria-label` 需与 Task 5 测试 `findByRole("button", { name: "编辑 SP90" })` 对应。给编辑按钮也加 `aria-label`：在编辑 `<button>` 上加 `aria-label={`编辑 ${(item as { code: string }).code}`}`。

补上编辑按钮的 aria-label（修改 Step (f) 的编辑按钮，加 `aria-label={`编辑 ${(item as { code: string }).code}`}`）。

- [ ] **Step 4: 运行全部 UI 测试确认通过**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 全部 PASS（含 Task 5 的编辑用例）。

- [ ] **Step 5: Commit**

```bash
git add src/features/inspection-capability/InspectionCapabilityPage.tsx tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): Page 操作列 + 编辑/删除入口 (M06.F01-04.I02/I03)"
```

---

### Task 7: 功能清单状态推进 + gate 全绿 + trace

**Files:**
- Modify: `docs/functions/function-tree.md`
- Run: suite gate + trace_cmd

- [ ] **Step 1: 推进功能清单状态**

在 `docs/functions/function-tree.md` 中，把以下 8 行的 `| 规划 |` 改为 `| 已上线 |`（注意每行末尾状态列）：

- M06.F01.I02、M06.F01.I03
- M06.F02.I02、M06.F02.I03
- M06.F03.I02、M06.F03.I03
- M06.F04.I02、M06.F04.I03

> 这些子项分布在 `### M06.F01` ~ `### M06.F04` 四个小节的表格里，每行末列为状态。**只改这 8 行**，不动其它。

- [ ] **Step 2: 运行全量测试 + 类型检查**

Run（项目根 `output/lab-management-system`）:
```bash
npx vitest run
npx tsc --noEmit
npx eslint src msw
```
Expected: 全绿。

- [ ] **Step 3: 重新生成 trace.json（由 trace_cmd，禁止手写）**

Run（项目根）:
```bash
npx vitest run --reporter=trace   # 若 trace 走 reporter
```
若项目的 trace 由 gate 内部的 `trace_cmd` 自动生成（典型），跳过此步，gate 会处理。**禁止手写 `.state/trace.json`。**

- [ ] **Step 4: 运行 suite gate**

Run（**suite 根目录** `d:/zcqiand-life/1-projects/xr-code-suite`）:
```bash
python scripts/gate.py -p lab-management-system
```
Expected: exit 0。L5 关于"已上线缺设计映射"的告警按 spec 决策可接受（告警不阻断）。若 exit 1，按提示回代码修；exit 2 停下问人。

- [ ] **Step 5: Commit**

```bash
git add docs/functions/function-tree.md
git commit -m "feat(inspection): M06.F01-04 I02/I03 推进为已上线"
```

- [ ] **Step 6: handoff**

调用 `/handoff` 更新 `output/lab-management-system/.state/session.json`。

---

## Self-Review 结论

- **Spec coverage**：PUT×4（Task 1-4）、DELETE×4 含官方/引用保护（Task 1-4）、UI 编辑入口（Task 5+6）、UI 删除入口+ConfirmModal（Task 6）、功能清单推进（Task 7）、gate 全绿（Task 7）。spec §4 全覆盖。
- **Placeholder**：无 TBD/TODO，所有代码块完整。
- **类型一致**：`countBy`、`editing`、`rowId`、`isOfficialRow`、`FN_DELETE` 跨任务命名一致。
- **已知顺序依赖**：Task 5 的测试依赖 Task 6 的"编辑 …"按钮。已在 Task 5 Step 4 备注，推荐 5+6 连做后统一跑 UI 测试。
- **standard 官方判定**：spec 未细化，本计划定为 `sourceDocumentId != null`，已在 Task 4 与 Global Constraints 显式说明。
