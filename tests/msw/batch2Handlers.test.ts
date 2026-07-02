import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

async function createTask(body: unknown) {
  return fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
async function listTasks(query?: string) {
  const url = query ? `${API_BASE}/tasks?${query}` : `${API_BASE}/tasks`
  return fetch(url)
}
async function getTask(id: string) { return fetch(`${API_BASE}/tasks/${id}`) }
async function updateTask(id: string, body: unknown) {
  return fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
async function deleteTask(id: string) { return fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' }) }
async function entryTask(id: string, body: unknown) {
  return fetch(`${API_BASE}/tasks/${id}/entry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('MSW tasks handlers', () => {
  it('GET /tasks 分页结构', async () => {
    await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: '抗压强度' })
    const res = await listTasks('page=1&pageSize=10')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.items).toBeInstanceOf(Array)
    expect(typeof data.total).toBe('number')
  })

  it('POST /tasks 创建成功 201', async () => {
    const res = await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: '拉伸试验' })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.status).toBe('pending')
    expect(data.resultData).toBe('')
  })

  it('POST /tasks 缺必填 400', async () => {
    const res = await createTask({ sampleId: 's-001' })
    expect(res.status).toBe(400)
  })

  it('PUT /tasks/:id 更新成功', async () => {
    const created = await (await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'X' })).json()
    const res = await updateTask(created.id, { status: 'testing' })
    expect((await res.json()).status).toBe('testing')
  })

  it('DELETE /tasks/:id 204', async () => {
    const created = await (await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'X' })).json()
    const res = await deleteTask(created.id)
    expect(res.status).toBe(204)
    expect((await getTask(created.id)).status).toBe(404)
  })

  it('POST /tasks/:id/entry 录入数据 pending → completed', async () => {
    const created = await (await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'X' })).json()
    const res = await entryTask(created.id, { resultData: '{"strength":30}', conclusion: '合格', status: 'completed' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('completed')
    expect(data.resultData).toBe('{"strength":30}')
    expect(data.conclusion).toBe('合格')
  })

  it('POST /tasks/:id/entry 已完成任务不可录入 400', async () => {
    const created = await (await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'X' })).json()
    await entryTask(created.id, { resultData: 'd', conclusion: 'c', status: 'completed' })
    const res = await entryTask(created.id, { resultData: 'd2', conclusion: 'c2', status: 'completed' })
    expect(res.status).toBe(400)
  })

  it('GET /tasks status 筛选', async () => {
    const c1 = await (await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'A' })).json()
    await updateTask(c1.id, { status: 'testing' })
    const res = await listTasks('page=1&pageSize=50&status=testing')
    const data = await res.json()
    expect(data.items.every((t: { status: string }) => t.status === 'testing')).toBe(true)
  })

  it('GET /tasks assigneeId 筛选', async () => {
    await createTask({ sampleId: 's-001', assigneeId: 'u-target', testItems: 'A' })
    await createTask({ sampleId: 's-001', assigneeId: 'u-other', testItems: 'B' })
    const res = await listTasks('page=1&pageSize=50&assigneeId=u-target')
    const data = await res.json()
    expect(data.items.every((t: { assigneeId: string }) => t.assigneeId === 'u-target')).toBe(true)
  })
})

describe('MSW stats handler', () => {
  it('GET /stats 返回聚合统计', async () => {
    await fetch(`${API_BASE}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'P1', code: 'C1', ownerId: 'u-001' }) })
    await fetch(`${API_BASE}/samples`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: 'p-1', name: 'S1', code: 'SC1' }) })
    await createTask({ sampleId: 's-001', assigneeId: 'u-001', testItems: 'X' })
    const res = await fetch(`${API_BASE}/stats`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(typeof data.projectCount).toBe('number')
    expect(data.sampleCountByStatus).toBeDefined()
    expect(data.reportCountByStatus).toBeDefined()
    expect(typeof data.pendingTaskCount).toBe('number')
    expect(data.pendingTaskCount).toBeGreaterThan(0)
  })
})

describe('MSW auth/change-password handler', () => {
  it('正确旧密码 + 合规新密码返回成功', async () => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'old-lab123', newPassword: 'new-lab456' }),
    })
    expect(res.ok).toBe(true)
    expect((await res.json()).success).toBe(true)
  })

  it('旧密码错误返回 400', async () => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'wrong', newPassword: 'new-lab456' }),
    })
    expect(res.status).toBe(400)
  })

  it('新密码不足 6 位返回 400', async () => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'old-lab123', newPassword: '123' }),
    })
    expect(res.status).toBe(400)
  })
})
