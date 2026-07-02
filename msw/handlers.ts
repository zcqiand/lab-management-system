import { http, HttpResponse } from 'msw'
import type { User, Role, Permission, Project, Sample, ProjectCreateInput, ProjectUpdateInput, SampleCreateInput, SampleUpdateInput, Report, ReportCreateInput, ReportUpdateInput, ReviewAction, UserRecord, UserCreateInput, UserUpdateInput, RoleRecord, RoleCreateInput, RoleUpdateInput } from '../src/types/api'
import { signJwt, verifyJwt } from './jwt'
import { projectTable, sampleTable, flowStore, reportTable, userTable, roleTable, reviewReportRecord } from './db'

// —— mock 用户库（仅 mock 层，非真实凭证）——
const ADMIN_PERMISSIONS: Permission[] = [
  'project:read',
  'project:write',
  'sample:read',
  'sample:write',
  'report:read',
  'report:write',
  'report:issue',
  'user:read',
  'user:delete',
]
const TECH_PERMISSIONS: Permission[] = [
  'project:read',
  'sample:read',
  'sample:write',
  'report:read',
  'report:write',
]

const adminRole: Role = { id: 'role-admin', name: 'admin', permissions: ADMIN_PERMISSIONS }
const techRole: Role = { id: 'role-tech', name: 'technician', permissions: TECH_PERMISSIONS }

interface MockUserRecord {
  password: string
  user: User
}

const MOCK_USERS: Record<string, MockUserRecord> = {
  labadmin: {
    password: 'lab123',
    user: {
      id: 'u-001',
      username: 'labadmin',
      displayName: '实验室管理员',
      role: adminRole,
      permissions: ADMIN_PERMISSIONS,
    },
  },
  technician: {
    password: 'tech123',
    user: {
      id: 'u-002',
      username: 'technician',
      displayName: '检测员',
      role: techRole,
      permissions: TECH_PERMISSIONS,
    },
  },
}

interface LoginResponse {
  token: string
  user: User
}

// MSW handler 注册表。
// ch35：追加 /auth/login、/auth/me。后续章节在此数组追加新 handler（只增不改）。
// ch36：追加 /projects、/samples 的 CRUD handler（mock 内存表，支持分页/搜索/过滤）。
export const handlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    const record = MOCK_USERS[body.username]
    if (!record || record.password !== body.password) {
      return HttpResponse.json({ message: '用户名或密码错误' }, { status: 401 })
    }
    const token = signJwt({
      sub: record.user.id,
      username: record.user.username,
      role: record.user.role.name,
      permissions: record.user.permissions,
    })
    const data: LoginResponse = { token, user: record.user }
    return HttpResponse.json(data)
  }),

  http.get('*/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ message: '未授权' }, { status: 401 })
    }
    const token = auth.slice(7)
    const payload = verifyJwt(token)
    if (!payload) {
      return HttpResponse.json({ message: 'token 无效或已过期' }, { status: 401 })
    }
    const record = Object.values(MOCK_USERS).find((r) => r.user.id === payload.sub)
    if (!record) {
      return HttpResponse.json({ message: '用户不存在' }, { status: 401 })
    }
    return HttpResponse.json({ user: record.user })
  }),

  // —— ch36：projects CRUD ——
  http.get('*/projects', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    const keyword = url.searchParams.get('keyword') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const ownerId = url.searchParams.get('ownerId') ?? undefined
    const dateFrom = url.searchParams.get('dateFrom') ?? undefined
    const dateTo = url.searchParams.get('dateTo') ?? undefined
    const result = projectTable.query({
      page,
      pageSize,
      keyword,
      keywordFields: ['name', 'code'],
      filters: { status, ownerId },
      dateField: 'createdAt',
      dateFrom,
      dateTo,
    })
    return HttpResponse.json(result)
  }),

  http.post('*/projects', async ({ request }) => {
    const body = (await request.json()) as Partial<ProjectCreateInput>
    if (!body.name || !body.code || !body.ownerId) {
      return HttpResponse.json({ message: 'name/code/ownerId 必填' }, { status: 400 })
    }
    const created = projectTable.insert({
      name: body.name,
      code: body.code,
      status: body.status ?? 'active',
      ownerId: body.ownerId,
    })
    return HttpResponse.json(created as unknown as Project, { status: 201 })
  }),

  http.get('*/projects/:id', ({ params }) => {
    const found = projectTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return HttpResponse.json(found as unknown as Project)
  }),

  http.put('*/projects/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as ProjectUpdateInput
    const updated = projectTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return HttpResponse.json(updated as unknown as Project)
  }),

  http.delete('*/projects/:id', ({ params }) => {
    const ok = projectTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '项目不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // —— ch36：samples CRUD ——
  http.get('*/samples', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    const keyword = url.searchParams.get('keyword') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const projectId = url.searchParams.get('projectId') ?? undefined
    const result = sampleTable.query({
      page,
      pageSize,
      keyword,
      keywordFields: ['name', 'code'],
      filters: { status, projectId },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/samples', async ({ request }) => {
    const body = (await request.json()) as Partial<SampleCreateInput>
    if (!body.projectId || !body.name || !body.code) {
      return HttpResponse.json({ message: 'projectId/name/code 必填' }, { status: 400 })
    }
    const created = sampleTable.insert({
      projectId: body.projectId,
      name: body.name,
      code: body.code,
      status: body.status ?? 'pending',
      receivedAt: new Date().toISOString(),
    })
    return HttpResponse.json(created as unknown as Sample, { status: 201 })
  }),

  http.get('*/samples/:id', ({ params }) => {
    const found = sampleTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(found as unknown as Sample)
  }),

  http.put('*/samples/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as SampleUpdateInput
    const updated = sampleTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return HttpResponse.json(updated as unknown as Sample)
  }),

  http.delete('*/samples/:id', ({ params }) => {
    const ok = sampleTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '样品不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // —— ch37：flow 状态持久化（mock 内存 Map，可选）——
  http.get('*/flow/:id', ({ params }) => {
    const id = String(params.id)
    const saved = flowStore.get(id)
    // 未保存返回默认 draft 状态
    return HttpResponse.json(saved ?? { status: 'draft', history: [] })
  }),

  http.post('*/flow/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as { status: string; history: unknown[] }
    flowStore.set(id, body)
    return HttpResponse.json(body)
  }),

  // —— extend 批1：reports CRUD + 审核 ——
  http.get('*/reports', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    const keyword = url.searchParams.get('keyword') ?? undefined
    const sampleId = url.searchParams.get('sampleId') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const result = reportTable.query({
      page,
      pageSize,
      keyword,
      keywordFields: ['title'],
      filters: { sampleId, status },
    })
    return HttpResponse.json(result)
  }),

  http.post('*/reports', async ({ request }) => {
    const body = (await request.json()) as Partial<ReportCreateInput>
    if (!body.sampleId || !body.title) {
      return HttpResponse.json({ message: 'sampleId/title 必填' }, { status: 400 })
    }
    const created = reportTable.insert({
      sampleId: body.sampleId,
      title: body.title,
      status: 'draft',
      conclusion: body.conclusion ?? '',
      issuedAt: null,
    })
    return HttpResponse.json(created as unknown as Report, { status: 201 })
  }),

  http.get('*/reports/:id', ({ params }) => {
    const found = reportTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '报告不存在' }, { status: 404 })
    return HttpResponse.json(found as unknown as Report)
  }),

  http.put('*/reports/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as ReportUpdateInput
    const updated = reportTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '报告不存在' }, { status: 404 })
    return HttpResponse.json(updated as unknown as Report)
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
    return HttpResponse.json(result.report as Report)
  }),

  // —— extend 批1：users CRUD ——
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    const keyword = url.searchParams.get('keyword') ?? undefined
    const role = url.searchParams.get('role') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const result = userTable.query({
      page,
      pageSize,
      keyword,
      keywordFields: ['username', 'displayName', 'email'],
      filters: { roleId: role, status },
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
    })
    return HttpResponse.json(created as unknown as UserRecord, { status: 201 })
  }),

  http.get('*/users/:id', ({ params }) => {
    const found = userTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return HttpResponse.json(found as unknown as UserRecord)
  }),

  http.put('*/users/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as UserUpdateInput
    const updated = userTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return HttpResponse.json(updated as unknown as UserRecord)
  }),

  http.delete('*/users/:id', ({ params }) => {
    const ok = userTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // —— extend 批1：roles CRUD ——
  http.get('*/roles', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50')
    const keyword = url.searchParams.get('keyword') ?? undefined
    const result = roleTable.query({
      page,
      pageSize,
      keyword,
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
    return HttpResponse.json(created as unknown as RoleRecord, { status: 201 })
  }),

  http.get('*/roles/:id', ({ params }) => {
    const found = roleTable.findById(String(params.id))
    if (!found) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return HttpResponse.json(found as unknown as RoleRecord)
  }),

  http.put('*/roles/:id', async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as RoleUpdateInput
    const updated = roleTable.update(id, body as Record<string, unknown>)
    if (!updated) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return HttpResponse.json(updated as unknown as RoleRecord)
  }),

  http.delete('*/roles/:id', ({ params }) => {
    const ok = roleTable.remove(String(params.id))
    if (!ok) return HttpResponse.json({ message: '角色不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),
]
