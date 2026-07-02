import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

async function createReport(body: unknown) {
  return fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
async function listReports(query?: string) {
  const url = query ? `${API_BASE}/reports?${query}` : `${API_BASE}/reports`
  return fetch(url)
}
async function getReport(id: string) {
  return fetch(`${API_BASE}/reports/${id}`)
}
async function updateReport(id: string, body: unknown) {
  return fetch(`${API_BASE}/reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
async function deleteReport(id: string) {
  return fetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' })
}
async function reviewReport(id: string, action: string) {
  return fetch(`${API_BASE}/reports/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

describe('MSW reports handlers', () => {
  it('GET /reports 返回分页结构', async () => {
    await createReport({ sampleId: 's-001', title: '报告A' })
    const res = await listReports('page=1&pageSize=10')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.items).toBeInstanceOf(Array)
    expect(typeof data.total).toBe('number')
    expect(data.page).toBe(1)
  })

  it('POST /reports 创建成功返回 201', async () => {
    const res = await createReport({ sampleId: 's-001', title: '抗压强度报告', conclusion: '合格' })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.title).toBe('抗压强度报告')
    expect(data.status).toBe('draft')
    expect(data.issuedAt).toBeNull()
  })

  it('POST /reports 缺必填返回 400', async () => {
    const res = await createReport({ title: '缺 sampleId' })
    expect(res.status).toBe(400)
  })

  it('GET /reports/:id 返回单个报告', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '查询报告' })).json()
    const res = await getReport(created.id)
    expect(res.ok).toBe(true)
    expect((await res.json()).id).toBe(created.id)
  })

  it('PUT /reports/:id 更新成功', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '原' })).json()
    const res = await updateReport(created.id, { title: '改', conclusion: '不合格' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('改')
    expect(data.conclusion).toBe('不合格')
  })

  it('DELETE /reports/:id 删除成功 204', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '删' })).json()
    const res = await deleteReport(created.id)
    expect(res.status).toBe(204)
    expect((await getReport(created.id)).status).toBe(404)
  })

  it('GET /reports 支持 sampleId 筛选', async () => {
    await createReport({ sampleId: 's-filter', title: 'A' })
    await createReport({ sampleId: 's-other', title: 'B' })
    const res = await listReports('page=1&pageSize=50&sampleId=s-filter')
    const data = await res.json()
    expect(data.items.every((r: { sampleId: string }) => r.sampleId === 's-filter')).toBe(true)
  })

  it('GET /reports 支持 status 筛选', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '待审核' })).json()
    await reviewReport(created.id, 'submit')
    const res = await listReports('page=1&pageSize=50&status=reviewing')
    const data = await res.json()
    expect(data.items.every((r: { status: string }) => r.status === 'reviewing')).toBe(true)
  })

  it('POST /reports/:id/review submit: draft → reviewing', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '审核流' })).json()
    const res = await reviewReport(created.id, 'submit')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('reviewing')
  })

  it('POST /reports/:id/review approve: reviewing → issued', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '签发' })).json()
    await reviewReport(created.id, 'submit')
    const res = await reviewReport(created.id, 'approve')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('issued')
    expect(data.issuedAt).toBeTruthy()
  })

  it('POST /reports/:id/review reject: reviewing → draft', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '驳回' })).json()
    await reviewReport(created.id, 'submit')
    const res = await reviewReport(created.id, 'reject')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('draft')
  })

  it('POST /reports/:id/review 非法转换返回 400', async () => {
    const created = await (await createReport({ sampleId: 's-001', title: '非法' })).json()
    // draft 上直接 approve 非法
    const res = await reviewReport(created.id, 'approve')
    expect(res.status).toBe(400)
  })
})
