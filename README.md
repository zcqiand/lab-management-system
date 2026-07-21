# 建筑工程实验室管理系统

[《React从入门到项目实践》](https://www.amazon.com/dp/B0H5DGZM5B) 案例一：建筑工程实验室管理系统配套可运行工程。

## 快速开始

```bash
npm install
npm test        # 全量测试（无 Key/无 Docker/无网可跑）
npm run dev     # 本地开发
npm run build   # 生产构建
```

## 发布与部署

推送版本 tag（推荐格式：`v<MAJOR>.<MINOR>-<NNN>`）会触发 GitHub Actions：

1. 执行测试、覆盖率和生产构建；
2. 将 Docker 镜像推送到 Docker Hub 的 `lab-management-system` 仓库（`latest` 与版本 tag）；
3. 通过 SSH 连接 VPS，拉取指定版本并重启容器。

首次配置 VPS：

```bash
sudo sh deploy/setup-vps.sh lab.example.com
```

部署链需要在 GitHub 仓库的 Actions secrets 中配置 `DOCKER_USERNAME`、`DOCKER_PASSWORD`、`VPS_HOST`、`VPS_USER` 和 `VPS_SSH_KEY`。证书与 SSH 私钥只保留在 VPS 或 GitHub Secrets，不提交到仓库。容器只监听 VPS 本机的 `127.0.0.1:8062`，由 nginx vhost 负责 HTTPS 终结与反向代理。由于 Docker 组成员拥有宿主机级权限，VPS 应使用专用的受限部署账号，不要与其他敏感服务共用。

### Mock 用户

| 用户名 | 密码 | 角色 | 权限 |
| :--- | :--- | :--- | :--- |
| `labadmin` | `lab123` | admin | 全部权限（含 user:delete） |
| `technician` | `tech123` | technician | project:read / sample:* / report:* |

## 功能特性

- **JWT 认证 + RBAC**：MSW mock 层签发 JWT，双角色（admin/technician）权限管控
- **接样管理**：接样单 CRUD，含报告类别关联与流程状态追踪
- **样品管理**：归属接样单，四码表（型号/规格/等级/牌号）组合框 + 报告类别驱动扩展属性
- **检测项与自动评定**：按技术要求码表自动评定合格/不合格，支持人工改判
- **报告文档**：HTML 模板维护 + 预览 + Word 下载，覆盖审核/批准/发放/归档四阶段
- **流程引擎**：接样→任务安排→数据录入→报告审核→批准→发放→归档，支持批量提交/退回/撤回
- **统计汇总**：按报告类别输出试验报告汇总表，支持工程过滤
- **基础数据管理**：机构信息/角色/用户/报告类别/参数/标准/技术要求/四码表/报告模板

## 技术栈

| 技术 | 版本 |
| :--- | :--- |
| React | 19 |
| TypeScript | 5.6 |
| Vite | 6 |
| Tailwind CSS | 4 |
| React Router | 7 |
| Zustand | 5 |
| Vitest | 2 |
| MSW | 2 |
| Node | 20 LTS |

> 依赖版本与 `version-lock.json` 的 `version_lock` 一致，不引入 lock 外的库。

## 配套书籍及章节映射

购买电子书籍：[《React从入门到项目实践》](https://www.amazon.com/dp/B0H5DGZM5B) 

| 章 | 主题 | 对应源文件 |
| :--- | :--- | :--- |
| ch34 | 架构与路由 | `src/types/api.ts`、`src/app/router.tsx`、`src/app/layouts/Layout.tsx` |
| ch35 | JWT 认证 + RBAC | `src/features/auth/authStore.ts`、`src/features/auth/Login.tsx`、`src/app/guards/ProtectedRoute.tsx`、`msw/handlers.ts`、`msw/jwt.ts` |
| ch36 | 数据管理与业务模块 | `src/features/receipts/`、`src/features/samples/`、`src/features/codes/`、`src/features/categories/`、`msw/db.ts` |
| ch37 | 流程引擎与状态机 | `src/features/flow-pipeline/FlowStagePage.tsx`、`src/features/receipts/receiptStore.ts`、`tests/msw/flowPipelineHandlers.test.ts` |
| ch38 | 测试体系与部署 | `tests/`、`vitest.config.ts`、`Dockerfile`、`nginx.conf`、`.github/workflows/ci.yml` |

## 快速链接

- [功能规格文档.md](功能规格文档.md) — 功能名称、描述与验收标准
- [CLAUDE.md](CLAUDE.md) — 开发约定与编码规范
