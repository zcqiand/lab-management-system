import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

/** v3：接样单必须携带存在的报告类别——先幂等创建 steel 类别 */
async function ensureCategory(code = 'steel') {
  await fetch(`${API_BASE}/report-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name: '钢材', summaryType: 'material' }),
  }) // 已存在返回 400，忽略
}

async function createReceipt(code: string) {
  await ensureCategory()
  const res = await fetch(`${API_BASE}/receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractId: 'c-1',
      receiptCode: code,
      categoryCode: 'steel',
      receivedBy: '王五',
      sampleSource: '施工送检',
      testCategory: '委托检验',
    }),
  })
  return (await res.json()) as { id: string; flowStatus: string }
}

async function flow(action: string, ids: string[], operator = 'u-001') {
  const res = await fetch(`${API_BASE}/receipts/flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ids, operator }),
  })
  return (await res.json()) as { results: { id: string; ok: boolean; message?: string; flowStatus?: string }[] }
}

async function getReceipt(id: string) {
  const res = await fetch(`${API_BASE}/receipts/${id}`)
  return (await res.json()) as { id: string; flowStatus: string; lastSubmittedBy: string | null; issuedAt?: string | null }
}

describe('v2.0 流程管线：提交（前进）', () => {
  it('新建接样单初始为 receiving，提交后进入 task_assignment', async () => {
    const rc = await createReceipt('RC-FLOW-1')
    expect(rc.flowStatus).toBe('receiving')
    const { results } = await flow('submit', [rc.id])
    expect(results[0].ok).toBe(true)
    expect(results[0].flowStatus).toBe('task_assignment')
    const after = await getReceipt(rc.id)
    expect(after.flowStatus).toBe('task_assignment')
    expect(after.lastSubmittedBy).toBe('u-001')
  })

  it('批量提交：多条单据一次前进一步', async () => {
    const a = await createReceipt('RC-FLOW-B1')
    const b = await createReceipt('RC-FLOW-B2')
    const { results } = await flow('submit', [a.id, b.id])
    expect(results.every((r) => r.ok)).toBe(true)
    expect((await getReceipt(a.id)).flowStatus).toBe('task_assignment')
    expect((await getReceipt(b.id)).flowStatus).toBe('task_assignment')
  })

  it('沿全流程连续提交至归档；归档后不可再提交', async () => {
    const rc = await createReceipt('RC-FLOW-FULL')
    const stages = ['task_assignment', 'data_entry', 'review', 'approval', 'issuance', 'archived']
    for (const stage of stages) {
      const { results } = await flow('submit', [rc.id])
      expect(results[0].ok).toBe(true)
      expect(results[0].flowStatus).toBe(stage)
    }
    // 批准 → 发放时自动写入签发时间
    const issued = await getReceipt(rc.id)
    expect(issued.issuedAt).toBeTruthy()
    // 已归档不可再提交
    const { results } = await flow('submit', [rc.id])
    expect(results[0].ok).toBe(false)
  })
})

describe('v2.0 流程管线：退回（后退）', () => {
  it('退回后退一步；接样（首环节）不可退回', async () => {
    const rc = await createReceipt('RC-FLOW-RET')
    await flow('submit', [rc.id])
    const { results } = await flow('return', [rc.id], 'u-reviewer')
    expect(results[0].ok).toBe(true)
    expect(results[0].flowStatus).toBe('receiving')
    // 首环节退回失败
    const fail = await flow('return', [rc.id])
    expect(fail.results[0].ok).toBe(false)
  })

  it('批量退回', async () => {
    const a = await createReceipt('RC-FLOW-RB1')
    const b = await createReceipt('RC-FLOW-RB2')
    await flow('submit', [a.id, b.id])
    const { results } = await flow('return', [a.id, b.id], 'u-x')
    expect(results.every((r) => r.ok)).toBe(true)
    expect((await getReceipt(a.id)).flowStatus).toBe('receiving')
  })
})

describe('v2.0 流程管线：撤回（提交人收回）', () => {
  it('提交人可撤回，回到提交前环节', async () => {
    const rc = await createReceipt('RC-FLOW-WD')
    await flow('submit', [rc.id], 'u-001')
    const { results } = await flow('withdraw', [rc.id], 'u-001')
    expect(results[0].ok).toBe(true)
    expect(results[0].flowStatus).toBe('receiving')
  })

  it('非提交人不可撤回', async () => {
    const rc = await createReceipt('RC-FLOW-WD2')
    await flow('submit', [rc.id], 'u-001')
    const { results } = await flow('withdraw', [rc.id], 'u-other')
    expect(results[0].ok).toBe(false)
    expect(results[0].message).toContain('提交人')
  })

  it('提交后已被处理（退回）则不可撤回', async () => {
    const rc = await createReceipt('RC-FLOW-WD3')
    await flow('submit', [rc.id], 'u-001')
    await flow('return', [rc.id], 'u-reviewer')
    const { results } = await flow('withdraw', [rc.id], 'u-001')
    expect(results[0].ok).toBe(false)
  })

  it('批量撤回', async () => {
    const a = await createReceipt('RC-FLOW-WB1')
    const b = await createReceipt('RC-FLOW-WB2')
    await flow('submit', [a.id, b.id], 'u-001')
    const { results } = await flow('withdraw', [a.id, b.id], 'u-001')
    expect(results.every((r) => r.ok)).toBe(true)
  })

  it('GET /receipts 支持 flowStatus + lastSubmittedBy 过滤（撤回视图）', async () => {
    const rc = await createReceipt('RC-FLOW-Q1')
    await flow('submit', [rc.id], 'u-me')
    const res = await fetch(`${API_BASE}/receipts?flowStatus=task_assignment&lastSubmittedBy=u-me`)
    const data = await res.json()
    expect(data.items.some((r: { id: string }) => r.id === rc.id)).toBe(true)
  })
})

describe('v2.0 流程管线：非法请求', () => {
  it('缺 ids 或非法 action 返回 400', async () => {
    const res1 = await fetch(`${API_BASE}/receipts/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', ids: [] }),
    })
    expect(res1.status).toBe(400)
    const res2 = await fetch(`${API_BASE}/receipts/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fly', ids: ['x'] }),
    })
    expect(res2.status).toBe(400)
  })

  it('不存在的单据返回单条失败结果', async () => {
    const { results } = await flow('submit', ['rc-not-exist'])
    expect(results[0].ok).toBe(false)
  })
})

// =============================================================================
// 数据录入：检测结果自动评定（按技术要求）+ 手工修正
// =============================================================================

async function seedEvaluationFixtures(receiptId: string) {
  // 技术要求（v3）：抗拉强度 ≥ 400 MPa，按 报告类别 steel + 牌号 HRB400E 匹配
  await fetch(`${API_BASE}/technical-requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'REQ-T-STE003',
      standardCode: 'GB 1499.2-2024',
      parameterCode: 'STE003',
      categoryCode: 'steel',
      brand: 'HRB400E',
      comparison: '≥',
      value: '400',
      unit: 'MPa',
    }),
  })
  // 样品（v3）：归属接样单 receiptId，牌号 HRB400E
  const sampleRes = await fetch(`${API_BASE}/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiptId,
      sampleCode: 'S-EVAL-1',
      sampleName: 'HRB400E 钢筋',
      model: '热轧带肋钢筋',
      brand: 'HRB400E',
      specification: 'Φ20',
      ext: {},
    }),
  })
  const sample = await sampleRes.json()
  return sample as { id: string }
}

describe('v2.0 数据录入：自动评定与手工修正', () => {
  it('检测值达标 → 自动评定合格；接样单结论同步生成', async () => {
    const rc = await createReceipt('RC-EVAL-1')
    const sample = await seedEvaluationFixtures(rc.id)
    const res = await fetch(`${API_BASE}/test-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: sample.id, parameterCode: 'STE003', result: '425' }),
    })
    expect(res.status).toBe(201)
    const item = await res.json()
    expect(item.autoPassed).toBe(true)
    expect(item.passed).toBe(true)
    expect(item.requirement).toContain('400')
    // 接样单结论同步：全部合格 → pass，并自动生成报告编号
    const receipt = await getReceipt(rc.id)
    expect((receipt as { result?: string }).result).toBe('pass')
    expect((receipt as { reportCode?: string }).reportCode).toBe('R-RC-EVAL-1')
  })

  it('检测值不达标 → 自动评定不合格；可手工修正为合格', async () => {
    const rc = await createReceipt('RC-EVAL-2')
    const sample = await seedEvaluationFixtures(rc.id)
    const res = await fetch(`${API_BASE}/test-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: sample.id, parameterCode: 'STE003', result: '380' }),
    })
    const item = await res.json()
    expect(item.autoPassed).toBe(false)
    expect(item.passed).toBe(false)
    expect((await getReceipt(rc.id) as { result?: string }).result).toBe('fail')
    // 手工修正（显式传 passed 覆盖自动评定）
    const putRes = await fetch(`${API_BASE}/test-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: true }),
    })
    const updated = await putRes.json()
    expect(updated.passed).toBe(true)
    expect(updated.autoPassed).toBe(false)
    expect((await getReceipt(rc.id) as { result?: string }).result).toBe('pass')
  })

  it('修改检测值且未显式传 passed → 重新自动评定', async () => {
    const rc = await createReceipt('RC-EVAL-3')
    const sample = await seedEvaluationFixtures(rc.id)
    const res = await fetch(`${API_BASE}/test-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: sample.id, parameterCode: 'STE003', result: '380' }),
    })
    const item = await res.json()
    expect(item.autoPassed).toBe(false)
    const putRes = await fetch(`${API_BASE}/test-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: '450' }),
    })
    const updated = await putRes.json()
    expect(updated.autoPassed).toBe(true)
    expect(updated.passed).toBe(true)
  })

  it('未匹配到技术要求 → autoPassed=null（需人工判定），默认不合格', async () => {
    const rc = await createReceipt('RC-EVAL-4')
    const sample = await seedEvaluationFixtures(rc.id)
    const res = await fetch(`${API_BASE}/test-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: sample.id, parameterCode: 'NO-SUCH-PARAM', result: '1.0' }),
    })
    const item = await res.json()
    expect(item.autoPassed).toBeNull()
    expect(item.passed).toBe(false)
  })

  it('删除检测项后接样单结论同步清空', async () => {
    const rc = await createReceipt('RC-EVAL-5')
    const sample = await seedEvaluationFixtures(rc.id)
    const res = await fetch(`${API_BASE}/test-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: sample.id, parameterCode: 'STE003', result: '425' }),
    })
    const item = await res.json()
    await fetch(`${API_BASE}/test-items/${item.id}`, { method: 'DELETE' })
    expect((await getReceipt(rc.id) as { result?: string }).result).toBe('')
  })
})
