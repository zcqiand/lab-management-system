# 设计：M06 检测能力 4 资源 编辑/删除（B 区）

> 日期：2026-07-22
> 范围：lab-management-system（react-ts）
> 关联需求：[REQ-2026-003-检测能力模块与真实标准数据](../../requirements/REQ-2026-003-检测能力模块与真实标准数据.md)
> 关联功能：M06.F01.I02/I03、M06.F02.I02/I03、M06.F03.I02/I03、M06.F04.I02/I03

## 1. 背景与目标

M06 检测能力的 4 个核心主数据资源（检测专项 / 检测项目 / 检测参数 / 检测标准）目前只有「列表 + 新建」：

| 资源 | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| inspection-specialties | ✓ | ✓ | ✗ | ✓（仅官方保护） |
| inspection-objects | ✓ | ✓ | ✗ | ✗ |
| inspection-parameters | ✓ | ✓ | ✗ | ✗ |
| inspection-standards | ✓ | ✓ | ✗ | ✗ |

UI 侧 `InspectionCapabilityPage`（4 资源按 `resource` prop 共用）只有新建入口，无编辑/删除入口。

**目标**：补齐 4 资源的 PUT + DELETE handler，UI 加编辑/删除入口，使功能清单 M06.F01–F04 的 I02（新建/编辑）与 I03（删除）落地。

## 2. 不在本轮范围（A 区，独立 spec）

- 扩充 9 专项 / 93 项目的全量参数、计算规则、技术要求、相关标准（docx 抽取 + 人工校核）。
- 本轮不动 `data/master-data/*.csv` 与 `scripts/data/build-master-data.mjs` 的数据内容（仅可能因测试需要新增自定义 fixture，走 handler 内存表）。

## 3. 方案

**选定：扩展现有 Page + Modal，复用 ConfirmModal（方案 A）。** 顺 `resource` 抽象走，4 资源共用一套编辑/删除逻辑。

被否：方案 B（每资源独立 Page/Modal）——重复代码 4 倍，违背 CLAUDE.md「最小改动」。

## 4. 详细设计

### 4.1 决策（已与人确认）

| 议题 | 决策 |
|---|---|
| PUT 官方行字段策略 | 所有字段可编辑、都可缺省（部分更新语义）；官方行与自定义行一致 |
| `code` 字段 | PUT 时**不可变**（业务主键，被 5 张关联表引用；改 code 会孤儿化关联）。请求里的 code 新值被忽略 |
| DELETE 引用检查命中 | 硬拒绝 400 + 返回「被 N 处引用，不可删除」 |
| DELETE 官方行 | 拒绝 400「官方数据不可删除」（沿用现有 specialties DELETE 保护，符合 I03「保护官方及已引用」） |
| 功能清单状态 | `规划 → 已上线`（接受 L5 关于设计映射/测试引用的告警，人裁量） |

### 4.2 PUT handler（×4，新增）

路由：`PUT */inspection-{specialties|objects|parameters|standards}/:id`

通用流程：
1. `findById(params.id)` → 不存在返回 404。
2. 合并更新：仅应用请求体里**已提供**的字段（部分更新）。忽略请求体里的 `code`（不可变）与 `id`。
3. `code` 不可变但保留原值；无需做唯一性校验（因为不允许改）。
4. 刷新 `updatedAt = now`。
5. 返回 200 + 更新后整行。

各资源可改字段（除 code 外）：
- specialties：`officialNo`、`name`、`isOfficial`、`enabled`
- objects：`inspectionSpecialtyCode`（若改，需校验目标专项存在，否则 400）、`sourceProjectNo`、`sourceProjectName`、`name`、`isOptionalForQualification`、`isOfficial`、`enabled`
- parameters：`name`、`rawName`、`canonicalName`、`methodText`、`aliases`、`unit`、`sourceType`
- standards：`name`、`version`、`status`

> objects 改 `inspectionSpecialtyCode` 需校验目标专项存在（沿用 POST 的同款校验）。

### 4.3 DELETE handler（×4）

specialties 已有 DELETE（官方保护），补 objects / parameters / standards 三个，并对**所有 4 个**统一加引用检查（specialties 现版本只查官方，需补引用检查）。

通用流程：
1. `findById` → 404。
2. 官方行 → 400「官方{资源名}不可删除」。
3. 引用检查（见下表）→ 命中返回 400 `{ message: "被 N 处引用，不可删除", references: N }`。
4. 通过 → `remove(id)` + 204。

引用检查矩阵：

| 删除目标 | 检查的关联表 | 字段 |
|---|---|---|
| specialty | inspectionObjectTable | `inspectionSpecialtyCode === row.code` |
|          | inspectionSpecialtyObjectTable | `inspectionSpecialtyCode === row.code` |
| object   | inspectionObjectParameterTable | `inspectionObjectCode` |
|          | inspectionObjectStandardTable | `inspectionObjectCode` |
|          | inspectionSpecialtyObjectTable | `inspectionObjectCode` |
| parameter| inspectionObjectParameterTable | `inspectionParameterCode` |
|          | inspectionStandardParameterTable | `inspectionParameterCode` |
| standard | inspectionObjectStandardTable | `inspectionStandardCode` |
|          | inspectionStandardParameterTable | `inspectionStandardCode` |

`references` 计数 = 命中关联行总数（多表求和）。

### 4.4 UI 改动

**`InspectionCapabilityPage.tsx`**
- 表格新增「操作」列（表头 + 每行一个单元格）。
- 每行两个按钮：「编辑」（`text-xs`，蓝）、「删除」（`text-xs`，红）。删除按钮在官方行 `disabled`。
- 新增 state：`editing: Row | null`、`deleting: Row | null`。
- 编辑按钮 → `setEditing(row)`；保存回调 → `load()()`。
- 删除按钮 → `setDeleting(row)`；渲染 `<ConfirmModal>` 确认后 `DELETE`，成功 `load()`，失败展示 message（含被引用数）。
- `data-fn` 挂载：编辑按钮复用 `FN_EDIT[key]`（= I02），删除按钮挂 `FN_DELETE[key]`（= I03）。

**`InspectionCapabilityFormModal.tsx`**
- 新增可选 prop `editing?: { id: string; [k: string]: unknown } | null`。
- `editing` 有值：标题「编辑{资源名}」、字段预填 `editing` 的值、提交走 `PUT PATH/:id`、成功 200/204 视为成功。
- `editing` 无值：维持现有「新建」行为（POST）。
- `useEffect` 依赖加 `editing`：open 时若有 `editing` 则用其值初始化 `values`。

**`ConfirmModal`**：复用现有 `src/components/ConfirmModal.tsx`，删除确认文案「确定删除 {code} {name}？官方数据与被引用数据不可删除。」

### 4.5 测试

复用 `tests/fn.ts` 的 `fnTest([...fnIds], name, fn)` 模式。

**`tests/msw/inspectionCapabilityCrudHandlers.test.ts`**（扩展）：
- 各资源 PUT：成功 200 + 字段更新 + `code` 不可变（传新 code 被忽略）
- 各资源 PUT 404（不存在 id）
- objects PUT 改 `inspectionSpecialtyCode` 到不存在专项 → 400
- 各资源 DELETE：自定义且未引用 → 204
- 各资源 DELETE 官方行 → 400
- 各资源 DELETE 被引用 → 400 + `references` 计数正确（fixture 用 SP01/OBJ-SP01-P1/IP-CEM003/GB 175-2023 等官方行，先 POST 一条自定义行 + 一条关联来制造引用）

**`tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx`**（扩展）：
- 列表行出现「编辑」「删除」按钮
- 点编辑 → modal 打开、字段预填、提交 PUT、列表刷新
- 点删除 → ConfirmModal 打开、确认 → DELETE、列表刷新
- 删除被引用 → 列表展示错误 message

### 4.6 功能清单

`docs/functions/function-tree.md` 中以下 8 个子项 `规划 → 已上线`（同 commit）：
- M06.F01.I02、M06.F01.I03
- M06.F02.I02、M06.F02.I03
- M06.F03.I02、M06.F03.I03
- M06.F04.I02、M06.F04.I03

## 5. 受影响文件

| 文件 | 改动 |
|---|---|
| `msw/handlers.ts` | 新增 4×PUT、3×DELETE（specialties 补 PUT + 引用检查）、specialties DELETE 补引用检查 |
| `src/features/inspection-capability/InspectionCapabilityPage.tsx` | 加操作列、编辑/删除 state、ConfirmModal |
| `src/features/inspection-capability/InspectionCapabilityFormModal.tsx` | 加 `editing` prop，支持 PUT |
| `tests/msw/inspectionCapabilityCrudHandlers.test.ts` | PUT/DELETE 用例 |
| `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx` | 编辑/删除 UI 用例 |
| `docs/functions/function-tree.md` | 8 子项状态推进 |
| `.state/trace.json` | 由 trace_cmd 重新挂接测试 → 功能 ID（手写禁止） |

## 6. 验证

- `python scripts/gate.py -p lab-management-system`（在 suite 根目录）exit 0。
- L5 告警（已上线缺设计映射）按决策 4.1 接受，不阻断。
