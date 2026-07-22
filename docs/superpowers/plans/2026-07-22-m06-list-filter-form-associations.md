# M06 列表级联过滤 + 表单字段补足 + 编辑关联页签 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 M06 检测标准/参数列表加父链级联过滤，补足 4 资源编辑表单字段，并在编辑弹窗内以页签管理资源间关联（增/删）。

**Architecture:** 后端给 `MockTable.query` 加 `match` 谓词实现 JOIN 过滤；standards/parameters GET 增父链参数；4 张关联表补 DELETE（按复合查询参数删，避开标准编码含 `/` 的路由分裂）。前端 Page 加级联下拉；FormModal 字段类型化并改 tab 布局；抽 `<AssociationManager>` 组件复用 4 种关联管理。

**Tech Stack:** React 19 + TypeScript + Vite + Vitest + MSW 2 + axios + Tailwind。

## Global Constraints

- **路由前缀** `*/`；关联表 DELETE 用**复合查询参数**（非 `:id`），因为标准编码含 `/` 会让 `:id` 路由分裂。
- **官方行字段全部可编辑**（首轮决策覆盖了功能清单"官方来源字段只读"字样）。
- **多过滤条件取交集（AND）**。
- **关联页签仅编辑态**出现（新建态父不存在，不能关联）。
- 禁止 any / @ts-ignore（CLAUDE.md）。禁止组件直接 fetch（走 apiClient）。函数组件 + Hooks。useEffect 依赖数组完整。
- npm 依赖走 registry.npmmirror.com（本任务不新增依赖）。
- 门禁命令（suite 根目录 `d:/zcqiand-life/1-projects/xr-code-suite`）：`python scripts/gate.py -p lab-management-system`，exit 0 才算完成。
- 改功能与改功能清单同一个 commit。
- 测试走 `fnTest(["<id>"], name, body)` 挂功能 ID；TDD 先红后绿。

## File Structure

| 文件 | 责任 | 改动 |
|---|---|---|
| `msw/db.ts` | MockTable | `query` 加 `match` 谓词 |
| `msw/handlers.ts` | MSW handler | standards/parameters GET 级联参数；标准 PUT +sourceDocumentId；4 关联 DELETE |
| `src/features/inspection-capability/InspectionCapabilityPage.tsx` | 列表页 | 级联下拉（object/standard filter） |
| `src/features/inspection-capability/InspectionCapabilityFormModal.tsx` | 新建/编辑弹窗 | 字段类型化 + 补字段 + tab 布局 |
| `src/features/inspection-capability/AssociationManager.tsx` | 新建 | 可复用关联管理组件 |
| `tests/msw/inspectionCapabilityCrudHandlers.test.ts` | handler 测试 | 级联过滤 + 关联 DELETE |
| `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx` | UI 测试 | 级联下拉 + 表单字段 + 关联页签 |
| `docs/functions/function-tree.md` | 功能清单 | M06.F02.I04/I05/I06/I07 → 已上线 |

**共享接口（跨任务约定）：**
- `MockTable.query` 新增 `match?: (row: T) => boolean`（Task 1 定义，Task 2 复用）。
- `<AssociationManager config={...} parentCode={...} />`（Task 6 定义，Task 7 复用）。
- 测试基线：handler 测试 `beforeEach` 已 `resetMockDb()+seedMasterDataIntoMockDb()`；UI 测试同理 + `loginAsAdmin()` + `cleanup()`。

---

### Task 1: MockTable.query `match` 谓词 + 检测标准级联过滤

**Files:**
- Modify: `msw/db.ts`（`query` 方法，约 81-130 行）
- Modify: `msw/handlers.ts`（`GET /inspection-standards`，约 1611 行之前的标准 GET）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

**Interfaces:**
- Produces: `MockTable.query` 支持 `match?: (row: T) => boolean`。

- [ ] **Step 1: 追加失败测试**（在 handler 测试 `describe` 内，闭合 `})` 之前）

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 2 新用例 FAIL（`match` 不存在、参数被忽略 → 返回全部标准，断言不等）。

- [ ] **Step 3: 给 `MockTable.query` 加 `match`**

在 `msw/db.ts` 的 `query` 方法 opts 类型加 `match`，并在 filters 之后应用（约 107 行之后、dateField 之前插入）。opts 类型改为：

```ts
  query(opts: {
    page: number
    pageSize: number
    keyword?: string
    keywordFields?: (keyof T)[]
    filters?: Partial<T>
    match?: (row: T) => boolean
    dateField?: keyof T
    dateFrom?: string
    dateTo?: string
    sortField?: keyof T
  }): { items: T[]; total: number; page: number; pageSize: number } {
    const { page, pageSize, keyword, keywordFields, filters, match, dateField, dateFrom, dateTo, sortField } = opts
    let filtered = [...this.rows]
    // ...keyword / filters 不变...
    if (match) filtered = filtered.filter(match)
    // ...dateField / sort / paginate 不变...
```

- [ ] **Step 4: 改 `GET /inspection-standards` 加级联过滤**

找到 `http.get('*/inspection-standards', ({ request }) => {` 块，把其中 `inspectionStandardTable.query({ ... })` 改为先解析参数、解出允许集、传 `match`：

```ts
  http.get('*/inspection-standards', ({ request }) => {
    const url = new URL(request.url)
    const objectCode = url.searchParams.get('inspectionObjectCode')
    const specialtyCode = url.searchParams.get('inspectionSpecialtyCode')
    let match: ((r: { code: string }) => boolean) | undefined
    if (objectCode || specialtyCode) {
      const objCodes = new Set<string>()
      if (objectCode) {
        objCodes.add(objectCode)
      } else if (specialtyCode) {
        for (const o of inspectionObjectTable.all()) {
          if (o.inspectionSpecialtyCode === specialtyCode) objCodes.add(o.code)
        }
      }
      const allowed = new Set<string>()
      for (const r of inspectionObjectStandardTable.all()) {
        if (objCodes.has(r.inspectionObjectCode)) allowed.add(r.inspectionStandardCode)
      }
      match = (r) => allowed.has(r.code)
    }
    return HttpResponse.json(
      inspectionStandardTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name'],
        sortField: 'code',
        match,
      }),
    )
  }),
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全绿（含原有）。

- [ ] **Step 6: Commit**

```bash
git add msw/db.ts msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测标准列表按项目/专项级联过滤 (M06.F04.I01)"
```

---

### Task 2: 检测参数级联过滤（专项/项目/标准，多条件交集）

**Files:**
- Modify: `msw/handlers.ts`（`GET /inspection-parameters`）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `MockTable.query` `match` 选项。

- [ ] **Step 1: 追加失败测试**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 2 新用例 FAIL。

- [ ] **Step 3: 改 `GET /inspection-parameters`**

找到 `http.get('*/inspection-parameters', ...)`，替换 query 调用为解析三参 + 解析两个集合 + 交集 + match：

```ts
  http.get('*/inspection-parameters', ({ request }) => {
    const url = new URL(request.url)
    const objectCode = url.searchParams.get('inspectionObjectCode')
    const specialtyCode = url.searchParams.get('inspectionSpecialtyCode')
    const standardCode = url.searchParams.get('inspectionStandardCode')
    const sets: Array<Set<string>> = []
    if (objectCode || specialtyCode) {
      const objCodes = new Set<string>()
      if (objectCode) objCodes.add(objectCode)
      else if (specialtyCode) for (const o of inspectionObjectTable.all()) if (o.inspectionSpecialtyCode === specialtyCode) objCodes.add(o.code)
      const s = new Set<string>()
      for (const r of inspectionObjectParameterTable.all()) if (objCodes.has(r.inspectionObjectCode)) s.add(r.inspectionParameterCode)
      sets.push(s)
    }
    if (standardCode) {
      const s = new Set<string>()
      for (const r of inspectionStandardParameterTable.all()) if (r.inspectionStandardCode === standardCode) s.add(r.inspectionParameterCode)
      sets.push(s)
    }
    let match: ((r: { code: string }) => boolean) | undefined
    if (sets.length > 0) {
      const inter = sets.reduce((acc, cur) => new Set([...acc].filter((c) => cur.has(c))))
      match = (r) => inter.has(r.code)
    }
    return HttpResponse.json(
      inspectionParameterTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name', 'canonicalName'],
        sortField: 'code',
        match,
      }),
    )
  }),
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 检测参数列表按专项/项目/标准级联过滤 (M06.F03.I01)"
```

---

### Task 3: 列表页级联下拉（标准 + 参数）

**Files:**
- Modify: `src/features/inspection-capability/InspectionCapabilityPage.tsx`
- Test: `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

**Interfaces:**
- Consumes: Task 1/2 的后端过滤参数。

- [ ] **Step 1: 追加失败测试**（UI 测试 `describe` 内，闭合 `})` 之前）

```ts
  fnTest(["M06.F04.I01"], "检测标准页级联下拉：选专项后请求带 inspectionSpecialtyCode", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    renderPage("standards");
    await flush();
    const user = userEvent.setup();
    const spSelect = screen.getByLabelText("检测专项筛选");
    await user.selectOptions(spSelect, "SP01");
    await flush();
    const hit = getSpy.mock.calls.find(
      ([path, cfg]) =>
        path === "/inspection-standards" &&
        (cfg as unknown as { params?: { inspectionSpecialtyCode?: string } })?.params?.inspectionSpecialtyCode === "SP01",
    );
    expect(hit).toBeTruthy();
  });

  fnTest(["M06.F03.I01"], "检测参数页三级级联：选专项→项目→标准后请求带全部参数", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    renderPage("parameters");
    await flush();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("检测专项筛选"), "SP01");
    await flush();
    await user.selectOptions(await screen.findByLabelText("检测项目筛选"), "OBJ-SP01-P1");
    await flush();
    await user.selectOptions(await screen.findByLabelText("检测标准筛选"), "GB 175-2023");
    await flush();
    const hit = getSpy.mock.calls.find(
      ([path, cfg]) =>
        path === "/inspection-parameters" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionSpecialtyCode === "SP01" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionObjectCode === "OBJ-SP01-P1" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionStandardCode === "GB 175-2023",
    );
    expect(hit).toBeTruthy();
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL（standards/parameters 页无对应下拉 / 无 object/standard filter）。

- [ ] **Step 3: 扩展 Page 的过滤栏与级联**

在 `InspectionCapabilityPage.tsx`：

(a) state 增加 `objectFilter`、`standardFilter`、`objectOptions`、`standardOptions`（紧邻现有 `specialtyFilter`/`specialtyOptions`）：

```ts
  const [objectFilter, setObjectFilter] = useState('')
  const [standardFilter, setStandardFilter] = useState('')
  const [objectOptions, setObjectOptions] = useState<InspectionObject[]>([])
  const [standardOptions, setStandardOptions] = useState<InspectionStandard[]>([])
```

(b) `load()` 的 params 按资源拼（替换现有 `if (key === 'objects' && specialtyFilter)` 块）：

```ts
    const params: { page: number; pageSize: string; inspectionSpecialtyCode?: string; inspectionObjectCode?: string; inspectionStandardCode?: string } = {
      page: 1,
      pageSize: String(PAGE_SIZE),
    }
    if (key === 'objects' && specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter
    if (key === 'standards') {
      if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter
      if (objectFilter) params.inspectionObjectCode = objectFilter
    }
    if (key === 'parameters') {
      if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter
      if (objectFilter) params.inspectionObjectCode = objectFilter
      if (standardFilter) params.inspectionStandardCode = standardFilter
    }
```

(c) 主列表 effect 依赖加 objectFilter/standardFilter：

```ts
  useEffect(() => load(), [key, specialtyFilter, objectFilter, standardFilter])
```

(d) 现有"专项下拉"仅 `key === 'objects'` 渲染——扩到 `'objects' | 'standards' | 'parameters'` 都渲染。把渲染条件从 `key === 'objects'` 改为 `key !== 'specialties'`（专项页本身不需要筛专项）。

(e) 新增项目下拉（standards/parameters 渲染，按 specialtyFilter 过滤选项；specialtyFilter 变化时清 objectFilter+standardFilter 并重拉项目）和标准下拉（仅 parameters 渲染，按 objectFilter 过滤选项；objectFilter 变化时清 standardFilter 并重拉标准）。加两个 effect：

```ts
  // 项目下拉选项（standards/parameters，按选中专项过滤）
  useEffect(() => {
    if (key !== 'standards' && key !== 'parameters') { setObjectOptions([]); return }
    const controller = new AbortController()
    const params: { page: number; pageSize: string; inspectionSpecialtyCode?: string } = { page: 1, pageSize: '200' }
    if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter
    apiClient
      .get<{ items: InspectionObject[] }>(PATHS.objects, { params, signal: controller.signal })
      .then((res) => setObjectOptions(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => {})
    return () => controller.abort()
  }, [key, specialtyFilter])

  // 标准下拉选项（parameters，按选中项目过滤）
  useEffect(() => {
    if (key !== 'parameters') { setStandardOptions([]); return }
    const controller = new AbortController()
    const params: { page: number; pageSize: string; inspectionObjectCode?: string } = { page: 1, pageSize: '200' }
    if (objectFilter) params.inspectionObjectCode = objectFilter
    apiClient
      .get<{ items: InspectionStandard[] }>(PATHS.standards, { params, signal: controller.signal })
      .then((res) => setStandardOptions(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => {})
    return () => controller.abort()
  }, [key, objectFilter])
```

(f) header 过滤区把三个下拉都放进去（专项下拉改条件后，再追加项目、标准下拉）。把现有 `<select aria-label="检测专项筛选" ...>` 保留，其后追加：

```tsx
          {(key === 'standards' || key === 'parameters') && (
            <select
              aria-label="检测项目筛选"
              value={objectFilter}
              onChange={(e) => { setObjectFilter(e.target.value); setStandardFilter('') }}
              className="px-2 py-1.5 text-sm border rounded"
            >
              <option value="">全部项目</option>
              {objectOptions.map((o) => (<option key={o.code} value={o.code}>{o.name}</option>))}
            </select>
          )}
          {key === 'parameters' && (
            <select
              aria-label="检测标准筛选"
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border rounded"
            >
              <option value="">全部标准</option>
              {standardOptions.map((s) => (<option key={s.code} value={s.code}>{s.code}</option>))}
            </select>
          )}
```

> 注意：专项下拉 onChange 需在选中变化时清 objectFilter 与 standardFilter（级联清子）。修改现有专项 `<select>` 的 onChange 为：
> `onChange={(e) => { setSpecialtyFilter(e.target.value); setObjectFilter(''); setStandardFilter('') }}`

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add src/features/inspection-capability/InspectionCapabilityPage.tsx tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): 标准/参数列表页级联下拉 (M06.F03.F04.I01)"
```

---

### Task 4: 表单字段补足 + 标准 PUT 接受 sourceDocumentId

**Files:**
- Modify: `msw/handlers.ts`（标准 PUT 白名单 +sourceDocumentId，约 1621 行）
- Modify: `src/features/inspection-capability/InspectionCapabilityFormModal.tsx`
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`、`tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

- [ ] **Step 1: 追加失败测试（后端）**

```ts
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
```

- [ ] **Step 2: 追加失败测试（前端）**

```ts
  fnTest(["M06.F03.I02"], "检测参数编辑弹窗渲染补足字段（sourceType/aliases）", async () => {
    await fetch("http://localhost/api/inspection-parameters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "IP-FORM-1", name: "表单参数", sourceType: "custom" }),
    });
    renderPage("parameters");
    await flush();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "编辑 IP-FORM-1" }));
    expect(await screen.findByLabelText("来源类型")).toBeTruthy();
    expect(screen.getByLabelText("别名（逗号分隔）")).toBeTruthy();
  });
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL。

- [ ] **Step 4: 标准 PUT 白名单 +sourceDocumentId**

在 `msw/handlers.ts` 标准 PUT（`http.put(INSPECTION_STANDARD_ID_RE, ...)`）把白名单与 cast 改为含 `sourceDocumentId`：

```ts
    const patch: Record<string, unknown> = {}
    for (const key of ['name', 'version', 'status', 'sourceDocumentId'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    const updated = inspectionStandardTable.update(id, patch as Partial<{ name: string; version: string; status: 'active' | 'superseded' | 'draft'; sourceDocumentId: string }>)
```

- [ ] **Step 5: FormModal 字段类型化 + 补字段**

在 `InspectionCapabilityFormModal.tsx`：

(a) 把 `FIELDS` 的条目从 `{ name, label, placeholder?, required? }` 升级为带 `type`：

```ts
type FieldType = 'text' | 'select' | 'checkbox' | 'aliases'
interface Field {
  name: string
  label: string
  type?: FieldType                  // 缺省 text
  options?: string[]                // select 用
  required?: boolean
  placeholder?: string
}
```

(b) 替换 4 个资源的 FIELDS（补足字段）：

```ts
const FIELDS: Record<Resource, Field[]> = {
  specialties: [
    { name: "code", label: "编码", required: true, placeholder: "SP10" },
    { name: "officialNo", label: "官方序号", placeholder: "十" },
    { name: "name", label: "名称", required: true },
    { name: "isOfficial", label: "官方", type: "checkbox" },
    { name: "enabled", label: "启用", type: "checkbox" },
  ],
  objects: [
    { name: "code", label: "编码", required: true, placeholder: "OBJ-SP01-P24" },
    { name: "inspectionSpecialtyCode", label: "检测专项编码", required: true, placeholder: "SP01" },
    { name: "sourceProjectNo", label: "来源行号", placeholder: "24" },
    { name: "sourceProjectName", label: "来源行名称", placeholder: "自定义项目" },
    { name: "name", label: "名称", required: true },
    { name: "isOptionalForQualification", label: "资质可选", type: "checkbox" },
    { name: "isOfficial", label: "官方", type: "checkbox" },
    { name: "enabled", label: "启用", type: "checkbox" },
  ],
  parameters: [
    { name: "code", label: "编码", required: true, placeholder: "IP-CUSTOM-1" },
    { name: "name", label: "名称", required: true },
    { name: "rawName", label: "原始名" },
    { name: "canonicalName", label: "规范名" },
    { name: "methodText", label: "试验方法" },
    { name: "aliases", label: "别名（逗号分隔）", type: "aliases" },
    { name: "unit", label: "单位", placeholder: "MPa" },
    { name: "sourceType", label: "来源类型", type: "select", options: ["official", "custom"] },
  ],
  standards: [
    { name: "code", label: "编码", required: true, placeholder: "GB/T CUSTOM-2026" },
    { name: "name", label: "名称", required: true },
    { name: "version", label: "版本", placeholder: "2026" },
    { name: "status", label: "状态", type: "select", options: ["active", "superseded", "draft"] },
    { name: "sourceDocumentId", label: "来源文件" },
  ],
}
```

(c) initialValues 支持 checkbox/select：现有 `initialValues[f.name] = editing ? String(...) : ""`。checkbox 编辑态用 `String(!!value)`。aliases 编辑态用 `Array.isArray(value) ? value.join(", ") : ""`。把初始化循环改为：

```ts
    const init: Record<string, string> = {}
    for (const f of fields) {
      const v = editing ? (editing as Record<string, unknown>)[f.name] : ""
      if (f.type === "checkbox") init[f.name] = v === true || v === "true" ? "true" : "false"
      else if (f.type === "aliases") init[f.name] = Array.isArray(v) ? (v as string[]).join(", ") : ""
      else init[f.name] = v == null ? "" : String(v)
    }
```

(d) payload 构造（提交前转换 checkbox/select/aliases）。在 `handleSubmit` 内、`apiClient.post/put` 之前，把 `payload` 按字段类型重塑：

```ts
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.name]
      if (f.type === "checkbox") payload[f.name] = v === "true"
      else if (f.type === "aliases") payload[f.name] = v.split(",").map((s) => s.trim()).filter(Boolean)
      else payload[f.name] = v
    }
    // 保留原有 resource 专属默认值逻辑（objects/specialties/parameters/standards 的 isOfficial/enabled/sourceType/status 等）
    if (resource === "objects") { payload.isOfficial = payload.isOfficial ?? false; payload.isOptionalForQualification = payload.isOptionalForQualification ?? false; payload.enabled = payload.enabled ?? true }
    else if (resource === "specialties") { payload.isOfficial = payload.isOfficial ?? false; payload.enabled = payload.enabled ?? true }
    else if (resource === "parameters") { payload.rawName = (payload.rawName as string) || (payload.name as string) || (payload.canonicalName as string); payload.sourceType = payload.sourceType ?? "custom" }
    else if (resource === "standards") { payload.status = payload.status ?? "active" }
```

（删掉旧的 `{...values}` 直传与逐 resource 默认值旧块，用上面替换。）

(e) 字段渲染按 type 分支。把现有 `{fields.map((f) => ...)}` 单 input 改为按 type 渲染：

```tsx
        {fields.map((f) => {
          const ftype = f.type ?? "text"
          if (ftype === "checkbox") {
            return (
              <label key={f.name} className="block text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={f.label}
                  checked={values[f.name] === "true"}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.checked ? "true" : "false" })}
                  disabled={!!editing && f.name === "code"}
                />
                <span className="text-xs font-medium text-gray-600">{f.label}</span>
              </label>
            )
          }
          if (ftype === "select") {
            return (
              <label key={f.name} className="block text-sm">
                <span className="text-xs font-medium text-gray-600">{f.label}</span>
                <select
                  aria-label={f.label}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  className="mt-1 w-full border rounded px-2 py-1.5"
                >
                  {(f.options ?? []).map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </label>
            )
          }
          // text / aliases 共用 input
          return (
            <label key={f.name} className="block text-sm">
              <span className="text-xs font-medium text-gray-600">{f.label}{f.required ? " *" : ""}</span>
              <input
                aria-label={f.label}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                placeholder={f.placeholder}
                className="mt-1 w-full border rounded px-2 py-1.5"
                required={f.required}
                disabled={!!editing && f.name === "code"}
              />
            </label>
          )
        })}
```

> aliases 字段是普通 input（逗号分隔），走 text 分支即可，aria-label 仍是"别名（逗号分隔）"。

- [ ] **Step 6: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 全绿。

- [ ] **Step 7: Commit**

```bash
git add msw/handlers.ts src/features/inspection-capability/InspectionCapabilityFormModal.tsx tests/msw/inspectionCapabilityCrudHandlers.test.ts tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): 表单字段补足（类型化）+ 标准 PUT sourceDocumentId (M06.F02-04.I02)"
```

---

### Task 5: 4 张关联表 DELETE handler（复合查询参数）

**Files:**
- Modify: `msw/handlers.ts`（在各关联 POST 之后追加对应 DELETE）
- Test: `tests/msw/inspectionCapabilityCrudHandlers.test.ts`

- [ ] **Step 1: 追加失败测试**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 4 新用例 FAIL。

- [ ] **Step 3: 实现 4 个 DELETE handler**

在对应 POST 之后各追加一个 DELETE（按 query 复合键定位唯一行；缺参 400；未命中 404；命中删 204）：

```ts
  // M06.F02.I06 删除 项目-参数 关联
  http.delete('*/inspection-object-parameters', ({ request }) => {
    const url = new URL(request.url)
    const oc = url.searchParams.get('inspectionObjectCode')
    const pc = url.searchParams.get('inspectionParameterCode')
    if (!oc || !pc) return HttpResponse.json({ message: 'inspectionObjectCode/inspectionParameterCode 必填' }, { status: 400 })
    const row = inspectionObjectParameterTable.all().find((r) => r.inspectionObjectCode === oc && r.inspectionParameterCode === pc)
    if (!row) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    inspectionObjectParameterTable.remove(row.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F02.I04/I05 删除 项目-标准 关联（带 role）
  http.delete('*/inspection-object-standards', ({ request }) => {
    const url = new URL(request.url)
    const oc = url.searchParams.get('inspectionObjectCode')
    const sc = url.searchParams.get('inspectionStandardCode')
    const role = url.searchParams.get('role') as 'TESTING' | 'JUDGMENT' | null
    if (!oc || !sc || !role) return HttpResponse.json({ message: '对象/标准/角色 必填' }, { status: 400 })
    if (!['TESTING', 'JUDGMENT'].includes(role)) return HttpResponse.json({ message: 'role 仅支持 TESTING/JUDGMENT' }, { status: 400 })
    const row = inspectionObjectStandardTable.all().find((r) => r.inspectionObjectCode === oc && r.inspectionStandardCode === sc && r.role === role)
    if (!row) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    inspectionObjectStandardTable.remove(row.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F02.I07 删除 专项-项目 关联
  http.delete('*/inspection-specialty-objects', ({ request }) => {
    const url = new URL(request.url)
    const sp = url.searchParams.get('inspectionSpecialtyCode')
    const oc = url.searchParams.get('inspectionObjectCode')
    if (!sp || !oc) return HttpResponse.json({ message: '专项/项目 必填' }, { status: 400 })
    const row = inspectionSpecialtyObjectTable.all().find((r) => r.inspectionSpecialtyCode === sp && r.inspectionObjectCode === oc)
    if (!row) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    inspectionSpecialtyObjectTable.remove(row.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F04.I04 删除 标准-参数 关联
  http.delete('*/inspection-standard-parameters', ({ request }) => {
    const url = new URL(request.url)
    const sc = url.searchParams.get('inspectionStandardCode')
    const pc = url.searchParams.get('inspectionParameterCode')
    if (!sc || !pc) return HttpResponse.json({ message: '标准/参数 必填' }, { status: 400 })
    const row = inspectionStandardParameterTable.all().find((r) => r.inspectionStandardCode === sc && r.inspectionParameterCode === pc)
    if (!row) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    inspectionStandardParameterTable.remove(row.id)
    return new HttpResponse(null, { status: 204 })
  }),
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/msw/inspectionCapabilityCrudHandlers.test.ts`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add msw/handlers.ts tests/msw/inspectionCapabilityCrudHandlers.test.ts
git commit -m "feat(inspection): 4 张关联表 DELETE（复合查询参数）(M06.F02.I04/I05/I06/I07)"
```

---

### Task 6: `<AssociationManager>` 可复用关联管理组件

**Files:**
- Create: `src/features/inspection-capability/AssociationManager.tsx`
- Test: `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

**Interfaces:**
- Produces: `AssociationManager`，props 见下。Task 7 在 FormModal 中使用。

- [ ] **Step 1: 追加失败测试**

```ts
  fnTest(["M06.F02.I06"], "AssociationManager 列出/添加/移除关联", async () => {
    // 给 OBJ-SP01-P1 建一条自定义参数关联用于移除
    await fetch("http://localhost/api/inspection-parameters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "IP-AM-1", name: "AM 参数", sourceType: "custom" }) });
    await fetch("http://localhost/api/inspection-object-parameters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionObjectCode: "OBJ-SP01-P1", inspectionParameterCode: "IP-AM-1" }) });
    render(
      <MemoryRouter>
        <AssociationManager
          ariaLabel="OBJ-SP01-P1 关联检测参数"
          endpoint="/inspection-object-parameters"
          parentParam="inspectionObjectCode"
          parentCode="OBJ-SP01-P1"
          targetLabel="检测参数"
          targetEndpoint="/inspection-parameters"
          targetParam="inspectionParameterCode"
          targetValueKey="code"
          targetTextKey="name"
        />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    // 列表含 IP-AM-1
    expect(await screen.findByText("AM 参数")).toBeTruthy();
    // 移除
    await user.click(screen.getByRole("button", { name: "移除 IP-AM-1" }));
    await waitFor(() => expect(screen.queryByText("AM 参数")).toBeNull());
  });
```

> 需要 `import { AssociationManager } from "../../../src/features/inspection-capability/AssociationManager";`。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL（组件不存在）。

- [ ] **Step 3: 创建 `AssociationManager.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface ExtraField {
  name: string
  label: string
  type?: 'text' | 'select'
  options?: string[]
}

interface Props {
  ariaLabel: string
  endpoint: string                       // 如 /inspection-object-parameters
  parentParam: string                    // 如 inspectionObjectCode
  parentCode: string
  targetLabel: string                    // 如 "检测参数"
  targetEndpoint: string                 // 如 /inspection-parameters
  targetParam: string                    // 如 inspectionParameterCode
  targetValueKey: string                 // 目标下拉 value 字段（通常 code）
  targetTextKey: string                  // 目标下拉 显示字段（通常 name）
  extraFields?: ExtraField[]             // role / qualificationLevel+sortOrder / clause+methodName+unit
  fnId?: string                          // data-fn 锚点
}

export function AssociationManager(props: Props) {
  const { ariaLabel, endpoint, parentParam, parentCode, targetLabel, targetEndpoint, targetParam, targetValueKey, targetTextKey, extraFields = [], fnId } = props
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [targets, setTargets] = useState<Array<Record<string, string>>>([])
  const [selected, setSelected] = useState('')
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = () => {
    apiClient
      .get<{ items: Array<Record<string, string>> }>(endpoint, { params: { [parentParam]: parentCode, page: 1, pageSize: '200' } })
      .then((res) => setRows(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => setError('加载失败'))
    apiClient
      .get<{ items: Array<Record<string, string>> }>(targetEndpoint, { params: { page: 1, pageSize: '200' } })
      .then((res) => setTargets(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => {})
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadAll, [endpoint, parentParam, parentCode])

  const add = async () => {
    if (!selected) return
    setBusy(true); setError(null)
    const payload: Record<string, unknown> = { [parentParam]: parentCode, [targetParam]: selected, ...extra }
    try {
      const res = await apiClient.post(endpoint, payload)
      if (res.data && typeof res.data === 'object' && 'message' in (res.data as { message?: string })) setError((res.data as { message: string }).message)
      else { setSelected(''); setExtra({}); loadAll() }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '添加失败')
    } finally { setBusy(false) }
  }

  const remove = async (targetCode: string, row: Record<string, string>) => {
    setBusy(true); setError(null)
    const params: Record<string, string> = { [parentParam]: parentCode, [targetParam]: targetCode }
    for (const f of extraFields) { const v = row[f.name]; if (v !== undefined) params[f.name] = v }
    try {
      await apiClient.delete(endpoint, { params })
      loadAll()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '移除失败')
    } finally { setBusy(false) }
  }

  return (
    <div data-fn={fnId} aria-label={ariaLabel} className="space-y-3">
      {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
      <ul className="text-sm divide-y">
        {rows.length === 0 && <li className="px-1 py-2 text-gray-400">暂无关联</li>}
        {rows.map((r) => {
          const code = r[targetParam]
          return (
            <li key={code + extraFields.map((f) => r[f.name]).join('#')} className="flex items-center justify-between px-1 py-2">
              <span>{code}{extraFields.map((f) => ` · ${f.label}: ${r[f.name] ?? ''}`).join('')}</span>
              <button type="button" aria-label={`移除 ${code}`} disabled={busy} onClick={() => remove(code, r)} className="text-red-600 hover:underline disabled:opacity-40">移除</button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-xs text-gray-600">{targetLabel}</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ml-1 border rounded px-2 py-1">
            <option value="">选择{targetLabel}</option>
            {targets.map((t) => <option key={t[targetValueKey]} value={t[targetValueKey]}>{t[targetTextKey]}</option>)}
          </select>
        </label>
        {extraFields.map((f) => (
          <label key={f.name} className="text-sm">
            <span className="text-xs text-gray-600">{f.label}</span>
            {f.type === 'select' ? (
              <select value={extra[f.name] ?? ''} onChange={(e) => setExtra({ ...extra, [f.name]: e.target.value })} className="ml-1 border rounded px-2 py-1">
                <option value="">（选）</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={extra[f.name] ?? ''} onChange={(e) => setExtra({ ...extra, [f.name]: e.target.value })} className="ml-1 border rounded px-2 py-1" />
            )}
          </label>
        ))}
        <button type="button" onClick={add} disabled={busy || !selected} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">添加</button>
      </div>
    </div>
  )
}

export default AssociationManager
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 PASS（其余可能因 FormModal 未改 tab 而无关，只要这条绿）。

- [ ] **Step 5: Commit**

```bash
git add src/features/inspection-capability/AssociationManager.tsx tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): 可复用 AssociationManager 组件"
```

---

### Task 7: FormModal tab 布局，编辑态接入关联页签

**Files:**
- Modify: `src/features/inspection-capability/InspectionCapabilityFormModal.tsx`
- Test: `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`

**Interfaces:**
- Consumes: Task 6 的 `AssociationManager`。

- [ ] **Step 1: 追加失败测试**

```ts
  fnTest(["M06.F02.I06"], "检测项目编辑弹窗出现 关联检测参数 页签", async () => {
    renderPage("objects");
    await flush();
    const user = userEvent.setup();
    // 点第一行的编辑按钮
    const editBtns = await screen.findAllByRole("button", { name: /^编辑 / });
    await user.click(editBtns[0]!);
    expect(await screen.findByRole("button", { name: "关联检测参数" })).toBeTruthy();
  });

  fnTest(["M06.F04.I04"], "检测标准编辑弹窗出现 关联检测参数 页签", async () => {
    renderPage("standards");
    await flush();
    const user = userEvent.setup();
    const editBtns = await screen.findAllByRole("button", { name: /^编辑 / });
    await user.click(editBtns[0]!);
    expect(await screen.findByRole("button", { name: "关联检测参数" })).toBeTruthy();
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 新用例 FAIL（无页签按钮）。

- [ ] **Step 3: FormModal 改 tab 布局**

在 `InspectionCapabilityFormModal.tsx`：

(a) 导入 AssociationManager：

```ts
import { AssociationManager } from './AssociationManager'
```

(b) 定义 tab 配置（编辑态用；新建态无 tab）：

```ts
type TabKey = 'basic' | 'assocObject' | 'assocStandard' | 'assocParameter'
const ASSOC_TABS: Record<Resource, Array<{ key: TabKey; label: string }>> = {
  specialties: [{ key: 'basic', label: '基本信息' }, { key: 'assocObject', label: '关联检测项目' }],
  objects: [{ key: 'basic', label: '基本信息' }, { key: 'assocStandard', label: '关联检测标准' }, { key: 'assocParameter', label: '关联检测参数' }],
  parameters: [{ key: 'basic', label: '基本信息' }],
  standards: [{ key: 'basic', label: '基本信息' }, { key: 'assocParameter', label: '关联检测参数' }],
}
```

(c) 组件内加 tab state：`const [tab, setTab] = useState<TabKey>('basic')`，并在 `useEffect`（open 切换时）重置 `setTab('basic')`。

(d) 表单主体：编辑态渲染 tab 按钮 + 按 `tab` 切换内容。把现有表单字段块包进"基本信息"分支；其它 tab 渲染对应 AssociationManager。在 `<form>` 内（或与 form 平级——关联操作不走表单提交），结构示意：

```tsx
        {editing && (
          <div className="flex gap-2 border-b">
            {ASSOC_TABS[resource].map((t) => (
              <button key={t.key} type="button" aria-label={t.label} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm ${tab === t.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {(!editing || tab === 'basic') && (
          <div className="space-y-3">
            {/* 原 fields.map(...) 渲染移到这里 */}
          </div>
        )}
        {editing && tab === 'assocObject' && (
          (resource === 'specialties')
            ? <AssociationManager ariaLabel="关联检测项目" endpoint="/inspection-specialty-objects" parentParam="inspectionSpecialtyCode" parentCode={String((editing as Record<string, unknown>).code ?? '')} targetLabel="检测项目" targetEndpoint="/inspection-objects" targetParam="inspectionObjectCode" targetValueKey="code" targetTextKey="name" fnId="M06.F02.I07" />
            : null
        )}
        {editing && tab === 'assocStandard' && resource === 'objects' && (
          <AssociationManager ariaLabel="关联检测标准" endpoint="/inspection-object-standards" parentParam="inspectionObjectCode" parentCode={String((editing as Record<string, unknown>).code ?? '')} targetLabel="检测标准" targetEndpoint="/inspection-standards" targetParam="inspectionStandardCode" targetValueKey="code" targetTextKey="name" extraFields={[{ name: 'role', label: '角色', type: 'select', options: ['TESTING', 'JUDGMENT'] }]} fnId="M06.F02.I04" />
        )}
        {editing && tab === 'assocParameter' && (
          resource === 'objects'
            ? <AssociationManager ariaLabel="关联检测参数" endpoint="/inspection-object-parameters" parentParam="inspectionObjectCode" parentCode={String((editing as Record<string, unknown>).code ?? '')} targetLabel="检测参数" targetEndpoint="/inspection-parameters" targetParam="inspectionParameterCode" targetValueKey="code" targetTextKey="name" extraFields={[{ name: 'qualificationLevel', label: '资质级别', type: 'select', options: ['QUALIFIED', 'RESTRICTED'] }, { name: 'sortOrder', label: '排序', type: 'text' }]} fnId="M06.F02.I06" />
            : resource === 'standards'
              ? <AssociationManager ariaLabel="关联检测参数" endpoint="/inspection-standard-parameters" parentParam="inspectionStandardCode" parentCode={String((editing as Record<string, unknown>).code ?? '')} targetLabel="检测参数" targetEndpoint="/inspection-parameters" targetParam="inspectionParameterCode" targetValueKey="code" targetTextKey="name" extraFields={[{ name: 'clause', label: '条款', type: 'text' }, { name: 'methodName', label: '方法', type: 'text' }, { name: 'unit', label: '单位', type: 'text' }]} fnId="M06.F04.I04" />
              : null
        )}
```

> 保存/取消按钮仅基本信息 tab 显示，或始终显示（保存只作用于基本信息字段）。保持按钮在 form 末尾即可——切换到关联 tab 时按钮仍在，保存只提交基本信息字段（关联有自己的添加/移除按钮）。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add src/features/inspection-capability/InspectionCapabilityFormModal.tsx tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx
git commit -m "feat(inspection): 编辑弹窗 tab 布局 + 关联页签 (M06.F02.I04/I05/I06/I07)"
```

---

### Task 8: 功能清单 I04/I05/I06/I07 → 已上线 + gate

**Files:**
- Modify: `docs/functions/function-tree.md`
- Run: gate

- [ ] **Step 1: 推进功能清单状态**

在 `docs/functions/function-tree.md` 把以下 4 行末列改为 `已上线`：
- `M06.F02.I04 关联检测依据`
- `M06.F02.I05 关联判定依据`
- `M06.F02.I06 关联检测参数`
- `M06.F02.I07 关联检测专项`（现为 `开发中`，改 `已上线`）

> 只改这 4 行的状态列，不动其它。

- [ ] **Step 2: 全量校验**

Run（项目根）:
```bash
npx vitest run
npx tsc --noEmit
npx eslint src msw tests
```
Expected: 全绿。

- [ ] **Step 3: 运行 gate**

Run（**suite 根** `d:/zcqiand-life/1-projects/xr-code-suite`）:
```bash
python scripts/gate.py -p lab-management-system
```
Expected: exit 0。L5 关于已上线缺设计映射的告警可接受（告警不阻断）。exit 1 按提示修；exit 2 停下问人。

- [ ] **Step 4: Commit**

```bash
git add docs/functions/function-tree.md
git commit -m "feat(inspection): M06.F02.I04/I05/I06/I07 推进为已上线"
```

- [ ] **Step 5: handoff**

调用 `/handoff` 更新 `.state/session.json`。

---

## Self-Review 结论

- **Spec coverage**：① 过滤（Task 1-3）、② 表单字段（Task 4）、③ 关联 DELETE（Task 5）、③ AssociationManager（Task 6）、③ tab 布局（Task 7）、清单推进（Task 8）。spec §4/5/6/7/8 全覆盖。
- **Placeholder**：无 TBD/TODO；所有代码块完整。
- **类型一致**：`match`、`AssociationManager` props、`Field`/`ExtraField`/`TabKey` 跨任务命名一致。
- **已知顺序依赖**：Task 3（UI 级联）依赖 Task 1/2（后端过滤参数）；Task 7 依赖 Task 6（AssociationManager）。按编号顺序执行即可。
- **关联 DELETE 用复合查询参数**：避开标准编码含 `/` 的 `:id` 路由分裂（spec §3 决策）。
