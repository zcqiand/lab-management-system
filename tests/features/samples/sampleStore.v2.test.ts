import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useSampleStoreV2 } from '../../../src/features/samples/sampleStore.v2'
import { resetApiClient } from '../../../src/api/client'
import { contractTable, receiptTable, sampleTable, resetMockDb } from '../../../msw/db'

beforeEach(() => {
  localStorage.clear()
  resetMockDb()
  contractTable.insert({
    id: 'contract-bj-001',
    contractCode: 'BJ-2024-001',
    clientUnit: 'XX 建设',
    projectName: '滨江',
    constructionUnit: '中建',
    witnessUnit: '监理',
    witness: '张工',
    status: 'active',
  })
  receiptTable.insert({
    id: 'receipt-001',
    contractId: 'contract-bj-001',
    receiptCode: 'RC-001',
    receivedDate: '2024-05-03',
    receivedBy: '王五',
    sampleSource: '施工送检',
    testCategory: '委托检验',
    remark: '',
    status: 'received',
    flowStatus: 'receiving',
    flowHistory: [],
    lastSubmittedBy: null,
  })
  sampleTable.insert({
    id: 'sample-steel-001',
    contractId: 'contract-bj-001',
    receiptId: 'receipt-001',
    reportId: null,
    sampleCode: 'ST-001',
    materialType: 'steel',
    sampleName: '钢筋',
    sampleType: '热轧带肋 HRB400',
    specification: 'Φ22',
    sampleGrade: 'HRB400',
    manufacturer: '沙钢集团',
    sampleQuantity: '3 根',
    representQuantity: '60t',
    materialDetails: { kind: 'steel', steelGrade: 'HRB400', nominalDiameter: 22, heatNumber: 'SG-2024-0512' },
    status: 'completed',
    projectId: 'contract-bj-001',
    name: '钢筋',
    code: 'ST-001',
    receivedAt: '2024-05-03',
  })
  useSampleStoreV2.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('sampleStore.v2 状态流转', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useSampleStoreV2.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchSamples 成功后 list/total 填充', async () => {
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(1)
    expect(s.total).toBe(1)
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchSamples 支持 materialType 过滤', async () => {
    sampleTable.insert({
      id: 'sample-cement-001',
      contractId: 'contract-bj-001',
      receiptId: 'receipt-001',
      reportId: null,
      sampleCode: 'CE-001',
      materialType: 'cement',
      sampleName: '水泥',
      materialDetails: { kind: 'cement', cementType: 'P.O' },
      status: 'pending',
      projectId: 'contract-bj-001',
      name: '水泥',
      code: 'CE-001',
      receivedAt: '2024-05-03',
    })
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10, materialType: 'steel' })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].materialType).toBe('steel')
    expect(s.list[0].sampleCode).toBe('ST-001')
    expect(s.list[0].materialDetails).toEqual({ kind: 'steel', steelGrade: 'HRB400', nominalDiameter: 22, heatNumber: 'SG-2024-0512' })
  })

  it('fetchSamples 支持 keyword 搜索', async () => {
    sampleTable.insert({
      id: 'sample-sand-001',
      contractId: 'contract-bj-001',
      receiptId: 'receipt-001',
      reportId: null,
      sampleCode: 'SA-001',
      materialType: 'sand',
      sampleName: '砂',
      materialDetails: { kind: 'sand' },
      status: 'pending',
      projectId: 'contract-bj-001',
      name: '砂',
      code: 'SA-001',
      receivedAt: '2024-05-03',
    })
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10, keyword: 'ST-001' })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].sampleCode).toBe('ST-001')
  })

  it('fetchSamples 支持 receiptId 过滤', async () => {
    receiptTable.insert({
      id: 'receipt-002',
      contractId: 'contract-bj-001',
      receiptCode: 'RC-002',
      receivedDate: '2024-05-04',
      receivedBy: '李四',
      sampleSource: '施工送检',
      testCategory: '委托检验',
      remark: '',
      status: 'received',
      flowStatus: 'receiving',
      flowHistory: [],
      lastSubmittedBy: null,
    })
    sampleTable.insert({
      id: 'sample-concrete-001',
      contractId: 'contract-bj-001',
      receiptId: 'receipt-002',
      reportId: null,
      sampleCode: 'CO-001',
      materialType: 'concrete',
      sampleName: '混凝土试块',
      materialDetails: { kind: 'concrete', pourDate: '2024-04-25', ageDays: 28 },
      status: 'pending',
      projectId: 'contract-bj-001',
      name: '混凝土试块',
      code: 'CO-001',
      receivedAt: '2024-05-04',
    })
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10, receiptId: 'receipt-001' })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].receiptId).toBe('receipt-001')
    expect(s.list[0].sampleCode).toBe('ST-001')
  })

  it('fetchSamples 空列表场景', async () => {
    sampleTable.reset()
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(0)
    expect(s.total).toBe(0)
    expect(s.loading).toBe(false)
  })

  it('fetchSamples 网络错误后 error 填充', async () => {
    server.use(http.get('*/samples', () => HttpResponse.error()))
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    const s = useSampleStoreV2.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeTruthy()
    expect(s.list).toEqual([])
  })

  it('createSample 成功后追加到 list', async () => {
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    await useSampleStoreV2.getState().createSample({
      contractId: 'contract-bj-001',
      receiptId: 'receipt-001',
      sampleCode: 'ST-NEW',
      materialType: 'steel',
      materialDetails: { kind: 'steel', steelGrade: 'HRB400', nominalDiameter: 18 },
      sampleName: '新钢筋',
    })
    const s = useSampleStoreV2.getState()
    expect(s.list.some((item) => item.sampleCode === 'ST-NEW')).toBe(true)
    expect(s.total).toBe(2)
    const created = s.list.find((item) => item.sampleCode === 'ST-NEW')
    expect(created?.materialType).toBe('steel')
    expect(created?.materialDetails).toEqual({ kind: 'steel', steelGrade: 'HRB400', nominalDiameter: 18 })
  })

  it('createSample 失败（缺字段）后 error 填充', async () => {
    await useSampleStoreV2.getState().createSample({
      contractId: '',
      sampleCode: '',
      materialType: 'steel',
      materialDetails: { kind: 'steel' },
    })
    expect(useSampleStoreV2.getState().error).toBeTruthy()
  })

  it('updateSample 成功后 list 中对应项更新', async () => {
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    const target = useSampleStoreV2.getState().list[0]
    await useSampleStoreV2.getState().updateSample(target.id, {
      status: 'testing',
      sampleName: '已改名',
    })
    const s = useSampleStoreV2.getState()
    const updated = s.list.find((item) => item.id === target.id)
    expect(updated?.status).toBe('testing')
    expect(updated?.sampleName).toBe('已改名')
    expect(updated?.materialType).toBe('steel')
  })

  it('updateSample 不存在时 error 填充', async () => {
    await useSampleStoreV2.getState().updateSample('nonexistent', { status: 'testing' })
    expect(useSampleStoreV2.getState().error).toBeTruthy()
  })

  it('deleteSample 成功后从 list 移除', async () => {
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 10 })
    expect(useSampleStoreV2.getState().list).toHaveLength(1)
    const target = useSampleStoreV2.getState().list[0]
    await useSampleStoreV2.getState().deleteSample(target.id)
    const s = useSampleStoreV2.getState()
    expect(s.list.some((item) => item.id === target.id)).toBe(false)
    expect(s.total).toBe(0)
  })

  it('deleteSample 不存在时 error 填充', async () => {
    await useSampleStoreV2.getState().deleteSample('nonexistent')
    expect(useSampleStoreV2.getState().error).toBeTruthy()
  })

  it('clearError 清除 error', async () => {
    await useSampleStoreV2.getState().deleteSample('nonexistent')
    expect(useSampleStoreV2.getState().error).toBeTruthy()
    useSampleStoreV2.getState().clearError()
    expect(useSampleStoreV2.getState().error).toBeNull()
  })

  it('fetchSamples 分页场景', async () => {
    for (let i = 0; i < 5; i++) {
      sampleTable.insert({
        id: `sample-page-${i}`,
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportId: null,
        sampleCode: `SP-${i}`,
        materialType: 'steel',
        sampleName: `样品${i}`,
        materialDetails: { kind: 'steel' },
        status: 'pending',
        projectId: 'contract-bj-001',
        name: `样品${i}`,
        code: `SP-${i}`,
        receivedAt: '2024-05-03',
      })
    }
    await useSampleStoreV2.getState().fetchSamples({ page: 1, pageSize: 3 })
    const s = useSampleStoreV2.getState()
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(6)
  })
})
