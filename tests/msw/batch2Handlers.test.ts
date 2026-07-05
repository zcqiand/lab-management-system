import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

// v2.0：/tasks 端点已移除——「任务安排」为流程阶段，见 flowPipelineHandlers.test.ts

describe('MSW stats handler', () => {
  it('GET /stats 返回聚合统计（pendingTaskCount = 任务安排阶段的接样单数）', async () => {
    // v3：创建报告类别 + 接样单 + 样品，并将接样单提交至「任务安排」阶段
    await fetch(`${API_BASE}/report-categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'steel', name: '钢材' }) })
    const rcRes = await fetch(`${API_BASE}/receipts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractId: 'c-1', receiptCode: 'RC-STATS-1', categoryCode: 'steel', receivedBy: '王五', sampleSource: '施工送检', testCategory: '委托检验' }) })
    const rc = await rcRes.json()
    await fetch(`${API_BASE}/samples`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiptId: rc.id, sampleCode: 'SC1' }) })
    await fetch(`${API_BASE}/receipts/flow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', ids: [rc.id], operator: 'u-001' }) })
    const res = await fetch(`${API_BASE}/stats`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(typeof data.contractCount).toBe('number')
    expect(data.receiptCount).toBeGreaterThan(0)
    expect(data.sampleCount).toBeGreaterThan(0)
    expect(data.reportCountByStatus).toBeDefined()
    expect(typeof data.pendingTaskCount).toBe('number')
    expect(data.pendingTaskCount).toBeGreaterThan(0)
    expect(data.receiptCountByStage.task_assignment).toBeGreaterThan(0)
    expect(Array.isArray(data.receiptCountByCategory)).toBe(true)
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
