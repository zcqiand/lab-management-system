import { http, HttpResponse } from 'msw'
import type {
  ReviewAction,
  UserRecord,
  UserCreateInput,
  UserUpdateInput,
  RoleRecord,
  RoleCreateInput,
  RoleUpdateInput,
  TaskRecord,
  TaskCreateInput,
  TaskUpdateInput,
  TaskEntryInput,
  DashboardStats,
  ChangePasswordInput,
} from '../src/types/api'
import { signJwt, verifyJwt } from './jwt'
import {
  MockTable,
  contractTable,
  receiptTable,
  sampleTable,
  reportTable,
  userTable,
  roleTable,
  taskTable,
  testRecordSheetTable,
  testItemTable,
  testParameterTable,
  testStandardTable,
  technicalRequirementTable,
  orgInfoTable,
  flowStore,
  reviewReportRecord,
  computeStats,
} from './db'

// =============================================================================
// batch3-A2：input adapter（关键兼容层）
// 旧 fixture 用 name/code/sampleId/title 向 mock API 发送请求；
// handlers 入口做字段映射，db 内部存新结构（sampleCode/contractId/sampleIds[]/reportCode）。
// GET 响应时输出新结构 + 旧字段 fallback（兼容测试读 r.sampleId / s.name 等）。
// =============================================================================

// ---------- /projects 兼容：旧测试 fixture 可能仍用 POST /projects{name,code,ownerId} ----------
// 实际 /projects 端点保留为 contractTable 的兼容 alias，body {name,code,ownerId,status} 映射到 Contract。
// GET 返回旧 Project 形态（id, name=projectName, code=contractCode, status, ownerId='u-001' fallback, createdAt, updatedAt）。
// batch3-A4 测试迁移后删除该 alias 段。

interface LegacyReportCreate {
  sampleId: string
  title: string
  conclusion?: string
}

/** /projects 旧 Project 形态（GET 响应） */
interface LegacyProjectShape {
  id: string
  name: string
  code: string
  status: 'active' | 'archived' | 'paused'
  ownerId: string
  createdAt: string
  updatedAt: string
}

function contractToLegacyProject(c: {
  id: string
  contractCode: string
  projectName: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}): LegacyProjectShape {
  return {
    id: c.id,
    name: c.projectName,
    code: c.contractCode,
    status: c.status,
    ownerId: 'u-001', // Contract 无 ownerId，mock 用 'u-001' fallback
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

/** batch3-A2：MSW handler 注册表
 * ch35：/auth/*（auth/login / auth/me）
 * ch36：/projects（旧，已删）+ /samples（旧字段兼容）—— 实际为兼容层
 * ch37：/flow/:id
 * extend 批1：/reports（旧字段兼容）+ /users + /roles
 * extend 批2：/tasks + /stats + /auth/change-password
 * batch3-A2：/contracts + /receipts + /test-record-sheets + /test-items + /org-info
 *          + /test-parameters + /test-standards + /technical-requirements
 *          + /contracts/:id/summary
 */
export const handlers = [
  // ===========================================================
  // ch35：/auth/login（保留）
  // ===========================================================
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    // batch3-A2 兼容：原 ch35 admin(lab123) + technician(tech123) 双角色逻辑保留
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
    const token = auth.slice(7)
    const payload = verifyJwt(token)
    if (!payload) {
      return HttpResponse.json({ message: 'token 无效或已过期' }, { status: 401 })
    }
    const rolePermissions = payload.permissions
    return HttpResponse.json({
      user: {
        id: payload.sub,
        username: payload.username,
        displayName: '管理员',
        role: { id: 'role-admin', name: payload.role, permissions: rolePermissions },
        permissions: rolePermissions,
      },
    })
  }),

  // ===========================================================
  // batch3-A2 兼容：/projects（CRUD 操作 contractTable，GET 返回旧 Project 形态）
  // ===========================================================
  http.get('*/projects', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'active' | 'archived' | null
    const result = contractTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['contractCode', 'projectName', 'clientUnit'],
      filters: {
        status: status ?? undefined,
      },
    })
    // 输出旧 Project 形态（name/code/ownerId），让 ch36 projectsHandlers.test 仍绿
    const legacyItems = (result.items as unknown as Parameters<typeof contractToLegacyProject>[0][]).map(contractToLegacyProject)
    return HttpResponse.json({ ...result, items: legacyItems })
  }),

  http.post('*/projects', async ({ request }) => {
    // input adapter：旧 {name, code, ownerId, status} → Contract
    const body = (await request.json()) as { name?: string; code?: string; ownerId?: string; status?: string }
    if (!body.name || !body.code || !body.ownerId) {
      return HttpResponse.json({ message: 'name/code/ownerId 必填' }, { status: 400 })
    }
    const created = contractTable.insert({
      contractCode: body.code,
      clientUnit: body.ownerId, // mock：旧 ownerId → Contract.clientUnit 占位
      projectName: body.name,
      constructionUnit: 'mock-construction-unit',
      witnessUnit: 'mock-witness-unit',
      witness: 'mock-witness',
      status: (body.status as 'active' | 'archived') ?? 'active',
    } as never)
    return HttpResponse.json(contractToLegacyProject(created as never), { status: 201 })
  }),

  http.get('*/projects/:id', ({ params }) => {
    const found = contractTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return HttpResponse.json(contractToLegacyProject(found as never))
  }),

  http.put('*/projects/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    // 旧字段名 → Contract 字段名
    if (body.name && !body.projectName) body.projectName = body.name
    if (body.code && !body.contractCode) body.contractCode = body.code
    const updated = contractTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return HttpResponse.json(contractToLegacyProject(updated as never))
  }),

  http.delete('*/projects/:id', ({ params }) => {
    const ok = contractTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // batch3-A2：/org-info（OrgInfo 系统级单例）
  // ===========================================================
  http.get('*/org-info', () => {
    const list = orgInfoTable.query({ page: 1, pageSize: 1 })
    if (list.total === 0) {
      return HttpResponse.json({ message: 'OrgInfo 未初始化' }, { status: 404 })
    }
    return HttpResponse.json(list.items[0])
  }),

  http.put('*/org-info', async ({ request }) => {
    const body = (await request.json()) as Partial<typeof orgInfoTable extends MockTable<infer T> ? T : never>
    const list = orgInfoTable.query({ page: 1, pageSize: 1 })
    if (list.total === 0) {
      const created = orgInfoTable.insert({ ...body, id: 'org-001' } as never)
      return HttpResponse.json(created)
    }
    const updated = orgInfoTable.update(list.items[0].id, body as Record<string, unknown>)
    return HttpResponse.json(updated)
  }),

  // ===========================================================
  // batch3-A2：/contracts（合同/委托，取代旧 /projects）
  // ===========================================================
  http.get('*/contracts', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'active' | 'archived' | null
    const result = contractTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['contractCode', 'projectName', 'clientUnit'],
      filters: {
        status: status ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/contracts', async ({ request }) => {
    const body = (await request.json()) as { contractCode?: string; projectName?: string; clientUnit?: string; constructionUnit?: string; witnessUnit?: string; witness?: string }
    if (!body.contractCode || !body.projectName || !body.clientUnit || !body.constructionUnit || !body.witnessUnit || !body.witness) {
      return HttpResponse.json({ message: 'contractCode/projectName/clientUnit/constructionUnit/witnessUnit/witness 必填' }, { status: 400 })
    }
    const created = contractTable.insert({
      contractCode: body.contractCode,
      clientUnit: body.clientUnit,
      projectName: body.projectName,
      constructionUnit: body.constructionUnit,
      witnessUnit: body.witnessUnit,
      witness: body.witness,
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
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const updated = contractTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '合同不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/contracts/:id', ({ params }) => {
    const ok = contractTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '合同不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // batch3-A2：钢材汇总表
  http.get('*/contracts/:id/summary', ({ params, request }) => {
    const contractId = String(params.id)
    const url = new URL(request.url)
    const materialType = url.searchParams.get('materialType')
    const samples = sampleTable.query({ page: 1, pageSize: 99999 }).items.filter((s) => s.contractId === contractId)
    const reports = reportTable.query({ page: 1, pageSize: 99999 }).items.filter((r) => r.contractId === contractId)
    if (materialType === 'steel') {
      const rows = samples.filter((s) => s.materialType === 'steel').map((s, i) => {
        const report = reports.find((r) => r.sampleIds.includes(s.id))
        return {
          seq: i + 1,
          spec: s.specification ?? '',
          steelGrade: s.sampleGrade ?? '',
          qualityCertNo: '',
          manufacturer: s.manufacturer ?? '',
          representQuantity: s.representQuantity ?? '',
          reportCode: report?.reportCode ?? '',
          testDate: report?.reportDate ?? '',
          result: (report?.result ?? 'pass'),
        }
      })
      return HttpResponse.json(rows)
    }
    return HttpResponse.json([])
  }),

  // ===========================================================
  // batch3-A2：/receipts（接样）
  // ===========================================================
  http.get('*/receipts', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'received' | 'testing' | 'completed' | 'rejected' | null
    const result = receiptTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['receiptCode'],
      filters: {
        contractId: url.searchParams.get('contractId') ?? undefined,
        status: status ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/receipts', async ({ request }) => {
    const body = (await request.json()) as Partial<{ contractId: string; receiptCode: string; receivedBy: string; sampleSource: string; testCategory: string }>
    if (!body.contractId || !body.receiptCode || !body.receivedBy || !body.sampleSource || !body.testCategory) {
      return HttpResponse.json({ message: 'contractId/receiptCode/receivedBy/sampleSource/testCategory 必填' }, { status: 400 })
    }
    const created = receiptTable.insert({
      contractId: body.contractId,
      receiptCode: body.receiptCode,
      receivedDate: new Date().toISOString().slice(0, 10),
      receivedBy: body.receivedBy,
      sampleSource: body.sampleSource,
      testCategory: body.testCategory,
      remark: '',
      status: 'received',
    } as never)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/receipts/:id', ({ params }) => {
    const found = receiptTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '接样不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/receipts/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const updated = receiptTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '接样不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/receipts/:id', ({ params }) => {
    const ok = receiptTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '接样不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // batch3-A2：/samples（兼容旧字段名 + 新结构）
  // ===========================================================
  http.get('*/samples', ({ request }) => {
    const url = new URL(request.url)
    const result = sampleTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['sampleCode', 'sampleName'],
      filters: {
        status: url.searchParams.get('status') ?? undefined,
        materialType: url.searchParams.get('materialType') ?? undefined,
        // 兼容旧字段 projectId（ch36 tests 用）
        projectId: url.searchParams.get('projectId') ?? undefined,
        // batch3-A2 + v1.2-001：新增 receiptId/contractId 过滤
        receiptId: url.searchParams.get('receiptId') ?? undefined,
        contractId: url.searchParams.get('contractId') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/samples', async ({ request }) => {
    // input adapter：兼容旧字段 {projectId, name, code, status, receivedAt}
    const raw = (await request.json()) as Record<string, unknown>
    const body: Record<string, unknown> = { ...raw }
    if (!body.contractId && body.projectId) body.contractId = body.projectId
    if (!body.sampleCode && body.code) body.sampleCode = body.code
    if (!body.sampleName && body.name) body.sampleName = body.name
    if (!body.receiptId) body.receiptId = body.receiptId ?? 'receipt-001' // batch3-A2：默认 fallback
    if (!body.materialType) body.materialType = body.materialType ?? 'concrete'
    if (!body.materialDetails) body.materialDetails = body.materialDetails ?? { kind: 'concrete' }

    if (!body.sampleCode || !body.contractId) {
      return HttpResponse.json({ message: 'sampleCode/contractId 必填' }, { status: 400 })
    }
    const created = sampleTable.insert({
      contractId: body.contractId as string,
      receiptId: body.receiptId as string,
      reportId: null,
      sampleCode: body.sampleCode as string,
      materialType: body.materialType as string,
      sampleName: body.sampleName as string | undefined,
      sampleType: body.sampleType as string | undefined,
      specification: body.specification as string | undefined,
      sampleGrade: body.sampleGrade as string | undefined,
      structuralPart: body.structuralPart as string | undefined,
      manufacturer: body.manufacturer as string | undefined,
      sampleQuantity: body.sampleQuantity as string | undefined,
      representQuantity: body.representQuantity as string | undefined,
      sampleCondition: body.sampleCondition as string | undefined,
      materialDetails: body.materialDetails as Record<string, unknown>,
      status: (body.status as string | undefined) ?? 'pending',
      // 旧字段兼容（fallback）
      projectId: body.contractId as string,
      name: (body.sampleName as string | undefined) ?? (body.sampleCode as string),
      code: body.sampleCode as string,
      receivedAt: new Date().toISOString(),
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/samples/:id', ({ params }) => {
    const found = sampleTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/samples/:id', async ({ params, request }) => {
    const id = String(params.id)
    const raw = (await request.json()) as Record<string, unknown>
    const body: Record<string, unknown> = { ...raw }
    // 兼容旧字段 projectId→contractId, name→sampleName, code→sampleCode
    if (body.projectId && !body.contractId) body.contractId = body.projectId
    if (body.name && !body.sampleName) body.sampleName = body.name
    if (body.code && !body.sampleCode) body.sampleCode = body.code
    const updated = sampleTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/samples/:id', ({ params }) => {
    const ok = sampleTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // batch3-A2：/reports（兼容旧字段 sampleId/title + 新结构 sampleIds[]/reportCode）
  // ===========================================================
  http.get('*/reports', ({ request }) => {
    const url = new URL(request.url)
    const result = reportTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['reportCode'],
      filters: {
        status: url.searchParams.get('status') ?? undefined,
        materialType: url.searchParams.get('materialType') ?? undefined,
        // 兼容旧字段 sampleId
        sampleId: url.searchParams.get('sampleId') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/reports', async ({ request }) => {
    // input adapter：兼容旧字段 {sampleId, title, conclusion}
    const raw = (await request.json()) as LegacyReportCreate & Record<string, unknown>
    const body: Record<string, unknown> = { ...raw }
    if (!body.sampleIds && body.sampleId) body.sampleIds = [body.sampleId]
    if (!body.reportCode && body.title) body.reportCode = body.title
    if (!body.contractId) body.contractId = body.contractId ?? 'contract-bj-001' // fallback
    if (!body.receiptId) body.receiptId = body.receiptId ?? 'receipt-001'
    if (!body.reportDate) body.reportDate = body.reportDate ?? new Date().toISOString().slice(0, 10)
    if (!body.materialType) body.materialType = body.materialType ?? 'concrete'
    if (!body.result) body.result = body.result ?? 'pass'

    if (!body.reportCode || !Array.isArray(body.sampleIds) || (body.sampleIds as string[]).length === 0) {
      return HttpResponse.json({ message: 'reportCode/sampleIds 必填' }, { status: 400 })
    }
    const created = reportTable.insert({
      contractId: body.contractId as string,
      receiptId: body.receiptId as string,
      reportCode: body.reportCode as string,
      reportDate: body.reportDate as string,
      materialType: body.materialType as string,
      sampleIds: body.sampleIds as string[],
      conclusion: (body.conclusion as string | undefined) ?? '',
      result: body.result as 'pass' | 'fail',
      remark: '',
      status: 'draft',
      issuedAt: null,
      // 旧字段兼容
      sampleId: (body.sampleIds as string[])[0],
      title: body.reportCode as string,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/reports/:id', ({ params }) => {
    const found = reportTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '报告不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/reports/:id', async ({ params, request }) => {
    const id = String(params.id)
    const raw = (await request.json()) as Record<string, unknown>
    const body: Record<string, unknown> = { ...raw }
    if (body.title && !body.reportCode) body.reportCode = body.title
    const updated = reportTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '报告不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/reports/:id', ({ params }) => {
    const ok = reportTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '报告不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/reports/:id/review', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as { action: ReviewAction }
    const result = reviewReportRecord(id, body.action)
    if (!result.ok) {
      return HttpResponse.json({ message: result.message }, { status: 400 })
    }
    return HttpResponse.json(result.report as Record<string, unknown>)
  }),

  // ===========================================================
  // batch3-A2：/test-record-sheets
  // ===========================================================
  http.get('*/test-record-sheets', ({ request }) => {
    const url = new URL(request.url)
    const result = testRecordSheetTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['sheetCode'],
      filters: { contractId: url.searchParams.get('contractId') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/test-record-sheets', async ({ request }) => {
    const body = (await request.json()) as Partial<{ contractId: string; sheetCode: string; testDate: string; sampleIds: string[] }>
    if (!body.contractId || !body.sheetCode || !body.testDate || !Array.isArray(body.sampleIds)) {
      return HttpResponse.json({ message: 'contractId/sheetCode/testDate/sampleIds 必填' }, { status: 400 })
    }
    const created = testRecordSheetTable.insert({
      contractId: body.contractId,
      sheetCode: body.sheetCode,
      testDate: body.testDate,
      sampleIds: body.sampleIds,
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/test-record-sheets/:id', ({ params }) => {
    const found = testRecordSheetTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '记录单不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/test-record-sheets/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const updated = testRecordSheetTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '记录单不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/test-record-sheets/:id', ({ params }) => {
    const ok = testRecordSheetTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '记录单不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // batch3-A2：/test-items
  // ===========================================================
  http.get('*/test-items', ({ request }) => {
    const url = new URL(request.url)
    const result = testItemTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['parameterCode', 'requirement', 'result'],
      filters: {
        sheetId: url.searchParams.get('sheetId') ?? undefined,
        sampleId: url.searchParams.get('sampleId') ?? undefined,
        reportId: url.searchParams.get('reportId') ?? undefined,
        parameterCode: url.searchParams.get('parameterCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/test-items', async ({ request }) => {
    const body = (await request.json()) as Partial<{ sheetId: string; sampleId: string; parameterCode: string; requirement: string; result: string; passed: boolean }>
    if (!body.sheetId || !body.sampleId || !body.parameterCode || !body.requirement || body.result === undefined || body.passed === undefined) {
      return HttpResponse.json({ message: 'sheetId/sampleId/parameterCode/requirement/result/passed 必填' }, { status: 400 })
    }
    const created = testItemTable.insert({
      sheetId: body.sheetId,
      sampleId: body.sampleId,
      reportId: null,
      parameterCode: body.parameterCode,
      requirement: body.requirement,
      result: body.result,
      passed: body.passed,
      materialDetails: { kind: 'steel' }, // 默认 fallback，ch41 UI 按 materialType 选
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/test-items/:id', ({ params }) => {
    const found = testItemTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '单项记录不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/test-items/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const updated = testItemTable.update(id, body)
    if (!updated) return HttpResponse.json({ message: '单项记录不存在' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('*/test-items/:id', ({ params }) => {
    const ok = testItemTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '单项记录不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // batch3-A2：三个码表（/test-parameters / /test-standards / /technical-requirements）
  // ===========================================================
  http.get('*/test-parameters', ({ request }) => {
    const url = new URL(request.url)
    const result = testParameterTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'name', 'category'],
      filters: { materialType: url.searchParams.get('materialType') ?? undefined },
    })
    return HttpResponse.json(result)
  }),

  http.get('*/test-parameters/:code', ({ params }) => {
    const list = testParameterTable.query({ page: 1, pageSize: 99999 })
    const found = list.items.find((p) => p.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '参数不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.get('*/test-standards', ({ request }) => {
    const url = new URL(request.url)
    const result = testStandardTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'name'],
    })
    return HttpResponse.json(result)
  }),

  http.get('*/test-standards/:code', ({ params }) => {
    const list = testStandardTable.query({ page: 1, pageSize: 99999 })
    const found = list.items.find((s) => s.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '标准不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.get('*/technical-requirements', ({ request }) => {
    const url = new URL(request.url)
    const result = technicalRequirementTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '100'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['code', 'value'],
      filters: {
        materialType: url.searchParams.get('materialType') ?? undefined,
        parameterCode: url.searchParams.get('parameterCode') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.get('*/technical-requirements/:code', ({ params }) => {
    const list = technicalRequirementTable.query({ page: 1, pageSize: 99999 })
    const found = list.items.find((r) => r.code === String(params.code))
    if (!found) return HttpResponse.json({ message: '技术要求不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  // ===========================================================
  // extend 批1：/users（保留）
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
    const id = String(params.id)
    const body = (await request.json()) as UserUpdateInput
    const updated = userTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return HttpResponse.json(updated as UserRecord)
  }),

  http.delete('*/users/:id', ({ params }) => {
    const ok = userTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // extend 批1：/roles（保留）
  // ===========================================================
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
    const id = String(params.id)
    const body = (await request.json()) as RoleUpdateInput
    const updated = roleTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return HttpResponse.json(updated as RoleRecord)
  }),

  http.delete('*/roles/:id', ({ params }) => {
    const ok = roleTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // ===========================================================
  // ch37：/flow/:id（保留）
  // ===========================================================
  http.get('*/flow/:id', ({ params }) => {
    const id = String(params.id)
    const saved = flowStore.get(id)
    return HttpResponse.json(saved ?? { status: 'draft', history: [] })
  }),

  http.post('*/flow/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as { status: string; history: unknown[] }
    flowStore.set(id, body)
    return HttpResponse.json(body)
  }),

  // ===========================================================
  // extend 批2：/tasks（保留）
  // ===========================================================
  http.get('*/tasks', ({ request }) => {
    const url = new URL(request.url)
    const result = taskTable.query({
      page: Number(url.searchParams.get('page') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
      keyword: url.searchParams.get('keyword') ?? undefined,
      keywordFields: ['testItems', 'conclusion'],
      filters: {
        sampleId: url.searchParams.get('sampleId') ?? undefined,
        status: url.searchParams.get('status') ?? undefined,
        assigneeId: url.searchParams.get('assigneeId') ?? undefined,
      },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/tasks', async ({ request }) => {
    const body = (await request.json()) as Partial<TaskCreateInput>
    if (!body.sampleId || !body.assigneeId || !body.testItems) {
      return HttpResponse.json({ message: 'sampleId/assigneeId/testItems 必填' }, { status: 400 })
    }
    const created = taskTable.insert({
      sampleId: body.sampleId,
      assigneeId: body.assigneeId,
      testItems: body.testItems,
      status: 'pending',
      resultData: '',
      conclusion: '',
    } as never)
    return HttpResponse.json(created as TaskRecord, { status: 201 })
  }),

  http.get('*/tasks/:id', ({ params }) => {
    const found = taskTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '任务不存在' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  http.put('*/tasks/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as TaskUpdateInput
    const updated = taskTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '任务不存在' }, { status: 404 })
    return HttpResponse.json(updated as Record<string, unknown>)
  }),

  http.delete('*/tasks/:id', ({ params }) => {
    const ok = taskTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '任务不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/tasks/:id/entry', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as TaskEntryInput
    const task = taskTable.findById(id)
    if (!task) return HttpResponse.json({ message: '任务不存在' }, { status: 404 })
    if (task.status !== 'pending' && task.status !== 'testing') {
      return HttpResponse.json({ message: '当前状态不可录入数据' }, { status: 400 })
    }
    const updated = taskTable.update(id, {
      status: body.status,
      resultData: body.resultData,
      conclusion: body.conclusion,
    })
    return HttpResponse.json(updated as Record<string, unknown>)
  }),

  // ===========================================================
  // extend 批2：/stats（Dashboard 聚合统计，兼容旧 projectCount 字段）
  // ===========================================================
  http.get('*/stats', () => {
    return HttpResponse.json(computeStats() as unknown as DashboardStats)
  }),

  // ===========================================================
  // extend 批2：/auth/change-password（保留）
  // ===========================================================
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
]