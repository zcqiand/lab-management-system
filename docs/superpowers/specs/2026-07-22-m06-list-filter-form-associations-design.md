# 设计：M06 检测能力 列表级联过滤 + 表单字段补足 + 编辑关联页签

> 日期：2026-07-22
> 范围：lab-management-system（react-ts）
> 关联需求：[REQ-2026-003](../../requirements/REQ-2026-003-检测能力模块与真实标准数据.md)
> 关联功能：M06.F01-04.I01/I02、M06.F02.I04/I05/I06/I07

## 1. 目标

把 M06 检测能力的列表与编辑体验补全，三件事一起做：

- **① 列表级联过滤**：检测标准、检测参数列表支持按父链过滤 + 关键字。
- **② 表单字段补足**：4 资源编辑弹窗字段对齐各自类型定义。
- **③ 编辑弹窗关联页签**：在编辑弹窗内以页签管理各资源间的关联（增/删关联）。

检测项目的专项过滤已上线（前序 commit），本轮不重复。

## 2. 现状（缺口）

| 资源 | 列表过滤现状 | 表单字段现状 | 编辑关联 |
|---|---|---|---|
| 检测专项 | keyword | code/officialNo/name | 无 |
| 检测项目 | 专项 + keyword ✅ | code/specialtyCode/sourceProjectNo/sourceProjectName/name | 无 |
| 检测标准 | keyword(code/name) | code/name/version | 无 |
| 检测参数 | keyword(code/name/canonicalName) | code/name/canonicalName/unit | 无 |

关联表 handler 现状：4 张关联表都有 GET（按父码过滤）+ POST，**全部没有 DELETE**。

类型完整字段（表单要对齐的目标）：
- 专项：code, officialNo, name, isOfficial, enabled
- 项目：code, inspectionSpecialtyCode, sourceProjectNo, sourceProjectName, name, isOptionalForQualification, isOfficial, enabled
- 参数：code, name, rawName, canonicalName, methodText, aliases[], unit, sourceType('official'|'custom')
- 标准：code, name, version, status('active'|'superseded'|'draft'), sourceDocumentId

PUT handler 白名单现状：专项/项目/参数三者的 PUT 白名单已覆盖全部类型字段（前序任务所做）；**标准 PUT 白名单是 `['name','version','status']`，缺 `sourceDocumentId`**，需补。

## 3. 决策（已与人确认）

| 议题 | 决策 |
|---|---|
| 官方行字段是否只读 | **否**——沿用首轮决策"所有字段都可编辑、都可缺省"。功能清单里"官方来源字段只读"的字样被人决议覆盖。 |
| 多过滤条件组合 | AND 交集 |
| 级联下拉 | 父变 → 清子选中值 + 重拉子选项；子不反向影响父 |
| 关联删除路由 | **按复合查询参数删**（如 `DELETE /inspection-object-standards?inspectionObjectCode=&inspectionStandardCode=&role=`），避开标准编码含 `/` 导致的 `:id` 路由分裂问题 |
| 关联页签仅编辑态 | 是——新建（POST）时父尚不存在，不能关联；只有编辑（PUT）态出现页签 |
| 功能清单推进 | ③ 落地后 M06.F02.I04/I05/I06/I07 → 已上线（I07 现为开发中），随实现同 commit、经人认可 |

## 4. ① 列表级联过滤

### 4.1 后端

**`MockTable.query` 增 `match` 谓词**（分页前过滤，类型安全、不侵入现有 filters/keyword）：

```ts
query(opts: { ...现有..., match?: (row: T) => boolean }): { items, total, page, pageSize }
// 实现内：if (opts.match) filtered = filtered.filter(opts.match)
```

**`GET /inspection-standards`** 增参 `inspectionSpecialtyCode`、`inspectionObjectCode`：
- 解析允许的标准码集合：
  - 给 `inspectionObjectCode` → `inspectionObjectStandardTable.all()` 中 `inspectionObjectCode === X` 的 `inspectionStandardCode` 去重。
  - 只给 `inspectionSpecialtyCode` → 先取该专项的项目码集合，再取关联这些项目的标准码。
- 传 `match = (r) => allowedSet.has(r.code)`，叠加原 keyword。

**`GET /inspection-parameters`** 增参 `inspectionSpecialtyCode`、`inspectionObjectCode`、`inspectionStandardCode`：
- 项目维度（`inspectionObjectCode` 或 `inspectionSpecialtyCode`）→ 经 `inspectionObjectParameterTable` 解析参数码集合（专项先降级到项目码集合）。
- 标准维度（`inspectionStandardCode`）→ 经 `inspectionStandardParameterTable` 解析参数码集合。
- **多条件交集**：每个条件各自解出一个集合，取所有集合的交集；无条件则不过滤。传 `match`。

### 4.2 前端（InspectionCapabilityPage）

资源感知过滤栏（级联下拉）：
- 检测标准：专项下拉 → 项目下拉（按选中专项过滤，复用 `GET /inspection-objects?inspectionSpecialtyCode=`）。
- 检测参数：专项下拉 → 项目下拉 → 标准下拉（按选中项目过滤，复用 `GET /inspection-standards?inspectionObjectCode=`）。
- 行为：父下拉 onChange → 清子选中值 → 触发子选项重拉 → 触发主列表重查（带新参数组合）。
- 状态：`specialtyFilter`（已有）、新增 `objectFilter`、`standardFilter`。
- 主列表 `load()` 按资源拼对应参数（标准：specialty/object；参数：specialty/object/standard）。

## 5. ② 表单字段补足

### 5.1 后端

- 标准 PUT 白名单加 `sourceDocumentId`：`['name','version','status','sourceDocumentId']`。
- 其余 3 资源 PUT 白名单无需改（已齐全）。

### 5.2 前端（InspectionCapabilityFormModal）

`FIELDS` 配置扩展，引入字段类型：

```ts
type FieldType = 'text' | 'select' | 'checkbox' | 'aliases'
interface Field { name: string; label: string; type: FieldType; options?: string[]; required?: boolean; placeholder?: string }
```

各资源补足字段：
- 专项：+ `enabled`(checkbox)、`isOfficial`(checkbox)。
- 项目：+ `isOptionalForQualification`(checkbox)、`isOfficial`(checkbox)、`enabled`(checkbox)。
- 参数：+ `rawName`(text)、`methodText`(text)、`sourceType`(select: official/custom)、`aliases`(aliases：逗号分隔 ↔ string[])。
- 标准：+ `status`(select: active/superseded/draft)、`sourceDocumentId`(text)。

提交时：checkbox → boolean；aliases → 字符串按逗号切分去空；select → 字符串。POST/PUT 复用现有 payload 构造（POST 端的默认值逻辑保留）。

## 6. ③ 编辑弹窗关联页签

### 6.1 后端：关联表 DELETE（复合查询参数）

新增 4 个 DELETE handler：

| 端点 | 复合键 | 返回 |
|---|---|---|
| `DELETE /inspection-specialty-objects` | inspectionSpecialtyCode + inspectionObjectCode | 命中删 → 204；未命中 → 404 |
| `DELETE /inspection-object-standards` | inspectionObjectCode + inspectionStandardCode + role | 同上 |
| `DELETE /inspection-object-parameters` | inspectionObjectCode + inspectionParameterCode | 同上 |
| `DELETE /inspection-standard-parameters` | inspectionStandardCode + inspectionParameterCode | 同上 |

- 按 query 参数定位行（与现有 GET 的过滤参数一致），找到唯一行删除。
- role 必填且仅 TESTING/JUDGMENT（沿用 POST 校验）。
- 不存在 → 404 `{ message }`。

POST/GET 已就绪，无需改。

### 6.2 前端：页签 + 关联管理组件

**弹窗改 tab 布局**（仅编辑态；新建态保持单栏表单）：
- 专项编辑：`基本信息` | `关联检测项目`
- 项目编辑：`基本信息` | `关联检测标准` | `关联检测参数`
- 标准编辑：`基本信息` | `关联检测参数`
- 参数编辑：`基本信息`（无关联页签）

**抽取可复用 `<AssociationManager>` 组件**（避免弹窗膨胀、DRY）：

```ts
interface AssociationManagerProps {
  parent: { kind: 'specialty'|'object'|'standard'; code: string }
  association: {
    endpoint: string                     // 如 '/inspection-object-standards'
    parentParam: string                  // 如 'inspectionObjectCode'
    targetResource: ResourceKey          // 目标下拉的数据源
    targetParam: string                  // 如 'inspectionStandardCode'
    extraFields?: Field[]                // role / qualificationLevel+sortOrder / clause+methodName+unit
  }
}
```

- 挂载时 GET `endpoint?{parentParam}={code}` → 展示当前关联列表（目标名 + 额外字段）。
- 添加：选目标（下拉，选项来自 `GET /inspection-{targetResource}`）+ 填额外字段 → POST。
- 移除：每行"移除"按钮 → DELETE（带复合键）。
- 操作后刷新本页签列表。

**`data-fn` 锚点**：关联页签挂 `M06.F02.I04/I05/I06/I07`（对应关联类型）。

## 7. 受影响文件

| 文件 | 改动 |
|---|---|
| `msw/db.ts` | `MockTable.query` 增 `match` 谓词 |
| `msw/handlers.ts` | standards/parameters GET 增级联过滤参数；标准 PUT 白名单 +sourceDocumentId；4 关联表 DELETE |
| `src/features/inspection-capability/InspectionCapabilityPage.tsx` | 级联下拉（object/standard filter） |
| `src/features/inspection-capability/InspectionCapabilityFormModal.tsx` | 字段类型化 + 补字段 + tab 布局 |
| `src/features/inspection-capability/AssociationManager.tsx` | 新建：可复用关联管理组件 |
| `tests/msw/inspectionCapabilityCrudHandlers.test.ts` | 级联过滤 + 关联 DELETE 用例 |
| `tests/features/inspection-capability/inspectionCapabilityCrud.test.tsx` | 级联下拉 + 表单字段 + 关联页签用例 |
| `docs/functions/function-tree.md` | M06.F02.I04/I05/I06/I07 → 已上线 |

## 8. 测试策略（TDD，red-first）

- ① 后端：standards 按项目/专项过滤命中正确集合；parameters 按项目/专项/标准过滤 + 多条件交集；空命中返回空。
- ① 前端：级联下拉出现、父变清子、选中后请求带正确参数组合。
- ② 标准 PUT 接受 sourceDocumentId；表单字段渲染与提交（checkbox/aliases 转换）。
- ③ 后端：4 关联 DELETE 命中 204 / 未命中 404 / role 校验。
- ③ 前端：编辑态出现页签；页签内列表/添加/移除闭环。

## 9. 实施顺序建议（供 writing-plans 拆任务）

1. ① 后端（match + standards/parameters 过滤）+ 测试
2. ① 前端（级联下拉）+ 测试
3. ② 标准 PUT +sourceDocumentId + 表单字段 + 测试
4. ③ 后端（4 关联 DELETE）+ 测试
5. ③ 前端（AssociationManager + tab 布局）+ 测试
6. 功能清单 I04/I05/I06/I07 → 已上线 + gate

## 10. 不在本轮范围

- A区 数据扩充（9 专项/93 项目的参数/规则/要求/标准内容批量灌数据）。
- M06.F05 计算规则、M06.F06 技术要求资源搭建（无表/handler/页面）。
- 新建态的关联（设计上不做）。
