// 业务实体类型定义（建筑工程实验室管理系统）
// ch34：架构与路由章节的基础类型契约
// batch3-A1：按 FIELD-ALIGNMENT-SPEC.md 第 0.5~7 节重写四层模型；保留旧字段名作为
//            @deprecated 兼容字段，避免破坏 291 tests 的字段引用
//            （components/store/tests 字段同步在批3-A3/A4）

// =============================================================================
// 通用基础（保留，ch34/ch35/ch36/ch37 引用）
// =============================================================================

/** 权限码：资源:操作（如 project:read、user:delete） */
export type Permission = string

/** 角色 */
export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

/** 用户 */
export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  /** 用户最终权限集合（角色权限 + 个人授权的并集） */
  permissions: Permission[]
}

/** 统一 API 结果：成功带 value，失败带 error */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** 分页响应 */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页查询参数 */
export interface PageQuery {
  page: number
  pageSize: number
  keyword?: string
}

/** 日期范围筛选 */
export interface DateRangeFilter {
  dateFrom?: string
  dateTo?: string
}

// =============================================================================
// batch3-A1：四层模型权威定义（FIELD-ALIGNMENT-SPEC.md 第 0.5~7 节）
// =============================================================================

/** 材料种类（7 种） */
export type MaterialType =
  | 'steel'
  | 'cement'
  | 'concrete'
  | 'sand'
  | 'gravel'
  | 'rebar_mech'
  | 'rebar_weld'

// ----- 0.5 OrgInfo（系统级单例配置：检测单位信息） -----
export interface OrgInfo {
  orgName: string
  registeredAddress: string
  testingSiteAddress: string
  postalCode: string
  contactPhone: string
  email: string
  qualificationCertNo: string
  updatedAt: string
}

// ----- 1. Contract（合同/委托，取代原 Project） -----
export type ContractStatus = 'active' | 'archived'

export interface Contract {
  id: string
  contractCode: string
  clientUnit: string
  projectName: string
  projectLocation?: string
  constructionUnit: string
  witnessUnit: string
  witness: string
  witnessPhone?: string
  contactPerson?: string
  contactPhone?: string
  entrustedDate?: string
  selfCheckConclusion?: { operator: string; conclusion: string; date: string; sealed: boolean }
  recheckConclusion?: { operator: string; conclusion: string; date: string; sealed: boolean }
  status: ContractStatus
  createdAt: string
  updatedAt: string
}

// ----- 2. SampleReceipt（接样信息，一次接样 N 个样品共享） -----
export type ReceiptStatus = 'received' | 'testing' | 'completed' | 'rejected'

export interface SampleReceipt {
  id: string
  contractId: string
  receiptCode: string
  receivedDate: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  /** 此次接样的检测环境（温度/湿度）——接样层业务属性 */
  testEnvironment?: string
  /** 此次接样用到的设备 */
  mainEquipment?: string
  representBatchSummary?: string
  remark: string
  status: ReceiptStatus
  createdAt: string
  updatedAt: string
}

// ----- 3. Sample 状态 -----
export type SampleStatus = 'pending' | 'testing' | 'completed' | 'rejected'

// ----- 3.1 SampleMaterialDetails（样品端——材料专属属性联合，字段全 ?） -----
export type SampleMaterialDetails =
  | { kind: 'steel'; steelGrade?: string; nominalDiameter?: number; heatNumber?: string }
  | { kind: 'cement'; cementType?: string; factoryBatchNo?: string; productionDate?: string }
  | {
      kind: 'concrete'
      pourDate?: string
      volume?: number
      specimenSize?: string
      curingCondition?: string
      ageDays?: number
      groupIndex?: number
    }
  | { kind: 'sand' }
  | { kind: 'gravel' }
  | { kind: 'rebar_mech'; spliceType?: string; steelGrade?: string; groupIndex?: number }
  | { kind: 'rebar_weld'; weldMethod?: string; steelGrade?: string; welderName?: string; welderCertNo?: string; groupIndex?: number }

// ----- 4. TestItemMaterialDetails（检测端——材料专属属性联合） -----
export type TestItemMaterialDetails =
  | { kind: 'steel' }
  | { kind: 'cement' }
  | { kind: 'sand' }
  | { kind: 'gravel' }
  | { kind: 'concrete'; specimenPositionInGroup?: number }
  | { kind: 'rebar_mech'; specimenPositionInGroup?: number }
  | { kind: 'rebar_weld'; specimenPositionInGroup?: number }

// ----- 4. TestRecordSheet（检测记录单——原始检测任务记录） -----
export interface TestRecordSheet {
  id: string
  contractId: string
  receiptId?: string
  /** 本记录单归属的样品/试件列表（N ↔ M） */
  sampleIds: string[]
  sheetCode: string
  testDate: string
  operatorId?: string
  reviewerId?: string
  equipment?: string
  environment?: string
  remark?: string
  createdAt: string
}

// ----- 4. TestItem（单项检测记录——归属 sheet/report） -----
export interface TestItem {
  id: string
  sheetId: string
  sampleId: string
  /** 归属的报告（未出报告时 null；一旦绑定不可改） */
  reportId: string | null
  parameterCode: string
  standardCode?: string
  requirementCode?: string
  /** 技术要求显示文本（冗余存以兼容离线/历史快照） */
  requirement: string
  result: string
  unit?: string
  passed: boolean
  materialDetails: TestItemMaterialDetails
  remark?: string
  createdAt: string
}

// =============================================================================
// 兼容层：保留旧类型与旧字段名（避免破坏 291 tests 字段引用）
// =============================================================================

// ----- 兼容层 1: 旧 ProjectStatus（ch36 旧组件引用，含 'paused' 扩展） -----
/** @deprecated batch3-A 后由 ContractStatus 取代；保留旧状态值（含 'paused'，Contract 不含此值）供既有 store/tests 引用 */
export type ProjectStatus = 'active' | 'archived' | 'paused'

// ----- 兼容层 2: 旧 Project（ch36 项目文件字段引用：name/code/status/ownerId） -----
/** @deprecated batch3-A 后由 Contract 取代。保留旧字段名供既有 store/components/tests 引用；批3-A3 同步后删除 */
export interface Project {
  id: string
  name: string
  code: string
  status: ProjectStatus
  ownerId: string
  createdAt: string
  updatedAt: string
}

// ----- 兼容层 3: 旧 Sample（ch36 样品文件字段引用：name/code/projectId/status） -----
/** @deprecated batch3-A 后由新 Sample（materialType/materialDetails/sampleCode/通用层）取代。保留旧字段名供既有 store/components/tests 引用；批3-A3 同步后删除 */
export interface Sample {
  id: string
  projectId: string
  name: string
  code: string
  status: SampleStatus
  receivedAt: string
  createdAt: string
}

// ----- 兼容层 4: 旧 Report（extend 批1 报告文件字段引用：sampleId/title） -----
/** @deprecated batch3-A 后由新 Report（contractId/receiptId/sampleIds[]/materialType）取代。保留旧字段名供既有 ReportFormModal/ReportList/tests 引用；批3-A3 同步后删除 */
export interface Report {
  id: string
  sampleId: string
  title: string
  status: ReportStatus
  conclusion: string
  /** 签发时间，未签发为 null */
  issuedAt: string | null
  createdAt: string
}

// ----- 旧 ReportTestItems 联合类型（钢材/水泥/混凝土/砂石/钢筋连接检测项，兼容层） -----
// @deprecated 规格 11.1 ADR：检测项迁到独立 TestItem 实体的 reportId 反查，
// 旧 ReportTestItems 联合类型仅供既有 tests 兼容，迁移后删除。

/** 钢材检测项（兼容层） */
export interface SteelTestItems {
  yieldStrength?: number
  tensileStrength?: number
  elongation?: number
  bendAngle?: number
  mandrelDiameter?: number
  surfaceCrack?: string
}

/** 水泥检测项（兼容层） */
export interface CementTestItems {
  specificSurface?: number
  settingTimeInitial?: number
  settingTimeFinal?: number
  soundness?: string
  so3?: number
  mgo?: number
  cl?: number
  alkali?: number
  compressive3d?: number
  compressive28d?: number
  flexural3d?: number
  flexural28d?: number
}

/** 混凝土试件检测项（兼容层） */
export interface ConcreteTestItems {
  compressiveStrength?: number
  compressiveRepresentative?: number
  ageDays?: number
}

/** 砂石检测项（兼容层） */
export interface AggregateTestItems {
  mudContent?: number
  clayLump?: number
  methyleneBlue?: number
  stonePowder?: number
  crushIndex?: number
  soundness?: number
  flakyParticle?: number
  apparentDensity?: number
  bulkDensity?: number
  voidRatio?: number
  waterContent?: number
  shellContent?: number
  chlorideIon?: number
  finenessModulus?: number
}

/** 钢筋机械连接检测项（兼容层） */
export interface RebarMechTestItems {
  nominalDiameter?: number
  ultimateTensileStrength?: number
  fracturePosition?: string
}

/** 钢筋焊接连接检测项（兼容层） */
export interface RebarWeldTestItems {
  nominalDiameter?: number
  tensileStrength?: number
  fractureDistanceFromWeld?: number
  fractureFeature?: string
  bend90Test?: string
}

/** 旧 Report.testItems 联合类型（兼容层） */
export type ReportTestItems =
  | SteelTestItems
  | CementTestItems
  | ConcreteTestItems
  | AggregateTestItems
  | RebarMechTestItems
  | RebarWeldTestItems

// ----- LegacyTestItem（兼容层：旧 TestItem 形态） -----
/** @deprecated 用 TestItem 替代；此类型仅供既有 tests 兼容 */
export interface LegacyTestItem {
  requirement: string
  result: string
  passed: boolean
}

// ----- 5. Report 状态 -----
export type ReportStatus = 'draft' | 'reviewing' | 'issued' | 'printed' | 'archived'

// ----- 5.1 ReportRecord（v2 报告实体：sampleIds[]/reportCode/materialType，四层模型） -----
export interface ReportRecord {
  id: string
  contractId: string
  receiptId: string
  reportCode: string
  reportDate: string
  materialType: MaterialType
  sampleIds: string[]
  conclusion: string
  result: 'pass' | 'fail'
  remark: string
  status: ReportStatus
  issuedAt: string | null
  createdAt: string
  updatedAt: string
  sampleId?: string
  title?: string
}

// =============================================================================
// 7. 码表（检测参数/标准/技术要求）
// =============================================================================

export interface TestParameter {
  code: string
  name: string
  materialType: MaterialType
  category: string
  unit?: string
  description?: string
}

export interface TestStandard {
  code: string
  name: string
  type: 'national' | 'industry' | 'local' | 'enterprise'
  applicableMaterials: MaterialType[]
  applicableParameters: string[]
}

export interface TechnicalRequirement {
  code: string
  standardCode: string
  parameterCode: string
  materialType: MaterialType
  materialGrade?: string
  specification?: string
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'
  value: string
  unit?: string
  remark?: string
}

// =============================================================================
// 6. SummaryRow：钢材汇总表行（其余材料各自 SummaryRow 在批3-A5 路由接入时按需补）
// =============================================================================

export interface SteelSummaryRow {
  seq: number
  spec: string
  steelGrade: string
  qualityCertNo: string
  manufacturer: string
  representQuantity: string
  reportCode: string
  testDate: string
  result: 'pass' | 'fail'
}

// =============================================================================
// Query / Input 类型（每个实体的 CRUD 参数，保留旧字段名 + 按需扩展）
// =============================================================================

/** 项目列表查询参数（ch36 旧 + 兼容层） */
export interface ProjectQuery extends PageQuery, DateRangeFilter {
  status?: ProjectStatus
  ownerId?: string
}

/** 样品列表查询参数（ch36 旧 + 兼容层扩展 receiptId/materialType） */
export interface SampleQuery extends PageQuery {
  status?: SampleStatus
  projectId?: string
  receiptId?: string
  materialType?: MaterialType
}

/** 项目新建载荷（兼容层） */
export interface ProjectCreateInput {
  name: string
  code: string
  status?: ProjectStatus
  ownerId: string
}

/** 项目更新载荷（兼容层） */
export interface ProjectUpdateInput {
  name?: string
  code?: string
  status?: ProjectStatus
  ownerId?: string
}

/** 样品新建载荷（兼容层——保留旧 name/code/projectId 字段供既有组件引用） */
export interface SampleCreateInput {
  projectId: string
  name: string
  code: string
  status?: SampleStatus
}

/** 样品更新载荷（兼容层） */
export interface SampleUpdateInput {
  projectId?: string
  name?: string
  code?: string
  status?: SampleStatus
}

/** 报告列表查询参数（兼容层 + 扩展 contractId） */
export interface ReportQuery extends PageQuery {
  sampleId?: string
  status?: ReportStatus
  contractId?: string
}

/** 报告新建载荷（兼容层——保留旧 sampleId/title 字段供既有组件引用） */
export interface ReportCreateInput {
  sampleId: string
  title: string
  conclusion?: string
}

/** 报告更新载荷（兼容层——保留旧 title/status 字段） */
export interface ReportUpdateInput {
  title?: string
  conclusion?: string
  status?: ReportStatus
}

/** 审核动作类型（extend 批1） */
export type ReviewAction = 'submit' | 'approve' | 'reject'

// =============================================================================
// extend 批1：用户管理类型（RBAC 落地）
// =============================================================================

export interface UserRecord {
  id: string
  username: string
  displayName: string
  email: string
  roleId: string
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface UserQuery extends PageQuery {
  role?: string
  status?: 'active' | 'disabled'
}

export interface UserCreateInput {
  username: string
  displayName: string
  email: string
  roleId: string
  status?: 'active' | 'disabled'
}

export interface UserUpdateInput {
  displayName?: string
  email?: string
  roleId?: string
  status?: 'active' | 'disabled'
}

// =============================================================================
// extend 批1：角色管理类型
// =============================================================================

export interface RoleRecord {
  id: string
  name: string
  description: string
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

export interface RoleQuery extends PageQuery {
  name?: string
}

export interface RoleCreateInput {
  name: string
  description?: string
  permissions: Permission[]
}

export interface RoleUpdateInput {
  name?: string
  description?: string
  permissions?: Permission[]
}

// =============================================================================
// extend 批2：检测任务（兼容层——保留旧 sampleId/testItems 字段供既有 store/tests）
// =============================================================================

export type TaskStatus = 'pending' | 'testing' | 'completed' | 'rejected'

export interface TaskRecord {
  id: string
  sampleId: string
  assigneeId: string
  testItems: string
  status: TaskStatus
  /** 检测数据（JSON 字符串，由检测员录入） */
  resultData: string
  /** 检测结论 */
  conclusion: string
  createdAt: string
  updatedAt: string
}

export interface TaskQuery extends PageQuery {
  sampleId?: string
  status?: TaskStatus
  assigneeId?: string
}

export interface TaskCreateInput {
  sampleId: string
  assigneeId: string
  testItems: string
}

export interface TaskUpdateInput {
  assigneeId?: string
  testItems?: string
  status?: TaskStatus
}

export interface TaskEntryInput {
  resultData: string
  conclusion: string
  status: 'completed' | 'rejected'
}

// =============================================================================
// extend 批2：Dashboard 聚合统计（兼容层——保留旧 projectCount 字段名）
// =============================================================================

export interface DashboardStats {
  /** @deprecated batch3-A 后由 contractCount 取代；保留以兼容旧组件 */
  projectCount?: number
  contractCount?: number
  receiptCount?: number
  sampleCount?: number
  sampleCountByStatus: { pending: number; testing: number; completed: number; rejected: number }
  reportCountByStatus: { draft: number; reviewing: number; issued: number }
  pendingTaskCount: number
}

// =============================================================================
// extend 批2：密码修改
// =============================================================================

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}