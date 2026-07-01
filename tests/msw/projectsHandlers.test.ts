import { describe, it, expect, beforeEach } from 'vitest'

const API_BASE = 'http://localhost/api'

async function listProjects(query?: string) {
  const url = query ? `${API_BASE}/projects?${query}` : `${API_BASE}/projects`
  return fetch(url)
}

async function createProject(body: unknown) {
  return fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function getProject(id: string) {
  return fetch(`${API_BASE}/projects/${id}`)
}

async function updateProject(id: string, body: unknown) {
  return fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function deleteProject(id: string) {
  return fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
}

describe('MSW projects handlers', () => {
  // beforeEach 保证每个测试都有种子数据（afterEach 会 resetMockDb）
  beforeEach(async () => {
    await createProject({ name: '种子项目-城南检测', code: 'SEED-001', status: 'active', ownerId: 'u-001' })
  })

  it('GET /projects 返回分页结构 {items,total,page,pageSize}', async () => {
    const res = await listProjects('page=1&pageSize=10')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.items).toBeInstanceOf(Array)
    expect(typeof data.total).toBe('number')
    expect(data.page).toBe(1)
    expect(data.pageSize).toBe(10)
  })

  it('POST /projects 创建成功返回 201 + 新建实体（含 id）', async () => {
    const res = await createProject({
      name: '新建项目-江北',
      code: 'LAB-2026-002',
      status: 'active',
      ownerId: 'u-001',
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.name).toBe('新建项目-江北')
    expect(data.code).toBe('LAB-2026-002')
    expect(data.createdAt).toBeTruthy()
  })

  it('POST /projects 缺少必填字段返回 400', async () => {
    const res = await createProject({ name: '缺 code' })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toBeTruthy()
  })

  it('GET /projects/:id 返回单个项目', async () => {
    const created = await (await createProject({
      name: '单个查询项目',
      code: 'SINGLE-001',
      status: 'active',
      ownerId: 'u-001',
    })).json()
    const res = await getProject(created.id)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.id).toBe(created.id)
    expect(data.name).toBe('单个查询项目')
  })

  it('GET /projects/:id 不存在返回 404', async () => {
    const res = await getProject('nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id 更新成功返回 200 + 更新后实体', async () => {
    const created = await (await createProject({
      name: '待更新项目',
      code: 'UPD-001',
      status: 'active',
      ownerId: 'u-001',
    })).json()
    const res = await updateProject(created.id, { name: '已更新项目', status: 'paused' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('已更新项目')
    expect(data.status).toBe('paused')
    expect(data.updatedAt).toBeTruthy()
  })

  it('DELETE /projects/:id 删除成功返回 204', async () => {
    const created = await (await createProject({
      name: '待删除项目',
      code: 'DEL-001',
      status: 'active',
      ownerId: 'u-001',
    })).json()
    const res = await deleteProject(created.id)
    expect(res.status).toBe(204)
    // 二次 GET 应 404
    const after = await getProject(created.id)
    expect(after.status).toBe(404)
  })

  it('GET /projects 支持 keyword 搜索', async () => {
    await createProject({ name: '关键词匹配-XYZ', code: 'KW-001', status: 'active', ownerId: 'u-001' })
    await createProject({ name: '其他项目-ABC', code: 'KW-002', status: 'active', ownerId: 'u-001' })
    const res = await listProjects('page=1&pageSize=50&keyword=XYZ')
    const data = await res.json()
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((p: { name: string }) => p.name.includes('XYZ'))).toBe(true)
  })

  it('GET /projects 支持 status 过滤', async () => {
    await createProject({ name: '归档项目', code: 'ARCH-001', status: 'archived', ownerId: 'u-001' })
    const res = await listProjects('page=1&pageSize=50&status=archived')
    const data = await res.json()
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((p: { status: string }) => p.status === 'archived')).toBe(true)
  })
})
