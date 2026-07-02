import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useReceiptStore } from '../../../src/features/receipts/receiptStore'
import { resetApiClient } from '../../../src/api/client'
import { receiptTable } from '../../../msw/db'

beforeEach(() => {
  localStorage.clear()
  receiptTable.reset()
  useReceiptStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

function insertReceipt(overrides: Partial<{
  id: string; contractId: string; receiptCode: string; receivedBy: string;
  sampleSource: string; testCategory: string; status: string
}> = {}) {
  receiptTable.insert({
    id: overrides.id ?? `rc-${Math.random().toString(36).slice(2, 8)}`,
    contractId: overrides.contractId ?? 'contract-bj-001',
    receiptCode: overrides.receiptCode ?? 'RC-TEST-001',
    receivedDate: '2024-05-03',
    receivedBy: overrides.receivedBy ?? '王五',
    sampleSource: overrides.sampleSource ?? '施工送检',
    testCategory: overrides.testCategory ?? '委托检验',
    remark: '',
    status: (overrides.status as 'received' | 'testing' | 'completed' | 'rejected') ?? 'received',
  })
}

describe('receiptStore 状态流转', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useReceiptStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchReceipts 成功后 list/total 填充，loading 流转', async () => {
    insertReceipt({ receiptCode: 'RC-001' })
    insertReceipt({ receiptCode: 'RC-002' })
    insertReceipt({ receiptCode: 'RC-003' })
    const promise = useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    expect(useReceiptStore.getState().loading).toBe(true)
    await promise
    const s = useReceiptStore.getState()
    expect(s.loading).toBe(false)
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(3)
    expect(s.error).toBeNull()
  })

  it('fetchReceipts 支持 keyword 搜索', async () => {
    insertReceipt({ receiptCode: 'RC-KEYWORD-XYZ' })
    insertReceipt({ receiptCode: 'RC-OTHER' })
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10, keyword: 'XYZ' })
    const s = useReceiptStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].receiptCode).toContain('XYZ')
  })

  it('fetchReceipts 支持 status 过滤', async () => {
    insertReceipt({ receiptCode: 'RC-STATUS-1', status: 'completed' })
    insertReceipt({ receiptCode: 'RC-STATUS-2', status: 'received' })
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10, status: 'completed' })
    const s = useReceiptStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].status).toBe('completed')
  })

  it('fetchReceipts 空列表场景', async () => {
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    const s = useReceiptStore.getState()
    expect(s.list).toHaveLength(0)
    expect(s.total).toBe(0)
    expect(s.loading).toBe(false)
  })

  it('fetchReceipts 网络错误后 error 填充', async () => {
    server.use(http.get('*/receipts', () => HttpResponse.error()))
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    const s = useReceiptStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeTruthy()
    expect(s.list).toEqual([])
  })

  it('createReceipt 成功后追加到 list', async () => {
    insertReceipt({ receiptCode: 'RC-SEED-001' })
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    await useReceiptStore.getState().createReceipt({
      contractId: 'contract-bj-001',
      receiptCode: 'RC-NEW-001',
      receivedBy: '王五',
      sampleSource: '施工送检',
      testCategory: '委托检验',
    })
    const s = useReceiptStore.getState()
    expect(s.list.some((r) => r.receiptCode === 'RC-NEW-001')).toBe(true)
    expect(s.total).toBe(2)
  })

  it('createReceipt 失败（缺字段）后 error 填充', async () => {
    await useReceiptStore.getState().createReceipt({
      contractId: '',
      receiptCode: '',
      receivedBy: '',
      sampleSource: '',
      testCategory: '',
    })
    const s = useReceiptStore.getState()
    expect(s.error).toBeTruthy()
  })

  it('updateReceipt 成功后 list 中对应项更新', async () => {
    insertReceipt({ id: 'rc-update-test', receiptCode: 'RC-UPD-001' })
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    const target = useReceiptStore.getState().list[0]
    await useReceiptStore.getState().updateReceipt(target.id, { receivedBy: '李四', status: 'testing' })
    const s = useReceiptStore.getState()
    const updated = s.list.find((r) => r.id === target.id)
    expect(updated?.receivedBy).toBe('李四')
    expect(updated?.status).toBe('testing')
  })

  it('updateReceipt 不存在时 error 填充', async () => {
    await useReceiptStore.getState().updateReceipt('nonexistent', { receivedBy: 'x' })
    expect(useReceiptStore.getState().error).toBeTruthy()
  })

  it('deleteReceipt 成功后从 list 移除', async () => {
    insertReceipt({ id: 'rc-del-1', receiptCode: 'RC-DEL-1' })
    insertReceipt({ id: 'rc-del-2', receiptCode: 'RC-DEL-2' })
    await useReceiptStore.getState().fetchReceipts({ page: 1, pageSize: 10 })
    const target = useReceiptStore.getState().list[0]
    await useReceiptStore.getState().deleteReceipt(target.id)
    const s = useReceiptStore.getState()
    expect(s.list.some((r) => r.id === target.id)).toBe(false)
    expect(s.total).toBe(1)
  })

  it('deleteReceipt 不存在时 error 填充', async () => {
    await useReceiptStore.getState().deleteReceipt('nonexistent')
    expect(useReceiptStore.getState().error).toBeTruthy()
  })

  it('clearError 清除 error', async () => {
    await useReceiptStore.getState().deleteReceipt('nonexistent')
    expect(useReceiptStore.getState().error).toBeTruthy()
    useReceiptStore.getState().clearError()
    expect(useReceiptStore.getState().error).toBeNull()
  })
})
