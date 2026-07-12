import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockDb } from '../../msw/db'

const API_BASE = 'http://localhost/api'

// server.ts 模块加载时执行了 seedData()（含 code='steel' 的类别种子）。
// 全局 afterEach 会 resetMockDb，但每个文件首个用例仅经历 beforeAll，此时种子仍在。
// 显式 beforeEach 保证包括首个用例在内均从干净的空库开始。
beforeEach(() => resetMockDb())

async function post(path: string, body: unknown) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function seedCategory(code: string, extra: Record<string, unknown> = {}) {
  return post('/report-categories', { code, name: `类别${code}`, ...extra })
}

describe('v3 /report-categories：报告类别可维护', () => {
  it('创建后可查询；重复编码返回 400；自动生成默认报告模板', async () => {
    const res = await seedCategory('steel', { reportTitle: '钢材检测报告', summaryType: 'material', extFields: [{ key: 'furnaceNo', label: '炉号' }] })
    expect(res.status).toBe(201)
    const dup = await seedCategory('steel')
    expect(dup.status).toBe(400)
    const list = await (await fetch(`${API_BASE}/report-categories`)).json()
    expect(list.items.some((c: { code: string }) => c.code === 'steel')).toBe(true)
    const one = await (await fetch(`${API_BASE}/report-categories/steel`)).json()
    expect(one.extFields[0].key).toBe('furnaceNo')
    // 自动生成默认模板
    const tpls = await (await fetch(`${API_BASE}/report-templates?categoryCode=steel`)).json()
    expect(tpls.items).toHaveLength(1)
    expect(tpls.items[0].content).toContain('{{')
  })

  it('被接样单引用的类别不能删除；未被引用可删除', async () => {
    await seedCategory('steel')
    await seedCategory('unused')
    await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-CAT-1', categoryCode: 'steel', receivedBy: '王五' })
    const delUsed = await fetch(`${API_BASE}/report-categories/steel`, { method: 'DELETE' })
    expect(delUsed.status).toBe(400)
    const delUnused = await fetch(`${API_BASE}/report-categories/unused`, { method: 'DELETE' })
    expect(delUnused.status).toBe(204)
  })

  it('接样单必须携带存在的报告类别', async () => {
    const res = await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-CAT-X', categoryCode: 'no-such', receivedBy: '王五' })
    expect(res.status).toBe(400)
  })
})

describe('v3 /category-standards：报告类别关联标准', () => {
  it('关联/去重/按类别过滤/取消关联', async () => {
    await seedCategory('steel')
    await post('/test-standards', { code: 'GB 1499.2-2024', name: '热轧带肋钢筋', type: 'national' })
    const link = await post('/category-standards', { categoryCode: 'steel', standardCode: 'GB 1499.2-2024' })
    expect(link.status).toBe(201)
    const dup = await post('/category-standards', { categoryCode: 'steel', standardCode: 'GB 1499.2-2024' })
    expect(dup.status).toBe(400)
    // GET /test-standards?categoryCode 经关联表过滤
    const filtered = await (await fetch(`${API_BASE}/test-standards?categoryCode=steel`)).json()
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0].code).toBe('GB 1499.2-2024')
    // 取消关联
    const created = await (await fetch(`${API_BASE}/category-standards?categoryCode=steel`)).json()
    const del = await fetch(`${API_BASE}/category-standards/${created.items[0].id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
  })

  it('删除标准时级联删除关联', async () => {
    await seedCategory('steel')
    await post('/test-standards', { code: 'GB-DEL-1', name: '待删标准', type: 'national' })
    await post('/category-standards', { categoryCode: 'steel', standardCode: 'GB-DEL-1' })
    await fetch(`${API_BASE}/test-standards/${encodeURIComponent('GB-DEL-1')}`, { method: 'DELETE' })
    const links = await (await fetch(`${API_BASE}/category-standards?standardCode=GB-DEL-1`)).json()
    expect(links.items).toHaveLength(0)
  })
})

describe('v3 型号/规格/等级/牌号码表（归属报告类别）', () => {
  it.each(['models', 'specifications', 'grades', 'brands'])('%s：CRUD + 类别过滤 + 同名去重', async (endpoint) => {
    await seedCategory('steel')
    await seedCategory('cement')
    const created = await post(`/${endpoint}`, { categoryCode: 'steel', name: 'X-1' })
    expect(created.status).toBe(201)
    const dup = await post(`/${endpoint}`, { categoryCode: 'steel', name: 'X-1' })
    expect(dup.status).toBe(400)
    // 不同类别可同名
    const other = await post(`/${endpoint}`, { categoryCode: 'cement', name: 'X-1' })
    expect(other.status).toBe(201)
    const filtered = await (await fetch(`${API_BASE}/${endpoint}?categoryCode=steel`)).json()
    expect(filtered.items).toHaveLength(1)
    const item = filtered.items[0]
    const upd = await fetch(`${API_BASE}/${endpoint}/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X-2' }),
    })
    expect((await upd.json()).name).toBe('X-2')
    const del = await fetch(`${API_BASE}/${endpoint}/${item.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
  })
})

describe('v3 /report-templates：每类别一份模板', () => {
  it('同类别重复 POST 为覆盖更新（upsert）', async () => {
    await seedCategory('steel')
    // seedCategory 已自动生成默认模板
    await post('/report-templates', { categoryCode: 'steel', name: 'V2', content: '<p>v2</p>' })
    const list = await (await fetch(`${API_BASE}/report-templates?categoryCode=steel`)).json()
    expect(list.items).toHaveLength(1)
    expect(list.items[0].content).toBe('<p>v2</p>')
  })
})

describe('v3 样品归属接样单 / 检测项归属样品', () => {
  it('样品必须归属存在的接样单；删除接样单级联删样品与检测项', async () => {
    await seedCategory('steel')
    const bad = await post('/samples', { receiptId: 'rc-none', sampleCode: 'S-X' })
    expect(bad.status).toBe(400)
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-CASCADE', categoryCode: 'steel', receivedBy: '王五' })).json()
    const sample = await (await post('/samples', { receiptId: rc.id, sampleCode: 'S-1', brand: 'HRB400E' })).json()
    await post('/test-items', { sampleId: sample.id, parameterCode: 'STE003', result: '425' })
    await fetch(`${API_BASE}/receipts/${rc.id}`, { method: 'DELETE' })
    const samples = await (await fetch(`${API_BASE}/samples?receiptId=${rc.id}`)).json()
    expect(samples.items).toHaveLength(0)
    const items = await (await fetch(`${API_BASE}/test-items?receiptId=${rc.id}`)).json()
    expect(items.items).toHaveLength(0)
  })

  it('GET /test-items?receiptId 经样品 join；样品扩展属性 ext 持久化', async () => {
    await seedCategory('steel', { extFields: [{ key: 'furnaceNo', label: '炉号' }] })
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-JOIN', categoryCode: 'steel', receivedBy: '王五' })).json()
    const sample = await (await post('/samples', { receiptId: rc.id, sampleCode: 'S-1', ext: { furnaceNo: 'LH-01' } })).json()
    expect(sample.ext.furnaceNo).toBe('LH-01')
    await post('/test-items', { sampleId: sample.id, parameterCode: 'P-1', result: '1' })
    const items = await (await fetch(`${API_BASE}/test-items?receiptId=${rc.id}`)).json()
    expect(items.total).toBe(1)
    expect(items.items[0].sampleId).toBe(sample.id)
  })
})

describe('v3 /summary：按报告类别的试验报告汇总表', () => {
  it('material 口径：行=样品，含 牌号/质保编号/厂家/代表数量/报告编号/判定结果', async () => {
    await seedCategory('steel', { summaryType: 'material', summaryName: '钢材试验报告汇总表', extFields: [] })
    await post('/technical-requirements', { code: 'REQ-S', standardCode: 'GB', parameterCode: 'STE003', categoryCode: 'steel', brand: 'HRB400E', comparison: '≥', value: '400', unit: 'MPa' })
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-SUM-1', categoryCode: 'steel', receivedBy: '王五' })).json()
    const sample = await (
      await post('/samples', {
        receiptId: rc.id,
        sampleCode: 'S-1',
        model: '热轧带肋钢筋',
        specification: 'Φ22',
        brand: 'HRB400E',
        ext: { qualityCertNo: 'ZB-118', manufacturer: '陕钢', representQuantity: '60' },
      })
    ).json()
    // 录入合格结果 → syncReceiptResult 自动生成报告编号 → 进入汇总
    await post('/test-items', { sampleId: sample.id, parameterCode: 'STE003', result: '425' })
    const summary = await (await fetch(`${API_BASE}/summary?categoryCode=steel`)).json()
    expect(summary.summaryName).toBe('钢材试验报告汇总表')
    expect(summary.columns.some((c: { key: string }) => c.key === 'brand')).toBe(true)
    expect(summary.rows).toHaveLength(1)
    const row = summary.rows[0]
    expect(row.brand).toBe('HRB400E')
    expect(row.certNo).toBe('ZB-118')
    expect(row.manufacturer).toBe('陕钢')
    expect(row.representQuantity).toBe('60')
    expect(row.reportCode).toBe('R-RC-SUM-1')
    expect(row.result).toBe('合格')
  })

  it('concrete 口径：含 轴线部位/浇筑时间/设计强度等级/实际强度值', async () => {
    await seedCategory('concrete', { summaryType: 'concrete', summaryName: '混凝土抗压汇总表' })
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-SUM-C', categoryCode: 'concrete', receivedBy: '王五' })).json()
    const sample = await (
      await post('/samples', {
        receiptId: rc.id,
        sampleCode: 'S-C1',
        model: 'C30',
        ext: { structuralPart: '3F 柱', castingDate: '2024-05-01', volume: '120' },
      })
    ).json()
    await post('/test-items', { sampleId: sample.id, parameterCode: 'CON002', result: '31.2', passed: true })
    const summary = await (await fetch(`${API_BASE}/summary?categoryCode=concrete`)).json()
    expect(summary.rows).toHaveLength(1)
    const row = summary.rows[0]
    expect(row.structuralPart).toBe('3F 柱')
    expect(row.designGrade).toBe('C30')
    expect(row.strength).toContain('31.2')
  })

  it('connection 口径：含 结构部位/品种规格/对应部位混凝土浇筑时间；支持合同过滤', async () => {
    await seedCategory('rebar_mech', { summaryType: 'connection', summaryName: '机械连接汇总表' })
    const mk = async (contractId: string, code: string) => {
      const rc = await (await post('/receipts', { contractId, commissionCode: code, categoryCode: 'rebar_mech', receivedBy: '王五' })).json()
      const s = await (
        await post('/samples', {
          receiptId: rc.id,
          sampleCode: `${code}-S1`,
          model: '直螺纹套筒连接',
          specification: 'Φ22',
          ext: { structuralPart: '5F 梁柱', concreteCastingDate: '2024-05-10' },
        })
      ).json()
      await post('/test-items', { sampleId: s.id, parameterCode: 'RMK001', result: '575', passed: true })
    }
    await mk('c-A', 'RC-CON-A')
    await mk('c-B', 'RC-CON-B')
    const all = await (await fetch(`${API_BASE}/summary?categoryCode=rebar_mech`)).json()
    expect(all.rows).toHaveLength(2)
    expect(all.rows[0].modelSpec).toContain('直螺纹套筒连接')
    expect(all.rows[0].concreteCastingDate).toBe('2024-05-10')
    const filtered = await (await fetch(`${API_BASE}/summary?categoryCode=rebar_mech&contractId=c-A`)).json()
    expect(filtered.rows).toHaveLength(1)
    expect(filtered.rows[0].reportCode).toBe('R-RC-CON-A')
  })

  it('缺 categoryCode 返回 400；未出报告的接样单不进入汇总', async () => {
    const bad = await fetch(`${API_BASE}/summary`)
    expect(bad.status).toBe(400)
    await seedCategory('sand', { summaryType: 'material' })
    await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-NO-REPORT', categoryCode: 'sand', receivedBy: '王五' })
    const summary = await (await fetch(`${API_BASE}/summary?categoryCode=sand`)).json()
    expect(summary.rows).toHaveLength(0)
  })
})

describe('v3 自动评定：技术要求按 类别+牌号/型号/等级/规格 匹配', () => {
  it('维度冲突的要求被排除（HRB500 样品不命中 HRB400 要求）', async () => {
    await seedCategory('steel')
    await post('/technical-requirements', { code: 'REQ-400', standardCode: 'GB', parameterCode: 'STE001', categoryCode: 'steel', brand: 'HRB400', comparison: '≥', value: '400', unit: 'MPa' })
    await post('/technical-requirements', { code: 'REQ-500', standardCode: 'GB', parameterCode: 'STE001', categoryCode: 'steel', brand: 'HRB500', comparison: '≥', value: '500', unit: 'MPa' })
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-EVAL-B', categoryCode: 'steel', receivedBy: '王五' })).json()
    const sample = await (await post('/samples', { receiptId: rc.id, sampleCode: 'S-500', brand: 'HRB500' })).json()
    // 450 对 HRB500（≥500）不合格；若误匹配 HRB400（≥400）会误判合格
    const item = await (await post('/test-items', { sampleId: sample.id, parameterCode: 'STE001', result: '450' })).json()
    expect(item.requirementCode).toBe('REQ-500')
    expect(item.autoPassed).toBe(false)
  })

  it('range 比较：区间内合格', async () => {
    await seedCategory('sand')
    await post('/technical-requirements', { code: 'REQ-FM', standardCode: 'GB', parameterCode: 'SND001', categoryCode: 'sand', model: '中砂', comparison: 'range', value: '2.3~3.0' })
    const rc = await (await post('/receipts', { contractId: 'c-1', commissionCode: 'RC-RANGE', categoryCode: 'sand', receivedBy: '王五' })).json()
    const sample = await (await post('/samples', { receiptId: rc.id, sampleCode: 'S-SND', model: '中砂' })).json()
    const ok = await (await post('/test-items', { sampleId: sample.id, parameterCode: 'SND001', result: '2.6' })).json()
    expect(ok.autoPassed).toBe(true)
    const bad = await (await post('/test-items', { sampleId: sample.id, parameterCode: 'SND001', result: '3.5' })).json()
    expect(bad.autoPassed).toBe(false)
  })
})
