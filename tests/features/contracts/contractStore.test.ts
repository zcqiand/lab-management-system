import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useContractStore } from '../../../src/features/contracts/contractStore'
import { resetApiClient } from '../../../src/api/client'
import { contractTable } from '../../../msw/db'

beforeEach(() => {
  localStorage.clear()
  contractTable.reset()
  useContractStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

function insertContract(overrides: Partial<{
  id: string
  contractCode: string
  clientUnit: string
  projectName: string
  constructionUnit: string
  witnessUnit: string
  witness: string
  status: 'active' | 'archived'
}> = {}) {
  contractTable.insert({
    id: overrides.id ?? `contract-${Math.random().toString(36).slice(2, 8)}`,
    contractCode: overrides.contractCode ?? 'BJ-TEST-001',
    clientUnit: overrides.clientUnit ?? 'XX 建设集团',
    projectName: overrides.projectName ?? '滨江一号一期',
    constructionUnit: overrides.constructionUnit ?? '中建 XX 局',
    witnessUnit: overrides.witnessUnit ?? 'XX 监理公司',
    witness: overrides.witness ?? '张工',
    status: overrides.status ?? 'active',
  })
}

describe('contractStore 状态流转', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useContractStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchContracts 成功后 list/total 填充，loading 流转', async () => {
    insertContract({ contractCode: 'C-001' })
    insertContract({ contractCode: 'C-002' })
    insertContract({ contractCode: 'C-003' })
    const promise = useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    expect(useContractStore.getState().loading).toBe(true)
    await promise
    const s = useContractStore.getState()
    expect(s.loading).toBe(false)
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(3)
    expect(s.error).toBeNull()
  })

  it('fetchContracts 支持 keyword 搜索', async () => {
    insertContract({ contractCode: 'C-KEYWORD-XYZ', projectName: 'keyword-project' })
    insertContract({ contractCode: 'C-OTHER', projectName: 'other-project' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10, keyword: 'XYZ' })
    const s = useContractStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].contractCode).toContain('XYZ')
  })

  it('fetchContracts 支持 status 过滤（active）', async () => {
    insertContract({ contractCode: 'C-STATUS-1', status: 'active' })
    insertContract({ contractCode: 'C-STATUS-2', status: 'archived' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10, status: 'active' })
    const s = useContractStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].status).toBe('active')
  })

  it('fetchContracts 支持 status 过滤（archived）', async () => {
    insertContract({ contractCode: 'C-STATUS-3', status: 'archived' })
    insertContract({ contractCode: 'C-STATUS-4', status: 'active' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10, status: 'archived' })
    const s = useContractStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].status).toBe('archived')
  })

  it('fetchContracts 空列表场景', async () => {
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    const s = useContractStore.getState()
    expect(s.list).toHaveLength(0)
    expect(s.total).toBe(0)
    expect(s.loading).toBe(false)
  })

  it('fetchContracts 网络错误后 error 填充', async () => {
    server.use(http.get('*/contracts', () => HttpResponse.error()))
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    const s = useContractStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeTruthy()
    expect(s.list).toEqual([])
  })

  it('clearError 清除 error', async () => {
    server.use(http.get('*/contracts', () => HttpResponse.error()))
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    expect(useContractStore.getState().error).toBeTruthy()
    useContractStore.getState().clearError()
    expect(useContractStore.getState().error).toBeNull()
  })

  it('createContract 成功后追加到 list', async () => {
    insertContract({ contractCode: 'C-SEED-001' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    await useContractStore.getState().createContract({
      contractCode: 'C-NEW-001',
      clientUnit: '新建设公司',
      projectName: '新城项目',
      constructionUnit: '新建筑公司',
      witnessUnit: '新监理公司',
      witness: '李工',
    })
    const s = useContractStore.getState()
    expect(s.list.some((c) => c.contractCode === 'C-NEW-001')).toBe(true)
    expect(s.total).toBe(2)
  })

  it('createContract 失败后 error 填充', async () => {
    server.use(http.post('*/contracts', () => HttpResponse.error()))
    await useContractStore.getState().createContract({
      contractCode: 'C-ERR-001',
      clientUnit: 'err-client',
      projectName: 'err-project',
      constructionUnit: 'err-construction',
      witnessUnit: 'err-witness',
      witness: 'err-witness',
    })
    const s = useContractStore.getState()
    expect(s.error).toBeTruthy()
  })

  it('updateContract 成功后 list 中对应项更新', async () => {
    insertContract({ id: 'contract-update-test', contractCode: 'C-UPD-001' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    const target = useContractStore.getState().list[0]
    await useContractStore.getState().updateContract(target.id, { witness: '王工', status: 'archived' })
    const s = useContractStore.getState()
    const updated = s.list.find((c) => c.id === target.id)
    expect(updated?.witness).toBe('王工')
    expect(updated?.status).toBe('archived')
  })

  it('updateContract 不存在时 error 填充', async () => {
    await useContractStore.getState().updateContract('nonexistent', { witness: 'x' })
    expect(useContractStore.getState().error).toBeTruthy()
  })

  it('deleteContract 成功后从 list 移除', async () => {
    insertContract({ id: 'contract-del-1', contractCode: 'C-DEL-1' })
    insertContract({ id: 'contract-del-2', contractCode: 'C-DEL-2' })
    await useContractStore.getState().fetchContracts({ page: 1, pageSize: 10 })
    const target = useContractStore.getState().list[0]
    await useContractStore.getState().deleteContract(target.id)
    const s = useContractStore.getState()
    expect(s.list.some((c) => c.id === target.id)).toBe(false)
    expect(s.total).toBe(1)
  })

  it('deleteContract 不存在时 error 填充', async () => {
    await useContractStore.getState().deleteContract('nonexistent')
    expect(useContractStore.getState().error).toBeTruthy()
  })
})
