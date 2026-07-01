import { describe, it, expect, beforeEach } from 'vitest'

const API_BASE = 'http://localhost/api'

async function listSamples(query?: string) {
  const url = query ? `${API_BASE}/samples?${query}` : `${API_BASE}/samples`
  return fetch(url)
}
async function createSample(body: unknown) {
  return fetch(`${API_BASE}/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
async function getSample(id: string) {
  return fetch(`${API_BASE}/samples/${id}`)
}
async function updateSample(id: string, body: unknown) {
  return fetch(`${API_BASE}/samples/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
async function deleteSample(id: string) {
  return fetch(`${API_BASE}/samples/${id}`, { method: 'DELETE' })
}

describe('MSW samples handlers', () => {
  beforeEach(async () => {
    await createSample({ projectId: 'p-001', name: '种子样品-混凝土', code: 'SP-SEED', status: 'pending' })
  })

  it('GET /samples 返回分页结构', async () => {
    const res = await listSamples('page=1&pageSize=10')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.items).toBeInstanceOf(Array)
    expect(typeof data.total).toBe('number')
    expect(data.page).toBe(1)
  })

  it('POST /samples 创建成功返回 201 + 新建实体', async () => {
    const res = await createSample({
      projectId: 'p-001',
      name: '钢筋拉伸试样',
      code: 'SP-001',
      status: 'pending',
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.name).toBe('钢筋拉伸试样')
    expect(data.createdAt).toBeTruthy()
  })

  it('POST /samples 缺少必填字段返回 400', async () => {
    const res = await createSample({ name: '缺 projectId 和 code' })
    expect(res.status).toBe(400)
  })

  it('GET /samples/:id 返回单个样品', async () => {
    const created = await (await createSample({
      projectId: 'p-001',
      name: '查询样品',
      code: 'SP-Q-001',
      status: 'pending',
    })).json()
    const res = await getSample(created.id)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.id).toBe(created.id)
  })

  it('GET /samples/:id 不存在返回 404', async () => {
    const res = await getSample('nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('PUT /samples/:id 更新成功', async () => {
    const created = await (await createSample({
      projectId: 'p-001',
      name: '待更新样品',
      code: 'SP-U-001',
      status: 'pending',
    })).json()
    const res = await updateSample(created.id, { name: '已更新样品', status: 'testing' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('已更新样品')
    expect(data.status).toBe('testing')
  })

  it('DELETE /samples/:id 删除成功返回 204', async () => {
    const created = await (await createSample({
      projectId: 'p-001',
      name: '待删除样品',
      code: 'SP-D-001',
      status: 'pending',
    })).json()
    const res = await deleteSample(created.id)
    expect(res.status).toBe(204)
    expect((await getSample(created.id)).status).toBe(404)
  })

  it('GET /samples 支持 keyword 搜索', async () => {
    await createSample({ projectId: 'p-001', name: '特殊样品-XYZ', code: 'SP-KW-001', status: 'pending' })
    const res = await listSamples('page=1&pageSize=50&keyword=XYZ')
    const data = await res.json()
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((s: { name: string }) => s.name.includes('XYZ'))).toBe(true)
  })

  it('GET /samples 支持 status 过滤', async () => {
    await createSample({ projectId: 'p-001', name: '检测中样品', code: 'SP-T-001', status: 'testing' })
    const res = await listSamples('page=1&pageSize=50&status=testing')
    const data = await res.json()
    expect(data.items.every((s: { status: string }) => s.status === 'testing')).toBe(true)
  })

  it('GET /samples 支持 projectId 过滤', async () => {
    await createSample({ projectId: 'p-filter', name: '项目过滤样品', code: 'SP-PF-001', status: 'pending' })
    const res = await listSamples('page=1&pageSize=50&projectId=p-filter')
    const data = await res.json()
    expect(data.items.every((s: { projectId: string }) => s.projectId === 'p-filter')).toBe(true)
  })
})
