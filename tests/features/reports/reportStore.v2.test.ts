import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { contractTable, receiptTable, reportTable, resetMockDb } from '../../../msw/db'
import { server } from '../../../msw/server'
import { useReportStoreV2 } from '../../../src/features/reports/reportStore.v2'
import { resetApiClient, setToken } from '../../../src/api/client'

beforeEach(() => {
  resetMockDb()
  resetApiClient()
  setToken('mock-token')
  useReportStoreV2.setState({ list: [], total: 0, current: null, loading: false, error: null })
})

describe('reportStore.v2', () => {
  describe('initial state', () => {
    it('has empty list and null current', () => {
      const s = useReportStoreV2.getState()
      expect(s.list).toEqual([])
      expect(s.total).toBe(0)
      expect(s.current).toBeNull()
      expect(s.loading).toBe(false)
      expect(s.error).toBeNull()
    })
  })

  describe('fetchReports', () => {
    beforeEach(() => {
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
      })
    })

    it('populates list and total on success', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })
      reportTable.insert({
        id: 'report-cement-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0502-001',
        reportDate: '2024-05-05',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-cement-001',
        title: 'R-2024-0502-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(2)
      expect(s.total).toBe(2)
      expect(s.loading).toBe(false)
      expect(s.error).toBeNull()
    })

    it('filters by keyword (reportCode)', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })
      reportTable.insert({
        id: 'report-cement-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0502-001',
        reportDate: '2024-05-05',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-cement-001',
        title: 'R-2024-0502-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10, keyword: '0501' })

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(1)
      expect(s.list[0].reportCode).toBe('R-2024-0501-001')
    })

    it('filters by status', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })
      reportTable.insert({
        id: 'report-cement-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0502-001',
        reportDate: '2024-05-05',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-cement-001',
        title: 'R-2024-0502-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10, status: 'issued' })

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(1)
      expect(s.list[0].status).toBe('issued')
    })

    it('filters by materialType', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })
      reportTable.insert({
        id: 'report-cement-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0502-001',
        reportDate: '2024-05-05',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-cement-001',
        title: 'R-2024-0502-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10, materialType: 'steel' })

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(1)
      expect(s.list[0].materialType).toBe('steel')
    })

    it('returns empty list when no reports', async () => {
      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })
      const s = useReportStoreV2.getState()
      expect(s.list).toEqual([])
      expect(s.total).toBe(0)
    })
  })

  describe('fetchReports error handling', () => {
    it('sets error on network failure', async () => {
      server.use(
        http.get('*/reports', () => {
          return HttpResponse.json({ message: 'Network error' }, { status: 500 })
        }),
      )
      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })
      const s = useReportStoreV2.getState()
      expect(s.error).toBeTruthy()
    })
  })

  describe('createReport', () => {
    beforeEach(() => {
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
      })
    })

    it('appends new report to list', async () => {
      reportTable.insert({
        id: 'report-existing-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })

      await useReportStoreV2.getState().createReport({
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0503-001',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
      })

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(2)
      expect(s.total).toBe(2)
      expect(s.list.some((r) => r.reportCode === 'R-2024-0503-001')).toBe(true)
    })
  })

  describe('updateReport', () => {
    beforeEach(() => {
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
      })
    })

    it('syncs updated report in list', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })

      await useReportStoreV2.getState().updateReport('report-steel-001', {
        conclusion: '不合格',
        status: 'issued',
      })

      const s = useReportStoreV2.getState()
      const updated = s.list.find((r) => r.id === 'report-steel-001')
      expect(updated?.conclusion).toBe('不合格')
      expect(updated?.status).toBe('issued')
    })
  })

  describe('deleteReport', () => {
    beforeEach(() => {
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
      })
    })

    it('removes report from list', async () => {
      reportTable.insert({
        id: 'report-steel-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0501-001',
        reportDate: '2024-05-04',
        materialType: 'steel',
        sampleIds: ['sample-steel-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'issued',
        issuedAt: '2024-05-05T10:00:00Z',
        sampleId: 'sample-steel-001',
        title: 'R-2024-0501-001',
      })
      reportTable.insert({
        id: 'report-cement-001',
        contractId: 'contract-bj-001',
        receiptId: 'receipt-001',
        reportCode: 'R-2024-0502-001',
        reportDate: '2024-05-05',
        materialType: 'cement',
        sampleIds: ['sample-cement-001'],
        conclusion: '合格',
        result: 'pass',
        remark: '',
        status: 'draft',
        issuedAt: null,
        sampleId: 'sample-cement-001',
        title: 'R-2024-0502-001',
      })

      await useReportStoreV2.getState().fetchReports({ page: 1, pageSize: 10 })
      expect(useReportStoreV2.getState().list).toHaveLength(2)

      await useReportStoreV2.getState().deleteReport('report-steel-001')

      const s = useReportStoreV2.getState()
      expect(s.list).toHaveLength(1)
      expect(s.list.find((r) => r.id === 'report-steel-001')).toBeUndefined()
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      useReportStoreV2.setState({ error: 'some error' })
      useReportStoreV2.getState().clearError()
      expect(useReportStoreV2.getState().error).toBeNull()
    })
  })
})
