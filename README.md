# lab-management-system

《React从入门到项目实践》案例一：**建筑工程实验室管理系统**配套可运行工程。`git clone` 后即可跑：

```bash
npm install
npm test
```

默认 MSW mock 后端 + 前端模拟 JWT，无需任何 Key/Docker/网络。真实后端部署见 `.env.example`（可选）。

## 技术栈（钉死于项目 `version-lock.json`）

- React 19 + TypeScript 5.6
- Vite 6 + Tailwind CSS 4
- React Router 7
- 状态管理：Zustand 5（persist）
- 测试：Vitest 2 + React Testing Library + jsdom + @vitest/coverage-v8
- mock：MSW 2（拦截所有 HTTP，无真实后端）
- Node 20 LTS，npm

## 运行

```bash
npm install              # 安装依赖
npm test                 # 全量测试（无 Key/无 Docker/无网可跑）
npm run test:coverage    # 测试 + 覆盖率报告（coverage/ 目录）
npm run dev              # 本地开发（http://localhost:5173）
npm run build            # 生产构建（tsc -b + vite build）
npm run preview          # 预览构建产物
```

### Mock 用户（仅 mock 层，非真实凭证）

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| `labadmin` | `lab123` | admin | 全部权限（含 user:delete） |
| `technician` | `tech123` | technician | project:read / sample:* / report:* |

## mock-friendly 验收

- `npm install && npm test` 在无 Key、无 Docker、无网下全绿。
- 所有后端 API（`/auth/*`、`/projects/*`、`/samples/*`、`/flow/*`）由 MSW handler 拦截。
- JWT 在 mock 层签发/校验（`msw/jwt.ts`，密钥写死，非生产凭证，无密码学安全保证）。
- 测试环境 `VITE_OFFLINE=1` 强制离线。

## 测试策略与覆盖率

### 测试分层

| 层级 | 目录 | 说明 |
|------|------|------|
| 单元测试 | `tests/types/`、`tests/msw/`、`tests/hooks/`、`tests/features/*/` | 类型契约、MSW handler、hook、store/reducer/组件隔离测试 |
| 集成测试 | `tests/integration/` | App 全链路登录、CRUD 全流程、FlowPanel 状态流转端到端 |
| 守卫测试 | `tests/app/guards/` | ProtectedRoute 三态（未登录/已登录/角色不匹配） |

### 覆盖率

```bash
npm run test:coverage
```

阈值（`vitest.config.ts`）：
- Lines / Statements / Functions: 80%
- Branches: 75%

当前覆盖率（v8 provider）：
- Lines: 97.81%
- Functions: 95.45%
- Branches: 90.05%
- Statements: 97.81%

## 构建与部署

### 本地构建

```bash
npm run build       # tsc -b + vite build，产物在 dist/
npm run preview     # 本地预览生产包
```

### Docker 部署

```bash
docker build -t lab-management-system .
docker run -p 8080:80 lab-management-system
# 访问 http://localhost:8080
```

- 多阶段构建：Stage 1 `node:20-alpine` 构建，Stage 2 `nginx:alpine` 托管
- `nginx.conf` 配置 SPA `try_files $uri $uri/ /index.html` fallback
- 静态资源（`/assets/`）永久缓存，`index.html` 不缓存

### CI（GitHub Actions）

- `.github/workflows/ci.yml`：
  - `test` job：`npm ci` → `npm test` → `npm run test:coverage` → `npm run build`
  - `docker-build` job：构建 Docker 镜像验证部署配置（依赖 test 通过）

## 章节映射

> 书稿每个代码块可据此定位到本仓真实文件。ch34-38 + extend 批1 完成。

| 章 | 主题 | 对应模块 / 源文件 |
|----|------|------------------|
| 第34章 | 架构与路由 | `src/types/api.ts`、`src/types/store.ts`、`src/app/router.tsx`、`src/app/layouts/Layout.tsx`、`src/pages/` |
| 第35章 | JWT 认证 + RBAC | `src/api/client.ts`、`src/features/auth/authStore.ts`、`src/features/auth/Login.tsx`、`src/app/guards/ProtectedRoute.tsx`、`src/features/auth/usePermission.ts`、`src/features/auth/hasPermission.tsx`、`msw/handlers.ts`、`msw/jwt.ts` |
| 第36章 | 数据管理与业务模块 | `src/features/projects/projectStore.ts`、`src/features/projects/ProjectList.tsx`、`src/features/projects/ProjectFormModal.tsx`、`src/features/samples/sampleStore.ts`、`src/features/samples/SampleList.tsx`、`src/features/samples/SampleFormModal.tsx`、`src/components/ConfirmModal.tsx`、`src/hooks/useFetch.ts`、`msw/db.ts` |
| 第37章 | 流程引擎与状态机 | `src/features/flow/types.ts`、`src/features/flow/transitions.ts`、`src/features/flow/flowReducer.ts`、`src/features/flow/flowStore.ts`、`src/features/flow/FlowPanel.tsx` |
| 第38章 | 测试体系与部署 | `tests/integration/authFlow.test.tsx`、`tests/integration/crudFlow.test.tsx`、`tests/integration/flowTransition.test.tsx`、`vitest.config.ts`（coverage）、`Dockerfile`、`nginx.conf`、`.github/workflows/ci.yml` |
| extend 批1 | 报告管理 + 用户/角色管理（RBAC 落地） | `src/features/reports/reportStore.ts`、`src/features/reports/ReportList.tsx`、`src/features/reports/ReportFormModal.tsx`、`src/features/users/userStore.ts`、`src/features/users/UserList.tsx`、`src/features/users/UserFormModal.tsx`、`src/features/roles/roleStore.ts`、`src/features/roles/RoleList.tsx`、`src/features/roles/RoleFormModal.tsx`、`src/pages/{Reports,Users,Roles}.tsx` |

## 目录结构

```
src/
├── types/            # 业务实体类型（api.ts / store.ts）
├── app/              # 应用骨架（router.tsx / layouts/ / guards/）
├── pages/            # 路由页面（Dashboard/Projects/Samples/Flow/Reports/Users/Roles/Forbidden）
├── api/              # HTTP 客户端封装（client.ts）
├── components/       # 通用组件（ConfirmModal）
├── hooks/            # 通用 hook（useFetch）
├── features/
│   ├── auth/         # 认证特性（authStore / Login / usePermission / hasPermission）
│   ├── projects/     # 项目业务（projectStore / ProjectList / ProjectFormModal）
│   ├── samples/      # 样品业务（sampleStore / SampleList / SampleFormModal）
│   ├── flow/         # 流程引擎（types / transitions / flowReducer / flowStore / FlowPanel）
│   ├── reports/      # 报告管理（reportStore / ReportList / ReportFormModal）[extend 批1]
│   ├── users/        # 用户管理（userStore / UserList / UserFormModal）[extend 批1]
│   └── roles/        # 角色管理（roleStore / RoleList / RoleFormModal）[extend 批1]
├── main.tsx          # 应用入口
└── App.tsx           # RouterProvider
msw/
├── handlers.ts       # MSW handler 注册表（auth/projects/samples/flow/reports/users/roles）
├── jwt.ts            # mock JWT 签发/校验
├── db.ts             # mock 内存表（MockTable + flowStore Map + reportTable + userTable + roleTable）
└── server.ts         # Node 端 MSW server
tests/
├── setup.ts          # vitest 全局 setup（jest-dom + MSW lifecycle + resetMockDb + Request patch）
├── integration/      # 端到端集成测试（authFlow / crudFlow / flowTransition）
└── *.test.ts(x)      # 与 src/ 一一对应的单元/组件测试
Dockerfile            # 多阶段构建（node build → nginx serve）
nginx.conf            # SPA try_files fallback
```

## 版本

- 当前状态：**building**（ch34-38 + extend 批1 已完成，批2 待实现，未打新 tag）
- 技术栈：见 `package.json`（与书稿 `version-lock.json` 一致）
- 仓内开发约定：见 `CLAUDE.md`


---

## v2.0 单一流程线重构（最新）

业务全流程收敛为**一条流程线**（合并版）：

```
接样管理 → 任务安排 → 数据录入 → 报告审核 → 报告批准 → 报告发放 → 报告归档
```

- **前进 = 提交**（支持批量提交）；**后退 = 退回 + 撤回**（均支持批量；撤回=提交人主动收回，仅当提交后未被下一环节处理时可撤回）。
- **接样表与报告表合并为一张表**（`msw/db.ts` 的 `receiptTable`），报告字段（`reportCode/conclusion/result/issuedAt` 等）与流程字段（`flowStatus/flowHistory/lastSubmittedBy`）都在接样单上；`/reports`、`/test-record-sheets`、`/tasks` 端点已移除。
- **报告编制环节已删除**：报告随数据录入自然产生（录入检测项后自动生成报告编号与结论）。
- **数据录入自动评定**：录入检测值后按「技术要求」码表自动评定合格/不合格（`POST /test-items`）；无法自动判定的（非数值指标）提示人工判定；均可手工改判（`PUT /test-items/:id` 显式传 `passed`）。
- 核心实现：
  - 通用阶段页面 `src/features/flow-pipeline/FlowStagePage.tsx`（列表 + 批量提交/退回 + 「我提交的（可撤回）」区块）
  - 流程状态机 `applyFlowAction` 与自动评定 `evaluateTestResult`、结论同步 `syncReceiptResult`（`msw/db.ts`）
  - 批量流程端点 `POST /api/receipts/flow`（`{action: 'submit'|'return'|'withdraw', ids: string[], operator}`）
  - 测试：`tests/msw/flowPipelineHandlers.test.ts`

> 注：上文各章节记录为历史开发轨迹，其中涉及 `reports/tasks/test-record-sheets` 的文件与端点在 v2.0 中已移除或合并。

---

## v3 报告类别驱动重构（当前）

在 v2.0 单一流程线基础上，将原先写死的「材料种类」升级为**可维护的报告类别码表**，并以报告类别为中心贯穿样品扩展属性、四码表、检测标准、报告模板与统计汇总。**v2.0 中残留的兼容层（`MaterialType`、`materialType`、`sampleGrade`、`applicableMaterials`、`/projects` alias 等）已全部删除。**

### 领域模型

```
合同 Contract
  └─ 接样单 SampleReceipt（含 categoryCode 报告类别、合并的报告字段、流程状态）
       └─ 样品 Sample（归属 receiptId；型号/规格/等级/牌号 + 按报告类别的扩展属性 ext）
            └─ 单项检测记录 TestItem（归属 sampleId；自动评定 + 手工修正）
```

- **样品归属接样单**（`receiptId`），不再归属合同、不再带 `reportType`；合同经接样单间接得到。
- **检测项归属样品**（`sampleId`）：数据录入时选样品 → 选参数 → 填检测值，系统按「报告类别 + 牌号/型号/等级/规格」匹配技术要求并自动评定。

### 报告类别（原「材料种类」，`/report-categories`）

一条报告类别（如 steel/cement/concrete/sand/gravel/rebar_mech/rebar_weld）决定：

1. **样品扩展属性 `extFields`**：新建样品时按此动态渲染输入项（如钢材的「炉号（批号）」、混凝土的「浇筑部位/浇筑时间」）。
2. **可选的型号/规格/等级/牌号**：四码表均归属报告类别，新建样品时按类别过滤为可输入可选择的组合框（`input + datalist`）。
3. **关联的检测标准**：经「报告类别标准」（`/category-standards`）维护多对多关联。
4. **报告模板**：每个报告类别对应一份模板（`/report-templates`），新建类别时自动生成默认模板。
5. **统计汇总口径 `summaryType`**：material（原材料）/ concrete（混凝土抗压）/ connection（连接接头）三种汇总表列定义。

编码 `code` 不可修改；已被接样单引用的报告类别不可删除。

### 四码表（型号/规格/等级/牌号，均归属报告类别）

| 码表 | 端点 | 示例（用户指定） |
|------|------|------|
| 型号 | `/models` | 热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊 |
| 规格 | `/specifications` | Φ22 / 150×150×150mm / 5-25mm（无尺寸的类别留空） |
| 等级 | `/grades` | 机械连接接头Ⅰ/Ⅱ/Ⅲ级、砂石Ⅰ/Ⅱ/Ⅲ类 |
| 牌号 | `/brands` | HRB400 等 |

样品的型号/规格/等级/牌号**可输入可选择**：选项来自对应码表（按类别过滤），也允许自由输入。

### 报告文档生成

- 每个报告类别一份可维护模板（HTML + `{{标签}}`），标签面板点击插入光标处（`src/features/templates/ReportTemplateList.tsx`）。
- 数据录入完成后「生成报告」：按模板合成机构信息/合同/接样单/样品表/检测结果表，可预览、打印、下载 Word（`.doc`）。渲染逻辑见 `src/features/report-doc/renderReport.ts`，特殊标签 `{{samplesTable}}`（含扩展属性列）/`{{testItemsTable}}`。
- 报告审核/批准/发放/归档四个阶段页均提供「查看报告」。

### 统计汇总（`/summary`）

按报告类别输出试验报告汇总表（对应线下的 钢材/水泥/砂/碎石/混凝土/机械连接/焊接连接 汇总表），行粒度为样品，只统计已生成报告编号的接样单，可按工程（合同）过滤。三种 `summaryType` 各有列定义（`buildSummary`，`msw/db.ts`）。

### 自动评定（`evaluateTestResult`）

技术要求（`/technical-requirements`）按「报告类别 + 牌号/型号/等级/规格」四维度匹配样品：技术要求上填写了的维度必须与样品一致才命中（维度冲突则排除），命中多条时按 牌号+4 / 型号+2 / 等级+2 / 规格+1 打分取最高。比较方式支持 ≥ / ≤ / = / range（区间）。无法匹配时 `autoPassed=null`（需人工判定），最终评定 `passed` 可手工改判。

### 基础管理菜单顺序

机构信息 → 角色管理 → 用户管理 → 报告类别 → 参数管理 → 标准管理 → 技术要求 → 报告类别标准 → 型号 → 规格 → 等级 → 牌号 → 报告模板。

### v3 关键源文件

| 主题 | 源文件 |
|------|--------|
| 报告类别 CRUD + 扩展属性编辑器 | `src/features/categories/ReportCategoryList.tsx` |
| 报告类别标准关联 | `src/features/categories/CategoryStandardList.tsx` |
| 四码表通用页 | `src/features/dicts/CategoryDictList.tsx` |
| 样品管理（组合框 + 扩展属性） | `src/features/samples/SampleManagerModal.tsx` |
| 数据录入（自动评定 + 生成报告） | `src/features/data-entry/DataEntryPage.tsx` |
| 报告模板维护 | `src/features/templates/ReportTemplateList.tsx` |
| 报告渲染 / 预览 | `src/features/report-doc/renderReport.ts`、`ReportPreviewModal.tsx` |
| 统计汇总 | `src/features/summary/SummaryPage.tsx` |
| mock 数据层（种子/评定/汇总） | `msw/db.ts`（`seedData` / `evaluateTestResult` / `buildSummary` / `computeStats`） |
| v3 端点 handler | `msw/handlers.ts` |
| v3 测试 | `tests/msw/v3Handlers.test.ts`、`tests/features/report-doc/renderReport.test.ts` |

> 注：上文 v2.0 及各章节记录为历史开发轨迹；v3 中「材料种类」升级为「报告类别」，样品改为归属接样单，检测项改为归属样品，所有兼容字段已移除。
