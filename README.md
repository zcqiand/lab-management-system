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

> 书稿每个代码块可据此定位到本仓真实文件。ch34-38 全部完成。

| 章 | 主题 | 对应模块 / 源文件 |
|----|------|------------------|
| 第34章 | 架构与路由 | `src/types/api.ts`、`src/types/store.ts`、`src/app/router.tsx`、`src/app/layouts/Layout.tsx`、`src/pages/` |
| 第35章 | JWT 认证 + RBAC | `src/api/client.ts`、`src/features/auth/authStore.ts`、`src/features/auth/Login.tsx`、`src/app/guards/ProtectedRoute.tsx`、`src/features/auth/usePermission.ts`、`src/features/auth/hasPermission.tsx`、`msw/handlers.ts`、`msw/jwt.ts` |
| 第36章 | 数据管理与业务模块 | `src/features/projects/projectStore.ts`、`src/features/projects/ProjectList.tsx`、`src/features/projects/ProjectFormModal.tsx`、`src/features/samples/sampleStore.ts`、`src/features/samples/SampleList.tsx`、`src/features/samples/SampleFormModal.tsx`、`src/components/ConfirmModal.tsx`、`src/hooks/useFetch.ts`、`msw/db.ts` |
| 第37章 | 流程引擎与状态机 | `src/features/flow/types.ts`、`src/features/flow/transitions.ts`、`src/features/flow/flowReducer.ts`、`src/features/flow/flowStore.ts`、`src/features/flow/FlowPanel.tsx` |
| 第38章 | 测试体系与部署 | `tests/integration/authFlow.test.tsx`、`tests/integration/crudFlow.test.tsx`、`tests/integration/flowTransition.test.tsx`、`vitest.config.ts`（coverage）、`Dockerfile`、`nginx.conf`、`.github/workflows/ci.yml` |

## 目录结构

```
src/
├── types/            # 业务实体类型（api.ts / store.ts）
├── app/              # 应用骨架（router.tsx / layouts/ / guards/）
├── pages/            # 路由页面（Dashboard/Projects/Samples/Flow/Forbidden）
├── api/              # HTTP 客户端封装（client.ts）
├── components/       # 通用组件（ConfirmModal）
├── hooks/            # 通用 hook（useFetch）
├── features/
│   ├── auth/         # 认证特性（authStore / Login / usePermission / hasPermission）
│   ├── projects/     # 项目业务（projectStore / ProjectList / ProjectFormModal）
│   ├── samples/      # 样品业务（sampleStore / SampleList / SampleFormModal）
│   └── flow/         # 流程引擎（types / transitions / flowReducer / flowStore / FlowPanel）
├── main.tsx          # 应用入口
└── App.tsx           # RouterProvider
msw/
├── handlers.ts       # MSW handler 注册表（auth/projects/samples/flow）
├── jwt.ts            # mock JWT 签发/校验
├── db.ts             # mock 内存表（MockTable + flowStore Map）
└── server.ts         # Node 端 MSW server
tests/
├── setup.ts          # vitest 全局 setup（jest-dom + MSW lifecycle + resetMockDb）
├── integration/      # 端到端集成测试（authFlow / crudFlow / flowTransition）
└── *.test.ts(x)      # 与 src/ 一一对应的单元/组件测试
Dockerfile            # 多阶段构建（node build → nginx serve）
nginx.conf            # SPA try_files fallback
```

## 版本

- 当前状态：**tagged**（ch34-38 全部完成，tag `v1.0-001`）
- 技术栈：见 `package.json`（与书稿 `version-lock.json` 一致）
- 仓内开发约定：见 `CLAUDE.md`
