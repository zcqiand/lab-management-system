# lab-management-system — 仓库工作约定（供 Claude Code）

本仓是《React从入门到项目实践》案例一（建筑工程实验室管理系统，ch34-38）的可运行配套案例仓，是书稿代码块的 **source of truth**。

## 铁律

- **只增不改**：扩充时不动现有模块签名/行为；新模块独立测试，CI 双跑（旧测试 + 新测试都绿）。
- **mock-friendly**：`npm install && npm test` 必须在无 Key、无 Docker、无网下全绿。
  - 所有后端 API 走 MSW handler 拦截，无真实后端依赖。
  - JWT 在前端 mock 层签发/校验（密钥写死在 mock 层，非真实凭证）。
  - 测试环境 `VITE_OFFLINE=1` 强制离线。
- **TDD**：每个模块先写失败测试 → 跑确认失败 → 实现 → 跑确认绿 → commit。
- **版本钉死**：依赖与 `output/xr-know-001/version-lock.json` 的 `version_lock` 一致；不引入 lock 外的库。
- **tag 即放行**：全量回归绿后打 `v<MAJOR>.<MINOR>-<NNN>`（NNN=项目号，本书为 001）。ch38 完成前不打 tag。

## 技术栈（钉死于 version-lock.json）

- React 19.x、TypeScript 5.x、Vite 6.x、React Router 7.x
- 状态管理：Zustand 5.x
- 样式：Tailwind CSS 4.x（`@tailwindcss/vite` 插件，CSS `@import "tailwindcss"`）
- 测试：Vitest 2.x + React Testing Library + jsdom
- mock：MSW 2.x（Node 端 `msw/node`，拦截所有 HTTP）
- Node 20 LTS，包管理 npm

## 验收

```bash
npm install      # 离线可用（首次需联网，之后 node_modules 已就绪）
npm test         # 必须全绿，无需 Key/Docker/网络
npm run build    # tsc -b && vite build，无错
```

## 目录约定

```
src/
├── types/            # 业务实体类型（api.ts / store.ts）
├── app/              # 应用骨架（router.tsx / layouts/ / guards/）
├── pages/            # 路由页面（占位或简单页）
├── api/              # HTTP 客户端封装
├── features/         # 按业务特性组织（auth/、后续 projects/ 等）
└── main.tsx / App.tsx
msw/
├── handlers.ts       # MSW handler 注册表（只增不改）
└── server.ts         # Node 端 server 实例
tests/
├── setup.ts          # vitest 全局 setup（jest-dom + MSW lifecycle）
└── *.test.ts(x)      # 与 src/ 一一对应的测试
```

## 章节进度

- ch34（架构/路由/类型）：已完成
- ch35（JWT 认证 + RBAC）：已完成
- ch36（数据管理/业务模块）：已完成
- ch37（流程引擎/状态机）：已完成
- ch38（测试体系/部署）：已完成，已打 tag v1.0-001
- extend 批1（报告管理 + 用户/角色管理）：已完成
- extend 批2（检测任务 + Dashboard 统计 + 密码修改）：已被 v2.0 重构取代（检测任务表移除）
- v2.0（单一流程线重构）：已完成——接样→任务安排→数据录入→报告审核→报告批准→报告发放→报告归档；接样表与报告表合并；报告编制环节、检测记录单表、检测任务表删除；数据录入按技术要求自动评定并可手工改判；提交/退回/撤回均支持批量（POST /receipts/flow）
