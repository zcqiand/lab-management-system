# lab-management-system — 仓库工作约定（供 Claude Code）

本仓为《React从入门到项目实践》案例一（建筑工程实验室管理系统）的可运行配套工程，是书稿代码块的 **source of truth**。

## 项目定位

建筑工程实验室管理系统的 React 可运行案例仓，配套 ch34-38，MSW mock 全覆盖，无 Key/Docker/网络依赖。

## 铁律

- **TDD**：每个模块先写失败测试 → 跑确认失败 → 实现 → 跑确认绿 → commit。
- **版本钉死**：依赖与 `version-lock.json` 的 `version_lock` 一致；不引入 lock 外的库。
- **tag 即放行**：全量回归绿后打 `v<MAJOR>.<MINOR>-<NNN>`（NNN=项目号）。
- **只增不改**：扩充时不动现有模块签名/行为；新模块独立测试，CI 双跑（旧测试 + 新测试都绿）。
- **mock-friendly**：`npm install && npm test` 必须在无 Key、无 Docker、无网下全绿。

## 技术栈与版本（钉死于 version-lock.json）

- React 19.x
- TypeScript 5.x
- Vite 6.x
- React Router 7.x
- Zustand 5.x
- Tailwind CSS 4.x
- Vitest 2.x
- MSW 2.x
- Node 20 LTS，npm

## 验收

```bash
npm install      # 离线可用（首次需联网，之后 node_modules 已就绪）
npm test         # 必须全绿，无需 Key/Docker/网络
npm run build    # tsc -b && vite build，无错
```

## 目录结构

```text
src/
├── types/            # 业务实体类型（api.ts / store.ts）
├── app/              # 应用骨架（router.tsx / layouts/ / guards/）
├── pages/            # 路由页面
├── api/              # HTTP 客户端封装
├── features/         # 按业务特性组织（auth/ / receipts/ / samples/ / codes/ / categories/ / dicts/ / reports/ / flow-pipeline/ / data-entry/ / task-assignment/ / summary/ / templates/）
└── main.tsx / App.tsx
msw/
├── handlers.ts       # MSW handler 注册表（只增不改）
├── jwt.ts            # mock JWT 签发/校验
├── db.ts             # mock 内存数据库
└── server.ts         # Node 端 server 实例
tests/
├── setup.ts          # vitest 全局 setup（jest-dom + MSW lifecycle + resetMockDb）
└── *.test.ts(x)      # 与 src/ 一一对应的测试
Dockerfile            # 多阶段构建（node build → nginx serve）
nginx.conf            # SPA try_files fallback
```

## 编码约定

- 所有业务类型放在 `src/types/`
- 所有 HTTP 客户端封装在 `src/api/`
- 特性按 `src/features/` 组织，各子目录含同一特性下的 store/组件/page
- MSW handler 只增不改，注册表在 `msw/handlers.ts`
- JWT 在 mock 层签发/校验，非生产凭证
