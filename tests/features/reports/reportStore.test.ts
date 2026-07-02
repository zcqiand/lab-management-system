import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useReportStore } from '../../../src/features/reports/reportStore'
import { resetApiClient, setToken } from '../../../src/api/client'

const API_BASE = 'http://localhost/api'

async function seed(n: number) {
  for (let i = 0; i < n; i++) {
    await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: `s-${i}`, title: `报告${i}`, conclusion: '合格' }),
    })
  }
}

beforeEach(() => {
  localStorage.clear()
  useReportStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
  setToken('mock-token')
})

describe('reportStore', () => {
  it('初始状态', () => {
    const s = useReportStore.getState()
    expect(s.list).toEqual([])
    expect(s.total).toBe(0)
    expect(s.loading).toBe(false)
  })

  it('fetchReports 成功填充 list/total', async () => {
    await seed(3)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const s = useReportStore.getState()
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(3)
  })

  it('fetchReports sampleId 筛选', async () => {
    await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: 's-filter', title: 'A' }),
    })
    await seed(2)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10, sampleId: 's-filter' })
    expect(useReportStore.getState().list).toHaveLength(1)
  })

  it('fetchReports status 筛选', async () => {
    const created = await (await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: 's-1', title: '待审核' }),
    })).json()
    await fetch(`${API_BASE}/reports/${created.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    })
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10, status: 'reviewing' })
    expect(useReportStore.getState().list.every((r) => r.status === 'reviewing')).toBe(true)
  })

  it('fetchReport(id) 填充 current', async () => {
    const created = await (await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: 's-1', title: '详情' }),
    })).json()
    await useReportStore.getState().fetchReport(created.id)
    expect(useReportStore.getState().current?.id).toBe(created.id)
  })

  it('createReport 成功追加 list', async () => {
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    await useReportStore.getState().createReport({ sampleId: 's-1', title: '新建报告' })
    expect(useReportStore.getState().list.some((r) => r.title === '新建报告')).toBe(true)
  })

  it('updateReport 成功同步 list', async () => {
    await seed(1)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const target = useReportStore.getState().list[0]
    await useReportStore.getState().updateReport(target.id, { title: '已改', conclusion: '不合格' })
    const updated = useReportStore.getState().list.find((r) => r.id === target.id)
    expect(updated?.title).toBe('已改')
    expect(updated?.conclusion).toBe('不合格')
  })

  it('deleteReport 成功移除', async () => {
    await seed(2)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const target = useReportStore.getState().list[0]
    await useReportStore.getState().deleteReport(target.id)
    expect(useReportStore.getState().list.some((r) => r.id === target.id)).toBe(false)
  })

  it('reviewReport submit: draft → reviewing', async () => {
    await seed(1)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const target = useReportStore.getState().list[0]
    await useReportStore.getState().reviewReport(target.id, 'submit')
    const updated = useReportStore.getState().list.find((r) => r.id === target.id)
    expect(updated?.status).toBe('reviewing')
  })

  it('reviewReport approve: reviewing → issued', async () => {
    await seed(1)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const target = useReportStore.getState().list[0]
    await useReportStore.getState().reviewReport(target.id, 'submit')
    await useReportStore.getState().reviewReport(target.id, 'approve')
    const updated = useReportStore.getState().list.find((r) => r.id === target.id)
    expect(updated?.status).toBe('issued')
    expect(updated?.issuedAt).toBeTruthy()
  })

  it('reviewReport 非法转换设 error', async () => {
    await seed(1)
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    const target = useReportStore.getState().list[0]
    // draft 上直接 approve 非法
    await useReportStore.getState().reviewReport(target.id, 'approve')
    expect(useReportStore.getState().error).toBeTruthy()
  })

  it('fetchReports 网络错误后 error', async () => {
    server.use(http.get('*/reports', () => HttpResponse.error()))
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    expect(useReportStore.getState().error).toBeTruthy()
  })

  it('clearError', async () => {
    server.use(http.get('*/reports', () => HttpResponse.error()))
    await useReportStore.getState().fetchReports({ page: 1, pageSize: 10 })
    useReportStore.getState().clearError()
    expect(useReportStore.getState().error).toBeNull()
  })
})
