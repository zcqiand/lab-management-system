# 案例一字段对齐规格（建筑材料检测实验室 LIMS）

> 输入：`raw/` 下 7 份真实试验报告 docx（钢材/水泥/混凝土抗压/砂/碎卵石/钢筋机械连接/钢筋焊接连接）
> 原则：**原始资料中的字段在本规格中都要体现，合理安排去处**。
> 执行者：repo-engineer（重构 types/msw/store/组件/测试）。

---

## 0.5 OrgInfo（检测单位信息）—— 系统级单例配置

LIMS 系统本身是为一家检测单位（实验室）定制的，**检测单位信息是系统级常量配置**，不是每份合同/接样/样品的业务字段。在系统初始化时配置一次，全局引用，不在业务实体重复存储。

```ts
export interface OrgInfo {
  // 基本信息
  orgName: string                  // 检测单位名称（报告签发方，如 XX检测中心）

  // 地址
  registeredAddress: string        // 注册地址（机构登记地址）
  testingSiteAddress: string       // 检测能力场所地址（实际开展检测的地址，可与注册地址不同）

  // 联系方式
  postalCode: string               // 邮政编码
  contactPhone: string             // 联系电话
  email: string                    // 电子信箱

  // 资质
  qualificationCertNo: string      // 资质证书编号（如 CMA / CNAS 编号）

  // 系统字段
  updatedAt: string
}
```

### 设计要点

- **单例配置**：OrgInfo 是系统级单例（一般只有一条记录），配置页/系统设置页管理，业务实体不存这些字段
- **SampleReceipt 不再存检测单位信息**：原 `testingUnit` / `testAddress` / `judgeBasis` 等"整批共享"字段应从 SampleReceipt 移除，因为它们是检测单位层面的常量（OrgInfo），不是接样层面的业务属性。
  - **SampleReceipt 保留** `testEnvironment` / `mainEquipment`（每次接样的环境与设备可能不同，属于接样层业务属性，不应放 OrgInfo 系统级常量）
  - **保留** `mainEquipment`（可选）：记录"此次接样/此次检测用到的具体设备"，即使 OrgInfo 有默认设备清单，每次检测可能用不同设备
  - **移除** `testingUnit` / `testAddress` / `judgeBasis`：OrgInfo 单例
  - **保留** `testEnvironment` / `mainEquipment`（每次接样的环境与设备可能不同，属接样层业务属性）
- **报告展示**：报告头/页眉/落款直接引用 OrgInfo（如报告封面打印"XX检测中心 资质证书编号 CMA L1234"）

### 业务实体引用

| 实体 | 引用 OrgInfo 的方式 |
|---|---|
| Report | 报告头/落款展示 orgName/qualificationCertNo |
| Contract | 委托/见证方信息（独立于检测单位），不引用 OrgInfo |
| SampleReceipt | 不再存 testingUnit/testAddress/judgeBasis（OrgInfo/码表）；保留 mainEquipment + testEnvironment（每次接样可能不同） |
| TestRecordSheet | environment 可引用 OrgInfo 默认环境，但单次检测环境可能不同，保留为可选 |

### 与"多检测单位（多租户）"的兼容性

当前 LIMS 是单租户（一家检测单位），OrgInfo 单例。若未来扩展为多租户 SaaS（多家检测单位共用一套系统），OrgInfo 升级为多租户实体（每个 tenant 一份 OrgInfo），业务实体加 `tenantId` 引用。本次召回重制以单租户为准，扩展性预留。

---

## 1. Contract（合同/委托）—— 取代原 Project

```ts
export interface Contract {
  id: string                       // 原 projectId
  contractCode: string             // 合同/委托编号
  // —— 委托方 ——
  clientUnit: string               // 委托单位
  projectName: string              // 工程名称
  projectLocation?: string         // 工程地点
  // —— 施工方 ——
  constructionUnit: string         // 施工单位
  // —— 见证方 ——
  witnessUnit: string              // 见证单位
  witness: string                  // 见证人
  witnessPhone?: string            // 见证人电话
  // —— 其他委托信息 ——
  contactPerson?: string
  contactPhone?: string
  entrustedDate?: string           // 委托日期
  // —— 汇总表盖章结论 ——
  selfCheckConclusion?: { operator: string; conclusion: string; date: string; sealed: boolean }  // 项目经理自查
  recheckConclusion?: { operator: string; conclusion: string; date: string; sealed: boolean }    // 总监理工程师复查
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
```

原 `Project`（name/code/ownerId）重构为 `Contract`。原 `projectTable→contractTable`，下游 `Sample.projectId→contractId`。

---

## 2. SampleReceipt（接样信息）—— 新增层

一次接样登记。把原散在各样品里的「接样信息块」（收样日期/样品来源/检测类别/接样人/此次用到的设备）提到这一层——它们对**同一次接样的多个样品是共享的**。检测单位级常量（机构名/地址/资质证书号/判定依据等）见 OrgInfo 系统级配置，不在本实体重复存储。

```ts
export interface SampleReceipt {
  id: string
  contractId: string               // 关联合同
  receiptCode: string              // 接样编号 / 收样登记单号
  // —— 接样信息 ——
  receivedDate: string             // 收样日期
  receivedBy: string               // 接样人
  sampleSource: string             // 样品来源（施工送检/现场抽样）
  testCategory: string             // 检测类别（委托检验/见证取样/监督抽查）
  // —— 此次接样的环境与设备（每次接样可能不同，属接样层业务属性；检测单位名/地址/判定依据等常量见 OrgInfo）——
  testEnvironment?: string         // 此次接样的检测环境（温度/湿度）
  mainEquipment?: string           // 此次接样用到的设备
  // —— 汇总 ——
  representBatchSummary?: string   // 代表批量汇总说明
  remark: string
  status: 'received' | 'testing' | 'completed' | 'rejected'
  createdAt: string
  updatedAt: string
}
```

**说明**：检测日期 `testDate` 不放 Receipt（不同样品/报告检测时间可能不同），归 `Report.reportDate`。同一接样的样品若需独立检测日期，仍可在 Report 层表达。

---

## 3. Sample（通用样品信息 + 材料专属）

单个样品的**通用属性** + **材料专属属性**。接样/检测单位等批量共享字段已移到 `SampleReceipt`。

```ts
export type MaterialType = 'steel' | 'cement' | 'concrete' | 'sand' | 'gravel' | 'rebar_mech' | 'rebar_weld'

export interface Sample {
  id: string
  receiptId: string                // 所属接样（一次接样多个样品）
  contractId: string
  reportId?: string | null         // 被哪份报告收录（未出报告前 null）

  sampleCode: string               // 样品编号
  materialType: MaterialType       // 材料种类（决定 details 与所属报告检测项）

  // —— 通用样品信息（均可选，按材料与场景填写）——
  sampleName?: string              // 样品名称（大类：水泥/砂/钢材/混凝土）
  sampleType?: string              // 样品型号标识（形态+牌号/强度等级：热轧带肋HRB400 / P.O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊）
  specification?: string           // 样品规格（尺寸/粒径/直径：Φ22 / 150×150×150mm / 5-25mm；无尺寸的材料留空）
  sampleGrade?: string             // 样品分级（独立于型号的等级：机械连接接头等级Ⅰ/Ⅱ/Ⅲ级 / 砂石用途类别Ⅰ/Ⅱ/Ⅲ类；型号已含等级的钢材/水泥/混凝土留空）
  structuralPart?: string          // 结构部位（混凝土/钢筋连接用，如"一层柱A-3"；钢材/水泥/砂石留空）
  manufacturer?: string            // 生产厂家/产地（沙钢集团 / 海螺水泥 / 洞庭湖产地，统一厂家与产地；见证抽样等场景可留空）
  sampleDescription?: string       // 样品描述
  sampleQuantity?: string          // 样品数量（如"12kg"、"3个"，含单位）
  representQuantity?: string       // 代表批量/代表数量（如"60t"、"300个"）
  sampleCondition?: string         // 样品状态（完好/有锈蚀/破损）

  // —— 材料专属属性 ——
  materialDetails: SampleMaterialDetails

  status: SampleStatus             // pending/testing/completed/rejected
  createdAt: string
  updatedAt: string
}
```

### 3.1 SampleMaterialDetails（样品端——材料专属属性联合）

```ts
export type SampleMaterialDetails =
  // 钢材（原材料）—— manufacturer/steelGrade 已上提到通用层
  | { kind: 'steel'; nominalDiameter?: number; heatNumber?: string }
  // 水泥 —— manufacturer/strengthGrade 已上提；字段可后补
  | { kind: 'cement'; cementType?: string; factoryBatchNo?: string; productionDate?: string }
  // 混凝土（抗压）—— 试块组；structuralPart/designGrade 已上提；字段可后补
  | { kind: 'concrete'; pourDate?: string; volume?: number; specimenSize?: string; curingCondition?: string; ageDays?: number; groupIndex?: number }
  // 砂 —— 全部专属属性已上提，留 kind 标记
  | { kind: 'sand' }
  // 碎（卵）石 —— 同砂
  | { kind: 'gravel' }
  // 钢筋机械连接 —— manufacturer/spliceGrade 已上提；steelGrade（构成材料）+ 其余字段可后补
  | { kind: 'rebar_mech'; spliceType?: string; steelGrade?: string; groupIndex?: number }
  // 钢筋焊接连接 —— steelGrade（构成材料）+ 其余字段可后补
  | { kind: 'rebar_weld'; weldMethod?: string; steelGrade?: string; welderName?: string; welderCertNo?: string; groupIndex?: number }
```

`groupIndex`（组内序号）：同一报告多个试件/试块时区分（如混凝土 1 组 3 块的 1/2/3）。

---
## 4. 检测记录三层模型（TestRecordSheet → TestItem）

### 4.0 检测记录三层模型（TestRecordSheet → TestItem → Report）

真实 LIMS 系统的检测记录是**三层**关系，与样品四层（Contract/SampleReceipt/Sample/Report）同构：

```
TestRecordSheet（检测记录单）   —— 一次检测任务原始记录，可被多份 Report 引用
  └── TestItem（单项检测记录）   —— 一份记录单含多个检测项（每项对应一个 parameterCode），只能被一份 Report 引用
        ↑
      Report（检测报告）         —— 报告引用 TestItem[]，不再引用原始记录单
```

**关键不变量**：
- TestRecordSheet N ↔ Sample（**多对多**——一份记录单可含多个试件/试块，sampleIds[] 关联；如混凝土 1 组 3 试块、钢筋连接 1 组 3 试件归一份记录单）
- TestRecordSheet 1 → N TestItem（一组检测的原始数据可拆为多条参数项；每条 TestItem 仍 `sampleId` 单值，指代 sampleIds[] 之一的具体试件/试块）
- TestItem N → 1 TestRecordSheet（每条参数项归一份记录单）
- TestItem N → 1 Report（**一条参数项只能被一份报告引用**——一旦出报告就绑定，不跨报告）
- Report 1 → N TestItem（一份报告汇总多条参数项）
- TestRecordSheet 可被**多份 Report 引用**（重测补测/复审/多视角报告都基于同一份原始数据）

**为什么这样分层**：
- 真实场景：检测员做完一组实验，录入「检测记录单」（含 6+ 条参数项），原始数据先存；之后由审核员选部分/全部参数项组合出报告；同一份原始数据可能出多份不同角度的报告（如内部报告 + 客户报告）
- 数据真实性：原始记录一旦生成不被修改（审计要求），重测则新建一份 TestRecordSheet；报告引用原始数据快照
- 避免"改报告改数据"的反模式

```ts
/** 检测记录单（TestRecordSheet）—— 原始检测任务记录 */
export interface TestRecordSheet {
  id: string
  contractId: string
  receiptId?: string
  sampleIds: string[]              // 本记录单归属哪些样品（N ↔ M——一份记录单可含多个试件/试块，如混凝土 1 组 3 试块、钢筋连接 1 组 3 试件）

  sheetCode: string                // 记录单编号
  testDate: string                 // 检测日期（可精确到时间）
  operatorId?: string              // 检测员 ID
  reviewerId?: string              // 复核员 ID
  equipment?: string               // 此次检测所用设备
  environment?: string             // 检测环境（温度/湿度）
  remark?: string
}

/** 单项检测记录（TestItem）—— 记录单下的一条参数记录 */
export interface TestItem {
  id: string
  sheetId: string                  // 归属的检测记录单
  sampleId: string                 // 归属的具体样品/试件（与 sheet.sampleIds[] 之一一致；冗余便于按 sample 查询）
  reportId: string | null          // 归属的报告（可空——未出报告时为 null；一旦绑定不可改）

  // —— 通用单项检测记录属性 ——
  parameterCode: string            // 引用的检测参数 code
  standardCode?: string            // 引用的检测标准 code
  requirementCode?: string         // 引用的技术要求 code
  requirement: string              // 技术要求显示文本（冗余存以兼容离线/历史快照）
  result: string                   // 实测结果
  unit?: string                    // 单位（冗余存）
  passed: boolean                  // 单项判定

  // —— 检测端——材料专属属性联合，与 Sample 端 SampleMaterialDetails 同构（kind 与 sample 一致） ——
  // 承载此条检测项在材料端的结构化属性（试件组内位置、位置描述等）
  // 注意：「这条检测的是什么参数（屈服强度/弯曲压头直径/抗拉强度等）」由 parameterCode 引用 TestParameter 码表表达，
  // 不在 materialDetails 里硬编码；「此参数属于哪个分组（力学/工艺/重量偏差等）」由 TestParameter.category 表达，
  // 报告渲染时按 category 分组展示（UI 层面），不污染数据模型。
  materialDetails: TestItemMaterialDetails

  remark?: string
  createdAt: string
}

/** TestItemMaterialDetails（检测端——材料专属属性联合）
 *
 * 与 Sample 端 SampleMaterialDetails 同构（kind 与 sample.materialDetails.kind 一致），
 * 归属在 TestItem。仅承载"检测端的结构化属性"，不承载"检测什么参数"或"属于哪个分组"。
 *
 * **设计原则（与原 taskGroup 方案的本质区别）**：
 * - 「这条检测**是什么参数**」（屈服强度 ReL / 弯曲压头直径 / 弯曲角度 / 抗拉强度 / 三氧化硫 等）
 *   —— **由 TestItem.parameterCode 引用 TestParameter 码表表达**
 *   例如：弯曲检测参数是 3 个独立 code 条目（弯曲压头直径 STE010、弯曲角度 STE009、表面裂纹 STE011），
 *   它们的 category 表达"哪个分组"（力学性能 / 工艺性能）
 * - 「此条检测**属于哪个分组**」（力学/工艺/重量偏差等）
 *   —— **由 TestParameter.category 表达**，UI 渲染报告时按 category 分组展示
 *   例如：所有 category='mechanical' 的 TestItem 归为"力学性能"组
 * - TestItemMaterialDetails **只承载"此条检测项在材料端的结构化属性"**（如试件组内位置、特殊备注等），
 *   **不再承载"任务组"或"参数类型"**（这些已由码表承担）
 *
 * **优势**：
 * 1. 检测参数新增（如新增"应力-应变曲线"）→ 只需加 TestParameter 条目 + 对应 TechnicalRequirement，类型不变
 * 2. 分组调整（如把"抗拉强度"从力学性能移到工艺性能）→ 改 TestParameter.category，类型不变
 * 3. 多语言/单位切换 → 改 TestParameter.name/unit，类型不变
 * 4. 避免"按材料硬编码 taskGroup"导致的材料扩展时类型爆炸
 *
 * **与 SampleMaterialDetails 的差异**：
 * - SampleMaterialDetails = 样品**有什么**（固有属性：钢材牌号/直径、水泥品种/强度等级）
 * - TestItemMaterialDetails = 此条检测项在材料端的**结构化属性**（试件组内位置等）
 *
 * **结构化属性**：
 * - 多试件材料（concrete / rebar_mech / rebar_weld）有 specimenPositionInGroup（试件组内位置 1/2/3）
 * - 单试件材料（steel / cement / sand / gravel）不需要此字段
 * - 未来可扩展其他材料端结构化属性（位置描述 position、备注 note 等）
 */
export type TestItemMaterialDetails =
  // 单试件材料——不需 specimenPositionInGroup
  | { kind: 'steel' }
  | { kind: 'cement' }
  | { kind: 'sand' }
  | { kind: 'gravel' }
  // 多试件材料——承载试件组内位置（1/2/3）
  | { kind: 'concrete'; specimenPositionInGroup?: number }
  | { kind: 'rebar_mech'; specimenPositionInGroup?: number }
  | { kind: 'rebar_weld'; specimenPositionInGroup?: number }
```

**TestItemMaterialDetails 详细用途**（"材料检测单项检测记录属性"）：归属在 **TestItem**，与 Sample 端 SampleMaterialDetails 同构（`kind` 与 sample 一致）。仅承载"检测端的结构化属性"。

### 设计原则（关键变化：移除 taskGroup）

原 `materialTestProps` 用 `taskGroup: 'mechanical'` 表达"这条检测属于力学/工艺/重量偏差哪个分组"——这有根本问题：

**问题**：按"任务组"硬编码到类型里，会把"如何展示检测参数"的 UI 概念（分组）污染到数据模型。同一组检测参数（弯曲）实际上跨多个独立 TestParameter 条目（弯曲压头直径、弯曲角度、表面裂纹），不应该用一个 taskGroup 字段来"打包"——它们是 3 条独立的 TestItem，每条独立引用 TestParameter 码表。

**正确分层**：
- 「这条检测**是什么参数**」→ `TestItem.parameterCode` 引用 TestParameter 码表（code 唯一标识一个具体参数，如 STE009=弯曲角度 / STE010=弯曲压头直径 / STE011=表面裂纹）
- 「此参数**属于哪个分组**」→ `TestParameter.category`（如 'mechanical' / 'process'），UI 渲染报告时按 category 分组
- `TestItemMaterialDetails` **不存**这些（已被码表承担），只承载"试件组内位置"等检测端结构化属性

### 弯曲检测示例（按你的反馈）

弯曲检测**不是 1 条** TestItem 配 1 个 taskGroup='process'，而是 **3 条独立 TestItem**，每条独立引用 TestParameter 码表：

| TestItem id | sampleId | materialDetails | parameterCode | standardCode | result | passed |
|---|---|---|---|---|---|---|
| ti-001 | sample-steel-001 | { kind: 'steel' } | STE010（弯曲压头直径 mm） | GB/T 232-2010 | "30" | true |
| ti-002 | sample-steel-001 | { kind: 'steel' } | STE009（弯曲角度 °） | GB/T 232-2010 | "180" | true |
| ti-003 | sample-steel-001 | { kind: 'steel' } | STE011（表面裂纹） | GB/T 232-2010 | "无裂纹" | true |

这 3 条 TestItem 的 `TestParameter.category` 都是 `'process'`（工艺性能组），UI 渲染时按 category 聚合成"工艺性能"组展示。TestItemMaterialDetails 不需要 taskGroup。

### 设计类比（Sample 端 vs TestItem 端）

| 维度 | Sample 端 | TestItem 端 |
|---|---|---|
| 类型 | SampleMaterialDetails | TestItemMaterialDetails |
| 字段名 | materialDetails | materialDetails（统一命名，对称） |
| 表达 | "样品**有什么**"（固有属性，跨时间稳定） | "此条检测项在材料端的**结构化属性**"（与此次检测绑定） |
| 示例 | 钢材牌号/直径、水泥品种/强度等级 | 试件组内位置（specimenPositionInGroup）；单试件材料无此字段 |
| 检测参数表达 | 不适用 | **由 TestItem.parameterCode 引用 TestParameter 码表** |
| 分组表达 | 不适用 | **由 TestParameter.category 表达**（UI 渲染时聚合） |

### 多试件材料（concrete / rebar_mech / rebar_weld）

`specimenPositionInGroup`（试件组内位置 1/2/3）—— 因为同组多个试件各自的检测项需要区分（混凝土 1 组 3 块各自抗压强度不同）。

### 单试件材料（steel / cement / sand / gravel）

不带 specimenPositionInGroup——这些材料的每条检测项自然归属于唯一样品。

### 典型查询

- "这个钢筋样品所有弯曲检测项" → `sampleId=xxx AND materialDetails.kind='steel' AND parameterCode IN ('STE009','STE010','STE011')`
- "这个钢筋样品所有力学性能项" → `sampleId=xxx AND materialDetails.kind='steel' AND parameterCode IN (SELECT code FROM TestParameter WHERE category='mechanical')`
- "出报告时按 category 分组渲染" → 查 TestParameter.category，分组展示

### 不存什么

TestItemMaterialDetails 不存"任务组 / 参数类型"——这些由码表承担。也不直接存检测值（result/passed 已在 TestItem 通用字段）。TestItemMaterialDetails 只承载"试件组内位置"等纯结构化属性。

### 4.1 Report 引用 TestItem（不再内联检测项）

Report 改为引用 TestItem（一对多）：

```ts
export interface Report {
  ...其他字段...
  testItemIds: string[]          // 报告引用的单项检测记录（每条只能被一份报告引用）
}
```

展示时 JOIN TestItem（含码表 TestParameter/TestStandard/TechnicalRequirement）渲染"检测内容"表。TestItem 已是独立实体（见 6.0），与原始 TestRecordSheet 解耦：
- 同一份 TestRecordSheet 的不同 TestItem 可被分到不同 Report
- Report 引用 TestItem 后 TestItem.reportId 绑定不变
- 原始数据归 TestRecordSheet，报告归 Report，互不影响



## 5. Report（检测报告）—— 一份报告含多个样品的检测

一份报告对应「一次检测任务」，可包含多个样品/试件（混凝土 3 试块、钢筋连接 3 试件），也可单样品（钢材、水泥、砂石）。通过 `sampleIds[]` 关联包含哪些样品/试件。检测项通过 `TestItem.reportId` 反查（TestItem 绑定 reportId 后不可改）—— Report 本身**不存**检测项数组，避免冗余与"改报告改数据"反模式。展示时按 `sampleIds[]` 查 TestItem 列表 + JOIN 码表渲染。

```ts
export interface Report {
  id: string
  contractId: string
  receiptId: string                // 源自哪次接样
  reportCode: string               // 试验报告编号
  reportDate: string               // 试验报告检测日期
  materialType: MaterialType       // 报告按材料分（同一报告通常同材料）

  sampleIds: string[]              // 一份报告含的样品/试件（1 或多个）。检测项通过 TestItem.reportId 反查（TestItem 已绑定 reportId 后不可改），避免在 Report 上冗余存测试项数组。

  // —— 结论层 ——
  conclusion: string               // 文字结论
  result: 'pass' | 'fail'          // 判定结果（汇总表用）
  remark: string                   // 备注
  status: ReportStatus             // draft/reviewing/issued
  issuedAt: string | null
  createdAt: string
  updatedAt: string
}


### 5.1 Report 引用 TestItem（不在 Report 内联检测项）

Report 不再内联各材料的检测项字段（与第 6.0 节独立 `TestRecordSheet` + `TestItem` 三层模型冲突），改为引用 TestItem 数组：

```ts
export interface Report {
  ...其他字段（同上）...
  // 不再保留 testItemIds 数组——通过 sampleIds[] + 反查 TestItem（按 reportId）得到报告的检测项
}
```

**材料差异表达**：通过 TestItem 的 `materialDetails`（TestItemMaterialDetails，kind 与 sample 一致） + `parameterCode`（TestParameter 字典） + `parameterCode` 对应的 `TestParameter.category`（分组）共同表达。Report 本身不感知材料，每条 TestItem 携带自己的材料/参数/实测/分组(category)。

**多试件场景**：混凝土 1 组 3 试块、钢筋连接 1 组 3 试件——每试件/试块独立一条 TestItem（`sampleId` 单值指代具体试件），Report 引用全部 3 条。`specimens[]` / `results[]` 这类「Report 内嵌试件数组」结构已废弃。

**展示时**：JOIN TestItem + TestParameter + TestStandard + TechnicalRequirement 渲染「检测内容」表。

完整的三层模型见 **第 6.0 节「检测记录三层模型」**。


---

## 6. Summary（汇总表）—— 按材料投影

每种材料一份汇总表，由 contract + receipts + samples + reports 联表投影。

```ts
// GET /contracts/:id/summary?materialType=steel
export interface SteelSummaryRow {
  seq: number
  spec: string                      // 品种规格（样品种类+直径）
  steelGrade: string                // 牌号
  qualityCertNo: string             // 质保单编号/炉罐号
  manufacturer: string
  representQuantity: string         // 代表数量（t）
  reportCode: string                // 试验报告编号
  testDate: string                  // 试验报告检测日期
  result: 'pass' | 'fail'
}
// 水泥/砂/石/混凝土/钢筋连接 各自 SummaryRow（字段从其汇总表提取，见第 6 节）
```

实现：`GET /contracts/:id/summary?materialType=xxx` handler，返回对应材料的 SummaryRow[]。前端 `src/features/contracts/ContractSummary.tsx` 按 materialType 切换列定义。

---

## 7. 码表（数据字典）

LIMS 系统的标准做法：检测参数、检测标准、技术要求统一管理为码表，避免在每份报告里硬编码字段。这样：
- 新加检测参数 → 只改码表
- 标准更新（如 GB/T 1499.2-2018 换版） → 只改码表
- 技术要求随材料等级/规格自动带出 → 表单"选参数+等级"自动查码表填入技术要求
- 报告展示从码表查名称/单位，多语言/单位切换只改码表

```ts
/** 检测参数码表（Test Parameter Code Table） */
export interface TestParameter {
  code: string                  // 参数代码（如 STE001 / steel.yieldStrength）
  name: string                  // 参数名称（下屈服强度 ReL / 抗拉强度 Rm）
  materialType: MaterialType    // 适用材料
  category: string              // 分类（力学性能/工艺性能/物理性能/化学成分/尺寸偏差）
  unit?: string                 // 单位（MPa / % / kg/m³）
  description?: string
}

/** 检测标准码表（Test Standard Code Table） */
export interface TestStandard {
  code: string                  // 标准编号（如 GB/T 228.1-2010）
  name: string                  // 标准全称
  type: 'national' | 'industry' | 'local' | 'enterprise'  // 国标/行标/地标/企标
  applicableMaterials: MaterialType[]
  applicableParameters: string[]  // 适用检测参数 code 列表
}

/** 技术要求码表（Technical Requirement：标准+参数+材料等级/规格 → 指标值） */
export interface TechnicalRequirement {
  code: string                  // 组合码 REQ-steel-yieldStrength-HRB400
  standardCode: string          // 引用的标准 code
  parameterCode: string         // 引用的检测参数 code
  materialType: MaterialType
  materialGrade?: string        // 适用材料等级（HRB400 / 42.5 / C30 / Ⅰ类 / Ⅱ级）
  specification?: string        // 适用规格（Φ22 / 5-25mm）
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'  // 比较方式
  value: string                 // 技术要求值（如 400 / 8 / 1.25）
  unit?: string                 // 单位（与参数单位一致）
  remark?: string
}
```

### 7.0 码表总览（3 个码表定义）

### 7.1 码表预置示例（每材料若干）

**检测参数 TestParameter 摘要**（注意：每条参数是独立的码表条目，由 `category` 字段表达分组，而非按材料的 `taskGroup` 字段；如"弯曲"检测参数包含 STE009(角度) / STE010(压头直径) / STE011(表面裂纹) 三条独立条目，category 均为 'process'）：
- steel：STE001 牌号 / STE002 公称直径 / STE003 下屈服强度 ReL(MPa) / STE004 抗拉强度 Rm(MPa) / STE005 断后伸长率 A(%) / STE006 最大力总延伸率 Agt(%) / STE007 强屈比 Rom/RoeL / STE008 超屈比 RoeL/ReL / STE009 弯曲角度(°) / STE010 压头直径(mm) / STE011 表面裂纹 / STE012 重量偏差(%)
- cement：CEM001 比表面积(m²/kg) / CEM002 45μm筛余(%) / CEM003 初凝(min) / CEM004 终凝(min) / CEM005 沸煮安定性 / CEM006 压蒸安定性 / CEM007 三氧化硫(%) / CEM008 氧化镁(%) / CEM009 氯离子(%) / CEM010 碱含量(%) / CEM011 3天抗折(MPa) / CEM012 3天抗压(MPa) / CEM013 28天抗折(MPa) / CEM014 28天抗压(MPa)
- concrete：CON001 抗压强度(MPa) / CON002 抗压强度代表值(MPa)
- sand：SND001 含泥量(%) / SND002 泥块含量(%) / SND003 亚甲蓝值 / SND004 石粉含量(%) / SND005 压碎指标(%) / SND006 坚固性(%) / SND007 片状颗粒(%) / SND008 表观密度(kg/m³) / SND009 松散堆积密度(kg/m³) / SND010 空隙率(%) / SND011 含水率(%) / SND012 饱和面干吸水率(%) / SND013 贝壳含量(%) / SND014 氯离子(%) / SND015 细度模数
- gravel：GRV001 含泥量/泥粉含量(%) / GRV002 泥块含量(%) / GRV003 针片状颗粒(%) / GRV004 压碎指标(%) / GRV005 坚固性(%) / GRV006 不规则颗粒(%) / GRV007 表观密度(kg/m³) / GRV008 堆积密度(kg/m³) / GRV009 空隙率(%) / GRV010 吸水率(%) / GRV011 含水率(%) / GRV012 岩石抗压强度(MPa)
- rebar_mech：RMK001 公称直径(mm) / RMK002 极限抗拉强度(MPa) / RMK003 断裂位置
- rebar_weld：RWD001 公称直径(mm) / RWD002 抗拉强度(MPa) / RWD003 断口离焊缝距离(mm) / RWD004 断裂特征 / RWD005 弯曲试验90°

**检测标准 TestStandard 摘要**：
- GB/T 228.1-2010 金属材料 拉伸试验 第1部分：室温试验方法（steel）
- GB/T 1499.2-2018 钢筋混凝土用钢 第2部分：热轧带肋钢筋（steel）
- GB/T 17671-1999 水泥胶砂强度检验方法（ISO法）（cement）
- GB/T 1346-2011 水泥标准稠度用水量、凝结时间、安定性检验方法（cement）
- GB/T 50082-2009 普通混凝土长期性能和耐久性能试验方法标准（concrete）
- GB/T 50081-2019 混凝土物理力学性能试验方法标准（concrete）
- GB/T 14684-2011 建设用砂（sand）
- GB/T 14685-2011 建设用卵石和碎石（gravel）
- JGJ 107-2010 钢筋机械连接技术规程（rebar_mech）
- JGJ 18-2012 钢筋焊接及验收规程（rebar_weld）

**技术要求 TechnicalRequirement 摘要（grade=材料等级，spec=规格）**：

| code | standardCode | parameterCode | materialGrade | specification | comparison | value | unit |
|---|---|---|---|---|---|---|---|
| REQ-steel-yieldStrength-HRB400 | GB/T 1499.2-2018 | STE003 | HRB400 | Φ22 | ≥ | 400 | MPa |
| REQ-steel-yieldStrength-HRB500 | GB/T 1499.2-2018 | STE003 | HRB500 | Φ22 | ≥ | 500 | MPa |
| REQ-steel-tensileStrength-HRB400 | GB/T 1499.2-2018 | STE004 | HRB400 | Φ22 | ≥ | 540 | MPa |
| REQ-steel-elongation-HRB400 | GB/T 1499.2-2018 | STE005 | HRB400 | Φ22 | ≥ | 16 | % |
| REQ-steel-strengthRatio-HRB400 | GB/T 1499.2-2018 | STE007 | HRB400 | Φ22 | ≥ | 1.25 | — |
| REQ-cement-3dayCompressive-42.5 | GB/T 17671-1999 | CEM012 | 42.5 | — | ≥ | 17.0 | MPa |
| REQ-cement-28dayCompressive-42.5 | GB/T 17671-1999 | CEM014 | 42.5 | — | ≥ | 42.5 | MPa |
| REQ-cement-initialSetting-42.5 | GB/T 1346-2011 | CEM003 | 42.5 | — | ≥ | 45 | min |
| REQ-cement-finalSetting-42.5 | GB/T 1346-2011 | CEM004 | 42.5 | — | ≤ | 600 | min |
| REQ-concrete-compressive-C30 | GB/T 50081-2019 | CON002 | C30 | — | ≥ | 28.5 | MPa |
| REQ-sand-mudContent-Ⅰ类 | GB/T 14684-2011 | SND001 | Ⅰ类 | — | ≤ | 1.0 | % |
| REQ-sand-mudContent-Ⅱ类 | GB/T 14684-2011 | SND001 | Ⅱ类 | — | ≤ | 3.0 | % |
| REQ-sand-mudContent-Ⅲ类 | GB/T 14684-2011 | SND001 | Ⅲ类 | — | ≤ | 5.0 | % |
| REQ-gravel-crushIndex-Ⅰ类 | GB/T 14685-2011 | GRV004 | Ⅰ类 | — | ≤ | 10 | % |
| REQ-rebarMech-tensile-Ⅱ级 | JGJ 107-2010 | RMK002 | Ⅱ级 | Φ25 | ≥ | 钢筋极限抗拉强度标准值 | MPa |
| REQ-rebarWeld-tensile-闪光对焊 | JGJ 18-2012 | RWD002 | — | Φ20 | ≥ | 钢筋抗拉强度标准值 | MPa |

### 7.2 码表使用场景

- 表单录入：TestItem 输入时，先选 parameterCode（下拉来自 TestParameter）→ 选 materialGrade → 自动查 TechnicalRequirement 找到匹配条目带出 requirement 显示文本与单位 → 录入 result → 系统按 comparison 自动判定 passed
- 报告展示：从 parameterCode 查 TestParameter.name 显示参数名（支持多语言切换只改码表）；从 requirementCode 查 TechnicalRequirement 显示完整技术要求
- 标准更新：旧标准废止 → 改 TestStandard，新加 GB/T 1499.2-2024，旧报告 standardCode 仍指向旧版（码表历史快照）
- 码表存储：msw/db.ts 加 testParameterTable / testStandardTable / technicalRequirementTable，或 src/data/codes.ts 静态字典（只读、变化少）；前端表单按需查

### 7.2 码表与报告关系（续）

Report.testItems[] 里的 TestItem 通过 parameterCode / standardCode / requirementCode 三个外键引用码表。Report 本身不存"用什么检测"的全集（避免重复），展示时 JOIN 码表。

## 8. 7 种材料的原始字段清单（汇总表 + 样品信息 + 检测项）

### 6.1 钢材（steel）
- **汇总表**：序号 / 品种规格 / 牌号 / 质保单编号·炉罐号 / 生产厂家 / 代表数量(t) / 试验报告编号 / 检测日期 / 判定结果
- **样品信息**：样品编号 / 样品种类 / 钢筋牌号 / 公称直径(mm) / 炉号(批号) / 生产厂家 / 代表数量(t) / 样品状态
- **力学性能**：检测依据 / 下屈服强度ReL / 抗拉强度Rm / 断后伸长率A / 最大力总延伸率Agt / Rom/RoeL / RoeL/ReL（各含技术要求+检测结果）
- **工艺性能**：检测依据 / 弯曲(压头直径/角度/表面裂纹) / 反向弯曲(同)
- **重量偏差**：检测依据 / 技术要求 / 检测结果
- **结论 / 备注**

### 6.2 水泥（cement）
- **汇总表**：序号 / 品种 / 强度等级 / 质保单编号·出厂编号 / 生产厂家 / 代表数量(t) / 试验报告编号 / 检测日期 / 判定结果
- **样品信息**：样品编号 / 样品名称 / 检测类别 / 样品数量 / 水泥品种·强度等级 / 出厂编号·代表批量 / 样品来源 / 样品描述 / 出厂日期 / 生产厂家或商标
- **检测信息**：收样日期 / 检测日期 / 检测环境 / 检测地址 / 主要检测设备 / 判定依据
- **检测项**：细度(比表面积/45μm筛余) / 凝结时间(初凝/终凝) / 安定性(沸煮/压蒸) / 三氧化硫 / 氧化镁 / 氯离子 / 碱含量 / 强度(3天/28天 抗折·抗压)
- **结论 / 备注**

### 6.3 混凝土抗压强度（concrete）
- **汇总表（按浇筑）**：序号 / 轴线部位 / 浇筑时间 / 混凝土方量(m³) / 试验时间 / 设计强度等级 / 实际强度值(MPa) / 试验报告编号 / 试验结果 / 备注
- **汇总表（按试块）**：增加 试块留置情况 / 实际强度天数
- **样品/试块信息（1 组 3 块）**：样品编号 / 工程部位 / 设计等级 / 公称尺寸长×宽×高(mm) / 成型日期 / 检测日期 / 龄期(d) / 养护条件 / 抗压强度(MPa) / 抗压强度代表值(MPa)
- **结论 / 备注**

### 6.4 砂（sand）
- **汇总表**：序号 / 品种 / 规格 / 生产厂家(产地) / 代表数量(t) / 试验报告编号 / 检测日期 / 判定结果
- **样品信息**：样品编号 / 样品名称 / 检测类别 / 规格 / 样品数量 / 样品描述 / 代表批量 / 生产厂家或产地 / 样品来源
- **检测信息**：收样日期 / 检测日期 / 检测环境 / 检测地址 / 主要设备 / 判定依据
- **检测项（Ⅰ/Ⅱ/Ⅲ类分级）**：含泥量 / 泥块含量 / 亚甲蓝·石粉含量 / 压碎指标 / 坚固性 / 片状颗粒含量 / 表观密度 / 松散堆积密度 / 空隙率 / 含水率 / 饱和面干吸水率 / 贝壳含量 / 氯离子含量
- **颗粒级配**：方筛孔(4.75/2.36/1.18/0.60/0.30/0.15mm) → 累计筛余% / 砂颗粒级配区(1/2/3区) / 细度模数
- **结论 / 备注**

### 6.5 碎（卵）石（gravel）
- **汇总表**：同砂
- **样品信息**：同砂结构
- **检测项（Ⅰ/Ⅱ/Ⅲ类 + 混凝土强度等级分级）**：含泥量或泥粉含量 / 泥块含量 / 针片状颗粒含量 / 压碎指标 / 坚固性 / 不规则颗粒含量 / 表观密度 / 堆积密度 / 连续级配松散堆积空隙率 / 吸水率 / 含水率 / 岩石抗压强度
- **颗粒级配**：方孔筛(2.36/4.75/9.50/16.0/19.0/26.5/31.5/37.5/53.0/63.0/75.0/90mm) → 累计筛余%
- **结论 / 备注**

### 6.6 钢筋机械连接（rebar_mech）
- **汇总表**：序号 / 结构部位 / 品种规格 / 试验时间 / 报告编号 / 试验结果 / 对应部位混凝土浇筑时间 / 备注
- **样品信息（1 组 3 试件）**：样品状态 / 检测类别 / 接头类型 / 钢筋牌号 / 接头等级 / 样品来源 / 代表数量(个) / 生产厂家
- **检测信息**：收样日期 / 检测日期 / 检测地址 / 检测环境 / 检测依据 / 判定依据 / 主要设备
- **检测内容（多试件）**：样品编号 / 公称直径(mm) / 技术要求 / 极限抗拉强度(MPa) / 断裂位置
- **结论 / 备注**

### 6.7 钢筋焊接连接（rebar_weld）
- **汇总表**：同机械连接
- **样品信息（1 组 3 试件）**：样品状态 / 检测类别 / 焊接方式 / 钢筋牌号 / 焊工姓名 / 焊工证号 / 样品来源 / 代表数量(个)
- **检测信息**：同机械连接
- **检测内容（多试件）**：样品编号 / 钢筋生产厂家及批号 / 公称直径(mm) / 技术要求 / 抗拉强度(MPa) / 断口离焊缝距离(mm) / 断裂特征 / 弯曲试验90°
- **结论 / 备注**

---

## 9. 影响面（repo-engineer 执行时同步改）

| 文件 | 改动 |
|------|------|
| `src/types/api.ts` | 四层重构：Contract / 新增 SampleReceipt / Sample（瘦身，加 receiptId+reportId+materialDetails）/ Report（加 sampleIds[]+materialType，检测项通过 TestItem.reportId 反查）/ TestItem / 各材料 SampleMaterialDetails/TestItemMaterialDetails 子类型 / 各材料 SummaryRow。原 Project→Contract |
| `src/types/store.ts` | ContractState / 新增 ReceiptState / SampleState / ReportState 字段同步 |
| `msw/db.ts` | projectTable→contractTable；新增 receiptTable；sampleTable（加 receiptId/reportId）/reportTable（加 sampleIds[]）schema 对齐；种子数据换 7 种材料真实数据，含 1 个接样多样品、1 个报告多样品的样本（混凝土组/钢筋连接组） |
| `msw/handlers.ts` | /projects→/contracts；新增 /receipts CRUD；/samples /reports mock 新结构 + sampleIds 关联；新增 GET /contracts/:id/summary?materialType=；/stats 聚合同步 |
| `src/features/projects/` → `src/features/contracts/` | 目录改名；projectStore→contractStore；新增 ContractSummary（按材料切换汇总） |
| `src/features/receipts/`（新增） | receiptStore + ReceiptList + ReceiptFormModal + ReceiptDetail（展示其下多个样品） |
| `src/features/samples/` | sampleStore/SampleList/SampleFormModal 字段瘦身（通用样品信息 + 按 materialType 动态渲染材料专属字段），SampleDetail 展示所属 receiptId/reportId |
| `src/features/reports/` | reportStore/ReportList/ReportDetail/ReportFormModal/ReportReview 按 materialType 渲染检测项；ReportDetail 展示 sampleIds[] 各试件结果（混凝土/钢筋连接多试件表格） |
| `src/features/tasks/`（批2 未完成） | Task 关联 sampleIds[]（一份报告/一组试件为一个检测任务） |
| `src/pages/` | Projects→Contracts；新增 Receipts 页；ContractSummary 页 |
| `tests/` | 所涉测试数据与断言对齐新四层模型；种子数据用真实材料，覆盖 1 接样多样品、1 报告多试件 |

---

## 10. mock 种子数据建议（真实材料 + 批量关系）

- **合同**：委托单位"XX建设集团"、工程名称"滨江一号一期"、施工单位"中建XX局"、见证单位"XX监理公司"、见证人"张工"
- **接样1**（多样品）：receiptCode RC-2024-0501，2024-05-03 收样，接样人王五，检测单位"XX检测中心"，设备"WAW-1000万能试验机/试验筛"——含 3 个样品：钢材(HRB400 Φ22)、水泥(P.O 42.5)、砂(中砂)
- **接样2**（混凝土组）：含 1 组 3 试块（C30 一层柱A-3，150³ 标养28天）→ 1 份报告含 3 个 sampleId
- **接样3**（钢筋机械连接组）：含 1 组 3 试件（HRB400 Φ25 直螺纹Ⅱ级）→ 1 份报告含 3 个 sampleId
- **报告-钢材**：1 报告 1 样品，力学按 GB/T 1499.2-2018（ReL≥400、Rm≥540、A≥16%、强屈比≥1.25）
- **报告-混凝土**：1 报告 3 试块，抗压强度分别 31.2/30.8/29.5，代表值 30.5，结果 pass（≥C30 0.95=28.5）
- **报告-机械连接**：1 报告 3 试件，极限抗拉强度均 ≥570，断裂位置均「断于母材」，pass

---

### 8.1 通用样品字段 × 7 种材料 填写对照

新上提的 5 个通用字段在 7 种材料下的取值（repo-engineer 写种子数据、正文 ch36 讲表单时参照）：

| 材料 | sampleName?(大类) | sampleType?(型号标识) | specification?(尺寸) | sampleGrade?(独立分级) | structuralPart?(结构部位) | manufacturer?(厂家/产地) |
|------|------|------|------|------|------|------|
| 钢材 | 钢筋 | 热轧带肋 HRB400 | Φ22 | （空，牌号已在型号） | （空） | 沙钢集团 |
| 水泥 | 水泥 | P.O 42.5 | （空） | （空，强度等级已在型号） | （空） | 海螺水泥 |
| 混凝土 | 混凝土试块 | C30 | 150×150×150mm | （空，强度等级已在型号） | 一层柱A-3 | XX混凝土公司 |
| 砂 | 砂 | 中砂 | （空） | Ⅱ类（用途分级） | （空） | 洞庭湖产地 |
| 碎（卵）石 | 碎石 | 连续级配 | 5-25mm | Ⅰ类（用途分级） | （空） | 湖州产地 |
| 钢筋机械连接 | 机械连接试件 | 直螺纹套筒 | Φ25 | Ⅱ级（接头等级） | 一层柱A-3 | XX连接科技 |
| 钢筋焊接连接 | 焊接试件 | 闪光对焊 | Φ20 | （空，焊接接头无分级） | 一层柱B-2 | （焊接施工方，可留空） |

> **字段语义边界**：
> - `sampleType?` = **型号标识**（形态+牌号/强度等级，描述"具体是什么型号"）：钢材牌号、水泥品种强度、混凝土强度等级都并入此处。
> - `specification?` = **尺寸/粒径/直径**（仅有尺寸参数的材料填）：钢材直径、混凝土试块尺寸、石子粒径；水泥/砂留空。
> - `sampleGrade?` = **独立于型号的分级**（型号之外另有分级体系的材料填）：机械连接接头等级(Ⅰ/Ⅱ/Ⅲ级)、砂石用途类别(Ⅰ/Ⅱ/Ⅲ类)；型号已含等级的钢材/水泥/混凝土、无分级的焊接连接留空。
> - `structuralPart?` = **结构部位**：仅混凝土试块与钢筋连接试件填（绑定工程结构部位）；原材料留空。
> - `manufacturer?` = **生产厂家/产地**：统一承载两种语义；见证抽样等场景可留空。
>
> **全部字段可选的工程含义（2026-07-02 调整）**：Sample 通用层 + SampleMaterialDetails 各变体字段均标 `?`，仅 `sampleCode`/`materialType`/`kind` 这些标识/分类字段必填。对照表中的填写值是「标准场景下的典型填法」，实际接样允许字段缺失（先登记、后补录）。表单层按 materialType + 场景（委托/见证/抽查）动态决定哪些字段必填，校验下沉到表单而非类型。

---

## 11. 类型设计决策记录（ADR）

**决策**：Sample 采用「单一 interface + 嵌套 `materialDetails` 联合」（方案 D），不合并到 Sample 联合、不用全可选大 interface、不用键值。

**被否方案**：
- *方案 A（平铺到 Sample 联合）*：Sample 变成 `Steel | Cement | ...` 联合类型，Zustand store / React 列表 / MSW 每处持样品的容器都要反复按 materialType 收窄，摩擦大。访问扁平的好处不足以抵消容器稳定性损失。
- *方案 B（大 interface 全 optional）*：类型安全最差——`s.cementType` 在钢材样品上也"存在"(undefined)，编译器不拦，字段爆炸。
- *方案 C（动态 attrs 键值）*：放弃 TS 类型保护，拼写错/类型混都不报，IDE 无补全。
- *泛型 `Sample<T>` 变体*：兼顾单一 interface + 专属精确，但泛型在专用组件里传染（`Sample<'steel'>`），复杂度高，留作 ch16 进阶素材而非默认实现。

**选 D 的理由**：
1. 真实业务有分层语义——通用样品信息（编号/名称/种类/规格/状态/数量）是任何样品都有的稳定属性，材料专属（钢筋牌号/炉号、水泥品种/强度等级）随材料变化，嵌套如实反映这条边界。
2. Sample 保持单一 interface，外层操作（列表/搜索/分页/状态流转）不需收窄；只有渲染/校验专属字段时下钻到 materialDetails。
3. 教学价值高：可讲「组合优于继承/大杂烩」「嵌套 discriminated union 的类型守卫」「稳定外层 + 变化内核的分层建模」——比平铺联合多一层洞见，更贴合企业级建模。

**全部字段可选的取舍（2026-07-02 调整）**：上提的通用字段与 MaterialDetails 各变体字段全部标 `?` 可选（仅 `sampleCode`/`materialType`/`kind` 这些标识/分类字段必填）。理由：
- 接样登记是分步过程（委托时只录编号+材料种类+大类名称，型号/规格/厂家等往往后续随样品流转或检测要求补充）
- 不同材料/不同送检场景（委托/见证/抽查）下字段填写深度不同，强制必填会被弱场景卡住
- 数据采集的真实性：现场接样常信息不全，强行要求"全字段必填"会催生假数据；可选字段允许"先登记、后补录"
- 校验下沉到表单层（按 materialType + 场景动态决定哪些字段必填），而不是类型层（泛型容器遍历时无需反复 null 检查）

**留痕目的**：repo-engineer 据此判断扩展边界（新材料只在 MaterialDetails 加变体 + 通用层字段不动；表单层按场景决定字段必填策略）；书稿 ch16（TypeScript 集成）/ch34（类型契约）可直接引用本节讲类型设计权衡与"必填下沉到表单层"的工程实践。

### 11.1 材料检测端 MaterialDetails 拆分（Sample 端 vs TestItem 端）

**决策**：拆分为 `SampleMaterialDetails`（Sample 端，样品固有属性）与 `TestItemMaterialDetails`（TestItem 端，检测端结构化属性），两端同构（`kind` 与 sample.materialDetails.kind 一致）但语义不同。

**被否方案**：
- *单 MaterialDetails 共用*：Sample 端"样品有什么"与 TestItem 端"检测什么"语义不同，硬合一会让"钢材力学指标"这类**检测结构**与"钢材牌号/直径"这类**样品属性**混在一起
- *TestItem 端用 taskGroup 标签*：把"力学/工艺/重量偏差"等 UI 分组概念硬编码到数据类型，把视图概念污染到数据模型（见 11.2）

**选 D（拆分 + 对称命名）的理由**：
1. **对称心智模型**：Sample.materialDetails 与 TestItem.materialDetails 字段名一致，类型独立表达各自语义
2. **关注点分离**：Sample = 样品**有什么**（跨时间稳定） vs TestItem = 此条检测在材料端**结构化属性**（与检测绑定）
3. **配置驱动**：检测参数（弯曲压头直径/角度/表面裂纹）按 `parameterCode` 引用 TestParameter 码表表达，UI 分组由 `TestParameter.category` 表达，类型保持稳定
4. **多试件材料**：concrete / rebar_mech / rebar_weld 额外承载 `specimenPositionInGroup`（试件组内位置 1/2/3）以区分同组多试件

**留痕目的**：repo-engineer 据此实现两端独立类型（不复用）；书稿 ch34/ch37 引用讲"同构但语义不同的两端 MaterialDetails"——LIMS 数据建模的典型模式。

### 11.2 移除 TestItemMaterialDetails.taskGroup（关键设计修正）

**决策**：TestItemMaterialDetails **不再承载 `taskGroup` 字段**。分组（力学/工艺/重量偏差等）由 `TestParameter.category` 表达，UI 渲染时按 category 聚合。

**问题诊断（弯曲检测示例）**：
- 原 `taskGroup: 'process'` 试图把"弯曲检测"作为一个分组概念
- 但弯曲实际包含 3 个独立参数：STE010 弯曲压头直径 / STE009 弯曲角度 / STE011 表面裂纹——它们是 3 条独立 TestItem，每条独立引用 TestParameter 码表
- 用 1 个 `taskGroup: 'process'` 字段"打包"3 条参数，是把"如何展示"的 UI 概念硬塞进数据模型

**正确分层（三层分工）**：

| 关注点 | 表达位置 | 示例 |
|---|---|---|
| 这条检测**是什么参数** | `TestItem.parameterCode` 引用 TestParameter 码表 | STE009 = 弯曲角度 |
| 此参数**属于哪个分组** | `TestParameter.category` 字段 | 'process' = 工艺性能 |
| 此条检测在材料端的**结构化属性** | `TestItem.materialDetails` | 试件组内位置等 |

**优势**：
1. 检测参数新增/废弃 → 改 TestParameter 码表条目，类型不变
2. 分组调整（如把抗拉强度从力学移到工艺）→ 改 TestParameter.category，类型不变
3. 多语言/单位切换 → 改 TestParameter.name/unit，类型不变
4. 避免"按材料硬编码分组"导致的类型爆炸（每个新检测参数都要改 TestItemMaterialDetails 联合类型）

**留痕目的**：repo-engineer 不实现 taskGroup 字段；书稿 ch34/ch37 引用讲"数据模型 vs 视图模型分离"——分组是 UI 概念，配置放码表，不污染类型。

---

## 12. 执行注意

- 这是一次**大重构**（非只增不改），属召回重制「对齐真实业务」例外。git 单独 commit `refactor(model): 四层模型（Contract/SampleReceipt/Sample+materialDetails/Report+sampleIds）对齐真实检测实验室`。
- 建议与 extend 批2 UI 层合并到 `v1.1-001` tag（一次 tag 含：四层模型对齐 + 批2 UI 层 + 全量回归）。或分两次：`v1.1-001` 模型对齐、`v1.2-001` UI 补齐。
- 正文 ch34（表 34-1、目录结构）+ ch36（数据管理 CRUD，现含 receipts）+ ch37（流程）摘录代码块同步对齐新模型。
- `SampleMaterialDetails` 与 `TestItemMaterialDetails` 的 discriminated union、`Report.sampleIds[]` 的一对多、`SampleReceipt 1→N Sample` 的批量关系——都是 TypeScript 类型设计与数据库关系设计的实战教学点（ch16/ch34 可呼应）。
- 配额中断（429，7-17 重置）期间 repo-engineer 无法调度，本规格已落盘，恢复后执行。
