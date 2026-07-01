import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

async function getFlow(id: string) {
  return fetch(`${API_BASE}/flow/${id}`)
}

async function saveFlow(id: string, body: unknown) {
  return fetch(`${API_BASE}/flow/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('MSW flow handlers', () => {
  it('GET /flow/:id 未保存返回默认 draft 状态', async () => {
    const res = await getFlow('flow-new')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('draft')
    expect(data.history).toEqual([])
  })

  it('POST /flow/:id 保存状态后 GET 返回保存值', async () => {
    await saveFlow('flow-1', {
      status: 'submitted',
      history: [{ fromStatus: 'draft', toStatus: 'submitted', operator: 'u-1', timestamp: 't', comment: '' }],
    })
    const res = await getFlow('flow-1')
    const data = await res.json()
    expect(data.status).toBe('submitted')
    expect(data.history).toHaveLength(1)
  })

  it('POST /flow/:id 覆盖已保存状态', async () => {
    await saveFlow('flow-2', { status: 'submitted', history: [] })
    await saveFlow('flow-2', {
      status: 'testing',
      history: [{ fromStatus: 'draft', toStatus: 'submitted', operator: 'u-1', timestamp: 't', comment: '' }, { fromStatus: 'submitted', toStatus: 'testing', operator: 'u-2', timestamp: 't2', comment: '' }],
    })
    const res = await getFlow('flow-2')
    const data = await res.json()
    expect(data.status).toBe('testing')
    expect(data.history).toHaveLength(2)
  })
})
