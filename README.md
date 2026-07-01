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
- 测试：Vitest 2 + React Testing Library + jsdom
- mock：MSW 2（拦截所有 HTTP，无真实后端）
- Node 20 LTS，npm

## 运行

```bash
npm install      # 安装依赖
npm test         # 全量测试（无 Key/无 Docker/无网可跑）
npm run dev      # 本地开发（http://localhost:5173）
npm run build    # 生产构建（tsc -b + vite build）
npm run preview  # 预览构建产物
```

### Mock 用户（仅 mock 层，非真实凭证）

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| `labadmin` | `lab123` | admin | 全部权限（含 user:delete） |
| `technician` | `tech123` | technician | project:read / sample:* / report:* |

## mock-friendly 验收

- `npm install && npm test` 在无 Key、无 Docker、无网下全绿。
- 所有后端 API（`/auth/login`、`/auth/me`）由 MSW handler 拦截。
- JWT 在 mock 层签发/校验（`msw/jwt.ts`，密钥写死，非生产凭证，无密码学安全保证）。
- 测试环境 `VITE_OFFLINE=1` 强制离线。

## 章节映射

> 书稿每个代码块可据此定位到本仓真实文件。ch36-38 待后续实现。

| 章 | 主题 | 对应模块 / 源文件 |
|----|------|------------------|
| 第34章 | 架构与路由 | `src/types/api.ts`、`src/types/store.ts`、`src/app/router.tsx`、`src/app/layouts/Layout.tsx`、`src/pages/` |
| 第35章 | JWT 认证 + RBAC | `src/api/client.ts`、`src/features/auth/authStore.ts`、`src/features/auth/Login.tsx`、`src/app/guards/ProtectedRoute.tsx`、`src/features/auth/usePermission.ts`、`src/features/auth/hasPermission.tsx`、`msw/handlers.ts`、`msw/jwt.ts` |
| 第36章 | （待后续实现）项目/样品业务模块 | — |
| 第37章 | （待后续实现）检测流程与报告 | — |
| 第38章 | （待后续实现）测试策略与部署 | — |

## 目录结构

```
src/
├── types/            # 业务实体类型（api.ts / store.ts）
├── app/              # 应用骨架（router.tsx / layouts/ / guards/）
├── pages/            # 路由页面（Dashboard/Projects/Samples/Flow/Forbidden）
├── api/              # HTTP 客户端封装（client.ts）
├── features/
│   └── auth/         # 认证特性（authStore / Login / usePermission / hasPermission）
├── main.tsx          # 应用入口
└── App.tsx           # RouterProvider
msw/
├── handlers.ts       # MSW handler 注册表
├── jwt.ts            # mock JWT 签发/校验
└── server.ts         # Node 端 MSW server
tests/                # 与 src/ 一一对应的测试
```

## 版本

- 当前状态：**building**（ch34-35 已完成，ch36-38 待后续实现，未打 tag）
- 技术栈：见 `package.json`（与书稿 `version-lock.json` 一致）
- 仓内开发约定：见 `CLAUDE.md`
