# 检测能力 tree-change 分批提案（修订稿）

> 新目标是独立一级模块 M06。真正可执行的提案只有 `.state/tree-change.json` 当前批次，且必须保持 `approved=false` 等待人类批准。

## 批次 A：新增 M06 检测能力（当前提案）

新增功能：

```text
M06 检测能力
├─ M06.F01 检测专项
│  ├─ I01 列表
│  ├─ I02 新建/编辑
│  └─ I03 删除保护
├─ M06.F02 检测项目（InspectionObject）
│  ├─ I01 列表
│  ├─ I02 新建/编辑
│  ├─ I03 删除保护
│  ├─ I04 关联检测依据
│  ├─ I05 关联判定依据
│  └─ I06 关联检测参数
├─ M06.F03 检测参数
│  ├─ I01 列表
│  ├─ I02 新建/编辑
│  └─ I03 删除保护
├─ M06.F04 检测标准
│  ├─ I01 列表
│  ├─ I02 新建/编辑
│  ├─ I03 删除保护
│  └─ I04 关联检测参数
├─ M06.F05 计算规则
│  ├─ I01 列表
│  ├─ I02 新建/编辑
│  └─ I03 删除
└─ M06.F06 技术要求
   ├─ I01 列表
   ├─ I02 新建/编辑
   └─ I03 删除
```

批准后的第一实现任务只创建 `src/types/inspection/` 下的一类一文件 types；不改页面、API、MSW 或 M04。

同步文件：

- `docs/functions/function-tree.md`
- `docs/design/design-function-map.md`
- `docs/design/flow-function-map.md`
- `docs/requirements/REQ-2026-003-检测能力模块与真实标准数据.md`
- `docs/requirements/REQ-2026-004-检测能力业务流程迁移.md`
- `docs/adr/ADR-0002-独立检测能力模块与项目上下文.md`

## 批次 B：M06 数据、API 与 UI

目标：完成专项、项目、参数、标准和三张多对多关系表，并接入 CSV/JSON。

校验重点：

- InspectionObjectStandard 的 role 为 TESTING/JUDGMENT；
- InspectionObjectParameter、InspectionStandardParameter 无悬空关系；
- 93 是官方来源行数，拆分后项目数可大于 93；
- 计算规则限定项目+参数，可选 TESTING 标准；
- 技术要求限定项目+参数+JUDGMENT 标准+条件。

## 批次 C：业务流迁移与旧 M04 废弃

目标：

- 合同类别 → M06.F01 检测专项；
- 报告类别/categoryCode → M06.F02 检测项目/inspectionObjectCode；
- 接样依据、参数选择、结果计算、单项评定、报告和统计切换到 M06；
- 迁移完成后将旧 M04.F01/F03/F04/F05/F10/F11 标记为已废弃，不删除 ID。

## 评审纪律

- 每批先运行 `python scripts/tree_change.py -p lab-management-system --report`；
- 人工批准前不修改 function-tree 或 src；
- 新 ID 获 token 后才回填 REQ、设计、入口和测试；
- 任一批次 gate exit 2 时停止，不通过改配置绕过。
