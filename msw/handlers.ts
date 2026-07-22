import { http, HttpResponse } from 'msw'
import type {
  UserRecord,
  UserCreateInput,
  UserUpdateInput,
  RoleRecord,
  RoleCreateInput,
  RoleUpdateInput,
  DashboardStats,
  ChangePasswordInput,
} from '../src/types/api'
import { FLOW_STAGE_ORDER } from '../src/types/api'
import { signJwt, verifyJwt } from './jwt'
import {
  MockTable,
  contractTable,
  contractCategoryTable,
  reportCategoryTable,
  categoryStandardTable,
  standardParametersTable,
  modelTable,
  specificationTable,
  gradeTable,
  brandTable,
  receiptTable,
  sampleTable,
  testItemTable,
  testParameterTable,
  testStandardTable,
  technicalRequirementTable,
  calculationRuleTable,
  reportTemplateTable,
  orgInfoTable,
  userTable,
  roleTable,
  computeStats,
  buildSummary,
  applyFlowAction,
  evaluateTestResult,
  syncReceiptResult,
  samplesOfReceipt,
  inspectionSpecialtyTable,
  inspectionObjectTable,
  inspectionParameterTable,
  inspectionStandardTable,
  inspectionObjectParameterTable,
  inspectionObjectStandardTable,
  inspectionStandardParameterTable,
  inspectionSpecialtyObjectTable,
} from './db'

/** v3 MSW handler 注册表
 * /auth/*：登录 / me / change-password
 * /contracts：合同 CRUD
 * /report-categories：报告类别 CRUD（含扩展属性定义）
 * /category-standards：报告类别 ↔ 检测标准 关联 CRUD
 * /models /specifications /grades /brands：型号/规格/等级/牌号 码表（归属报告类别）
 * /receipts + /receipts/flow：接样单（合并报告字段）+ 流程管线批量操作
 * /samples：样品（归属接样单）
 * /test-items：单项检测记录（归属样品，自动评定 + 手工修正）
 * /test-parameters /test-standards /technical-requirements：检测码表
 * /report-templates：报告模板（每类别一份）
 * /stats + /summary：仪表盘统计 + 按报告类别的试验报告汇总表
 * /org-info /users /roles
 */

/** 统计表中某字段等于指定值的行数，用于删除前的引用计数。 */
function countBy<T extends { id: string; createdAt: string; updatedAt: string }>(table: MockTable<T>, field: keyof T, value: string): number {
  return table.all().filter((r) => r[field] === value).length
}

/** 通用码表 CRUD handler 工厂（归属报告类别的字典：型号/规格/等级/牌号） */
function dictHandlers(
  path: string,
  table: MockTable<{ id: string; categoryCode: string; name: string; remark?: string; createdAt: string; updatedAt: string }>,
  label: string,
) {
  return [
    http.get(`*/${path}`, ({ request }) => {
      const url = new URL(request.url)
      const result = table.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['name'],
        filters: { categoryCode: url.searchParams.get('categoryCode') ?? undefined },
      })
      return HttpResponse.json(result)
    }),
    http.post(`*/${path}`, async ({ request }) => {
      const body = (await request.json()) as Partial<{ categoryCode: string; name: string; remark: string }>
      if (!body.categoryCode || !body.name) {
        return HttpResponse.json({ message: 'categoryCode/name 必填' }, { status: 400 })
      }
      const dup = table.all().find((r) => r.categoryCode === body.categoryCode && r.name === body.name)
      if (dup) return HttpResponse.json({ message: `该报告类别下已存在同名${label}` }, { status: 400 })
      const created = table.insert({ categoryCode: body.categoryCode, name: body.name, remark: body.remark })
      return HttpResponse.json(created, { status: 201 })
    }),
    http.put(`*/${path}/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>
      const updated = table.update(String(params.id), body)
      if (!updated) return HttpResponse.json({ message: `${label}不存在` }, { status: 404 })
      return HttpResponse.json(updated)
    }),
    http.delete(`*/${path}/:id`, ({ params }) => {
      const ok = table.remove(String(params.id))
      if (!ok) return HttpResponse.json({ message: `${label}不存在` }, { status: 404 })
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

export const handlers = [
  // ===========================================================
  // /auth
  // ===========================================================
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    const isAdmin = body.username === 'labadmin' || body.username === 'admin'
    const isTech = body.username === 'technician'
    const isValidPassword =
      (isAdmin && body.password === 'lab123') ||
      (isTech && body.password === 'tech123') ||
      (!isAdmin && !isTech && body.password === 'lab123')
    if (!isValidPassword) {
      return HttpResponse.json({ message: '用户名或密码错误' }, { status: 401 })
    }
    const role = isAdmin ? 'admin' : isTech ? 'technician' : 'admin'
    const roleId = isAdmin ? 'role-admin' : isTech ? 'role-tech' : 'role-admin'
    const permissions = isAdmin
      ? ['project:read', 'project:write', 'sample:read', 'sample:write', 'report:read', 'report:write', 'report:issue', 'user:read', 'user:delete', 'role:read', 'role:write']
      : isTech
        ? ['project:read', 'sample:read', 'sample:write', 'report:read', 'report:write']
        : ['project:read']
    const token = signJwt({
      sub: 'u-001',
      username: body.username,
      role,
      permissions,
    })
    return HttpResponse.json({
      token,
      user: {
        id: 'u-001',
        username: body.username,
        displayName: body.username,
        role: { id: roleId, name: role, permissions },
        permissions,
      },
    })
  }),

  http.get('*/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ message: '未授权' }, { status: 401 })
    }
    const payload = verifyJwt(auth.slice(7))
    if (!payload) {
      return HttpResponse.json({ message: 'token 无效或已过期' }, { status: 401 })
    }
    return HttpResponse.json({
      user: {
        id: payload.sub,
        username: payload.username,
        displayName: '管理员',
        role: { id: 'role-admin', name: payload.role, permissions: payload.permissions },
        permissions: payload.permissions,
      },
    })
  }),

  http.post('*/auth/change-password', async ({ request }) => {
    const body = (await request.json()) as ChangePasswordInput
    if (body.oldPassword !== 'old-lab123') {
      return HttpResponse.json({ message: '旧密码错误' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      return HttpResponse.json({ message: '新密码至少 6 位' }, { status: 400 })
    }
    return HttpResponse.json({ success: true })
  }),

  // ===========================================================
  // /org-info（单例）
  // ===========================================================
  http.get('*/org-info', () => {
    const row = orgInfoTable.query({ page: 1, pageSize: 1 }).items[0]
    if (!row) return HttpResponse.json({ message: '机构信息未初始化' }, { status: 404 })
    return HttpResponse.json(row)
  }),

  http.put('*/org-info', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const row = orgInfoTable.query({ page: 1, pageSize: 1 }).items[0]
    if (!row) {
      const created = orgInfoTable.insert(body as never)
      return HttpResponse.json(created, { status: 201 })
    }
    const updated = orgInfoTable.update(row.id, body)
    return HttpResponse.json(updated)
  }),

  // ===========================================================
  // /contracts
  // ===========================================================
  http.get('*/contracts', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'active' | 'archived' | null
    const result = contractTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['contractCode', 'projectName', 'clientUnit'],
      filters: { status: status ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/contracts', async ({ request }) => {
    const body = (await request.json()) as Partial<{ contractCode: string; projectName: string; clientUnit: string; constructionUnit: string; contractCategory?: string; buildingUnit?: string; supervisorUnit?: string; inspectionPerson?: string; inspectionPhone?: string; witnessUnit: string; witness: string }>
    if (!body.contractCode || !body.projectName) {
      return HttpResponse.json({ message: 'contractCode/projectName 必填' }, { status: 400 })
    }
    const created = contractTable.insert({
      contractCode: body.contractCode,
      clientUnit: body.clientUnit ?? '',
      projectName: body.projectName,
      constructionUnit: body.constructionUnit ?? '',
      contractCategory: body.contractCategory,
      buildingUnit: body.buildingUnit,
      supervisorUnit: body.supervisorUnit,
      inspectionPerson: body.inspectionPerson,
      inspectionPhone: body.inspectionPhone,
      witnessUnit: body.witnessUnit ?? '',
      witness: body.witness ?? '',
      status: 'active',
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/contracts/:id', ({ params }) => {
    const found = contractTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '合同不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/contracts/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const updated = contractTable.update(String(params.id), body)
    if (!updated) return HttpResponse.json({ message: '合同不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/contracts/:id', ({ params }) => {
    const ok = contractTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '合同不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /contract-categories：合同类别码表
  // ===========================================================
  http.get('*/contract-categories', ({ request }) => {
    const url = new URL(request.url)
    const result = contractCategoryTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['name'],
    })
    return HttpResponse.json(result)
  }),

  http.post('*/contract-categories', async ({ request }) => {
    const body = (await request.json()) as Partial<{ name: string; sortOrder: number; remark: string }>
    if (!body.name) {
      return HttpResponse.json({ message: 'name 必填' }, { status: 400 })
    }
    const created = contractCategoryTable.insert({
      name: body.name,
      sortOrder: body.sortOrder ?? 0,
      remark: body.remark,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/contract-categories/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const updated = contractCategoryTable.update(String(params.id), body)
    if (!updated) return HttpResponse.json({ message: '合同类别不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/contract-categories/:id', ({ params }) => {
    const ok = contractCategoryTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '合同类别不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /report-categories：报告类别（原「材料种类」，可维护 + 扩展属性定义）
  // ===========================================================
  http.get('*/report-categories', ({ request }) => {
    const url = new URL(request.url)
    const result = reportCategoryTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'name', 'reportTitle'],
    })
    return HttpResponse.json(result)
  }),

  http.get('*/report-categories/:code', ({ params }) => {
    const found = reportCategoryTable.all().find((c) => c.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '报告类别不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.post('*/report-categories', async ({ request }) => {
    const body = (await request.json()) as Partial<{
      code: string
      name: string
      reportTitle: string
      summaryType: 'material' | 'concrete' | 'connection'
      summaryName: string
      extFields: { key: string; label: string }[]
      remark: string
    }>
    if (!body.code || !body.name) {
      return HttpResponse.json({ message: 'code/name 必填' }, { status: 400 })
    }
    if (reportCategoryTable.all().some((c) => c.code === body.code)) {
      return HttpResponse.json({ message: '类别编码已存在' }, { status: 400 })
    }
    const { remark, ...rest } = body
    const created = reportCategoryTable.insert({
      ...rest,
      name: body.name!,
      code: body.code!,
      reportTitle: body.reportTitle ?? `${body.name}检测报告`,
      summaryType: body.summaryType ?? 'material',
      summaryName: body.summaryName ?? `${body.name}试验报告汇总表`,
      extFields: body.extFields ?? [],
      sortOrder: 0,
      ...(remark !== undefined ? { remark } : {}),
    })
    // 新类别自动创建一份默认报告模板
    if (!reportTemplateTable.all().some((t) => t.categoryCode === body.code)) {
      reportTemplateTable.insert({
        categoryCode: body.code,
        name: `${body.name}报告模板`,
        content: `<h1 style="text-align:center">{{category.reportTitle}}</h1>\n<p>报告编号：{{receipt.reportCode}}</p>\n<h3>样品信息</h3>\n{{samplesTable}}\n<h3>检测结果</h3>\n{{testItemsTable}}\n<h3>检测结论</h3>\n<p>{{receipt.conclusion}}（判定结果：{{receipt.resultLabel}}）</p>`,
      })
    }
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/report-categories/:code', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const found = reportCategoryTable.all().find((c) => c.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '报告类别不存在' }, { status: 404 })
    delete body.code // 编码不可改（样品/接样单/码表经 code 关联）
    return HttpResponse.json(reportCategoryTable.update(found.id, body))
  }),

  http.delete('*/report-categories/:code', ({ params }) => {
    const code = String(params.code)
    const found = reportCategoryTable.all().find((c) => c.code === code)
    if (!found) return HttpResponse.json({ message: '报告类别不存在' }, { status: 404 })
    const used = receiptTable.all().some((r) => r.categoryCode === code)
    if (used) return HttpResponse.json({ message: '该报告类别已被接样单引用，不能删除' }, { status: 400 })
    reportCategoryTable.remove(found.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /category-standards：报告类别 ↔ 检测标准 关联
  // ===========================================================
  http.get('*/category-standards', ({ request }) => {
    const url = new URL(request.url)
    const result = categoryStandardTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '200'),
      filters: {
        categoryCode: url.searchParams.get('categoryCode') ?? undefined,
        standardCode: url.searchParams.get('standardCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/category-standards', async ({ request }) => {
    const body = (await request.json()) as Partial<{ categoryCode: string; standardCode: string; remark: string }>
    if (!body.categoryCode || !body.standardCode) {
      return HttpResponse.json({ message: 'categoryCode/standardCode 必填' }, { status: 400 })
    }
    const dup = categoryStandardTable
      .all()
      .find((r) => r.categoryCode === body.categoryCode && r.standardCode === body.standardCode)
    if (dup) return HttpResponse.json({ message: '该关联已存在' }, { status: 400 })
    const created = categoryStandardTable.insert({
      categoryCode: body.categoryCode,
      standardCode: body.standardCode,
      remark: body.remark,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.delete('*/category-standards/:id', ({ params }) => {
    const ok = categoryStandardTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /standard-parameters：检测标准 ↔ 检测参数 关联 CRUD
  // ===========================================================
  http.get('*/standard-parameters', ({ request }) => {
    const url = new URL(request.url)
    const result = standardParametersTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '200'),
      filters: {
        standardCode: url.searchParams.get('standardCode') ?? undefined,
        parameterCode: url.searchParams.get('parameterCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/standard-parameters', async ({ request }) => {
    const body = (await request.json()) as Partial<{ standardCode: string; parameterCode: string; remark: string }>
    if (!body.standardCode || !body.parameterCode) {
      return HttpResponse.json({ message: 'standardCode/parameterCode 必填' }, { status: 400 })
    }
    const dup = standardParametersTable.all().find(
      (r) => r.standardCode === body.standardCode && r.parameterCode === body.parameterCode
    )
    if (dup) return HttpResponse.json({ message: '该关联已存在' }, { status: 400 })
    const created = standardParametersTable.insert({
      standardCode: body.standardCode,
      parameterCode: body.parameterCode,
      remark: body.remark,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.delete('*/standard-parameters/:id', ({ params }) => {
    const ok = standardParametersTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '关联不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // 型号/规格/等级/牌号 码表（归属报告类别）
  // ===========================================================
  ...dictHandlers('models', modelTable, '型号'),
  ...dictHandlers('specifications', specificationTable, '规格'),
  ...dictHandlers('grades', gradeTable, '等级'),
  ...dictHandlers('brands', brandTable, '牌号'),

  // ===========================================================
  // /receipts：接样单（合并报告字段 + 流程管线）
  // ===========================================================
  http.get('*/receipts', ({ request }) => {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') as 'all' | 'not_yet' | 'submitted' | null
    const targetStage = url.searchParams.get('flowStatus')

    let rows = receiptTable.all()

    // filter 只有在指定了 targetStage 时才有意义
    if (targetStage) {
      const stageIdx = FLOW_STAGE_ORDER.indexOf(targetStage as never)
      rows = rows.filter((r) => {
        const idx = FLOW_STAGE_ORDER.indexOf(r.flowStatus as never)
        if (filter === 'not_yet') return idx === stageIdx
        if (filter === 'submitted') return idx >= stageIdx
        return true
      })
    } else if (filter === 'not_yet' || filter === 'submitted') {
      // 无 targetStage 时，filter 无意义，当 all 处理
    }

    // keyword 过滤
    const keyword = url.searchParams.get('keyword') ?? undefined
    if (keyword) {
      const kw = keyword.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.commissionCode?.toLowerCase().includes(kw) ||
          r.reportCode?.toLowerCase().includes(kw) ||
          r.receivedBy?.toLowerCase().includes(kw) ||
          r.projectName?.toLowerCase().includes(kw) ||
          r.clientUnit?.toLowerCase().includes(kw),
      )
    }

    // 额外精确过滤
    const contractId = url.searchParams.get('contractId')
    if (contractId) rows = rows.filter((r) => r.contractId === contractId)
    const categoryCode = url.searchParams.get('categoryCode')
    if (categoryCode) rows = rows.filter((r) => r.categoryCode === categoryCode)
    const lastSubmittedBy = url.searchParams.get('lastSubmittedBy')
    if (lastSubmittedBy) rows = rows.filter((r) => r.lastSubmittedBy === lastSubmittedBy)

    // 分页
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    const total = rows.length
    const items = rows.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total, page, pageSize })
  }),

  http.post('*/receipts', async ({ request }) => {
    const body = (await request.json()) as Partial<{
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
    }>
    if (!body.contractId || !body.commissionCode || !body.categoryCode || !body.receivedBy) {
      return HttpResponse.json({ message: 'contractId/commissionCode/categoryCode/receivedBy 必填' }, { status: 400 })
    }
    if (!reportCategoryTable.all().some((c) => c.code === body.categoryCode)) {
      return HttpResponse.json({ message: '报告类别不存在' }, { status: 400 })
    }
    const created = receiptTable.insert({
      contractId: body.contractId,
      commissionCode: body.commissionCode,
      commissionDate: body.commissionDate ?? new Date().toISOString().slice(0, 10),
      commissionRegisterCode: body.commissionRegisterCode,
      commissionRegisterDate: body.commissionRegisterDate,
      categoryCode: body.categoryCode,
      projectName: body.projectName ?? '',
      clientUnit: body.clientUnit ?? '',
      buildingUnit: body.buildingUnit,
      supervisorUnit: body.supervisorUnit,
      constructionUnit: body.constructionUnit,
      witnessUnit: body.witnessUnit,
      samplingLocation: body.samplingLocation,
      witness: body.witness,
      witnessPhone: body.witnessPhone,
      inspector: body.inspector,
      inspectorPhone: body.inspectorPhone,
      receivedBy: body.receivedBy,
      sampleSource: body.sampleSource ?? '施工送检',
      testCategory: body.testCategory ?? '委托检验',
      judgmentBasis: body.judgmentBasis,
      testingBasis: body.testingBasis,
      testParameters: body.testParameters,
      remark: body.remark ?? '',
      flowStatus: 'receiving',
      flowHistory: [],
      lastSubmittedBy: null,
    } as never)
    return HttpResponse.json(created, { status: 201 })
  }),

  // 流程管线批量操作（提交/退回/撤回，均支持批量）
  http.post('*/receipts/flow', async ({ request }) => {
    const body = (await request.json()) as Partial<{
      action: 'submit' | 'return' | 'withdraw'
      ids: string[]
      operator: string
      reason: string
    }>
    if (!body.action || !['submit', 'return', 'withdraw'].includes(body.action)) {
      return HttpResponse.json({ message: 'action 必须为 submit/return/withdraw' }, { status: 400 })
    }
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return HttpResponse.json({ message: 'ids 必填且不能为空' }, { status: 400 })
    }
    const results = applyFlowAction(body.ids, body.action, body.operator ?? 'anonymous', body.reason)
    return HttpResponse.json({ results })
  }),

  http.get('*/receipts/:id', ({ params }) => {
    const found = receiptTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '接样单不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/receipts/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const id = String(params.id)
    const existing = receiptTable.findById(id)
    if (existing) {
      const updated = receiptTable.update(id, { ...body, id, updatedAt: new Date().toISOString() })
      return HttpResponse.json(updated)
    }
    // 不存在则upsert：创建最小结构
    const created = receiptTable.insert({ id, ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never)
    return HttpResponse.json(created)
  }),

  http.delete('*/receipts/:id', ({ params }) => {
    const id = String(params.id)
    const ok = receiptTable.remove(id)
    if (!ok) return HttpResponse.json({ message: '接样单不存在' }, { status: 404 })
    // 级联删除样品与其检测项
    for (const s of sampleTable.all().filter((x) => x.receiptId === id)) {
      testItemTable.all().filter((i) => i.sampleId === s.id).forEach((i) => testItemTable.remove(i.id))
      sampleTable.remove(s.id)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /samples：样品（归属接样单 receiptId）
  // ===========================================================
  http.get('*/samples', ({ request }) => {
    const url = new URL(request.url)
    const result = sampleTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['sampleCode', 'sampleName', 'model', 'brand'],
      filters: { receiptId: url.searchParams.get('receiptId') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/samples', async ({ request }) => {
    const body = (await request.json()) as Partial<{
      receiptId: string
      sampleCode: string
      sampleName: string
      model: string
      specification: string
      grade: string
      brand: string
      sampleQuantity: string
      batchNumber: string
      supplyUnit: string
      arrivalDate: string
      samplingDate: string
      curingCondition: string
      age: string
      ext: Record<string, string>
      remark: string
    }>
    if (!body.receiptId || !body.sampleCode) {
      return HttpResponse.json({ message: 'receiptId/sampleCode 必填' }, { status: 400 })
    }
    if (!receiptTable.findById(body.receiptId)) {
      return HttpResponse.json({ message: '接样单不存在' }, { status: 400 })
    }
    const created = sampleTable.insert({
      receiptId: body.receiptId,
      sampleCode: body.sampleCode,
      sampleName: body.sampleName,
      model: body.model,
      specification: body.specification,
      grade: body.grade,
      brand: body.brand,
      sampleQuantity: body.sampleQuantity,
      batchNumber: body.batchNumber,
      supplyUnit: body.supplyUnit,
      arrivalDate: body.arrivalDate,
      samplingDate: body.samplingDate,
      curingCondition: body.curingCondition,
      age: body.age,
      ext: body.ext ?? {},
      remark: body.remark,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/samples/:id', ({ params }) => {
    const found = sampleTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/samples/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const updated = sampleTable.update(String(params.id), body)
    if (!updated) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/samples/:id', ({ params }) => {
    const id = String(params.id)
    const found = sampleTable.findById(id)
    if (!found) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    testItemTable.all().filter((i) => i.sampleId === id).forEach((i) => testItemTable.remove(i.id))
    sampleTable.remove(id)
    syncReceiptResult(found.receiptId)
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /test-items：单项检测记录（归属样品；自动评定 + 手工修正）
  // ===========================================================
  http.get('*/test-items', ({ request }) => {
    const url = new URL(request.url)
    const receiptId = url.searchParams.get('receiptId')
    // receiptId 过滤：经样品间接查询
    if (receiptId) {
      const sampleIds = samplesOfReceipt(receiptId).map((s) => s.id)
      const items = testItemTable.all().filter((i) => sampleIds.includes(i.sampleId))
      return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length || 1 })
    }
    const result = testItemTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['parameterCode', 'requirement', 'result'],
      filters: {
        sampleId: url.searchParams.get('sampleId') ?? undefined,
        parameterCode: url.searchParams.get('parameterCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  // 录入检测结果——按样品的 报告类别+牌号/型号/等级/规格 匹配技术要求，自动评定合格/不合格；
  // 显式传 passed 即手工判定（覆盖自动评定结果）。
  http.post('*/test-items', async ({ request }) => {
    const body = (await request.json()) as Partial<{
      sampleId: string
      parameterCode: string
      result: string
      loads: number[]
      testValues: number[]
      specimenArea: number
      correctionFactor: number
      unit: string
      passed: boolean
      remark: string
      testMethod: string
    }>
    if (!body.sampleId || !body.parameterCode) {
      return HttpResponse.json({ message: 'sampleId/parameterCode 必填' }, { status: 400 })
    }
    const sample = sampleTable.findById(body.sampleId)
    if (!sample) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    const receipt = receiptTable.findById(sample.receiptId)
    const rule = calculationRuleTable.all().find((r) => r.parameterCode === body.parameterCode)
    const evaluation = evaluateTestResult({
      parameterCode: body.parameterCode,
      categoryCode: receipt?.categoryCode,
      brand: sample.brand,
      model: sample.model,
      grade: sample.grade,
      specification: sample.specification,
      resultValue: body.result ?? '',
      loads: body.loads ?? body.testValues,
      specimenArea: body.specimenArea,
      correctionFactor: body.correctionFactor,
      algorithmType: rule?.algorithmType,
    })
    const parameter = testParameterTable.all().find((p) => p.code === body.parameterCode)
    const repVal = evaluation.representativeValue
    const rawLoads = body.loads ?? body.testValues
    // compressive_strength / steel_tensile 已算出 repVal（MPa），优先显示
    // simple_avg 或无 repVal 时才显示原始录入值
    const displayResult = (repVal !== undefined)
      ? String(repVal)
      : ((rawLoads && rawLoads.length > 0) ? rawLoads.join(', ') : (body.result ?? ''))
    // CON002 抗压强度、CON006 抗折强度、CEM005 安定性：由人工确认，不做自动评定
    const isManualParam = body.parameterCode === 'CON002' || body.parameterCode === 'CON006' || body.parameterCode === 'CEM005'
    const created = testItemTable.insert({
      sampleId: body.sampleId,
      parameterCode: body.parameterCode,
      standardCode: evaluation.standardCode,
      requirementCode: evaluation.requirementCode,
      requirement: evaluation.requirement,
      result: displayResult,
      testValues: rawLoads,
      representativeValue: repVal,
      unit: body.unit ?? parameter?.unit,
      autoPassed: isManualParam ? null : evaluation.autoPassed,
      passed: isManualParam ? null : (body.passed ?? evaluation.autoPassed ?? false),
      remark: body.remark,
      testMethod: body.testMethod,
    })
    syncReceiptResult(sample.receiptId)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/test-items/:id', ({ params }) => {
    const found = testItemTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '检测记录不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/test-items/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const existing = testItemTable.findById(id)
    if (!existing) return HttpResponse.json({ message: '检测记录不存在' }, { status: 404 })
    // CON002 抗压强度、CON006 抗折强度、CEM005 安定性：由人工确认，不做自动评定（passed 需显式传入）
    const isManual = existing.parameterCode === 'CON002' || existing.parameterCode === 'CON006' || existing.parameterCode === 'CEM005'
    if (!isManual && typeof body.result === 'string' && body.passed === undefined) {
      const sample = sampleTable.findById(existing.sampleId)
      const receipt = sample ? receiptTable.findById(sample.receiptId) : undefined
      const evaluation = evaluateTestResult({
        parameterCode: existing.parameterCode,
        categoryCode: receipt?.categoryCode,
        brand: sample?.brand,
        model: sample?.model,
        grade: sample?.grade,
        specification: sample?.specification,
        resultValue: body.result,
      })
      body.autoPassed = evaluation.autoPassed
      body.passed = evaluation.autoPassed ?? existing.passed
      if (evaluation.matched) {
        body.requirementCode = evaluation.requirementCode
        body.requirement = evaluation.requirement
        body.standardCode = evaluation.standardCode
      }
    }
    const updated = testItemTable.update(id, body)
    if (updated) {
      const sample = sampleTable.findById(updated.sampleId)
      if (sample) syncReceiptResult(sample.receiptId)
    }
    return HttpResponse.json(updated)
  }),

  http.delete('*/test-items/:id', ({ params }) => {
    const found = testItemTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '检测记录不存在' }, { status: 404 })
    const sample = sampleTable.findById(found.sampleId)
    testItemTable.remove(found.id)
    if (sample) syncReceiptResult(sample.receiptId)
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /test-parameters（归属报告类别）
  // ===========================================================
  http.get('*/test-parameters', ({ request }) => {
    const url = new URL(request.url)
    const result = testParameterTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'name', 'group'],
      filters: { categoryCode: url.searchParams.get('categoryCode') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.get('*/test-parameters/:code', ({ params }) => {
    const found = testParameterTable.all().find((p) => p.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '参数不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.post('*/test-parameters', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; name: string; categoryCode: string; group: string; unit: string; description: string }>
    if (!body.code || !body.name || !body.categoryCode) {
      return HttpResponse.json({ message: 'code/name/categoryCode 必填' }, { status: 400 })
    }
    if (testParameterTable.all().some((p) => p.code === body.code)) {
      return HttpResponse.json({ message: '参数编码已存在' }, { status: 400 })
    }
    const created = testParameterTable.insert(body as never)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/test-parameters/:code', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const found = testParameterTable.all().find((p) => p.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '参数不存在' }, { status: 404 })
    return HttpResponse.json(testParameterTable.update(found.id, body))
  }),

  http.delete('*/test-parameters/:code', ({ params }) => {
    const found = testParameterTable.all().find((p) => p.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '参数不存在' }, { status: 404 })
    testParameterTable.remove(found.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /test-standards（与类别的关联经 /category-standards）
  // ===========================================================
  http.get('*/test-standards', ({ request }) => {
    const url = new URL(request.url)
    // categoryCode 过滤：经关联表间接查询
    const categoryCode = url.searchParams.get('categoryCode')
    if (categoryCode) {
      const codes = categoryStandardTable
        .all()
        .filter((r) => r.categoryCode === categoryCode)
        .map((r) => r.standardCode)
      const items = testStandardTable.all().filter((s) => codes.includes(s.code))
      return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length || 1 })
    }
    const result = testStandardTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'name'],
      filters: { type: (url.searchParams.get('type') as 'national' | 'industry' | 'local' | 'enterprise' | null) ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.get('*/test-standards/:code', ({ params }) => {
    const found = testStandardTable.all().find((s) => s.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '标准不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.post('*/test-standards', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; name: string; type: 'national' | 'industry' | 'local' | 'enterprise'; remark: string }>
    if (!body.code || !body.name || !body.type) {
      return HttpResponse.json({ message: 'code/name/type 必填' }, { status: 400 })
    }
    if (testStandardTable.all().some((s) => s.code === body.code)) {
      return HttpResponse.json({ message: '标准编码已存在' }, { status: 400 })
    }
    const created = testStandardTable.insert(body as never)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/test-standards/:code', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const found = testStandardTable.all().find((s) => s.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '标准不存在' }, { status: 404 })
    return HttpResponse.json(testStandardTable.update(found.id, body))
  }),

  http.delete('*/test-standards/:code', ({ params }) => {
    const found = testStandardTable.all().find((s) => s.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '标准不存在' }, { status: 404 })
    testStandardTable.remove(found.id)
    // 级联删除类别关联
    categoryStandardTable.all().filter((r) => r.standardCode === found.code).forEach((r) => categoryStandardTable.remove(r.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /technical-requirements（报告类别 + 牌号/型号/等级/规格 维度）
  // ===========================================================
  http.get('*/technical-requirements', ({ request }) => {
    const url = new URL(request.url)
    const result = technicalRequirementTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'parameterCode', 'brand', 'model', 'grade'],
      filters: {
        categoryCode: url.searchParams.get('categoryCode') ?? undefined,
        parameterCode: url.searchParams.get('parameterCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.get('*/technical-requirements/:code', ({ params }) => {
    const found = technicalRequirementTable.all().find((r) => r.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '技术要求不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.post('*/technical-requirements', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; standardCode: string; parameterCode: string; categoryCode: string; brand: string; model: string; grade: string; specification: string; comparison: string; value: string; unit: string }>
    if (!body.code || !body.standardCode || !body.parameterCode || !body.categoryCode || !body.comparison || body.value === undefined) {
      return HttpResponse.json({ message: 'code/standardCode/parameterCode/categoryCode/comparison/value 必填' }, { status: 400 })
    }
    if (technicalRequirementTable.all().some((r) => r.code === body.code)) {
      return HttpResponse.json({ message: '技术要求编码已存在' }, { status: 400 })
    }
    const created = technicalRequirementTable.insert(body as never)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/technical-requirements/:code', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const found = technicalRequirementTable.all().find((r) => r.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '技术要求不存在' }, { status: 404 })
    return HttpResponse.json(technicalRequirementTable.update(found.id, body))
  }),

  http.delete('*/technical-requirements/:code', ({ params }) => {
    const found = technicalRequirementTable.all().find((r) => r.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '技术要求不存在' }, { status: 404 })
    technicalRequirementTable.remove(found.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /report-templates：报告模板（每个报告类别对应一份，可维护）
  // ===========================================================
  http.get('*/report-templates', ({ request }) => {
    const url = new URL(request.url)
    const result = reportTemplateTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      filters: { categoryCode: url.searchParams.get('categoryCode') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/report-templates', async ({ request }) => {
    const body = (await request.json()) as Partial<{ categoryCode: string; name: string; content: string }>
    if (!body.categoryCode || !body.content) {
      return HttpResponse.json({ message: 'categoryCode/content 必填' }, { status: 400 })
    }
    // 每个类别仅一份模板：已存在则更新
    const existing = reportTemplateTable.all().find((t) => t.categoryCode === body.categoryCode)
    if (existing) {
      return HttpResponse.json(reportTemplateTable.update(existing.id, { name: body.name, content: body.content }))
    }
    const created = reportTemplateTable.insert({
      categoryCode: body.categoryCode,
      name: body.name ?? '报告模板',
      content: body.content,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/report-templates/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const updated = reportTemplateTable.update(String(params.id), body)
    if (!updated) return HttpResponse.json({ message: '模板不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  // ===========================================================
  // /stats + /summary
  // ===========================================================
  http.get('*/stats', () => {
    return HttpResponse.json(computeStats() as unknown as DashboardStats)
  }),

  http.get('*/summary', ({ request }) => {
    const url = new URL(request.url)
    const categoryCode = url.searchParams.get('categoryCode')
    if (!categoryCode) {
      return HttpResponse.json({ message: 'categoryCode 必填' }, { status: 400 })
    }
    const contractId = url.searchParams.get('contractId') ?? undefined
    return HttpResponse.json(buildSummary(categoryCode, contractId))
  }),

  // ===========================================================
  // /users + /roles
  // ===========================================================
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url)
    const result = userTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['username', 'displayName', 'email'],
      filters: { roleId: url.searchParams.get('role') ?? undefined, status: url.searchParams.get('status') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/users', async ({ request }) => {
    const body = (await request.json()) as Partial<UserCreateInput>
    if (!body.username || !body.displayName || !body.email || !body.roleId) {
      return HttpResponse.json({ message: 'username/displayName/email/roleId 必填' }, { status: 400 })
    }
    const created = userTable.insert({
      username: body.username,
      displayName: body.displayName,
      email: body.email,
      roleId: body.roleId,
      status: body.status ?? 'active',
      password: 'default-mock-pwd',
    })
    return HttpResponse.json(created as UserRecord, { status: 201 })
  }),

  http.get('*/users/:id', ({ params }) => {
    const found = userTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/users/:id', async ({ params, request }) => {
    const body = (await request.json()) as UserUpdateInput
    const updated = userTable.update(String(params.id), body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return HttpResponse.json(updated as UserRecord)
  }),

  http.delete('*/users/:id', ({ params }) => {
    const ok = userTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/roles', ({ request }) => {
    const url = new URL(request.url)
    const result = roleTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['name', 'description'],
    })
    return HttpResponse.json(result)
  }),

  http.post('*/roles', async ({ request }) => {
    const body = (await request.json()) as Partial<RoleCreateInput>
    if (!body.name || !body.permissions) {
      return HttpResponse.json({ message: 'name/permissions 必填' }, { status: 400 })
    }
    const created = roleTable.insert({
      name: body.name,
      description: body.description ?? '',
      permissions: body.permissions,
    })
    return HttpResponse.json(created as RoleRecord, { status: 201 })
  }),

  http.get('*/roles/:id', ({ params }) => {
    const found = roleTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return HttpResponse.json(found as RoleRecord)
  }),

  http.put('*/roles/:id', async ({ params, request }) => {
    const body = (await request.json()) as RoleUpdateInput
    const updated = roleTable.update(String(params.id), body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return HttpResponse.json(updated as RoleRecord)
  }),

  http.delete('*/roles/:id', ({ params }) => {
    const ok = roleTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // /calculation-rules：计算规则（归属检测参数）
  // ===========================================================
  http.get('*/calculation-rules', ({ request }) => {
    const url = new URL(request.url)
    const parameterCode = url.searchParams.get('parameterCode') ?? undefined
    const all = calculationRuleTable.all()
    const filtered = parameterCode ? all.filter((r) => r.parameterCode === parameterCode) : all
    return HttpResponse.json({ items: filtered })
  }),

  http.post('*/calculation-rules', async ({ request }) => {
    const body = await request.json() as {
      parameterCode: string; algorithmType: string; specimenCount: number; unit?: string; remark?: string;
    }
    if (!body.parameterCode || !body.algorithmType || body.specimenCount === undefined) {
      return HttpResponse.json({ message: 'parameterCode/algorithmType/specimenCount 必填' }, { status: 400 })
    }
    const id = `cr-${body.parameterCode}`
    const existing = calculationRuleTable.findById(id)
    if (existing) {
      calculationRuleTable.update(id, body)
      return HttpResponse.json(calculationRuleTable.findById(id))
    }
    const created = calculationRuleTable.insert({ id, ...body })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/calculation-rules/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<{ algorithmType: string; specimenCount: number; unit: string; remark: string; }>
    const existing = calculationRuleTable.findById(String(params.id))
    if (!existing) return HttpResponse.json({ message: '记录不存在' }, { status: 404 })
    calculationRuleTable.update(String(params.id), body)
    return HttpResponse.json(calculationRuleTable.findById(String(params.id)))
  }),

  http.delete('*/calculation-rules/:id', ({ params }) => {
    const existing = calculationRuleTable.findById(String(params.id))
    if (!existing) return HttpResponse.json({ message: '记录不存在' }, { status: 404 })
    calculationRuleTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // M06 检测能力
  // ===========================================================

  // M06.F01 检测专项
  http.get('*/inspection-specialties', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionSpecialtyTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name', 'officialNo'],
        sortField: 'code',
      }),
    )
  }),

  // M06.F02 检测项目
  http.get('*/inspection-objects', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionObjectTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name', 'sourceProjectName'],
        filters: {
          inspectionSpecialtyCode: url.searchParams.get('inspectionSpecialtyCode') ?? undefined,
        },
        sortField: 'code',
      }),
    )
  }),

  // M06.F03 检测参数
  http.get('*/inspection-parameters', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionParameterTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name', 'canonicalName'],
        sortField: 'code',
      }),
    )
  }),

  // M06.F04 检测标准
  http.get('*/inspection-standards', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionStandardTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        keyword: url.searchParams.get('keyword') ?? undefined,
        keywordFields: ['code', 'name'],
        sortField: 'code',
      }),
    )
  }),

  // M06.F02.I06 检测项目-检测参数关联
  http.get('*/inspection-object-parameters', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionObjectParameterTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        filters: {
          inspectionObjectCode: url.searchParams.get('inspectionObjectCode') ?? undefined,
        },
        sortField: 'sortOrder',
      }),
    )
  }),

  // M06.F02.I04/I05 检测项目-检测标准关联（双角色）
  http.get('*/inspection-object-standards', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionObjectStandardTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        filters: {
          inspectionObjectCode: url.searchParams.get('inspectionObjectCode') ?? undefined,
          role: (url.searchParams.get('role') as 'TESTING' | 'JUDGMENT' | null) ?? undefined,
        },
      }),
    )
  }),

  // M06.F04.I04 检测标准-检测参数关联
  http.get('*/inspection-standard-parameters', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionStandardParameterTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        filters: {
          inspectionStandardCode: url.searchParams.get('inspectionStandardCode') ?? undefined,
        },
      }),
    )
  }),

  // M06.F02.I07 检测专项-检测项目多对多关联
  http.get('*/inspection-specialty-objects', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      inspectionSpecialtyObjectTable.query({
        page: Number(url.searchParams.get('page') ?? '1'),
        pageSize: Number(url.searchParams.get('pageSize') ?? '50'),
        filters: {
          inspectionSpecialtyCode: url.searchParams.get('inspectionSpecialtyCode') ?? undefined,
          inspectionObjectCode: url.searchParams.get('inspectionObjectCode') ?? undefined,
        },
      }),
    )
  }),

  // ===========================================================
  // M06 检测能力 CRUD/删除（仅 8 个 POST + 1 个 DELETE 保护）
  // ===========================================================

  // M06.F01.I02 检测专项新建
  http.post('*/inspection-specialties', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; officialNo: string; name: string; isOfficial: boolean; enabled: boolean }>
    if (!body.code || !body.name) {
      return HttpResponse.json({ message: 'code/name 必填' }, { status: 400 })
    }
    const dup = inspectionSpecialtyTable.all().find((r) => r.code === body.code)
    if (dup) return HttpResponse.json({ message: '检测专项编码已存在' }, { status: 400 })
    const now = new Date().toISOString()
    inspectionSpecialtyTable.insert({
      id: `insp-sp-${body.code}`,
      code: body.code,
      officialNo: body.officialNo ?? '',
      name: body.name,
      isOfficial: body.isOfficial ?? false,
      enabled: body.enabled ?? true,
    } as never)
    inspectionSpecialtyTable.update(`insp-sp-${body.code}`, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionSpecialtyTable.findById(`insp-sp-${body.code}`), { status: 201 })
  }),

  // M06.F01.I02 检测专项编辑（code 不可变）
  http.put('*/inspection-specialties/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionSpecialtyTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测专项不存在' }, { status: 404 })
    const body = (await request.json()) as Partial<{ officialNo: string; name: string; isOfficial: boolean; enabled: boolean }>
    // 仅允许白名单字段进入 patch；code/id 不可变
    const patch: Record<string, unknown> = {}
    for (const key of ['officialNo', 'name', 'isOfficial', 'enabled'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    const updated = inspectionSpecialtyTable.update(id, patch as Partial<{ officialNo: string; name: string; isOfficial: boolean; enabled: boolean }>)
    return HttpResponse.json(updated)
  }),

  // M06.F01.I03 检测专项删除保护：官方/被引用不可删
  http.delete('*/inspection-specialties/:id', ({ params }) => {
    const row = inspectionSpecialtyTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测专项不存在' }, { status: 404 })
    if (row.isOfficial) {
      return HttpResponse.json({ message: '官方检测专项不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectTable, 'inspectionSpecialtyCode', row.code) +
      countBy(inspectionSpecialtyObjectTable, 'inspectionSpecialtyCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionSpecialtyTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F02.I02 检测项目新建
  http.post('*/inspection-objects', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; inspectionSpecialtyCode: string; sourceProjectNo: string; sourceProjectName: string; name: string; isOptionalForQualification: boolean; isOfficial: boolean; enabled: boolean }>
    if (!body.code || !body.inspectionSpecialtyCode) {
      return HttpResponse.json({ message: 'code/inspectionSpecialtyCode 必填' }, { status: 400 })
    }
    const dup = inspectionObjectTable.all().find((r) => r.code === body.code)
    if (dup) return HttpResponse.json({ message: '检测项目编码已存在' }, { status: 400 })
    if (!inspectionSpecialtyTable.findById(`insp-sp-${body.inspectionSpecialtyCode}`)) {
      return HttpResponse.json({ message: '检测专项不存在' }, { status: 400 })
    }
    const now = new Date().toISOString()
    inspectionObjectTable.insert({
      id: `insp-obj-${body.code}`,
      code: body.code,
      inspectionSpecialtyCode: body.inspectionSpecialtyCode,
      sourceProjectNo: body.sourceProjectNo ?? '',
      sourceProjectName: body.sourceProjectName ?? body.name ?? '',
      name: body.name ?? '',
      isOptionalForQualification: body.isOptionalForQualification ?? false,
      isOfficial: body.isOfficial ?? false,
      enabled: body.enabled ?? true,
    } as never)
    inspectionObjectTable.update(`insp-obj-${body.code}`, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionObjectTable.findById(`insp-obj-${body.code}`), { status: 201 })
  }),

  // M06.F02.I02 检测项目编辑（code 不可变；改专项需校验存在）
  http.put('*/inspection-objects/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionObjectTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测项目不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    // 仅允许白名单字段进入 patch；code/id 不可变
    const patch: Record<string, unknown> = {}
    for (const key of ['inspectionSpecialtyCode', 'sourceProjectNo', 'sourceProjectName', 'name', 'isOptionalForQualification', 'isOfficial', 'enabled'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    if (typeof patch.inspectionSpecialtyCode === 'string' && patch.inspectionSpecialtyCode !== row.inspectionSpecialtyCode) {
      if (!inspectionSpecialtyTable.findById(`insp-sp-${patch.inspectionSpecialtyCode}`)) {
        return HttpResponse.json({ message: '检测专项不存在' }, { status: 400 })
      }
    }
    const updated = inspectionObjectTable.update(id, patch as Partial<{ inspectionSpecialtyCode: string; sourceProjectNo: string; sourceProjectName: string; name: string; isOptionalForQualification: boolean; isOfficial: boolean; enabled: boolean }>)
    return HttpResponse.json(updated)
  }),

  // M06.F02.I03 检测项目删除保护：官方/被引用不可删
  http.delete('*/inspection-objects/:id', ({ params }) => {
    const row = inspectionObjectTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测项目不存在' }, { status: 404 })
    if (row.isOfficial) {
      return HttpResponse.json({ message: '官方检测项目不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectParameterTable, 'inspectionObjectCode', row.code) +
      countBy(inspectionObjectStandardTable, 'inspectionObjectCode', row.code) +
      countBy(inspectionSpecialtyObjectTable, 'inspectionObjectCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionObjectTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F02.I06 检测项目-检测参数关联
  http.post('*/inspection-object-parameters', async ({ request }) => {
    const body = (await request.json()) as Partial<{ inspectionObjectCode: string; inspectionParameterCode: string; qualificationLevel: 'QUALIFIED' | 'RESTRICTED'; sortOrder: number }>
    if (!body.inspectionObjectCode || !body.inspectionParameterCode) {
      return HttpResponse.json({ message: 'inspectionObjectCode/inspectionParameterCode 必填' }, { status: 400 })
    }
    const dup = inspectionObjectParameterTable
      .all()
      .find((r) => r.inspectionObjectCode === body.inspectionObjectCode && r.inspectionParameterCode === body.inspectionParameterCode)
    if (dup) return HttpResponse.json({ message: '对象参数关联已存在' }, { status: 400 })
    const id = `insp-obj-param-${body.inspectionObjectCode}-${body.inspectionParameterCode}`
    const now = new Date().toISOString()
    inspectionObjectParameterTable.insert({
      id,
      inspectionObjectCode: body.inspectionObjectCode,
      inspectionParameterCode: body.inspectionParameterCode,
      qualificationLevel: body.qualificationLevel ?? 'QUALIFIED',
      sortOrder: body.sortOrder ?? 0,
    } as never)
    inspectionObjectParameterTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionObjectParameterTable.findById(id), { status: 201 })
  }),

  // M06.F02.I04 / I05 检测项目-检测标准关联（双角色）
  http.post('*/inspection-object-standards', async ({ request }) => {
    const body = (await request.json()) as Partial<{ inspectionObjectCode: string; inspectionStandardCode: string; role: 'TESTING' | 'JUDGMENT' }>
    if (!body.inspectionObjectCode || !body.inspectionStandardCode || !body.role) {
      return HttpResponse.json({ message: '对象/标准/角色 必填' }, { status: 400 })
    }
    if (!['TESTING', 'JUDGMENT'].includes(body.role)) {
      return HttpResponse.json({ message: 'role 仅支持 TESTING/JUDGMENT' }, { status: 400 })
    }
    const id = `insp-obj-std-${body.inspectionObjectCode}-${body.inspectionStandardCode}-${body.role}`
    const dup = inspectionObjectStandardTable.findById(id)
    if (dup) return HttpResponse.json({ message: '对象标准关联已存在' }, { status: 400 })
    const now = new Date().toISOString()
    inspectionObjectStandardTable.insert({
      id,
      inspectionObjectCode: body.inspectionObjectCode,
      inspectionStandardCode: body.inspectionStandardCode,
      role: body.role,
    } as never)
    inspectionObjectStandardTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionObjectStandardTable.findById(id), { status: 201 })
  }),

  // M06.F02.I07 检测专项-检测项目多对多关联
  http.post('*/inspection-specialty-objects', async ({ request }) => {
    const body = (await request.json()) as Partial<{ inspectionSpecialtyCode: string; inspectionObjectCode: string }>
    if (!body.inspectionSpecialtyCode || !body.inspectionObjectCode) {
      return HttpResponse.json({ message: '专项/项目 必填' }, { status: 400 })
    }
    const id = `insp-sp-obj-${body.inspectionSpecialtyCode}-${body.inspectionObjectCode}`
    const dup = inspectionSpecialtyObjectTable.findById(id)
    if (dup) return HttpResponse.json({ message: '专项项目关联已存在' }, { status: 400 })
    const now = new Date().toISOString()
    inspectionSpecialtyObjectTable.insert({
      id,
      inspectionSpecialtyCode: body.inspectionSpecialtyCode,
      inspectionObjectCode: body.inspectionObjectCode,
    } as never)
    inspectionSpecialtyObjectTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionSpecialtyObjectTable.findById(id), { status: 201 })
  }),

  // M06.F03.I02 检测参数新建
  http.post('*/inspection-parameters', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; name: string; rawName: string; canonicalName: string; aliases: string[]; unit?: string; sourceType: 'official' | 'custom' }>
    if (!body.code || !body.name) {
      return HttpResponse.json({ message: 'code/name 必填' }, { status: 400 })
    }
    const dup = inspectionParameterTable.all().find((r) => r.code === body.code)
    if (dup) return HttpResponse.json({ message: '检测参数编码已存在' }, { status: 400 })
    const now = new Date().toISOString()
    const id = `insp-param-${body.code}`
    inspectionParameterTable.insert({
      id,
      code: body.code,
      name: body.name,
      rawName: body.rawName ?? body.name,
      canonicalName: body.canonicalName ?? body.name,
      methodText: undefined,
      aliases: body.aliases ?? [],
      unit: body.unit,
      sourceType: body.sourceType ?? 'custom',
    } as never)
    inspectionParameterTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionParameterTable.findById(id), { status: 201 })
  }),

  // M06.F03.I02 检测参数编辑（code 不可变）
  http.put('*/inspection-parameters/:id', async ({ params, request }) => {
    const id = String(params.id)
    const row = inspectionParameterTable.findById(id)
    if (!row) return HttpResponse.json({ message: '检测参数不存在' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    // 仅允许白名单字段进入 patch；code/id 不可变
    const patch: Record<string, unknown> = {}
    for (const key of ['name', 'rawName', 'canonicalName', 'methodText', 'aliases', 'unit', 'sourceType'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    const updated = inspectionParameterTable.update(id, patch as Partial<{ name: string; rawName: string; canonicalName: string; methodText: string; aliases: string[]; unit: string; sourceType: 'official' | 'custom' }>)
    return HttpResponse.json(updated)
  }),

  // M06.F03.I03 检测参数删除保护：官方/被引用不可删
  http.delete('*/inspection-parameters/:id', ({ params }) => {
    const row = inspectionParameterTable.findById(String(params.id))
    if (!row) return HttpResponse.json({ message: '检测参数不存在' }, { status: 404 })
    if (row.sourceType === 'official') {
      return HttpResponse.json({ message: '官方检测参数不可删除' }, { status: 400 })
    }
    const refs =
      countBy(inspectionObjectParameterTable, 'inspectionParameterCode', row.code) +
      countBy(inspectionStandardParameterTable, 'inspectionParameterCode', row.code)
    if (refs > 0) {
      return HttpResponse.json({ message: `被 ${refs} 处引用，不可删除`, references: refs }, { status: 400 })
    }
    inspectionParameterTable.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // M06.F04.I02 检测标准新建
  http.post('*/inspection-standards', async ({ request }) => {
    const body = (await request.json()) as Partial<{ code: string; name: string; version?: string; status: 'active' | 'superseded' | 'draft' }>
    if (!body.code || !body.name) {
      return HttpResponse.json({ message: 'code/name 必填' }, { status: 400 })
    }
    const dup = inspectionStandardTable.all().find((r) => r.code === body.code)
    if (dup) return HttpResponse.json({ message: '检测标准编码已存在' }, { status: 400 })
    const now = new Date().toISOString()
    const id = `insp-std-${body.code}`
    inspectionStandardTable.insert({
      id,
      code: body.code,
      name: body.name,
      version: body.version,
      status: body.status ?? 'active',
    } as never)
    inspectionStandardTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionStandardTable.findById(id), { status: 201 })
  }),

  // M06.F04.I04 检测标准-检测参数关联
  http.post('*/inspection-standard-parameters', async ({ request }) => {
    const body = (await request.json()) as Partial<{ inspectionStandardCode: string; inspectionParameterCode: string; clause?: string; methodName?: string; unit?: string }>
    if (!body.inspectionStandardCode || !body.inspectionParameterCode) {
      return HttpResponse.json({ message: '标准/参数 必填' }, { status: 400 })
    }
    const id = `insp-std-param-${body.inspectionStandardCode}-${body.inspectionParameterCode}`
    const dup = inspectionStandardParameterTable.findById(id)
    if (dup) return HttpResponse.json({ message: '标准参数关联已存在' }, { status: 400 })
    const now = new Date().toISOString()
    inspectionStandardParameterTable.insert({
      id,
      inspectionStandardCode: body.inspectionStandardCode,
      inspectionParameterCode: body.inspectionParameterCode,
      clause: body.clause,
      methodName: body.methodName,
      unit: body.unit,
    } as never)
    inspectionStandardParameterTable.update(id, { createdAt: now, updatedAt: now })
    return HttpResponse.json(inspectionStandardParameterTable.findById(id), { status: 201 })
  }),
]
