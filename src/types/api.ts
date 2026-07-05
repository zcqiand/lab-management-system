// 业务实体类型定义（建筑工程实验室管理系统 v3）
// 领域模型：
//   合同 Contract → 接样单 SampleReceipt（含报告类别 categoryCode、合并报告字段、流程状态）
//     → 样品 Sample（归属接样单，型号/规格/等级/牌号 + 按报告类别的扩展属性 ext）
//       → 单项检测记录 TestItem（归属样品，自动评定 + 手工修正）
// 基础码表：报告类别 / 类别↔标准关联 / 检测参数 / 检测标准 / 技术要求 /
//           型号 / 规格 / 等级 / 牌号 / 报告模板

// =============================================================================
// 通用基础
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
// OrgInfo（系统级单例配置：检测单位信息）
// =============================================================================

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

// =============================================================================
// Contract（合同/委托）
// =============================================================================

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
  status: ContractStatus
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 报告类别（原「材料种类」，可维护码表）
// =============================================================================

/** 报告类别扩展属性定义：新建样品时按类别动态渲染扩展属性输入项 */
export interface ExtFieldDef {
  key: string
  label: string
}

/** 汇总表口径：material=原材料汇总 / concrete=混凝土抗压汇总 / connection=连接接头汇总 */
export type SummaryType = 'material' | 'concrete' | 'connection'

export interface ReportCategory {
  id: string
  code: string
  name: string
  /** 报告文档大标题，如「钢筋力学性能、工艺性能、重量偏差检测报告」 */
  reportTitle: string
  summaryType: SummaryType
  /** 汇总表名称，如「钢材试验报告汇总表」 */
  summaryName: string
  /** 样品扩展属性定义（可维护） */
  extFields: ExtFieldDef[]
  /** 排序号（越小越靠前），用户可维护 */
  sortOrder: number
  remark?: string
  createdAt: string
  updatedAt: string
}

/** 报告类别 ↔ 检测标准 关联 */
export interface CategoryStandard {
  id: string
  categoryCode: string
  standardCode: string
  remark?: string
  createdAt: string
  updatedAt: string
}

/** 型号/规格/等级/牌号 码表条目（均归属报告类别） */
export interface CategoryDictItem {
  id: string
  categoryCode: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 流程管线（接样表与报告表合并为一张表，单一流程线）
// =============================================================================

/** 流程阶段：接样 → 任务安排 → 数据录入 → 报告审核 → 报告批准 → 报告发放 → 报告归档 */
export type FlowStage =
  | 'receiving'
  | 'task_assignment'
  | 'data_entry'
  | 'review'
  | 'approval'
  | 'issuance'
  | 'archived'

/** 流程阶段顺序（前进 = 提交，后退 = 退回/撤回） */
export const FLOW_STAGE_ORDER: FlowStage[] = [
  'receiving',
  'task_assignment',
  'data_entry',
  'review',
  'approval',
  'issuance',
  'archived',
]

/** 流程阶段中文名 */
export const FLOW_STAGE_LABELS: Record<FlowStage, string> = {
  receiving: '接样',
  task_assignment: '任务安排',
  data_entry: '数据录入',
  review: '报告审核',
  approval: '报告批准',
  issuance: '报告发放',
  archived: '已归档',
}

/** 流程动作：submit=提交（前进）、return=退回（后退）、withdraw=撤回（提交人主动收回） */
export type FlowAction = 'submit' | 'return' | 'withdraw'

/** 流程历史条目 */
export interface FlowHistoryEntry {
  action: FlowAction
  from: FlowStage
  to: FlowStage
  operator: string
  at: string
  reason?: string
}

/** 批量流程操作的单条结果 */
export interface FlowActionResult {
  id: string
  ok: boolean
  message?: string
  flowStatus?: FlowStage
}

// =============================================================================
// SampleReceipt（接样单：接样表与报告表合并为一张表）
// =============================================================================

export interface SampleReceipt {
  id: string
  contractId: string
  receiptCode: string
  /** 报告类别——样品扩展属性、报告模板、汇总口径均由此决定 */
  categoryCode: string
  receivedDate: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  testEnvironment?: string
  mainEquipment?: string
  remark?: string
  // ----- 流程管线 -----
  flowStatus: FlowStage
  flowHistory: FlowHistoryEntry[]
  /** 最近一次提交的操作人（撤回权限校验：仅提交人可撤回） */
  lastSubmittedBy: string | null
  /** 任务安排：检测人员 / 计划检测日期 */
  assigneeId?: string
  assigneeName?: string
  plannedTestDate?: string
  // ----- 合并自报告表 -----
  reportCode?: string
  reportDate?: string
  conclusion?: string
  result?: 'pass' | 'fail' | ''
  issuedAt?: string | null
  createdAt: string
  updatedAt: string
}

// =============================================================================
// Sample（样品，归属接样单 receiptId；合同经接样单间接得到）
// =============================================================================

export interface Sample {
  id: string
  receiptId: string
  sampleCode: string
  sampleName?: string
  /** 型号：热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊 */
  model?: string
  /** 规格（尺寸/粒径/直径）：Φ22 / 150×150×150mm / 5-25mm；无尺寸的类别留空 */
  specification?: string
  /** 等级：接头Ⅰ/Ⅱ/Ⅲ级、砂石Ⅰ/Ⅱ/Ⅲ类；型号已含等级的类别留空 */
  grade?: string
  /** 牌号：HRB400 等 */
  brand?: string
  /** 生产厂家 */
  manufacturer?: string
  /** 结构部位 */
  structuralPart?: string
  /** 代表数量 */
  representQuantity?: string
  sampleQuantity?: string
  /** 按报告类别 extFields 定义的扩展属性 */
  ext: Record<string, string>
  remark?: string
  createdAt: string
  updatedAt: string
}

/** 新建样品入参 */
export interface SampleCreateInput {
  receiptId: string
  sampleCode: string
  sampleName?: string
  model?: string
  specification?: string
  grade?: string
  brand?: string
  manufacturer?: string
  structuralPart?: string
  representQuantity?: string
  sampleQuantity?: string
  ext?: Record<string, string>
  remark?: string
}

/** 更新样品入参（全量更新，同 create） */
export type SampleUpdateInput = SampleCreateInput

// =============================================================================
// TestItem（单项检测记录，归属样品 sampleId）
// =============================================================================

export interface TestItem {
  id: string
  sampleId: string
  parameterCode: string
  standardCode?: string
  requirementCode?: string
  /** 技术要求显示文本，如「≥ 400 MPa」 */
  requirement: string
  result: string
  unit?: string
  /** 系统按技术要求自动评定的结果（null = 无法自动评定，需人工判定） */
  autoPassed: boolean | null
  /** 最终评定结果（默认取 autoPassed，可手工修正） */
  passed: boolean
  remark?: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 检测码表
// =============================================================================

export interface TestParameter {
  id: string
  code: string
  name: string
  /** 归属报告类别 */
  categoryCode: string
  group?: string
  unit?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type StandardType = 'national' | 'industry' | 'local' | 'enterprise'

export interface TestStandard {
  id: string
  code: string
  name: string
  type: StandardType
  remark?: string
  createdAt: string
  updatedAt: string
}

export type ComparisonOp = '≥' | '≤' | '=' | 'range' | 'eq'

export interface TechnicalRequirement {
  id: string
  code: string
  standardCode: string
  parameterCode: string
  /** 归属报告类别 */
  categoryCode: string
  /** 匹配维度：技术要求上填写了的维度必须与样品一致；空 = 不限 */
  brand?: string
  model?: string
  grade?: string
  specification?: string
  comparison: ComparisonOp
  value: string
  unit?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 报告模板（每个报告类别对应一份，内容为带 {{标签}} 的 HTML）
// =============================================================================

export interface ReportTemplate {
  id: string
  categoryCode: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 统计：仪表盘 + 试验报告汇总表
// =============================================================================

export interface DashboardStats {
  contractCount: number
  receiptCount: number
  sampleCount: number
  /** 由接样单 flowStatus 推导（draft=审核前阶段 / reviewing=审核+批准 / issued=发放+归档） */
  reportCountByStatus: { draft: number; reviewing: number; issued: number }
  /** 处于「任务安排」阶段的接样单数量 */
  pendingTaskCount: number
  /** 各流程阶段的接样单数量 */
  receiptCountByStage: Record<FlowStage, number>
  /** 各报告类别的接样单数量与已出报告数 */
  receiptCountByCategory: { categoryCode: string; categoryName: string; count: number; reported: number }[]
}

export interface SummaryColumn {
  key: string
  label: string
}

/** 试验报告汇总表（对应各类汇总表：钢材/水泥/混凝土/砂/碎石/机械连接/焊接连接） */
export interface SummaryData {
  summaryName: string
  columns: SummaryColumn[]
  rows: Record<string, string>[]
}

// =============================================================================
// 用户管理（RBAC）
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
// 角色管理
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
// 密码修改
// =============================================================================

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}
