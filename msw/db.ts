// Mock 内存数据库：仅 mock 层使用，测试间隔离由 tests/setup.ts 的 resetHandlers + 本模块的 resetDb 保证。
// ch36：projects/samples CRUD + 分页/搜索/过滤
// ch37：flow 状态持久化
// extend 批1：reports/users/roles
// extend 批2：tasks/stats/change-password
// batch3-A2：四层模型重构（FIELD-ALIGNMENT-SPEC.md）—— 替换 projectTable→contractTable +
// 新增 receiptTable/testRecordSheetTable/testItemTable/testParameterTable/testStandardTable/
// technicalRequirementTable/orgInfoTable；改 sampleTable/reportTable schema 兼容旧字段；
// 7 种材料真实种子数据。

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
  }): { items: T[]; total: number; page: number; pageSize: number } {
    const { page, pageSize, keyword, keywordFields, filters, dateField, dateFrom, dateTo } = opts
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
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return { items, total, page, pageSize }
  }
}

// =============================================================================
// batch3-A2：四层模型权威 schema + 7 种材料真实种子
// =============================================================================

/** batch3-A2：合同/委托表（取代旧 projectTable） */
export const contractTable = new MockTable<{
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
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}>('c')

/** batch3-A2：接样表 */
export const receiptTable = new MockTable<{
  id: string
  contractId: string
  receiptCode: string
  receivedDate: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  testEnvironment?: string
  mainEquipment?: string
  representBatchSummary?: string
  remark: string
  status: 'received' | 'testing' | 'completed' | 'rejected'
  createdAt: string
  updatedAt: string
}>('rc')

/** batch3-A2：样品表（兼容旧字段 projectId/name/code/receivedAt 为可选 fallback 兼容） */
export const sampleTable = new MockTable<{
  id: string
  contractId: string
  receiptId: string
  reportId: string | null
  sampleCode: string
  materialType: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleDescription?: string
  sampleQuantity?: string
  representQuantity?: string
  sampleCondition?: string
  materialDetails: Record<string, unknown>
  status: string
  createdAt: string
  updatedAt: string
  // 旧字段兼容（fallback 兼容层，迁移后删除）
  projectId?: string
  name?: string
  code?: string
  receivedAt?: string
}>('s')

/** batch3-A2：检测记录单表（createdAt/updatedAt 由 MockTable 自动生成） */
export const testRecordSheetTable = new MockTable<{
  id: string
  contractId: string
  receiptId?: string
  sampleIds: string[]
  sheetCode: string
  testDate: string
  operatorId?: string
  reviewerId?: string
  equipment?: string
  environment?: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('trs')

/** batch3-A2：单项检测记录表（createdAt/updatedAt 由 MockTable 自动生成） */
export const testItemTable = new MockTable<{
  id: string
  sheetId: string
  sampleId: string
  reportId: string | null
  parameterCode: string
  standardCode?: string
  requirementCode?: string
  requirement: string
  result: string
  unit?: string
  passed: boolean
  materialDetails: Record<string, unknown>
  remark?: string
  createdAt: string
  updatedAt: string
}>('ti')

/** batch3-A2：报告表（兼容旧字段 sampleId/title 为可选 fallback） */
export const reportTable = new MockTable<{
  id: string
  contractId: string
  receiptId: string
  reportCode: string
  reportDate: string
  materialType: string
  sampleIds: string[]
  conclusion: string
  result: 'pass' | 'fail'
  remark: string
  status: string
  issuedAt: string | null
  createdAt: string
  updatedAt: string
  // 旧字段兼容
  sampleId?: string
  title?: string
  testItems?: Record<string, unknown>
}>('r')

/** batch3-A2：检测参数码表（createdAt/updatedAt 由 MockTable 自动生成） */
export const testParameterTable = new MockTable<{
  id: string
  code: string
  name: string
  materialType: string
  category: string
  unit?: string
  description?: string
  createdAt: string
  updatedAt: string
}>('tp')

/** batch3-A2：检测标准码表（createdAt/updatedAt 由 MockTable 自动生成） */
export const testStandardTable = new MockTable<{
  id: string
  code: string
  name: string
  type: 'national' | 'industry' | 'local' | 'enterprise'
  applicableMaterials: string[]
  applicableParameters: string[]
  createdAt: string
  updatedAt: string
}>('ts')

/** batch3-A2：技术要求码表（createdAt/updatedAt 由 MockTable 自动生成） */
export const technicalRequirementTable = new MockTable<{
  id: string
  code: string
  standardCode: string
  parameterCode: string
  materialType: string
  materialGrade?: string
  specification?: string
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'
  value: string
  unit?: string
  remark?: string
  createdAt: string
  updatedAt: string
}>('tr')

/** batch3-A2：OrgInfo 单例表（1 行，createdAt/updatedAt 由 MockTable 自动生成） */
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

// =============================================================================
// ch37：flow 状态持久化（保留）
// =============================================================================
export const flowStore = new Map<string, { status: string; history: unknown[] }>()

// =============================================================================
// extend 批1：用户/角色表（保留）
// =============================================================================
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
// extend 批2：检测任务表（保留）
// =============================================================================
export const taskTable = new MockTable<{
  id: string
  sampleId: string
  assigneeId: string
  testItems: string
  status: string
  resultData: string
  conclusion: string
  createdAt: string
  updatedAt: string
}>('task')

// =============================================================================
// batch3-A2：报告审核状态转换（draft→reviewing→issued/draft）
// =============================================================================
const REPORT_REVIEW_TRANSITIONS: Record<string, string[]> = {
  draft: ['reviewing'],
  reviewing: ['issued', 'draft'],
  issued: [],
}
const REVIEW_ACTION_TARGET: Record<string, string> = {
  submit: 'reviewing',
  approve: 'issued',
  reject: 'draft',
}

export function reviewReportRecord(id: string, action: string): { ok: boolean; report?: unknown; message?: string } {
  const report = reportTable.findById(id)
  if (!report) return { ok: false, message: '报告不存在' }
  const target = REVIEW_ACTION_TARGET[action]
  if (!target) return { ok: false, message: '未知审核动作' }
  const allowed = REPORT_REVIEW_TRANSITIONS[report.status] ?? []
  if (!allowed.includes(target)) {
    return { ok: false, message: `非法转换：${report.status} → ${target}` }
  }
  const updated = reportTable.update(id, {
    status: target,
    issuedAt: target === 'issued' ? new Date().toISOString() : null,
  })
  return { ok: true, report: updated }
}

// =============================================================================
// batch3-A2：Dashboard 聚合统计（兼容层保留 projectCount 字段）
// =============================================================================
export function computeStats() {
  const samples = sampleTable.query({ page: 1, pageSize: 99999 }).items
  const reports = reportTable.query({ page: 1, pageSize: 99999 }).items
  const tasks = taskTable.query({ page: 1, pageSize: 99999 }).items
  const contracts = contractTable.query({ page: 1, pageSize: 1 }).total
  const receipts = receiptTable.query({ page: 1, pageSize: 1 }).total
  return {
    // 兼容旧字段（@deprecated DashboardStats.projectCount）
    projectCount: contracts,
    contractCount: contracts,
    receiptCount: receipts,
    sampleCount: samples.length,
    sampleCountByStatus: {
      pending: samples.filter((s) => s.status === 'pending').length,
      testing: samples.filter((s) => s.status === 'testing').length,
      completed: samples.filter((s) => s.status === 'completed').length,
      rejected: samples.filter((s) => s.status === 'rejected').length,
    },
    reportCountByStatus: {
      draft: reports.filter((r) => r.status === 'draft').length,
      reviewing: reports.filter((r) => r.status === 'reviewing').length,
      issued: reports.filter((r) => r.status === 'issued').length,
    },
    pendingTaskCount: tasks.filter((t) => t.status === 'pending').length,
  }
}

// =============================================================================
// 测试隔离：重置所有 mock 表
// =============================================================================
export function resetMockDb() {
  contractTable.reset()
  receiptTable.reset()
  sampleTable.reset()
  testRecordSheetTable.reset()
  testItemTable.reset()
  reportTable.reset()
  testParameterTable.reset()
  testStandardTable.reset()
  technicalRequirementTable.reset()
  orgInfoTable.reset()
  userTable.reset()
  roleTable.reset()
  taskTable.reset()
  flowStore.clear()
}

// =============================================================================
// batch3-A2：7 种材料真实种子数据（合同 + 接样 + 样品 + 检测记录 + 单项 + 报告 + 码表 + OrgInfo）
// =============================================================================

function seedContract(input: {
  id: string
  contractCode: string
  clientUnit: string
  projectName: string
  constructionUnit: string
  witnessUnit: string
  witness: string
  status?: 'active' | 'archived'
}) {
  contractTable.insert({
    id: input.id,
    contractCode: input.contractCode,
    clientUnit: input.clientUnit,
    projectName: input.projectName,
    constructionUnit: input.constructionUnit,
    witnessUnit: input.witnessUnit,
    witness: input.witness,
    status: input.status ?? 'active',
  })
}

function seedReceipt(input: {
  id: string
  contractId: string
  receiptCode: string
  sampleIds: string[]
}) {
  receiptTable.insert({
    id: input.id,
    contractId: input.contractId,
    receiptCode: input.receiptCode,
    receivedDate: '2024-05-03',
    receivedBy: '王五',
    sampleSource: '施工送检',
    testCategory: '委托检验',
    testEnvironment: '温度 20±2℃，湿度 50%RH',
    mainEquipment: 'WAW-1000 万能试验机 / 试验筛',
    remark: '',
    status: 'received',
    sampleIds: input.sampleIds,
  } as never) // batch3-A2：receipt sampleIds 为冗余（来源由 sampleTable 关联），此处填充便于查询
}

function seedSample(input: {
  id: string
  contractId: string
  receiptId: string
  sampleCode: string
  materialType: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleQuantity?: string
  representQuantity?: string
  materialDetails: Record<string, unknown>
  status?: string
}) {
  sampleTable.insert({
    id: input.id,
    contractId: input.contractId,
    receiptId: input.receiptId,
    reportId: null,
    sampleCode: input.sampleCode,
    materialType: input.materialType,
    sampleName: input.sampleName,
    sampleType: input.sampleType,
    specification: input.specification,
    sampleGrade: input.sampleGrade,
    structuralPart: input.structuralPart,
    manufacturer: input.manufacturer,
    sampleQuantity: input.sampleQuantity,
    representQuantity: input.representQuantity,
    materialDetails: input.materialDetails,
    status: input.status ?? 'completed',
    // 旧字段兼容（fallback）
    projectId: input.contractId,
    name: input.sampleName ?? input.sampleCode,
    code: input.sampleCode,
    receivedAt: '2024-05-03',
  })
}

function seedReport(input: {
  id: string
  contractId: string
  receiptId: string
  reportCode: string
  reportDate: string
  materialType: string
  sampleIds: string[]
  conclusion: string
  result: 'pass' | 'fail'
  remark: string
  status: string
}) {
  reportTable.insert({
    id: input.id,
    contractId: input.contractId,
    receiptId: input.receiptId,
    reportCode: input.reportCode,
    reportDate: input.reportDate,
    materialType: input.materialType,
    sampleIds: input.sampleIds,
    conclusion: input.conclusion,
    result: input.result,
    remark: input.remark,
    status: input.status,
    issuedAt: input.status === 'issued' ? '2024-05-05T10:00:00Z' : null,
    // 旧字段兼容（fallback）
    sampleId: input.sampleIds[0] ?? '',
    title: input.reportCode,
  })
}

function seedTestRecordSheet(input: {
  id: string
  contractId: string
  receiptId: string
  sampleIds: string[]
  sheetCode: string
  testDate: string
}) {
  testRecordSheetTable.insert({
    id: input.id,
    contractId: input.contractId,
    receiptId: input.receiptId,
    sampleIds: input.sampleIds,
    sheetCode: input.sheetCode,
    testDate: input.testDate,
    equipment: 'WAW-1000 万能试验机',
    environment: '温度 20±2℃，湿度 50%RH',
  })
}

function seedTestItem(input: {
  id: string
  sheetId: string
  sampleId: string
  parameterCode: string
  result: string
  unit?: string
  passed: boolean
}) {
  testItemTable.insert({
    id: input.id,
    sheetId: input.sheetId,
    sampleId: input.sampleId,
    reportId: null,
    parameterCode: input.parameterCode,
    standardCode: 'GB/T 228.1-2010',
    requirementCode: 'REQ-steel-yieldStrength-HRB400',
    requirement: '≥ 400 MPa',
    result: input.result,
    unit: input.unit ?? 'MPa',
    passed: input.passed,
    materialDetails: { kind: 'steel' },
  })
}

function seedTestParameter(code: string, name: string, materialType: string, category: string, unit?: string) {
  testParameterTable.insert({ code, name, materialType, category, unit })
}

function seedTestStandard(code: string, name: string, type: 'national' | 'industry' | 'local' | 'enterprise', applicableMaterials: string[], applicableParameters: string[]) {
  testStandardTable.insert({ code, name, type, applicableMaterials, applicableParameters })
}

function seedTechnicalRequirement(req: {
  code: string
  standardCode: string
  parameterCode: string
  materialType: string
  materialGrade?: string
  specification?: string
  comparison: '≥' | '≤' | '=' | 'range' | 'eq'
  value: string
  unit?: string
}) {
  technicalRequirementTable.insert(req)
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

/** batch3-A2：种子 7 种材料真实场景 */
export function seedBatch3Data() {
  seedOrgInfo()

  // ===== 合同 =====
  seedContract({
    id: 'contract-bj-001',
    contractCode: 'BJ-2024-001',
    clientUnit: 'XX 建设集团',
    projectName: '滨江一号一期',
    constructionUnit: '中建 XX 局',
    witnessUnit: 'XX 监理公司',
    witness: '张工',
  })

  // ===== 接样 1（3 样品：钢材/水泥/砂） =====
  seedReceipt({ id: 'receipt-001', contractId: 'contract-bj-001', receiptCode: 'RC-2024-0501', sampleIds: ['sample-steel-001', 'sample-cement-001', 'sample-sand-001'] })

  seedSample({
    id: 'sample-steel-001', contractId: 'contract-bj-001', receiptId: 'receipt-001',
    sampleCode: 'ST-001', materialType: 'steel',
    sampleName: '钢筋', sampleType: '热轧带肋 HRB400', specification: 'Φ22',
    sampleGrade: 'HRB400', manufacturer: '沙钢集团',
    sampleQuantity: '3 根', representQuantity: '60t',
    materialDetails: { kind: 'steel', steelGrade: 'HRB400', nominalDiameter: 22, heatNumber: 'SG-2024-0512' },
  })
  seedSample({
    id: 'sample-cement-001', contractId: 'contract-bj-001', receiptId: 'receipt-001',
    sampleCode: 'CE-001', materialType: 'cement',
    sampleName: '水泥', sampleType: 'P.O 42.5',
    manufacturer: '海螺水泥', sampleQuantity: '12kg', representQuantity: '200t',
    materialDetails: { kind: 'cement', cementType: 'P.O', factoryBatchNo: 'HL-2024-0428', productionDate: '2024-04-28' },
  })
  seedSample({
    id: 'sample-sand-001', contractId: 'contract-bj-001', receiptId: 'receipt-001',
    sampleCode: 'SA-001', materialType: 'sand',
    sampleName: '砂', sampleType: '中砂',
    sampleGrade: 'Ⅱ类', manufacturer: '洞庭湖产地',
    sampleQuantity: '30kg', representQuantity: '300t',
    materialDetails: { kind: 'sand' },
  })

  // ===== 接样 2（混凝土组：1 接样 3 试块） =====
  seedReceipt({ id: 'receipt-002', contractId: 'contract-bj-001', receiptCode: 'RC-2024-0502', sampleIds: ['sample-concrete-001-1', 'sample-concrete-001-2', 'sample-concrete-001-3'] })

  ;['sample-concrete-001-1', 'sample-concrete-001-2', 'sample-concrete-001-3'].forEach((id, i) => {
    seedSample({
      id, contractId: 'contract-bj-001', receiptId: 'receipt-002',
      sampleCode: `CO-001-${i + 1}`, materialType: 'concrete',
      sampleName: '混凝土试块', sampleType: 'C30', specification: '150×150×150mm',
      structuralPart: '一层柱A-3', manufacturer: 'XX 混凝土公司',
      sampleQuantity: '1 块', representQuantity: '120m³',
      materialDetails: { kind: 'concrete', pourDate: '2024-04-25', volume: 120, specimenSize: '150×150×150mm', curingCondition: '标养', ageDays: 28, groupIndex: i + 1 },
    })
  })
  seedTestRecordSheet({ id: 'trs-concrete-001', contractId: 'contract-bj-001', receiptId: 'receipt-002', sampleIds: ['sample-concrete-001-1', 'sample-concrete-001-2', 'sample-concrete-001-3'], sheetCode: 'TR-CO-001', testDate: '2024-05-02' })
  ;['sample-concrete-001-1', 'sample-concrete-001-2', 'sample-concrete-001-3'].forEach((sid, i) => {
    seedTestItem({ id: `ti-co-${i + 1}`, sheetId: 'trs-concrete-001', sampleId: sid, parameterCode: 'CON001', result: `${31.2 - i * 0.4}`, unit: 'MPa', passed: true })
  })

  // ===== 接样 3（钢筋机械连接组：1 接样 3 试件） =====
  seedReceipt({ id: 'receipt-003', contractId: 'contract-bj-001', receiptCode: 'RC-2024-0503', sampleIds: ['sample-rebar-mech-001-1', 'sample-rebar-mech-001-2', 'sample-rebar-mech-001-3'] })

  ;['sample-rebar-mech-001-1', 'sample-rebar-mech-001-2', 'sample-rebar-mech-001-3'].forEach((id, i) => {
    seedSample({
      id, contractId: 'contract-bj-001', receiptId: 'receipt-003',
      sampleCode: `RM-001-${i + 1}`, materialType: 'rebar_mech',
      sampleName: '机械连接试件', sampleType: '直螺纹套筒', specification: 'Φ25',
      sampleGrade: 'Ⅱ级', structuralPart: '一层柱A-3', manufacturer: 'XX 连接科技',
      sampleQuantity: '1 根', representQuantity: '200 个',
      materialDetails: { kind: 'rebar_mech', spliceType: '直螺纹套筒', steelGrade: 'HRB400', groupIndex: i + 1 },
    })
  })
  seedTestRecordSheet({ id: 'trs-rebar-mech-001', contractId: 'contract-bj-001', receiptId: 'receipt-003', sampleIds: ['sample-rebar-mech-001-1', 'sample-rebar-mech-001-2', 'sample-rebar-mech-001-3'], sheetCode: 'TR-RM-001', testDate: '2024-05-03' })
  ;['sample-rebar-mech-001-1', 'sample-rebar-mech-001-2', 'sample-rebar-mech-001-3'].forEach((sid, i) => {
    seedTestItem({ id: `ti-rm-${i + 1}`, sheetId: 'trs-rebar-mech-001', sampleId: sid, parameterCode: 'RMK002', result: '575', unit: 'MPa', passed: true })
  })

  // ===== 报告 =====
  seedReport({
    id: 'report-steel-001', contractId: 'contract-bj-001', receiptId: 'receipt-001',
    reportCode: 'R-2024-0501-001', reportDate: '2024-05-04', materialType: 'steel',
    sampleIds: ['sample-steel-001'],
    conclusion: '所检项目均符合 GB/T 1499.2-2018 标准要求。', result: 'pass',
    remark: '见证取样', status: 'issued',
  })
  seedReport({
    id: 'report-concrete-001', contractId: 'contract-bj-001', receiptId: 'receipt-002',
    reportCode: 'R-2024-0502-001', reportDate: '2024-05-05', materialType: 'concrete',
    sampleIds: ['sample-concrete-001-1', 'sample-concrete-001-2', 'sample-concrete-001-3'],
    conclusion: '抗压强度代表值 30.5 MPa，符合 C30 设计要求。', result: 'pass',
    remark: '标养 28 天', status: 'issued',
  })
  seedReport({
    id: 'report-rebar-mech-001', contractId: 'contract-bj-001', receiptId: 'receipt-003',
    reportCode: 'R-2024-0503-001', reportDate: '2024-05-05', materialType: 'rebar_mech',
    sampleIds: ['sample-rebar-mech-001-1', 'sample-rebar-mech-001-2', 'sample-rebar-mech-001-3'],
    conclusion: '极限抗拉强度均 ≥ 570 MPa，断口均位于母材，符合 Ⅱ级接头要求。', result: 'pass',
    remark: '直螺纹套筒连接', status: 'issued',
  })

  // ===== 码表：检测参数（7 材料） =====
  // steel 12 项
  ;['STE001', 'STE002', 'STE003', 'STE004', 'STE005', 'STE006', 'STE007', 'STE008', 'STE009', 'STE010', 'STE011', 'STE012'].forEach((code, i) => {
    seedTestParameter(code, `钢材参数-${i + 1}`, 'steel', i < 8 ? 'mechanical' : 'process')
  })
  // cement 14 项
  for (let i = 1; i <= 14; i++) seedTestParameter(`CEM${String(i).padStart(3, '0')}`, `水泥参数-${i}`, 'cement', i <= 2 ? 'fineness' : i <= 4 ? 'setting' : i <= 10 ? 'chemistry' : 'strength')
  // concrete / sand / gravel / rebar_mech / rebar_weld
  seedTestParameter('CON001', '抗压强度', 'concrete', 'mechanical')
  seedTestParameter('CON002', '抗压强度代表值', 'concrete', 'mechanical')
  for (let i = 1; i <= 15; i++) seedTestParameter(`SND${String(i).padStart(3, '0')}`, `砂参数-${i}`, 'sand', 'physical')
  for (let i = 1; i <= 12; i++) seedTestParameter(`GRV${String(i).padStart(3, '0')}`, `石参数-${i}`, 'gravel', 'physical')
  for (let i = 1; i <= 3; i++) seedTestParameter(`RMK${String(i).padStart(3, '0')}`, `机械连接参数-${i}`, 'rebar_mech', 'mechanical')
  for (let i = 1; i <= 5; i++) seedTestParameter(`RWD${String(i).padStart(3, '0')}`, `焊接连接参数-${i}`, 'rebar_weld', 'mechanical')

  // ===== 码表：检测标准 =====
  seedTestStandard('GB/T 228.1-2010', '金属材料 拉伸试验 第1部分：室温试验方法', 'national', ['steel', 'rebar_mech', 'rebar_weld'], ['STE003', 'STE004', 'STE005', 'RMK002', 'RWD002'])
  seedTestStandard('GB/T 1499.2-2018', '钢筋混凝土用钢 第2部分：热轧带肋钢筋', 'national', ['steel'], ['STE003', 'STE004', 'STE005'])
  seedTestStandard('GB/T 17671-1999', '水泥胶砂强度检验方法（ISO法）', 'national', ['cement'], ['CEM011', 'CEM012', 'CEM013', 'CEM014'])
  seedTestStandard('GB/T 1346-2011', '水泥标准稠度用水量、凝结时间、安定性检验方法', 'national', ['cement'], ['CEM003', 'CEM004', 'CEM005'])
  seedTestStandard('GB/T 50082-2009', '普通混凝土长期性能和耐久性能试验方法标准', 'national', ['concrete'], ['CON001'])
  seedTestStandard('GB/T 50081-2019', '混凝土物理力学性能试验方法标准', 'national', ['concrete'], ['CON001', 'CON002'])
  seedTestStandard('GB/T 14684-2011', '建设用砂', 'national', ['sand'], Array.from({ length: 15 }, (_, i) => `SND${String(i + 1).padStart(3, '0')}`))
  seedTestStandard('GB/T 14685-2011', '建设用卵石和碎石', 'national', ['gravel'], Array.from({ length: 12 }, (_, i) => `GRV${String(i + 1).padStart(3, '0')}`))
  seedTestStandard('JGJ 107-2010', '钢筋机械连接技术规程', 'industry', ['rebar_mech'], ['RMK001', 'RMK002', 'RMK003'])
  seedTestStandard('JGJ 18-2012', '钢筋焊接及验收规程', 'industry', ['rebar_weld'], ['RWD001', 'RWD002', 'RWD003', 'RWD004', 'RWD005'])

  // ===== 码表：技术要求（16+ 条覆盖各材料/等级/规格） =====
  seedTechnicalRequirement({ code: 'REQ-steel-yieldStrength-HRB400', standardCode: 'GB/T 1499.2-2018', parameterCode: 'STE003', materialType: 'steel', materialGrade: 'HRB400', specification: 'Φ22', comparison: '≥', value: '400', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-yieldStrength-HRB500', standardCode: 'GB/T 1499.2-2018', parameterCode: 'STE003', materialType: 'steel', materialGrade: 'HRB500', specification: 'Φ22', comparison: '≥', value: '500', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-tensileStrength-HRB400', standardCode: 'GB/T 1499.2-2018', parameterCode: 'STE004', materialType: 'steel', materialGrade: 'HRB400', specification: 'Φ22', comparison: '≥', value: '540', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-steel-elongation-HRB400', standardCode: 'GB/T 1499.2-2018', parameterCode: 'STE005', materialType: 'steel', materialGrade: 'HRB400', specification: 'Φ22', comparison: '≥', value: '16', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-steel-strengthRatio-HRB400', standardCode: 'GB/T 1499.2-2018', parameterCode: 'STE007', materialType: 'steel', materialGrade: 'HRB400', specification: 'Φ22', comparison: '≥', value: '1.25' })
  seedTechnicalRequirement({ code: 'REQ-cement-3dayCompressive-42.5', standardCode: 'GB/T 17671-1999', parameterCode: 'CEM012', materialType: 'cement', materialGrade: '42.5', comparison: '≥', value: '17.0', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-cement-28dayCompressive-42.5', standardCode: 'GB/T 17671-1999', parameterCode: 'CEM014', materialType: 'cement', materialGrade: '42.5', comparison: '≥', value: '42.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-cement-initialSetting-42.5', standardCode: 'GB/T 1346-2011', parameterCode: 'CEM003', materialType: 'cement', materialGrade: '42.5', comparison: '≥', value: '45', unit: 'min' })
  seedTechnicalRequirement({ code: 'REQ-cement-finalSetting-42.5', standardCode: 'GB/T 1346-2011', parameterCode: 'CEM004', materialType: 'cement', materialGrade: '42.5', comparison: '≤', value: '600', unit: 'min' })
  seedTechnicalRequirement({ code: 'REQ-concrete-compressive-C30', standardCode: 'GB/T 50081-2019', parameterCode: 'CON002', materialType: 'concrete', materialGrade: 'C30', comparison: '≥', value: '28.5', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-sand-mudContent-Ⅰ类', standardCode: 'GB/T 14684-2011', parameterCode: 'SND001', materialType: 'sand', materialGrade: 'Ⅰ类', comparison: '≤', value: '1.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-mudContent-Ⅱ类', standardCode: 'GB/T 14684-2011', parameterCode: 'SND001', materialType: 'sand', materialGrade: 'Ⅱ类', comparison: '≤', value: '3.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-sand-mudContent-Ⅲ类', standardCode: 'GB/T 14684-2011', parameterCode: 'SND001', materialType: 'sand', materialGrade: 'Ⅲ类', comparison: '≤', value: '5.0', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-gravel-crushIndex-Ⅰ类', standardCode: 'GB/T 14685-2011', parameterCode: 'GRV004', materialType: 'gravel', materialGrade: 'Ⅰ类', comparison: '≤', value: '10', unit: '%' })
  seedTechnicalRequirement({ code: 'REQ-rebarMech-tensile-Ⅱ级', standardCode: 'JGJ 107-2010', parameterCode: 'RMK002', materialType: 'rebar_mech', materialGrade: 'Ⅱ级', specification: 'Φ25', comparison: '≥', value: '钢筋极限抗拉强度标准值', unit: 'MPa' })
  seedTechnicalRequirement({ code: 'REQ-rebarWeld-tensile-闪光对焊', standardCode: 'JGJ 18-2012', parameterCode: 'RWD002', materialType: 'rebar_weld', specification: 'Φ20', comparison: '≥', value: '钢筋抗拉强度标准值', unit: 'MPa' })

  // ===== 角色（extend 批1，保留） =====
  ;[
    { id: 'role-admin', name: 'admin', description: '管理员', permissions: ['project:read', 'project:write', 'sample:read', 'sample:write', 'report:read', 'report:write', 'report:issue', 'user:read', 'user:create', 'user:update', 'user:delete', 'role:read', 'role:write'] },
    { id: 'role-tech', name: 'tech', description: '检测员', permissions: ['sample:read', 'sample:write', 'report:read', 'report:write'] },
    { id: 'role-viewer', name: 'viewer', description: '查看者', permissions: ['sample:read', 'report:read'] },
  ].forEach((r) => roleTable.insert({ ...r, permissions: r.permissions }))

  // ===== 用户（extend 批1，保留种子） =====
  userTable.insert({ username: 'labadmin', displayName: '实验室管理员', email: 'labadmin@lab.cn', roleId: 'role-admin', status: 'active', password: 'lab123' })
  userTable.insert({ username: 'tech', displayName: '检测员', email: 'tech@lab.cn', roleId: 'role-tech', status: 'active', password: 'lab123' })
}

// batch3-A2：默认 seed（测试间隔离——但每次 resetMockDb 后调用 seedBatch3Data 恢复种子）
// 注意：tests/setup.ts 的 afterEach 调 resetMockDb 清空所有表（含种子），所以测试需要自行 seed
// 或在 beforeEach 调 seedBatch3Data。为避免破坏既有 291 tests 的隔离语义，不自动 seed；
// 需要种子的测试在 beforeEach 中显式调用 seedBatchData()（轻量版）。

/** 轻量种子（既有 tests 兼容——只 seed 旧 Project/Sample/Report 兼容字段） */
export function seedLegacyData() {
  // 旧 projectTable 删除后，旧 tests 用 query('/projects') 拿到空列表，OK（不依赖种子）
  // 这里只 seed 用户/角色（既有测试可能依赖）
  // 实际上 seedBatch3Data 全量 seed 会与测试期望不符（如 projectQuery 测试期望空表）
  // 因此 seedLegacyData 故意保持空，由既有测试自行准备数据
}

/** 测试隔离：清空所有表（含 batch3-A2 新表） */
export const __resetDb__ = resetMockDb

/** dev 模式种子：浏览器首次访问时给单例表（OrgInfo 等）灌入可用的展示数据。
 * 注意：测试 setup 在 afterEach 会调 resetMockDb 清空所有表，所以本函数不能影响测试隔离——
 * 仅在 dev 浏览器首次启动时由 msw/browser.ts 调一次。
 * 与 seedBatch3Data 的区别：本函数是幂等的 dev 启动 hook，不假设任何表为空；调用方在使用前应避免重复触发。
 */
export function seedDevData() {
  if (orgInfoTable.query({ page: 1, pageSize: 1 }).total === 0) {
    seedOrgInfo()
  }
}