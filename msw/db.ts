// Mock 内存数据库（v3）——实验室管理系统单一流程线版
// 领域模型：
//   合同 Contract → 接样单 Receipt（含报告类别 categoryCode、合并报告字段、流程状态）
//     → 样品 Sample（归属接样单 receiptId，型号/规格/等级/牌号 + 按报告类别的扩展属性 ext）
//       → 单项检测记录 TestItem（归属样品 sampleId，自动评定 + 手工修正）
// 基础码表：报告类别 / 报告类别关联标准 / 检测参数 / 检测标准 / 技术要求 /
//           型号 / 规格 / 等级 / 牌号（均归属报告类别）/ 报告模板（每类别一份）
// M06 检测能力：专项 / 项目 / 参数 / 标准 / 4 张关联表

// 注意：本模块会被 msw/browser.ts 引入浏览器 bundle，因此不得在顶层使用
// node:* 内建模块（Vite 会将其 externalize 为 undefined，导致 module load 抛错、
// MSW 起不来，最终 /api/* 被 bypass 到 Vite dev server 返回 index.html）。
// master data 通过 Vite/TS 静态 JSON 导入（resolveJsonModule 已开启），
// 每个类型一个文件（裸数组），由 scripts/data/build-master-data.mjs 从 CSV 生成。
import generatedSpecialties from '../src/data/generated/inspection-specialty.json'
import generatedObjects from '../src/data/generated/inspection-object.json'
import generatedParameters from '../src/data/generated/inspection-parameter.json'
import generatedStandards from '../src/data/generated/inspection-standard.json'
import generatedObjectParameters from '../src/data/generated/inspection-object-parameter.json'
import generatedObjectStandards from '../src/data/generated/inspection-object-standard.json'
import generatedStandardParameters from '../src/data/generated/inspection-standard-parameter.json'
import generatedSpecialtyObjects from '../src/data/generated/inspection-specialty-object.json'

export interface Timestamped {
  createdAt: string
  updatedAt: string
}

function now(): string {
  return new Date().toISOString()
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

/** 通用内存表：支持分页、关键词搜索、字段精确过滤、日期范围 */
export class MockTable<T extends { id: string } & Timestamped> {
  private rows: T[] = []

  constructor(private idPrefix: string) {}

  reset() {
    this.rows = []
  }

  insert(row: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id'>>): T {
    const entity = {
      ...row,
      id: row.id ?? genId(this.idPrefix),
      createdAt: now(),
      updatedAt: now(),
    } as T
    this.rows.push(entity)
    return entity
  }

  findById(id: string): T | undefined {
    return this.rows.find((r) => r.id === id)
  }

  all(): T[] {
    return [...this.rows]
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const idx = this.rows.findIndex((r) => r.id === id)
    if (idx === -1) return undefined
    const updated = { ...this.rows[idx], ...patch, id, updatedAt: now() } as T
    this.rows[idx] = updated
    return updated
  }

  remove(id: string): boolean {
    const idx = this.rows.findIndex((r) => r.id === id)
    if (idx === -1) return false
    this.rows.splice(idx, 1)
    return true
  }

  query(opts: {
    page: number
    pageSize: number
    keyword?: string
    keywordFields?: (keyof T)[]
    filters?: Partial<T>
    dateField?: keyof T
    dateFrom?: string
    dateTo?: string
    /** 排序字段，默认 createdAt */
    sortField?: keyof T
  }): { items: T[]; total: number; page: number; pageSize: number } {
    const { page, pageSize, keyword, keywordFields, filters, dateField, dateFrom, dateTo, sortField } = opts
    let filtered = [...this.rows]
    if (keyword && keywordFields?.length) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter((row) =>
        keywordFields.some((f) => String(row[f] ?? '').toLowerCase().includes(kw)),
      )
    }
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          filtered = filtered.filter((row) => row[key as keyof T] === value)
        }
      }
    }
    if (dateField && (dateFrom || dateTo)) {
      filtered = filtered.filter((row) => {
        const v = row[dateField] as unknown as string
        if (!v) return true
        if (dateFrom && v < dateFrom) return false
        if (dateTo && v > dateTo) return false
        return true
      })
    }
    const sf = (sortField ?? 'createdAt') as keyof T
    filtered.sort((a, b) => {
      const av = a[sf] as string | number | undefined
      const bv = b[sf] as string | number | undefined
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return av < bv ? -1 : av > bv ? 1 : 0
    })
    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return { items, total, page, pageSize }
  }
}

// =============================================================================
// 表定义
// =============================================================================

/** 合同类别码表 */
export const contractCategoryTable = new MockTable<{
  id: string
  name: string
  sortOrder: number
  remark?: string
  createdAt: string
  updatedAt: string
}>('cc')

/** 合同/委托表 */
export const contractTable = new MockTable<{
  id: string
  contractCode: string
  clientUnit: string
  projectName: string
  projectLocation?: string
  constructionUnit: string
  contractCategory?: string
  buildingUnit?: string
  supervisorUnit?: string
  inspectionPerson?: string
  inspectionPhone?: string
  witnessUnit: string
  witness: string
  witnessPhone?: string
  contactPerson?: string
  contactPhone?: string
  entrustedDate?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}>('c')

/** 流程阶段（接样 → 任务安排 → 数据录入 → 报告审核 → 报告批准 → 报告发放 → 报告归档） */
export type FlowStage =
  | 'receiving'
  | 'task_assignment'
  | 'data_entry'
  | 'review'
  | 'approval'
  | 'issuance'
  | 'archived'

export const FLOW_STAGE_ORDER: FlowStage[] = [
  'receiving',
  'task_assignment',
  'data_entry',
  'review',
  'approval',
  'issuance',
  'archived',
]

export interface FlowHistoryEntry {
  action: 'submit' | 'return' | 'withdraw'
  from: FlowStage
  to: FlowStage
  operator: string
  at: string
  reason?: string
}

/** 报告类别扩展属性定义（新建样品时按类别动态渲染） */
export interface ExtFieldDef {
  key: string
  label: string
}

/** 报告类别码表（原「材料种类」升级为可维护的报告类别） */
export const reportCategoryTable = new MockTable<{
  id: string
  code: string
  name: string
  /** 报告文档大标题，如「钢筋力学性能、工艺性能、重量偏差检测报告」 */
  reportTitle: string
  /** 汇总表口径：material=原材料汇总 / concrete=混凝土抗压汇总 / connection=连接接头汇总 */
  summaryType: 'material' | 'concrete' | 'connection'
  /** 汇总表名称，如「钢材试验报告汇总表」 */
  summaryName: string
  /** 样品扩展属性定义（可维护） */
  extFields: ExtFieldDef[]
  /** 排序号（越小越靠前），用户可维护 */
  sortOrder: number
  remark?: string
  createdAt: string
  updatedAt: string
}>('cat')

/** 报告类别 ↔ 检测标准 关联表 */
export const categoryStandardTable = new MockTable<{
  id: string
  categoryCode: string
  standardCode: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('cs')

/** 检测标准 ↔ 检测参数 关联表 */
export const standardParametersTable = new MockTable<{
  id: string
  standardCode: string
  parameterCode: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('sp')

/** 型号码表（归属报告类别）：热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊 */
export const modelTable = new MockTable<{
  id: string
  categoryCode: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('mdl')

/** 规格码表（归属报告类别）：Φ22 / 150×150×150mm / 5-25mm；无尺寸的类别留空 */
export const specificationTable = new MockTable<{
  id: string
  categoryCode: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('spc')

/** 等级码表（归属报告类别）：接头等级Ⅰ/Ⅱ/Ⅲ级、砂石类别Ⅰ/Ⅱ/Ⅲ类；型号已含等级的类别留空 */
export const gradeTable = new MockTable<{
  id: string
  categoryCode: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('grd')

/** 牌号码表（归属报告类别）：HRB400 等 */
export const brandTable = new MockTable<{
  id: string
  categoryCode: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('brd')

// =============================================================================
// M06 检测能力内存表
// =============================================================================

/** 检测专项（InspectionSpecialty） */
export const inspectionSpecialtyTable = new MockTable<{
  id: string
  code: string
  officialNo: string
  name: string
  isOfficial: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}>('insp-sp')

/** 检测项目（InspectionObject） */
export const inspectionObjectTable = new MockTable<{
  id: string
  code: string
  inspectionSpecialtyCode: string
  sourceProjectNo: string
  sourceProjectName: string
  name: string
  isOptionalForQualification: boolean
  isOfficial: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}>('insp-obj')

/** 检测参数（InspectionParameter） */
export const inspectionParameterTable = new MockTable<{
  id: string
  code: string
  name: string
  rawName: string
  canonicalName: string
  methodText?: string
  aliases: string[]
  unit?: string
  sourceType: 'official' | 'custom'
  createdAt: string
  updatedAt: string
}>('insp-param')

/** 检测标准（InspectionStandard） */
export const inspectionStandardTable = new MockTable<{
  id: string
  code: string
  name: string
  version?: string
  status: 'active' | 'superseded' | 'draft'
  sourceDocumentId?: string
  sourceHash?: string
  createdAt: string
  updatedAt: string
}>('insp-std')

/** 检测项目 ↔ 检测参数（InspectionObjectParameter） */
export const inspectionObjectParameterTable = new MockTable<{
  id: string
  inspectionObjectCode: string
  inspectionParameterCode: string
  qualificationLevel: 'QUALIFIED' | 'RESTRICTED'
  sortOrder: number
  sourcePage?: number
  remark?: string
  createdAt: string
  updatedAt: string
}>('insp-obj-param')

/** 检测项目 ↔ 检测标准（InspectionObjectStandard） */
export const inspectionObjectStandardTable = new MockTable<{
  id: string
  inspectionObjectCode: string
  inspectionStandardCode: string
  role: 'TESTING' | 'JUDGMENT'
  remark?: string
  createdAt: string
  updatedAt: string
}>('insp-obj-std')

/** 检测标准 ↔ 检测参数（InspectionStandardParameter） */
export const inspectionStandardParameterTable = new MockTable<{
  id: string
  inspectionStandardCode: string
  inspectionParameterCode: string
  clause?: string
  methodName?: string
  unit?: string
  sampleRule?: string
  roundingRule?: string
  createdAt: string
  updatedAt: string
}>('insp-std-param')

/** 检测专项 ↔ 检测项目（InspectionSpecialtyObject） */
export const inspectionSpecialtyObjectTable = new MockTable<{
  id: string
  inspectionSpecialtyCode: string
  inspectionObjectCode: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('insp-sp-obj')

/** 接样单表（接样表与报告表合并为一张表，携带报告类别与全流程状态） */
export const receiptTable = new MockTable<{
  id: string
  contractId: string
  commissionCode: string
  commissionDate: string
  commissionRegisterCode?: string
  commissionRegisterDate?: string
  categoryCode: string
  projectName?: string
  clientUnit?: string
  buildingUnit?: string
  supervisorUnit?: string
  constructionUnit?: string
  witnessUnit?: string
  samplingLocation?: string
  witness?: string
  witnessPhone?: string
  inspector?: string
  inspectorPhone?: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  judgmentBasis?: string[]
  testingBasis?: string[]
  testParameters?: string[]
  remark?: string
  // ----- 流程管线 -----
  flowStatus: FlowStage
  flowHistory: FlowHistoryEntry[]
  lastSubmittedBy: string | null
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
}>('rc')

/** 样品表（归属接样单 receiptId；合同经接样单间接得到） */
export const sampleTable = new MockTable<{
  id: string
  receiptId: string
  sampleCode: string
  sampleName?: string
  /** 型号：热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊 */
  model?: string
  /** 规格：Φ22 / 150×150×150mm / 5-25mm */
  specification?: string
  /** 等级：Ⅰ/Ⅱ/Ⅲ级（接头）、Ⅰ/Ⅱ/Ⅲ类（砂石） */
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
  /** 出厂编号/批号 */
  batchNumber?: string
  /** 供销单位 */
  supplyUnit?: string
  /** 进场日期 */
  arrivalDate?: string
  /** 取（制）样日期 */
  samplingDate?: string
  /** 养护条件 */
  curingCondition?: string
  /** 龄期 */
  age?: string
  /** 按报告类别 extFields 定义的扩展属性 */
  ext: Record<string, string>
  remark?: string
  createdAt: string
  updatedAt: string
}>('s')

/** 单项检测记录表（归属样品 sampleId；autoPassed=自动评定，passed=最终评定可手工修正） */
export const testItemTable = new MockTable<{
  id: string
  sampleId: string
  parameterCode: string
  standardCode?: string
  requirementCode?: string
  requirement: string
  result: string
  unit?: string
  testValues?: number[]
  /** 各试件荷载值（N），抗折强度用 */
  loads?: number[]
  /** 各试件是否判定为无效（按位置，true=作废）；用于 CON006 抗折强度 */
  disqualified?: boolean[]
  representativeValue?: number
  autoPassed: boolean | null
  passed: boolean | null
  verdict?: string
  remark?: string
  /** 试验方法（用于安定性检测 CEM005） */
  testMethod?: string
  createdAt: string
  updatedAt: string
}>('ti')

/** 检测参数码表（归属报告类别） */
export const testParameterTable = new MockTable<{
  id: string
  code: string
  name: string
  categoryCode: string
  group?: string
  unit?: string
  valueCount?: number
  description?: string
  createdAt: string
  updatedAt: string
}>('tp')

/** 计算规则表（每个检测参数一条规则） */
export const calculationRuleTable = new MockTable<{
  id: string
  /** 归属检测参数编码 */
  parameterCode: string
  /** 算法类型：simple_avg=多样本均值, compressive_strength=混凝土±15%规则 */
  algorithmType: string
  /** 每组试件数量（CON002=3） */
  specimenCount: number
  /** 单位（MPa等） */
  unit?: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('cr')

/** 检测标准码表（与报告类别的关联经 categoryStandardTable 维护） */
export const testStandardTable = new MockTable<{
  id: string
  code: string
  name: string
  type: 'national' | 'industry' | 'local' | 'enterprise'
  remark?: string
  createdAt: string
  updatedAt: string
}>('ts')

/** 技术要求码表（按 报告类别 + 牌号/型号/等级/规格 匹配） */
export const technicalRequirementTable = new MockTable<{
  id: string
  code: string
  standardCode: string
  parameterCode: string
  categoryCode: string
  brand?: string
  model?: string
  grade?: string
  specification?: string
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'
  value: string
  unit?: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('tr')

/** 报告模板表（每个报告类别对应一份，内容为带 {{标签}} 的 HTML） */
export const reportTemplateTable = new MockTable<{
  id: string
  categoryCode: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}>('tpl')

/** OrgInfo 单例表 */
export const orgInfoTable = new MockTable<{
  id: string
  orgName: string
  registeredAddress: string
  testingSiteAddress: string
  postalCode: string
  contactPhone: string
  email: string
  qualificationCertNo: string
  createdAt: string
  updatedAt: string
}>('org')

export const userTable = new MockTable<{
  id: string
  username: string
  displayName: string
  email: string
  roleId: string
  status: string
  password: string
  createdAt: string
  updatedAt: string
}>('u')

export const roleTable = new MockTable<{
  id: string
  name: string
  description: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}>('role')

// =============================================================================
// 流程管线状态机（提交=前进一步 / 退回=后退一步 / 撤回=提交人主动收回）
// =============================================================================

const STAGE_LABELS: Record<FlowStage, string> = {
  receiving: '接样',
  task_assignment: '任务安排',
  data_entry: '数据录入',
  review: '报告审核',
  approval: '报告批准',
  issuance: '报告发放',
  archived: '已归档',
}

export interface FlowActionResult {
  id: string
  ok: boolean
  message?: string
  flowStatus?: FlowStage
}

function applyFlowActionOne(
  id: string,
  action: 'submit' | 'return' | 'withdraw',
  operator: string,
  reason?: string,
): FlowActionResult {
  const receipt = receiptTable.findById(id)
  if (!receipt) return { id, ok: false, message: '接样单不存在' }
  const current = receipt.flowStatus ?? 'receiving'
  const idx = FLOW_STAGE_ORDER.indexOf(current)
  const history = receipt.flowHistory ?? []
  const at = new Date().toISOString()

  if (action === 'submit') {
    if (idx >= FLOW_STAGE_ORDER.length - 1) {
      return { id, ok: false, message: '已归档，无法继续提交' }
    }
    const to = FLOW_STAGE_ORDER[idx + 1]
    const patch: Record<string, unknown> = {
      flowStatus: to,
      flowHistory: [...history, { action, from: current, to, operator, at }],
      lastSubmittedBy: operator,
    }
    // 报告批准 → 报告发放：视为批准签发，写入签发时间
    if (current === 'approval') patch.issuedAt = at
    receiptTable.update(id, patch as never)
    return { id, ok: true, flowStatus: to }
  }

  if (action === 'return') {
    if (idx <= 0) {
      return { id, ok: false, message: `当前处于「${STAGE_LABELS[current]}」，无法退回` }
    }
    const to = FLOW_STAGE_ORDER[idx - 1]
    receiptTable.update(id, {
      flowStatus: to,
      flowHistory: [...history, { action, from: current, to, operator, at, reason }],
      lastSubmittedBy: null,
    } as never)
    return { id, ok: true, flowStatus: to }
  }

  // withdraw：仅最近一次提交的操作人可撤回，且提交后未被继续流转
  const last = history[history.length - 1]
  if (!last || last.action !== 'submit' || last.to !== current) {
    return { id, ok: false, message: '当前状态不可撤回（提交后已被处理）' }
  }
  if (receipt.lastSubmittedBy !== operator) {
    return { id, ok: false, message: '仅提交人可撤回' }
  }
  receiptTable.update(id, {
    flowStatus: last.from,
    flowHistory: [...history, { action, from: current, to: last.from, operator, at }],
    lastSubmittedBy: null,
  } as never)
  return { id, ok: true, flowStatus: last.from }
}

/** 批量流程操作：submit（批量提交）/ return（批量退回）/ withdraw（批量撤回） */
export function applyFlowAction(
  ids: string[],
  action: 'submit' | 'return' | 'withdraw',
  operator: string,
  reason?: string,
): FlowActionResult[] {
  return ids.map((id) => applyFlowActionOne(id, action, operator, reason))
}

// =============================================================================
// 检测结果自动评定 + 接样单结论同步
// =============================================================================

export interface EvaluationResult {
  matched: boolean
  requirementCode?: string
  standardCode?: string
  requirement: string
  /** true/false=自动评定结果；null=匹配到要求但无法自动判定（如非数值指标） */
  autoPassed: boolean | null
  /** 多样本检测时的代表值（平均值） */
  representativeValue?: number
  /** 试验无效（±15%规则下所有值均超限） */
  invalid?: boolean
}

/** 从样品规格自动派生 specimenArea 和 correctionFactor */
function deriveSpecimenParams(parameterCode: string, specimenArea?: number, correctionFactor?: number, spec?: string): { specimenArea: number; correctionFactor: number; span?: number; width?: number; height?: number } {
  // 如果外部已传入（兼容旧逻辑），直接用
  if (specimenArea !== undefined && correctionFactor !== undefined) {
    return { specimenArea, correctionFactor }
  }
  if (!spec) return { specimenArea: 22500, correctionFactor: 1.0 }

  // 混凝土抗压（CON002）：从 "150×150×150mm" 解析
  if (parameterCode === 'CON002') {
    const match = spec.match(/(\d+)×(\d+)×(\d+)mm/)
    if (match) {
      const side = Number(match[1])
      const area = side * side
      const cf = side >= 150 ? 1.0 : 0.95
      return { specimenArea: area, correctionFactor: cf }
    }
  }

  // 混凝土抗折强度（CON006）："150×150×550mm"（标准）或 "100×100×400mm"（小试件）
  if (parameterCode === 'CON006') {
    const match = spec.match(/(\d+)×(\d+)×(\d+)mm/)
    if (match) {
      const b = Number(match[1])   // 宽度 mm
      const h = Number(match[2])   // 高度 mm
      const l = Number(match[3])   // 长度（跨度）mm
      // 换算系数：标准试件 150×150×550 → 1.00；小试件 100×100×400 → 0.85
      const cf = (b === 150 && h === 150 && l === 550) ? 1.0
        : (b === 100 && h === 100 && l === 400) ? 0.85
        : 1.0
      return { specimenArea: 22500, correctionFactor: cf, span: l, width: b, height: h }
    }
    // 默认标准试件
    return { specimenArea: 22500, correctionFactor: 1.0, span: 450, width: 150, height: 150 }
  }

  // 钢材：从 "Φ22" 等解析公称面积（GB/T 228）
  const diamMatch = spec.match(/Φ(\d+)/)
  if (diamMatch) {
    const d = Number(diamMatch[1])
    const steelAreas: Record<number, number> = {
      12: 113.1, 14: 153.9, 16: 201.1, 18: 254.5,
      20: 314.2, 22: 380.1, 25: 490.9, 28: 615.8, 32: 804.2,
    }
    const area = steelAreas[d]
    if (area) return { specimenArea: area, correctionFactor: 1.0 }
  }

  return { specimenArea: 22500, correctionFactor: 1.0 }
}

/** 按 报告类别 + 参数编码 + 牌号/型号/等级/规格 匹配最合适的技术要求并自动评定。
 * 匹配规则：技术要求上填写了的维度必须与样品一致（样品该维度为空则视为不冲突）；
 * 命中维度越多的要求优先（牌号权重最高）。
 */
export function evaluateTestResult(input: {
  parameterCode: string
  categoryCode?: string
  brand?: string
  model?: string
  grade?: string
  specification?: string
  resultValue: string
  loads?: number[]
  specimenArea?: number
  correctionFactor?: number
  algorithmType?: string
}): EvaluationResult {
  const derived = deriveSpecimenParams(
    input.parameterCode,
    input.specimenArea,
    input.correctionFactor,
    input.specification,
  )
  const specimenArea = input.specimenArea ?? derived.specimenArea
  const correctionFactor = input.correctionFactor ?? derived.correctionFactor

  const all = technicalRequirementTable.all()
  const candidates = all.filter((r) => {
    if (r.parameterCode !== input.parameterCode) return false
    if (input.categoryCode && r.categoryCode !== input.categoryCode) return false
    // 要求指定了某维度、且样品该维度也有值但不相等 → 排除
    const conflict = (reqV?: string, sampleV?: string) => Boolean(reqV && sampleV && reqV !== sampleV)
    if (conflict(r.brand, input.brand)) return false
    if (conflict(r.model, input.model)) return false
    if (conflict(r.grade, input.grade)) return false
    if (conflict(r.specification, input.specification)) return false
    return true
  })
  if (candidates.length === 0) return { matched: false, requirement: '', autoPassed: null }

  let best = candidates[0]!
  let bestScore = -1
  for (const c of candidates) {
    let score = 0
    if (input.brand && c.brand === input.brand) score += 4
    if (input.model && c.model === input.model) score += 2
    if (input.grade && c.grade === input.grade) score += 2
    if (input.specification && c.specification === input.specification) score += 1
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  const unitSuffix = best.unit ? ` ${best.unit}` : ''
  const requirement =
    best.comparison === 'range' ? `${best.value}${unitSuffix}` : `${best.comparison} ${best.value}${unitSuffix}`

  // 算法 compressive_strength: 荷载(kN) → 强度(MPa) → ±15%规则 → 代表值
  // 算法 steel_tensile: F(kN)/A(mm²) → MPa → 修约 → 代表值
  // 算法 flexural_strength: F(N) × span / (b × h²) × 换算系数 → ±15%规则 → 代表值
  let representativeValue: number | undefined
  let invalid = false
  let num: number
  if (input.algorithmType === 'compressive_strength' && input.loads && input.loads.length > 0 && specimenArea !== undefined && correctionFactor !== undefined) {
    // 各试件强度(MPa) = 荷载(kN)×1000 / 面积(mm²) × 换算系数
    const strengths = input.loads.map(F => (F * 1000 / specimenArea!) * correctionFactor!)
    const sorted = [...strengths].sort((a, b) => a - b)
    const mid = sorted[1]!
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    const range15 = mid * 0.15
    if (high - mid > range15 && mid - low > range15) {
      // 都超限 → 试验无效，取中间值
      invalid = true
      representativeValue = Math.round(mid * 100) / 100
      num = representativeValue
    } else if (high - mid > range15 || mid - low > range15) {
      // 有一个超限 → 取中间值
      representativeValue = Math.round(mid * 100) / 100
      num = representativeValue
    } else {
      // 全部合规 → 算术平均值
      const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length
      representativeValue = Math.round(avg * 100) / 100
      num = representativeValue
    }
  } else if (input.algorithmType === 'steel_tensile' && input.loads && input.loads.length > 0 && specimenArea !== undefined) {
    // 钢材抗拉：F/A → MPa → 修约到 5 MPa（GB/T 228）
    const stresses = input.loads.map(F => (F * 1000) / specimenArea!)
    const avg = stresses.reduce((a, b) => a + b, 0) / stresses.length
    // 修约：>200MPa 修约到 5，≤200MPa 修约到 1
    const rounded = avg > 200 ? Math.round(avg / 5) * 5 : Math.round(avg)
    representativeValue = rounded
    num = rounded
  } else if (input.algorithmType === 'flexural_strength' && input.loads && input.loads.length > 0 && derived.span !== undefined && derived.width !== undefined && derived.height !== undefined) {
    // 抗折强度：f_f = F × span / (b × h²) × 换算系数（MPa）
    // UI 传入 loads 单位为 kN，需乘以 1000 转换为 N
    const strengths = input.loads.map(F_kN =>
      Math.round((F_kN * 1000 * derived.span! / (derived.width! * derived.height! ** 2)) * derived.correctionFactor! * 100) / 100,
    )
    const sorted = [...strengths].sort((a, b) => a - b)
    const mid = sorted[1]!
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    const range15 = mid * 0.15
    if (high - mid > range15 && mid - low > range15) {
      // 全部超限 → 整组无效
      invalid = true
      representativeValue = Math.round(mid * 100) / 100
      num = representativeValue
    } else if (high - mid > range15 || mid - low > range15) {
      // 有一个超限 → 取中间值
      representativeValue = Math.round(mid * 100) / 100
      num = representativeValue
    } else {
      // 全部合规 → 算术平均值
      const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length
      representativeValue = Math.round(avg * 100) / 100
      num = representativeValue
    }
  } else if (input.loads && input.loads.length > 1) {
    // 普通多样本均值
    const avg = input.loads.reduce((a, b) => a + b, 0) / input.loads.length
    representativeValue = Math.round(avg * 100) / 100
    num = representativeValue
  } else {
    num = Number.parseFloat(input.resultValue)
  }
  const reqNum = Number.parseFloat(best.value)

  let autoPassed: boolean | null = null
  switch (best.comparison) {
    case '≥':
      autoPassed = Number.isNaN(num) || Number.isNaN(reqNum) ? null : num >= reqNum
      break
    case '≤':
      autoPassed = Number.isNaN(num) || Number.isNaN(reqNum) ? null : num <= reqNum
      break
    case '=':
    case 'eq':
      if (!Number.isNaN(num) && !Number.isNaN(reqNum)) autoPassed = num === reqNum
      else autoPassed = input.resultValue.trim() === best.value.trim()
      break
    case 'range': {
      const m = best.value.match(/^\s*([\d.]+)\s*[~－-]\s*([\d.]+)\s*$/)
      if (m && !Number.isNaN(num)) {
        autoPassed = num >= Number.parseFloat(m[1]!) && num <= Number.parseFloat(m[2]!)
      } else {
        autoPassed = null
      }
      break
    }
    default:
      autoPassed = null
  }

  return { matched: true, requirementCode: best.code, standardCode: best.standardCode, requirement, autoPassed, representativeValue, invalid }
}
/** 取接样单下全部样品 */
export function samplesOfReceipt(receiptId: string) {
  return sampleTable.all().filter((s) => s.receiptId === receiptId)
}

/** 取样品下全部检测项 */
export function itemsOfSample(sampleId: string) {
  return testItemTable.all().filter((i) => i.sampleId === sampleId)
}

/** 检测项变化后同步接样单（合并表）的整体结论——
 * 全部检测项合格 → result='pass'，否则 'fail'；无检测项 → 清空；
 * 首次产生检测项时自动生成报告编号（报告编制环节已移除，报告随数据录入自然产生）。
 */
export function syncReceiptResult(receiptId: string) {
  const receipt = receiptTable.findById(receiptId)
  if (!receipt) return
  const sampleIds = samplesOfReceipt(receiptId).map((s) => s.id)
  const items = testItemTable.all().filter((i) => sampleIds.includes(i.sampleId))
  if (items.length === 0) {
    receiptTable.update(receiptId, { result: '', conclusion: '' } as never)
    return
  }
  // 只有明确判为不合格/不符合（passed===false）才算不通过；
  // 未评定（——，passed=null）与合格/符合一律按通过处理
  const allPassed = !items.some((i) => i.passed === false)
  const failedCodes = [...new Set(items.filter((i) => i.passed === false).map((i) => i.parameterCode))]
  receiptTable.update(receiptId, {
    result: allPassed ? 'pass' : 'fail',
    conclusion: allPassed
      ? '所检项目均符合相应标准的技术要求。'
      : `以下检测项不符合技术要求：${failedCodes.join('、')}。`,
    reportCode: receipt.reportCode ?? `R-${receipt.commissionCode}`,
    reportDate: receipt.reportDate ?? new Date().toISOString().slice(0, 10),
  } as never)
}

// =============================================================================
// 统计：仪表盘 + 按报告类别的试验报告汇总表（对应 raw 汇总表）
// =============================================================================

export function computeStats() {
  const receipts = receiptTable.all()
  const samples = sampleTable.all()
  const contracts = contractTable.query({ page: 1, pageSize: 1 }).total
  const stageCount = (stage: FlowStage) => receipts.filter((r) => (r.flowStatus ?? 'receiving') === stage).length
  const receiptCountByStage = Object.fromEntries(
    FLOW_STAGE_ORDER.map((stage) => [stage, stageCount(stage)]),
  ) as Record<FlowStage, number>
  const categories = reportCategoryTable.all()
  const receiptCountByCategory = categories.map((c) => ({
    categoryCode: c.code,
    categoryName: c.name,
    count: receipts.filter((r) => r.categoryCode === c.code).length,
    reported: receipts.filter((r) => r.categoryCode === c.code && r.reportCode).length,
  }))
  return {
    contractCount: contracts,
    receiptCount: receipts.length,
    sampleCount: samples.length,
    reportCountByStatus: {
      draft: receiptCountByStage.receiving + receiptCountByStage.task_assignment + receiptCountByStage.data_entry,
      reviewing: receiptCountByStage.review + receiptCountByStage.approval,
      issued: receiptCountByStage.issuance + receiptCountByStage.archived,
    },
    pendingTaskCount: receiptCountByStage.task_assignment,
    receiptCountByStage,
    receiptCountByCategory,
  }
}

export interface SummaryColumn {
  key: string
  label: string
}

/** 构建某报告类别的试验报告汇总表（对应 raw 提供的各类汇总表）。
 * 行粒度：样品；只统计已生成报告（reportCode 非空）的接样单；可按合同过滤。
 */
export function buildSummary(categoryCode: string, contractId?: string) {
  const category = reportCategoryTable.all().find((c) => c.code === categoryCode)
  if (!category) return { columns: [] as SummaryColumn[], rows: [] as Record<string, string>[], summaryName: '' }

  const receipts = receiptTable
    .all()
    .filter((r) => r.categoryCode === categoryCode && r.reportCode && (!contractId || r.contractId === contractId))
    .sort((a, b) => ((a.reportDate ?? '') < (b.reportDate ?? '') ? -1 : 1))

  const resultLabel = (r?: string) => (r === 'pass' ? '合格' : r === 'fail' ? '不合格' : '')
  const rows: Record<string, string>[] = []

  for (const receipt of receipts) {
    const samples = samplesOfReceipt(receipt.id)
    const list = samples.length > 0 ? samples : [null]
    for (const s of list) {
      const ext = s?.ext ?? {}
      const base = {
        reportCode: receipt.reportCode ?? '',
        reportDate: receipt.reportDate ?? '',
        result: resultLabel(receipt.result),
      }
      if (category.summaryType === 'material') {
        rows.push({
          model: s?.model ?? '',
          specification: s?.specification ?? '',
          grade: s?.grade ?? '',
          brand: s?.brand ?? '',
          certNo: ext.qualityCertNo ?? ext.factoryNo ?? ext.furnaceNo ?? '',
          manufacturer: ext.manufacturer ?? ext.origin ?? '',
          representQuantity: ext.representQuantity ?? '',
          ...base,
        })
      } else if (category.summaryType === 'concrete') {
        const strength = s
          ? itemsOfSample(s.id)
              .filter((i) => i.parameterCode.startsWith('CON'))
              .map((i) => i.result)
              .join(' / ')
          : ''
        rows.push({
          structuralPart: ext.structuralPart ?? '',
          castingDate: ext.castingDate ?? '',
          volume: ext.volume ?? '',
          testDate: receipt.reportDate ?? '',
          designGrade: s?.model ?? '',
          strength,
          reportCode: base.reportCode,
          result: base.result,
          remark: s?.remark ?? '',
        })
      } else {
        rows.push({
          structuralPart: ext.structuralPart ?? '',
          modelSpec: [s?.model, s?.brand, s?.specification].filter(Boolean).join(' '),
          testDate: receipt.reportDate ?? '',
          reportCode: base.reportCode,
          result: base.result,
          concreteCastingDate: ext.concreteCastingDate ?? '',
          remark: s?.remark ?? '',
        })
      }
    }
  }

  const columns: SummaryColumn[] =
    category.summaryType === 'material'
      ? [
          { key: 'model', label: '品种（型号）' },
          { key: 'specification', label: '规格' },
          { key: 'grade', label: '等级' },
          { key: 'brand', label: '牌号' },
          { key: 'certNo', label: '质保单/出厂/炉批编号' },
          { key: 'manufacturer', label: '生产厂家（产地）' },
          { key: 'representQuantity', label: '代表数量' },
          { key: 'reportCode', label: '试验报告编号' },
          { key: 'reportDate', label: '检测日期' },
          { key: 'result', label: '判定结果' },
        ]
      : category.summaryType === 'concrete'
        ? [
            { key: 'structuralPart', label: '轴线部位' },
            { key: 'castingDate', label: '浇筑时间' },
            { key: 'volume', label: '混凝土方量（m³）' },
            { key: 'testDate', label: '试验时间' },
            { key: 'designGrade', label: '设计强度等级' },
            { key: 'strength', label: '实际强度值（MPa）' },
            { key: 'reportCode', label: '试验报告编号' },
            { key: 'result', label: '试验结果' },
            { key: 'remark', label: '备注' },
          ]
        : [
            { key: 'structuralPart', label: '结构部位' },
            { key: 'modelSpec', label: '品种规格' },
            { key: 'testDate', label: '试验时间' },
            { key: 'reportCode', label: '报告编号' },
            { key: 'result', label: '试验结果' },
            { key: 'concreteCastingDate', label: '对应部位混凝土浇筑时间' },
            { key: 'remark', label: '备注' },
          ]

  return { columns, rows, summaryName: category.summaryName }
}

export function resetMockDb() {
  contractCategoryTable.reset()
  contractTable.reset()
  reportCategoryTable.reset()
  categoryStandardTable.reset()
  standardParametersTable.reset()
  modelTable.reset()
  specificationTable.reset()
  gradeTable.reset()
  brandTable.reset()
  receiptTable.reset()
  sampleTable.reset()
  testItemTable.reset()
  testParameterTable.reset()
  testStandardTable.reset()
  technicalRequirementTable.reset()
  reportTemplateTable.reset()
  orgInfoTable.reset()
  userTable.reset()
  roleTable.reset()
  inspectionSpecialtyTable.reset()
  inspectionObjectTable.reset()
  inspectionParameterTable.reset()
  inspectionStandardTable.reset()
  inspectionObjectParameterTable.reset()
  inspectionObjectStandardTable.reset()
  inspectionStandardParameterTable.reset()
  inspectionSpecialtyObjectTable.reset()
}

/**
 * 把 src/data/generated/*.json（按类型分文件）装入 M06 8 张内存表。
 * 测试与开发模式共享同一来源；接样、计算、评定等流程后续切换到 M06。
 */
export function seedMasterDataIntoMockDb(): void {
  // 浏览器侧：master data 通过顶层静态 JSON 导入获取（见文件顶部 import），
  // 不再走 node:fs / __dirname。空数组兜底，避免 JSON 结构异常时后续 for 循环报错。
  const data = {
    inspectionSpecialties: generatedSpecialties ?? [],
    inspectionObjects: generatedObjects ?? [],
    inspectionParameters: generatedParameters ?? [],
    inspectionStandards: generatedStandards ?? [],
    inspectionObjectParameters: generatedObjectParameters ?? [],
    inspectionObjectStandards: generatedObjectStandards ?? [],
    inspectionStandardParameters: generatedStandardParameters ?? [],
    inspectionSpecialtyObjects: generatedSpecialtyObjects ?? [],
  } as {
    inspectionSpecialties: Array<{ code: string; officialNo: string; name: string; isOfficial: boolean; enabled: boolean }>
    inspectionObjects: Array<{ code: string; inspectionSpecialtyCode: string; sourceProjectNo: string; sourceProjectName: string; name: string; isOptionalForQualification: boolean; isOfficial: boolean; enabled: boolean }>
    inspectionParameters: Array<{ code: string; name: string; rawName: string; canonicalName: string; methodText?: string; aliases: string[]; unit?: string; sourceType: 'official' | 'custom' }>
    inspectionStandards: Array<{ code: string; name: string; version?: string; status: string; sourceDocumentId?: string }>
    inspectionObjectParameters: Array<{ inspectionObjectCode: string; inspectionParameterCode: string; qualificationLevel: 'QUALIFIED' | 'RESTRICTED'; sortOrder: number }>
    inspectionObjectStandards: Array<{ inspectionObjectCode: string; inspectionStandardCode: string; role: 'TESTING' | 'JUDGMENT' }>
    inspectionStandardParameters: Array<{ inspectionStandardCode: string; inspectionParameterCode: string; clause?: string; methodName?: string; unit?: string }>
    inspectionSpecialtyObjects: Array<{ inspectionSpecialtyCode: string; inspectionObjectCode: string }>
  }
  const now = new Date('2026-07-22T00:00:00Z').toISOString()
  for (const s of data.inspectionSpecialties) {
    inspectionSpecialtyTable.insert({
      id: `insp-sp-${s.code}`,
      code: s.code,
      officialNo: s.officialNo,
      name: s.name,
      isOfficial: s.isOfficial,
      enabled: s.enabled,
    } as never);
    inspectionSpecialtyTable.update(inspectionSpecialtyTable.findById(`insp-sp-${s.code}`)!.id, {
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const o of data.inspectionObjects) {
    inspectionObjectTable.insert({
      id: `insp-obj-${o.code}`,
      code: o.code,
      inspectionSpecialtyCode: o.inspectionSpecialtyCode,
      sourceProjectNo: o.sourceProjectNo,
      sourceProjectName: o.sourceProjectName,
      name: o.name,
      isOptionalForQualification: o.isOptionalForQualification,
      isOfficial: o.isOfficial,
      enabled: o.enabled,
    } as never);
    inspectionObjectTable.update(`insp-obj-${o.code}`, {
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const p of data.inspectionParameters) {
    inspectionParameterTable.insert({
      id: `insp-param-${p.code}`,
      code: p.code,
      name: p.name,
      rawName: p.rawName,
      canonicalName: p.canonicalName,
      methodText: p.methodText,
      aliases: p.aliases,
      unit: p.unit,
      sourceType: p.sourceType,
    } as never);
    inspectionParameterTable.update(`insp-param-${p.code}`, {
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const s of data.inspectionStandards) {
    inspectionStandardTable.insert({
      id: `insp-std-${s.code}`,
      code: s.code,
      name: s.name,
      version: s.version,
      status: (s.status as 'active' | 'superseded' | 'draft') ?? 'active',
      sourceDocumentId: s.sourceDocumentId,
    } as never);
    inspectionStandardTable.update(`insp-std-${s.code}`, {
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const r of data.inspectionObjectParameters) {
    inspectionObjectParameterTable.insert({
      id: `insp-obj-param-${r.inspectionObjectCode}-${r.inspectionParameterCode}`,
      inspectionObjectCode: r.inspectionObjectCode,
      inspectionParameterCode: r.inspectionParameterCode,
      qualificationLevel: r.qualificationLevel,
      sortOrder: r.sortOrder,
    } as never);
    inspectionObjectParameterTable.update(
      `insp-obj-param-${r.inspectionObjectCode}-${r.inspectionParameterCode}`,
      { createdAt: now, updatedAt: now },
    );
  }
  for (const r of data.inspectionObjectStandards) {
    inspectionObjectStandardTable.insert({
      id: `insp-obj-std-${r.inspectionObjectCode}-${r.inspectionStandardCode}-${r.role}`,
      inspectionObjectCode: r.inspectionObjectCode,
      inspectionStandardCode: r.inspectionStandardCode,
      role: r.role,
    } as never);
    inspectionObjectStandardTable.update(
      `insp-obj-std-${r.inspectionObjectCode}-${r.inspectionStandardCode}-${r.role}`,
      { createdAt: now, updatedAt: now },
    );
  }
  for (const r of data.inspectionStandardParameters) {
    inspectionStandardParameterTable.insert({
      id: `insp-std-param-${r.inspectionStandardCode}-${r.inspectionParameterCode}`,
      inspectionStandardCode: r.inspectionStandardCode,
      inspectionParameterCode: r.inspectionParameterCode,
      clause: r.clause,
      methodName: r.methodName,
      unit: r.unit,
    } as never);
    inspectionStandardParameterTable.update(
      `insp-std-param-${r.inspectionStandardCode}-${r.inspectionParameterCode}`,
      { createdAt: now, updatedAt: now },
    );
  }
  for (const r of data.inspectionSpecialtyObjects) {
    inspectionSpecialtyObjectTable.insert({
      id: `insp-sp-obj-${r.inspectionSpecialtyCode}-${r.inspectionObjectCode}`,
      inspectionSpecialtyCode: r.inspectionSpecialtyCode,
      inspectionObjectCode: r.inspectionObjectCode,
    } as never);
    inspectionSpecialtyObjectTable.update(
      `insp-sp-obj-${r.inspectionSpecialtyCode}-${r.inspectionObjectCode}`,
      { createdAt: now, updatedAt: now },
    );
  }
}

// =============================================================================
// 种子数据
// =============================================================================

function seedContractCategories() {
  contractCategoryTable.insert({ id: 'cc-001', name: '常规建筑与材料检测', sortOrder: 0 })
  contractCategoryTable.insert({ id: 'cc-002', name: '工程实体与结构检测', sortOrder: 1 })
  contractCategoryTable.insert({ id: 'cc-003', name: '专项系统与安全性鉴定', sortOrder: 2 })
}

function seedOrgInfo() {
  orgInfoTable.insert({
    orgName: 'XX 检测中心',
    registeredAddress: '北京市海淀区中关村大街 1 号',
    testingSiteAddress: '北京市朝阳区望京西路 8 号',
    postalCode: '100080',
    contactPhone: '010-88880000',
    email: 'lab@xx-test.cn',
    qualificationCertNo: 'CMA L1234',
  })
}

/** 报告模板基础内容（每个类别 seed 一份独立副本，可分别维护） */
export const REPORT_TEMPLATE_TAGS: { tag: string; label: string }[] = [
  { tag: '{{org.orgName}}', label: '检测机构名称' },
  { tag: '{{org.registeredAddress}}', label: '注册地址' },
  { tag: '{{org.testingSiteAddress}}', label: '检测能力场所地址' },
  { tag: '{{org.postalCode}}', label: '邮政编码' },
  { tag: '{{org.contactPhone}}', label: '联系电话' },
  { tag: '{{org.email}}', label: '电子信箱' },
  { tag: '{{org.qualificationCertNo}}', label: '资质证书编号' },
  { tag: '{{category.name}}', label: '报告类别名称' },
  { tag: '{{category.reportTitle}}', label: '报告标题' },
  { tag: '{{contract.contractCode}}', label: '合同编号' },
  { tag: '{{contract.projectName}}', label: '工程名称' },
  { tag: '{{contract.clientUnit}}', label: '委托单位' },
  { tag: '{{contract.constructionUnit}}', label: '施工单位' },
  { tag: '{{contract.witnessUnit}}', label: '见证单位' },
  { tag: '{{contract.witness}}', label: '见证人' },
  { tag: '{{receipt.receiptCode}}', label: '委托书编号' },
  { tag: '{{receipt.reportCode}}', label: '报告编号' },
  { tag: '{{receipt.reportDate}}', label: '检测日期' },
  { tag: '{{receipt.receivedDate}}', label: '委托日期' },
  { tag: '{{receipt.testCategory}}', label: '检测类别' },
  { tag: '{{receipt.sampleSource}}', label: '样品来源' },
  { tag: '{{receipt.testEnvironment}}', label: '检测环境' },
  { tag: '{{receipt.mainEquipment}}', label: '主要设备' },
  { tag: '{{receipt.assigneeName}}', label: '检测人员' },
  { tag: '{{receipt.conclusion}}', label: '检测结论' },
  { tag: '{{receipt.resultLabel}}', label: '判定结果（合格/不合格）' },
  { tag: '{{receipt.issuedAt}}', label: '签发日期' },
  { tag: '{{samplesTable}}', label: '样品信息表（含扩展属性）' },
  { tag: '{{testItemsTable}}', label: '检测结果表' },
]

function baseTemplate(): string {
  return [
    '<div style="text-align:center">',
    '  <h2 style="margin:0">{{org.orgName}}</h2>',
    '  <h1 style="margin:8px 0 2px">{{category.reportTitle}}</h1>',
    '</div>',
    '<table class="kv"><tbody>',
    '  <tr><td>委托单位</td><td>{{contract.clientUnit}}</td><td>报告编号</td><td>{{receipt.reportCode}}</td></tr>',
    '  <tr><td>工程名称</td><td>{{contract.projectName}}</td><td>检测类别</td><td>{{receipt.testCategory}}</td></tr>',
    '  <tr><td>施工单位</td><td>{{contract.constructionUnit}}</td><td>委托日期</td><td>{{receipt.receivedDate}}</td></tr>',
    '  <tr><td>见证单位</td><td>{{contract.witnessUnit}}</td><td>见证人</td><td>{{contract.witness}}</td></tr>',
    '  <tr><td>样品来源</td><td>{{receipt.sampleSource}}</td><td>检测日期</td><td>{{receipt.reportDate}}</td></tr>',
    '  <tr><td>检测环境</td><td>{{receipt.testEnvironment}}</td><td>主要设备</td><td>{{receipt.mainEquipment}}</td></tr>',
    '</tbody></table>',
    '<h3>样品信息</h3>',
    '{{samplesTable}}',
    '<h3>检测结果</h3>',
    '{{testItemsTable}}',
    '<h3>检测结论</h3>',
    '<p>{{receipt.conclusion}}</p>',
    '<p><strong>判定结果：{{receipt.resultLabel}}</strong></p>',
    '<p class="sign">批准：＿＿＿＿＿　　审核：＿＿＿＿＿　　检测：{{receipt.assigneeName}}　　检测单位检测专用章（盖章）</p>',
    '<p class="sign">签发日期：{{receipt.issuedAt}}</p>',
    '<h4>检测单位基本信息</h4>',
    '<p>注册地址：{{org.registeredAddress}}<br/>检测能力场所地址：{{org.testingSiteAddress}}<br/>邮政编码：{{org.postalCode}}　联系电话：{{org.contactPhone}}<br/>电子信箱：{{org.email}}　资质证书编号：{{org.qualificationCertNo}}</p>',
    '<h4>声　明</h4>',
    '<ol class="notes">',
    '  <li>报告无本单位"检测专用章"或"公章"、骑缝章无效。</li>',
    '  <li>报告无检测人员、审核人员、报告批准人签字无效。</li>',
    '  <li>报告涂改无效。</li>',
    '  <li>报告部分复印/复制无效。</li>',
    '  <li>电子报告请扫描封面二维码查询真伪。</li>',
    '  <li>委托检测仅对来样及所检工程当时状态负责。</li>',
    '  <li>本报告依据的委托信息、工程描述、产品信息等来源于委托方，其真实性由委托方负责。</li>',
    '  <li>对报告若有异议，请在收到报告之日起十五日内向本单位提出。</li>',
    '</ol>',
  ].join('\n')
}

function seedCategories() {
  const cats: {
    code: string
    name: string
    reportTitle: string
    summaryType: 'material' | 'concrete' | 'connection'
    summaryName: string
    extFields: ExtFieldDef[]
    sortOrder: number
  }[] = [
    {
      code: 'steel', sortOrder: 1, name: '钢筋原材', reportTitle: '钢筋力学性能、工艺性能、重量偏差检测报告',
      summaryType: 'material', summaryName: '钢材试验报告汇总表',
      extFields: [
        { key: 'qualityCertNo', label: '质保单编号' },
      ],
    },
    {
      code: 'cement', sortOrder: 0, name: '水泥', reportTitle: '水泥检测报告',
      summaryType: 'material', summaryName: '水泥试验报告汇总表',
      extFields: [],
    },
    {
      code: 'concrete', sortOrder: 6, name: '混凝土', reportTitle: '混凝土抗压强度检测报告',
      summaryType: 'concrete', summaryName: '（标准养护）混凝土抗压强度试验报告汇总表',
      extFields: [
        { key: 'castingDate', label: '浇筑时间' },
        { key: 'volume', label: '混凝土方量（m³）' },
        { key: 'moldingDate', label: '成型日期' },
      ],
    },
    {
      code: 'sand', sortOrder: 5, name: '砂', reportTitle: '建设用砂检测报告',
      summaryType: 'material', summaryName: '砂试验报告汇总表',
      extFields: [],
    },
    {
      code: 'gravel', sortOrder: 4, name: '碎（卵）石', reportTitle: '建设用碎（卵）石检测报告',
      summaryType: 'material', summaryName: '碎（卵）石试验报告汇总表',
      extFields: [],
    },
    {
      code: 'rebar_mech', sortOrder: 2, name: '钢筋机械连接', reportTitle: '钢筋机械连接接头检测报告',
      summaryType: 'connection', summaryName: '钢筋机械连接试验报告汇总表',
      extFields: [
        { key: 'jointType', label: '接头类型' },
        { key: 'concreteCastingDate', label: '对应部位混凝土浇筑时间' },
      ],
    },
    {
      code: 'rebar_weld', sortOrder: 3, name: '钢筋焊接', reportTitle: '钢筋焊接接头检测报告',
      summaryType: 'connection', summaryName: '钢筋焊接连接试验报告汇总表',
      extFields: [
        { key: 'welderName', label: '焊工姓名' },
        { key: 'welderCertNo', label: '焊工证号' },
        { key: 'concreteCastingDate', label: '对应部位混凝土浇筑时间' },
      ],
    },
  ]
  cats.forEach((c) => {
    reportCategoryTable.insert({ id: `cat-${c.code}`, ...c })
    reportTemplateTable.insert({
      id: `tpl-${c.code}`,
      categoryCode: c.code,
      name: `${c.name}报告模板`,
      content: baseTemplate(),
    })
  })
}

function seedDicts() {
  const seed = (table: MockTable<{ id: string; categoryCode: string; name: string; remark?: string; createdAt: string; updatedAt: string }>, prefix: string, data: Record<string, string[]>) => {
    let n = 0
    for (const [cat, names] of Object.entries(data)) {
      for (const name of names) {
        n += 1
        table.insert({ id: `${prefix}-${String(n).padStart(3, '0')}`, categoryCode: cat, name })
      }
    }
  }
  // 型号：热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊
  seed(modelTable, 'mdl', {
    steel: ['热轧带肋钢筋', '热轧光圆钢筋'],
    cement: ['P·O 42.5', 'P·O 42.5R', 'P·C 32.5'],
    concrete: ['C25', 'C30', 'C35', 'C40'],
    sand: ['中砂', '粗砂', '细砂'],
    gravel: ['碎石', '卵石'],
    rebar_mech: ['直螺纹套筒连接', '锥螺纹套筒连接'],
    rebar_weld: ['闪光对焊', '电弧搭接焊', '电渣压力焊'],
  })
  // 规格：尺寸/粒径/直径；无尺寸的类别留空
  seed(specificationTable, 'spc', {
    steel: ['Φ12', 'Φ16', 'Φ20', 'Φ22', 'Φ25'],
    concrete: ['150×150×150mm', '100×100×100mm', '150×150×600mm'],
    gravel: ['5-25mm', '5-31.5mm', '5-16mm'],
    rebar_mech: ['Φ22', 'Φ25', 'd≤32'],
    rebar_weld: ['Φ22', 'Φ25'],
  })
  // 等级：接头Ⅰ/Ⅱ/Ⅲ级、砂石Ⅰ/Ⅱ/Ⅲ类；型号已含等级的钢材/水泥/混凝土留空
  seed(gradeTable, 'grd', {
    rebar_mech: ['Ⅰ级', 'Ⅱ级', 'Ⅲ级'],
    sand: ['Ⅰ类', 'Ⅱ类', 'Ⅲ类'],
    gravel: ['Ⅰ类', 'Ⅱ类', 'Ⅲ类'],
  })
  // 牌号：HRB400 等
  seed(brandTable, 'brd', {
    steel: ['HRB400', 'HRB400E', 'HRB500', 'HRB500E', 'HPB300'],
    rebar_mech: ['HRB400', 'HRB400E', 'HRB500'],
    rebar_weld: ['HRB400', 'HPB300'],
  })
}

function seedTestParameter(code: string, name: string, categoryCode: string, group: string, unit?: string, valueCount?: number) {
  testParameterTable.insert({ id: `tp-${code}`, code, name, categoryCode, group, unit, valueCount })
}

function seedCalculationRule(parameterCode: string, algorithmType: string, specimenCount: number, unit?: string, remark?: string) {
  calculationRuleTable.insert({
    id: `cr-${parameterCode}`,
    parameterCode, algorithmType, specimenCount, unit, remark,
  })
}

function seedTestStandard(code: string, name: string, type: 'national' | 'industry' | 'local' | 'enterprise', categories: string[]) {
  testStandardTable.insert({ id: `ts-${code}`, code, name, type })
  categories.forEach((cat) => {
    categoryStandardTable.insert({ categoryCode: cat, standardCode: code })
  })
}

function seedTechnicalRequirement(req: {
  code: string
  standardCode: string
  parameterCode: string
  categoryCode: string
  brand?: string
  model?: string
  grade?: string
  specification?: string
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'
  value: string
  unit?: string
}) {
  technicalRequirementTable.insert({ id: `tr-${req.code}`, ...req })
}

// 每类样品的默认字段（业务种子用）
const SAMPLE_DEFAULTS: Record<string, { model?: string; specification?: string; grade?: string; brand?: string; manufacturer?: string; structuralPart?: string; representQuantity?: string; ext: Record<string, string>; name: string }> = {
  steel: { model: '热轧带肋钢筋', specification: 'Φ22', brand: 'HRB400E', name: '热轧带肋钢筋', manufacturer: '陕钢集团', structuralPart: '主体结构', representQuantity: '60t', ext: { furnaceNo: 'LH-2024-0501', qualityCertNo: 'ZB-2024-118' } },
  cement: { model: 'P·O 42.5', name: '通用硅酸盐水泥', manufacturer: '尧柏水泥', structuralPart: '基础底板', representQuantity: '200t', ext: { factoryNo: 'CF-2024-0332', factoryDate: '2024-04-20' } },
  concrete: { model: 'C30', specification: '150×150×150mm', name: '混凝土试块', structuralPart: '3F 柱 1-8/A-D 轴', representQuantity: '120m³', ext: { castingDate: '2024-05-01', volume: '120', moldingDate: '2024-05-01', age: '28', curing: '标准养护' } },
  concrete_ff: { model: 'C20', specification: '150×150×550mm', name: '混凝土抗折试块', structuralPart: '4F 路面 1-4/A-C 轴', representQuantity: '3 组', ext: { castingDate: '2024-07-01', volume: '0.36', moldingDate: '2024-07-01', age: '28', curing: '标准养护' } },
  sand: { model: '中砂', grade: 'Ⅱ类', name: '建设用砂', manufacturer: '汉江砂场', structuralPart: '砌筑工程', representQuantity: '400t', ext: {} },
  gravel: { model: '碎石', specification: '5-25mm', grade: 'Ⅱ类', name: '建设用碎石', manufacturer: '秦岭石料厂', structuralPart: '主体结构', representQuantity: '600t', ext: {} },
  rebar_mech: { model: '直螺纹套筒连接', specification: 'Φ22', grade: 'Ⅰ级', brand: 'HRB400', name: '钢筋机械连接接头', structuralPart: '5F 梁柱节点', representQuantity: '500个', ext: { jointType: '直螺纹套筒', concreteCastingDate: '2024-05-10' } },
  rebar_weld: { model: '闪光对焊', specification: 'Φ22', brand: 'HRB400', name: '钢筋焊接接头', structuralPart: '基础底板', representQuantity: '300个', ext: { welderName: '刘师傅', welderCertNo: 'HG-0088', concreteCastingDate: '2024-05-12' } },
}

function seedContract(input: { id: string; contractCode: string; clientUnit: string; projectName: string; constructionUnit: string; witnessUnit: string; witness: string; status?: 'active' | 'archived' }) {
  contractTable.insert({ ...input, status: input.status ?? 'active' })
}

function seedReceipt(input: {
  id: string
  contractId: string
  commissionCode: string
  categoryCode: string
  flowStatus?: FlowStage
  commissionDate?: string
  receivedBy?: string
  sampleCount?: number
  judgmentBasis?: string[]
  testingBasis?: string[]
  testParameters?: string[]
  /** 直接指定样品规格（覆盖 SAMPLE_DEFAULTS），用于抗折等特殊试样 */
  sampleSpecOverride?: string
}) {
  const flowStatus = input.flowStatus ?? 'receiving'
  const idx = FLOW_STAGE_ORDER.indexOf(flowStatus)
  const flowHistory: FlowHistoryEntry[] = []
  for (let i = 0; i < idx; i++) {
    flowHistory.push({
      action: 'submit',
      from: FLOW_STAGE_ORDER[i]!,
      to: FLOW_STAGE_ORDER[i + 1]!,
      operator: 'u-seed',
      at: '2024-05-03T08:00:00Z',
    })
  }
  const reported = idx >= FLOW_STAGE_ORDER.indexOf('review')
  const issued = idx >= FLOW_STAGE_ORDER.indexOf('issuance')
  const def = SAMPLE_DEFAULTS[input.categoryCode]
  receiptTable.insert({
    id: input.id,
    contractId: input.contractId,
    commissionCode: input.commissionCode,
    commissionDate: input.commissionDate ?? '2024-05-03',
    categoryCode: input.categoryCode,
    projectName: '',
    clientUnit: '',
    receivedBy: input.receivedBy ?? '王五',
    sampleSource: '施工送检',
    testCategory: '委托检验',
    remark: '',
    flowStatus,
    flowHistory,
    lastSubmittedBy: flowHistory.length > 0 ? 'u-seed' : null,
    assigneeName: idx >= FLOW_STAGE_ORDER.indexOf('data_entry') ? '检测员' : undefined,
    reportCode: reported ? `R-${input.commissionCode}` : undefined,
    reportDate: reported ? '2024-05-06' : undefined,
    conclusion: reported ? '所检项目均符合相应标准的技术要求。' : undefined,
    result: reported ? 'pass' : undefined,
    issuedAt: issued ? '2024-05-08T10:00:00Z' : null,
    judgmentBasis: input.judgmentBasis,
    testingBasis: input.testingBasis,
    testParameters: input.testParameters,
  } as never)

  // 每个接样单 seed 1-N 个样品（数据录入及之后的阶段附带检测项）
  const count = input.sampleCount ?? 2
  for (let i = 1; i <= count; i++) {
    const sid = `s-${input.id}-${i}`
    const spec = input.sampleSpecOverride ?? def?.specification
    const extDef = spec === '150×150×550mm' ? (SAMPLE_DEFAULTS['concrete_ff'] ?? def) : def
    sampleTable.insert({
      id: sid,
      receiptId: input.id,
      sampleCode: `${input.commissionCode}-S${i}`,
      sampleName: extDef?.name ?? '样品',
      model: extDef?.model,
      specification: spec,
      grade: extDef?.grade,
      brand: extDef?.brand,
      manufacturer: extDef?.manufacturer,
      structuralPart: extDef?.structuralPart,
      representQuantity: extDef?.representQuantity,
      sampleQuantity: '1 组',
      ext: { ...(extDef?.ext ?? {}) },
      remark: '',
    })
    if (idx >= FLOW_STAGE_ORDER.indexOf('review')) {
      // 已到审核之后：附带一条已评定的检测项，供报告/汇总展示
      const itemByCat: Record<string, { p: string; v: string; u?: string; req: string }> = {
        steel: { p: 'STE001', v: `${420 + i * 5}`, u: 'MPa', req: '≥ 400 MPa' },
        cement: { p: 'CEM012', v: '18.2', u: 'MPa', req: '≥ 17.0 MPa' },
        concrete: { p: 'CON002', v: `${30.5 + i}`, u: 'MPa', req: '≥ 28.5 MPa' },
        sand: { p: 'SND002', v: '2.1', u: '%', req: '≤ 3.0 %' },
        gravel: { p: 'GRV005', v: '12', u: '%', req: '≤ 20 %' },
        rebar_mech: { p: 'RMK001', v: '575', u: 'MPa', req: '≥ 540 MPa' },
        rebar_weld: { p: 'RWD001', v: '605', u: 'MPa', req: '≥ 540 MPa' },
      }
      const it = itemByCat[input.categoryCode]
      if (it) {
        testItemTable.insert({
          id: `ti-${sid}`,
          sampleId: sid,
          parameterCode: it.p,
          requirement: it.req,
          result: it.v,
          unit: it.u,
          autoPassed: true,
          passed: true,
        })
      }
    }
  }
}

/** 全量种子：7 个报告类别 + 码表 + 10 合同 × 若干接样单（覆盖 7 阶段与 7 类别） */
export function seedData() {
  seedContractCategories()
  seedOrgInfo()
  seedCategories()
  seedDicts()

  // ===== 角色 / 用户 =====
  ;[
    { id: 'role-admin', name: 'admin', description: '管理员', permissions: ['project:read', 'project:write', 'sample:read', 'sample:write', 'report:read', 'report:write', 'report:issue', 'user:read', 'user:create', 'user:update', 'user:delete', 'role:read', 'role:write'] },
    { id: 'role-tech', name: 'tech', description: '检测员', permissions: ['sample:read', 'sample:write', 'report:read', 'report:write'] },
    { id: 'role-viewer', name: 'viewer', description: '查看者', permissions: ['sample:read', 'report:read'] },
  ].forEach((r) => roleTable.insert({ ...r }))
  userTable.insert({ id: 'u-admin', username: 'labadmin', displayName: '实验室管理员', email: 'labadmin@lab.cn', roleId: 'role-admin', status: 'active', password: 'lab123' })
  userTable.insert({ id: 'u-tech', username: 'tech', displayName: '检测员', email: 'tech@lab.cn', roleId: 'role-tech', status: 'active', password: 'lab123' })

  // ===== 检测参数（归属报告类别）=====
  seedTestParameter('STE001', '下屈服强度 ReL', 'steel', 'mechanical', 'MPa')
  seedTestParameter('STE002', '上屈服强度 ReH', 'steel', 'mechanical', 'MPa')
  seedTestParameter('STE003', '抗拉强度 Rm', 'steel', 'mechanical', 'MPa')
  seedTestParameter('STE004', '断后伸长率 A', 'steel', 'mechanical', '%')
  seedTestParameter('STE005', '最大力总延伸率 Agt', 'steel', 'mechanical', '%')
  seedTestParameter('STE006', '屈强比 Rm/ReL', 'steel', 'mechanical', '')
  seedTestParameter('STE008', '弯曲性能（弯曲角度/压头直径）', 'steel', 'process', '')
  seedTestParameter('STE009', '重量偏差', 'steel', 'weight', '%')
  seedTestParameter('CEM001', '比表面积', 'cement', 'fineness', 'm²/kg')
  seedTestParameter('CEM003', '初凝时间', 'cement', 'setting', 'min')
  seedTestParameter('CEM004', '终凝时间', 'cement', 'setting', 'min')
  seedTestParameter('CEM005', '安定性（雷氏夹/试饼法）', 'cement', 'soundness', '')
  seedTestParameter('CEM006', '三氧化硫 SO₃', 'cement', 'chemistry', '%')
  seedTestParameter('CEM012', '3天抗压强度', 'cement', 'strength', 'MPa')
  seedTestParameter('CEM014', '28天抗压强度', 'cement', 'strength', 'MPa')
  seedTestParameter('CON001', '立方体抗压强度', 'concrete', 'mechanical', 'MPa')
  seedTestParameter('CON002', '抗压强度', 'concrete', 'mechanical', 'MPa', 3)

  // ===== 计算规则 =====  // algorithmType: simple_avg=多样本均值, compressive_strength=混凝土±15%规则
  seedCalculationRule('STE001', 'steel_tensile', 1, 'MPa')
  seedCalculationRule('STE003', 'steel_tensile', 1, 'MPa')
  seedCalculationRule('STE004', 'simple_avg', 1, '%')
  seedCalculationRule('STE005', 'simple_avg', 1, '%')
  seedCalculationRule('STE006', 'simple_avg', 1, '')
  seedCalculationRule('CON001', 'simple_avg', 1, 'MPa')
  seedCalculationRule('CON002', 'compressive_strength', 3, 'MPa')
  seedCalculationRule('CON006', 'flexural_strength', 3, 'MPa')
  seedTestParameter('CON006', '抗折强度', 'concrete', 'mechanical', 'MPa')
  seedTestParameter('SND001', '颗粒级配（细度模数）', 'sand', 'gradation', '')
  seedTestParameter('SND002', '含泥量', 'sand', 'physical', '%')
  seedTestParameter('SND003', '泥块含量', 'sand', 'physical', '%')
  seedTestParameter('SND008', '表观密度', 'sand', 'physical', 'kg/m³')
  seedTestParameter('GRV001', '颗粒级配', 'gravel', 'gradation', '')
  seedTestParameter('GRV002', '含泥量', 'gravel', 'physical', '%')
  seedTestParameter('GRV004', '针片状颗粒含量', 'gravel', 'physical', '%')
  seedTestParameter('GRV005', '压碎指标', 'gravel', 'physical', '%')
  seedTestParameter('RMK001', '接头极限抗拉强度', 'rebar_mech', 'mechanical', 'MPa')
  seedTestParameter('RMK002', '残余变形 u₀（d≤32）', 'rebar_mech', 'deformation', 'mm')
  seedTestParameter('RMK003', '最大力下总伸长率 Agt', 'rebar_mech', 'mechanical', '%')
  seedTestParameter('RWD001', '抗拉强度', 'rebar_weld', 'mechanical', 'MPa')
  seedTestParameter('RWD002', '弯曲试验（90°/180°）', 'rebar_weld', 'process', '')
  seedTestParameter('RWD003', '断口位置', 'rebar_weld', 'fracture', '')

  // ===== 检测标准 +（报告类别↔标准）关联 =====
  seedTestStandard('GB/T 228.1-2021', '金属材料 拉伸试验 第1部分：室温试验方法', 'national', ['steel', 'rebar_mech', 'rebar_weld'])
  seedTestStandard('GB 1499.2-2024', '钢筋混凝土用钢 第2部分：热轧带肋钢筋', 'national', ['steel'])
  seedTestStandard('GB 1499.1-2024', '钢筋混凝土用钢 第1部分：热轧光圆钢筋', 'national', ['steel'])
  seedTestStandard('GB 175-2023', '通用硅酸盐水泥', 'national', ['cement'])
  seedTestStandard('GB/T 1346-2024', '水泥标准稠度用水量、凝结时间、安定性检验方法', 'national', ['cement'])
  seedTestStandard('GB/T 17671-2021', '水泥胶砂强度检验方法（ISO法）', 'national', ['cement'])
  seedTestStandard('GB/T 50081-2019', '混凝土物理力学性能试验方法标准', 'national', ['concrete'])
  seedTestStandard('GB/T 14684-2022', '建设用砂', 'national', ['sand'])
  seedTestStandard('GB/T 14685-2022', '建设用卵石和碎石', 'national', ['gravel'])
  seedTestStandard('JGJ 107-2016', '钢筋机械连接技术规程', 'industry', ['rebar_mech'])
  seedTestStandard('JGJ 18-2012', '钢筋焊接及验收规程', 'industry', ['rebar_weld'])

  // ===== 检测标准 ↔ 检测参数 关联 =====
  // GB/T 228.1-2021 金属材料 拉伸试验
  ;['STE001', 'STE002', 'STE003', 'STE004', 'STE005', 'STE006', 'STE008', 'STE009'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB228-${p}`, standardCode: 'GB/T 228.1-2021', parameterCode: p })
  )
  // GB 1499.2-2024 钢筋混凝土用钢 第2部分：热轧带肋钢筋
  ;['STE001', 'STE002', 'STE003', 'STE004', 'STE005', 'STE006', 'STE008', 'STE009'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB1499-2-${p}`, standardCode: 'GB 1499.2-2024', parameterCode: p })
  )
  // GB 1499.1-2024 钢筋混凝土用钢 第1部分：热轧光圆钢筋
  ;['STE001', 'STE002', 'STE003', 'STE004', 'STE005', 'STE006', 'STE008', 'STE009'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB1499-1-${p}`, standardCode: 'GB 1499.1-2024', parameterCode: p })
  )
  // GB 175-2023 通用硅酸盐水泥
  ;['CEM001', 'CEM003', 'CEM004', 'CEM005', 'CEM006', 'CEM012', 'CEM014'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB175-${p}`, standardCode: 'GB 175-2023', parameterCode: p })
  )
  // GB/T 1346-2024 水泥凝结时间安定性
  ;['CEM003', 'CEM004', 'CEM005'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB1346-${p}`, standardCode: 'GB/T 1346-2024', parameterCode: p })
  )
  // GB/T 17671-2021 水泥胶砂强度
  ;['CEM012', 'CEM014'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB17671-${p}`, standardCode: 'GB/T 17671-2021', parameterCode: p })
  )
  // GB/T 50081-2019 混凝土力学性能
  ;['CON001', 'CON002', 'CON006'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB50081-${p}`, standardCode: 'GB/T 50081-2019', parameterCode: p })
  )
  // GB/T 14684-2022 建设用砂
  ;['SND001', 'SND002', 'SND003', 'SND008'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB14684-${p}`, standardCode: 'GB/T 14684-2022', parameterCode: p })
  )
  // GB/T 14685-2022 建设用卵石和碎石
  ;['GRV001', 'GRV002', 'GRV004', 'GRV005'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-GB14685-${p}`, standardCode: 'GB/T 14685-2022', parameterCode: p })
  )
  // JGJ 107-2016 钢筋机械连接
  ;['RMK001', 'RMK002', 'RMK003'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-JGJ107-${p}`, standardCode: 'JGJ 107-2016', parameterCode: p })
  )
  // JGJ 18-2012 钢筋焊接及验收规程
  ;['RWD001', 'RWD002', 'RWD003'].forEach((p) =>
    standardParametersTable.insert({ id: `sp-JGJ18-${p}`, standardCode: 'JGJ 18-2012', parameterCode: p })
  )

  // ===== 技术要求（报告类别 + 牌号/型号/等级/规格 维度）=====
  // 钢材（牌号 + 规格）
  seedTechnicalRequirement({ code: 'REQ-steel-ReL-HRB400E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE001', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '400', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-ReL-HRB400', standardCode: 'GB 1499.2-2024', parameterCode: 'STE001', categoryCode: 'steel', brand: 'HRB400', comparison: '≥', value: '400', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-ReL-HRB500E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE001', categoryCode: 'steel', brand: 'HRB500E', comparison: '≥', value: '500', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-Rm-HRB400E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE003', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '540', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-Rm-HRB500E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE003', categoryCode: 'steel', brand: 'HRB500E', comparison: '≥', value: '630', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-A-HRB400E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE004', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '16', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-steel-Agt-HRB400E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE005', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '9.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-steel-RmReL-HRB400E', standardCode: 'GB 1499.2-2024', parameterCode: 'STE006', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '1.25', unit: '' })
  seedTechnicalRequirement({ code: 'REQ-steel-weightDev-Φ22', standardCode: 'GB 1499.2-2024', parameterCode: 'STE009', categoryCode: 'steel', specification: 'Φ22', comparison: '≤', value: '5', unit: '%' })
  // 水泥（型号）
  seedTechnicalRequirement({ code: 'REQ-cem-3d-PO42.5', standardCode: 'GB 175-2023', parameterCode: 'CEM012', categoryCode: 'cement', model: 'P·O 42.5', comparison: '≥', value: '17.0', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-cem-28d-PO42.5', standardCode: 'GB 175-2023', parameterCode: 'CEM014', categoryCode: 'cement', model: 'P·O 42.5', comparison: '≥', value: '42.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-cem-3d-PO42.5R', standardCode: 'GB 175-2023', parameterCode: 'CEM012', categoryCode: 'cement', model: 'P·O 42.5R', comparison: '≥', value: '22.0', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-cem-initSet', standardCode: 'GB/T 1346-2024', parameterCode: 'CEM003', categoryCode: 'cement', comparison: '≥', value: '45', unit: 'min' })
  seedTechnicalRequirement({ code: 'REQ-cem-finalSet', standardCode: 'GB/T 1346-2024', parameterCode: 'CEM004', categoryCode: 'cement', comparison: '≤', value: '600', unit: 'min' })
  seedTechnicalRequirement({ code: 'REQ-cem-SO3', standardCode: 'GB 175-2023', parameterCode: 'CEM006', categoryCode: 'cement', comparison: '≤', value: '3.5', unit: '%' })
  // 混凝土（型号=设计强度等级 + 规格）
  seedTechnicalRequirement({ code: 'REQ-con-C30-150', standardCode: 'GB/T 50081-2019', parameterCode: 'CON002', categoryCode: 'concrete', model: 'C30', specification: '150×150×150mm', comparison: '≥', value: '28.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-con-C35-150', standardCode: 'GB/T 50081-2019', parameterCode: 'CON002', categoryCode: 'concrete', model: 'C35', specification: '150×150×150mm', comparison: '≥', value: '33.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-con-C40-150', standardCode: 'GB/T 50081-2019', parameterCode: 'CON002', categoryCode: 'concrete', model: 'C40', specification: '150×150×150mm', comparison: '≥', value: '38.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-con-C30-cube', standardCode: 'GB/T 50081-2019', parameterCode: 'CON001', categoryCode: 'concrete', model: 'C30', comparison: '≥', value: '30.0', unit: 'MPa' })
  // 混凝土抗折强度（CON006）：标准试件 150×150×550mm
  seedTechnicalRequirement({ code: 'REQ-con-C20-FF', standardCode: 'GB/T 50081-2019', parameterCode: 'CON006', categoryCode: 'concrete', model: 'C20', specification: '150×150×550mm', comparison: '≥', value: '3.0', unit: 'MPa' })
  // 砂 / 碎石（等级）
  seedTechnicalRequirement({ code: 'REQ-sand-mud-Ⅰ类', standardCode: 'GB/T 14684-2022', parameterCode: 'SND002', categoryCode: 'sand', grade: 'Ⅰ类', comparison: '≤', value: '1.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-mud-Ⅱ类', standardCode: 'GB/T 14684-2022', parameterCode: 'SND002', categoryCode: 'sand', grade: 'Ⅱ类', comparison: '≤', value: '3.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-mud-Ⅲ类', standardCode: 'GB/T 14684-2022', parameterCode: 'SND002', categoryCode: 'sand', grade: 'Ⅲ类', comparison: '≤', value: '5.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-mudLump-Ⅱ类', standardCode: 'GB/T 14684-2022', parameterCode: 'SND003', categoryCode: 'sand', grade: 'Ⅱ类', comparison: '≤', value: '1.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-fineness', standardCode: 'GB/T 14684-2022', parameterCode: 'SND001', categoryCode: 'sand', model: '中砂', comparison: 'range', value: '2.3~3.0', unit: '' })
  seedTechnicalRequirement({ code: 'REQ-grv-crush-Ⅰ类', standardCode: 'GB/T 14685-2022', parameterCode: 'GRV005', categoryCode: 'gravel', grade: 'Ⅰ类', comparison: '≤', value: '10', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-grv-crush-Ⅱ类', standardCode: 'GB/T 14685-2022', parameterCode: 'GRV005', categoryCode: 'gravel', grade: 'Ⅱ类', comparison: '≤', value: '20', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-grv-mud-Ⅱ类', standardCode: 'GB/T 14685-2022', parameterCode: 'GRV002', categoryCode: 'gravel', grade: 'Ⅱ类', comparison: '≤', value: '1.0', unit: '%' })
  // 钢筋机械连接（等级 + 牌号）
  seedTechnicalRequirement({ code: 'REQ-rmk-tensile-Ⅰ级-HRB400', standardCode: 'JGJ 107-2016', parameterCode: 'RMK001', categoryCode: 'rebar_mech', grade: 'Ⅰ级', brand: 'HRB400', comparison: '≥', value: '540', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-rmk-residual-Ⅰ级', standardCode: 'JGJ 107-2016', parameterCode: 'RMK002', categoryCode: 'rebar_mech', grade: 'Ⅰ级', specification: 'd≤32', comparison: '≤', value: '0.10', unit: 'mm' })
  seedTechnicalRequirement({ code: 'REQ-rmk-Agt-Ⅰ级', standardCode: 'JGJ 107-2016', parameterCode: 'RMK003', categoryCode: 'rebar_mech', grade: 'Ⅰ级', comparison: '≥', value: '6.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-rmk-residual-Ⅱ级', standardCode: 'JGJ 107-2016', parameterCode: 'RMK002', categoryCode: 'rebar_mech', grade: 'Ⅱ级', specification: 'd≤32', comparison: '≤', value: '0.14', unit: 'mm' })
  // 钢筋焊接（型号=焊接方式 + 牌号）
  seedTechnicalRequirement({ code: 'REQ-rwd-tensile-HRB400', standardCode: 'JGJ 18-2012', parameterCode: 'RWD001', categoryCode: 'rebar_weld', brand: 'HRB400', comparison: '≥', value: '540', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-rwd-bend-闪光对焊', standardCode: 'JGJ 18-2012', parameterCode: 'RWD002', categoryCode: 'rebar_weld', model: '闪光对焊', comparison: '=', value: '90°弯曲无裂纹', unit: '' })

  // ===== 合同 + 接样单（覆盖 7 阶段 × 7 类别）=====
  seedContract({ id: 'c-001', contractCode: 'HT-2024-001', clientUnit: '石泉县城投公司', projectName: '滨江花园一期', constructionUnit: '中建三局', witnessUnit: '华监监理', witness: '张监理' })
  seedContract({ id: 'c-002', contractCode: 'HT-2024-002', clientUnit: '汉江置业', projectName: '汉江新城二标段', constructionUnit: '陕建五公司', witnessUnit: '秦监监理', witness: '李监理' })
  seedContract({ id: 'c-003', contractCode: 'HT-2024-003', clientUnit: '安康交建', projectName: '月河大桥引道工程', constructionUnit: '中铁七局', witnessUnit: '铁正监理', witness: '赵监理' })
  seedContract({ id: 'c-004', contractCode: 'HT-2024-004', clientUnit: '石泉教育局', projectName: '第二中学教学楼', constructionUnit: '安康建工', witnessUnit: '华监监理', witness: '钱监理' })
  seedContract({ id: 'c-005', contractCode: 'HT-2024-005', clientUnit: '恒信地产', projectName: '恒信广场综合体', constructionUnit: '中建八局', witnessUnit: '秦监监理', witness: '孙监理' })
  seedContract({ id: 'c-006', contractCode: 'HT-2024-006', clientUnit: '汉滨区水利局', projectName: '防洪堤加固工程', constructionUnit: '陕水集团', witnessUnit: '水正监理', witness: '周监理' })
  seedContract({ id: 'c-007', contractCode: 'HT-2024-007', clientUnit: '旬阳城建', projectName: '旬阳安置房三期', constructionUnit: '陕建九公司', witnessUnit: '华监监理', witness: '吴监理' })
  seedContract({ id: 'c-008', contractCode: 'HT-2024-008', clientUnit: '平利文旅', projectName: '游客中心建设项目', constructionUnit: '安康建工', witnessUnit: '秦监监理', witness: '郑监理' })
  seedContract({ id: 'c-009', contractCode: 'HT-2024-009', clientUnit: '紫阳交通局', projectName: '任河大桥维修加固', constructionUnit: '中交二航局', witnessUnit: '铁正监理', witness: '王监理' })
  seedContract({ id: 'c-010', contractCode: 'HT-2024-010', clientUnit: '岚皋住建局', projectName: '老旧小区改造一期', constructionUnit: '陕建五公司', witnessUnit: '华监监理', witness: '冯监理', status: 'archived' })

  seedReceipt({ id: 'rc-001-01', contractId: 'c-001', commissionCode: 'RC-2024-0501-01', categoryCode: 'steel', flowStatus: 'archived', commissionDate: '2024-05-01', sampleCount: 3 })
  seedReceipt({ id: 'rc-001-02', contractId: 'c-001', commissionCode: 'RC-2024-0502-01', categoryCode: 'concrete', flowStatus: 'issuance', commissionDate: '2024-05-02', sampleCount: 3 })
  seedReceipt({ id: 'rc-001-03', contractId: 'c-001', commissionCode: 'RC-2024-0503-01', categoryCode: 'rebar_mech', flowStatus: 'approval', commissionDate: '2024-05-03' })
  seedReceipt({ id: 'rc-002-01', contractId: 'c-002', commissionCode: 'RC-2024-0510-01', categoryCode: 'steel', flowStatus: 'review', commissionDate: '2024-05-10', receivedBy: '赵六' })
  seedReceipt({ id: 'rc-002-02', contractId: 'c-002', commissionCode: 'RC-2024-0515-01', categoryCode: 'concrete', flowStatus: 'archived', commissionDate: '2024-05-15', receivedBy: '赵六', sampleCount: 3 })
  seedReceipt({ id: 'rc-002-03', contractId: 'c-002', commissionCode: 'RC-2024-0520-01', categoryCode: 'steel', flowStatus: 'receiving', commissionDate: '2024-05-20', receivedBy: '赵六' })
  seedReceipt({ id: 'rc-003-01', contractId: 'c-003', commissionCode: 'RC-2024-0525-01', categoryCode: 'cement', flowStatus: 'review', commissionDate: '2024-05-25', receivedBy: '李工' })
  seedReceipt({ id: 'rc-003-02', contractId: 'c-003', commissionCode: 'RC-2024-0526-01', categoryCode: 'rebar_weld', flowStatus: 'approval', commissionDate: '2024-05-26', receivedBy: '李工', sampleCount: 3 })
  seedReceipt({ id: 'rc-003-03', contractId: 'c-003', commissionCode: 'RC-2024-0601-01', categoryCode: 'sand', flowStatus: 'data_entry', commissionDate: '2024-06-01', receivedBy: '李工' })
  seedReceipt({ id: 'rc-004-01', contractId: 'c-004', commissionCode: 'RC-2024-0605-01', categoryCode: 'steel', flowStatus: 'review', commissionDate: '2024-06-05', receivedBy: '王工' })
  seedReceipt({ id: 'rc-004-02', contractId: 'c-004', commissionCode: 'RC-2024-0610-01', categoryCode: 'sand', flowStatus: 'issuance', commissionDate: '2024-06-10', receivedBy: '王工' })
  seedReceipt({ id: 'rc-005-01', contractId: 'c-005', commissionCode: 'RC-2024-0615-01', categoryCode: 'concrete', flowStatus: 'issuance', commissionDate: '2024-06-15', receivedBy: '赵工', sampleCount: 3 })
  seedReceipt({ id: 'rc-005-02', contractId: 'c-005', commissionCode: 'RC-2024-0620-01', categoryCode: 'cement', flowStatus: 'data_entry', commissionDate: '2024-06-20', receivedBy: '赵工' })
  seedReceipt({ id: 'rc-006-01', contractId: 'c-006', commissionCode: 'RC-2024-0625-01', categoryCode: 'rebar_mech', flowStatus: 'archived', commissionDate: '2024-06-25', receivedBy: '陈工', sampleCount: 3 })
  seedReceipt({ id: 'rc-006-02', contractId: 'c-006', commissionCode: 'RC-2024-0701-01', categoryCode: 'steel', flowStatus: 'receiving', commissionDate: '2024-07-01', receivedBy: '陈工' })
  seedReceipt({ id: 'rc-007-01', contractId: 'c-007', commissionCode: 'RC-2024-0705-01', categoryCode: 'concrete', flowStatus: 'data_entry', commissionDate: '2024-07-05', receivedBy: '周工', sampleCount: 3, judgmentBasis: ['GB/T 50081-2019'], testingBasis: ['GB/T 50081-2019'], testParameters: ['CON002'] })
  seedReceipt({ id: 'rc-007-02', contractId: 'c-007', commissionCode: 'RC-2024-0710-01', categoryCode: 'sand', flowStatus: 'task_assignment', commissionDate: '2024-07-10', receivedBy: '周工' })
  // 混凝土抗折强度（CON006）：标准试件 150×150×550mm，sampleSpecOverride 直接指定规格
  seedReceipt({ id: 'rc-007-03', contractId: 'c-007', commissionCode: 'RC-2024-0712-02', categoryCode: 'concrete', flowStatus: 'data_entry', commissionDate: '2024-07-12', receivedBy: '周工', sampleCount: 3, sampleSpecOverride: '150×150×550mm', judgmentBasis: ['GB/T 50081-2019'], testingBasis: ['GB/T 50081-2019'], testParameters: ['CON006'] })
  seedReceipt({ id: 'rc-008-01', contractId: 'c-008', commissionCode: 'RC-2024-0712-01', categoryCode: 'steel', flowStatus: 'receiving', commissionDate: '2024-07-12', receivedBy: '吴工' })
  seedReceipt({ id: 'rc-008-02', contractId: 'c-008', commissionCode: 'RC-2024-0715-01', categoryCode: 'cement', flowStatus: 'task_assignment', commissionDate: '2024-07-15', receivedBy: '吴工' })
  seedReceipt({ id: 'rc-009-01', contractId: 'c-009', commissionCode: 'RC-2024-0718-01', categoryCode: 'rebar_weld', flowStatus: 'issuance', commissionDate: '2024-07-18', receivedBy: '郑工', sampleCount: 3 })
  seedReceipt({ id: 'rc-009-02', contractId: 'c-009', commissionCode: 'RC-2024-0720-01', categoryCode: 'gravel', flowStatus: 'issuance', commissionDate: '2024-07-20', receivedBy: '郑工' })
  seedReceipt({ id: 'rc-010-01', contractId: 'c-010', commissionCode: 'RC-2024-0508-01', categoryCode: 'gravel', flowStatus: 'archived', commissionDate: '2024-05-08', receivedBy: '孙工' })
}

/** dev 启动种子（幂等，见 msw/browser.ts） */
export function seedDevData() {
  if (orgInfoTable.query({ page: 1, pageSize: 1 }).total === 0) {
    seedOrgInfo()
  }
}
