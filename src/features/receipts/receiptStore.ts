import { create } from 'zustand'
import type { ReceiptState } from '../../types/store'
import type { SampleReceipt, FlowAction, FlowActionResult, FlowStage } from '../../types/api'
import { apiClient } from '../../api/client'

export interface ReceiptQueryInput {
  page: number
  pageSize: number
  keyword?: string
  categoryCode?: string
  contractId?: string
  /** v2.0：按流程阶段过滤（各阶段页面使用） */
  flowStatus?: FlowStage
  /** v2.0：按最近提交人过滤（撤回视图使用） */
  lastSubmittedBy?: string
}

interface ReceiptActions {
  fetchReceipts: (query: ReceiptQueryInput) => Promise<void>
  createReceipt: (input: {
    contractId: string
    receiptCode: string
    categoryCode: string
    receivedBy: string
    sampleSource: string
    testCategory: string
    receivedDate?: string
    testEnvironment?: string
    mainEquipment?: string
    remark?: string
  }) => Promise<void>
  updateReceipt: (id: string, input: Partial<SampleReceipt>) => Promise<void>
  deleteReceipt: (id: string) => Promise<void>
  /** v2.0：流程操作——提交（前进）/退回（后退）/撤回（提交人收回），均支持批量 */
  flowAction: (action: FlowAction, ids: string[], operator: string, reason?: string) => Promise<FlowActionResult[]>
  clearError: () => void
}

export type ReceiptStore = ReceiptState & ReceiptActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useReceiptStore = create<ReceiptStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchReceipts: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = {
        page: String(query.page),
        pageSize: String(query.pageSize),
      }
      if (query.keyword) params.keyword = query.keyword
      if (query.categoryCode) params.categoryCode = query.categoryCode
      if (query.contractId) params.contractId = query.contractId
      if (query.flowStatus) params.flowStatus = query.flowStatus
      if (query.lastSubmittedBy) params.lastSubmittedBy = query.lastSubmittedBy
      const res = await apiClient.get<{ items: SampleReceipt[]; total: number; page: number; pageSize: number }>(
        '/receipts',
        { params },
      )
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createReceipt: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<SampleReceipt>('/receipts', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateReceipt: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<SampleReceipt>(`/receipts/${id}`, input)
      set({
        list: get().list.map((r) => (r.id === id ? res.data : r)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteReceipt: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/receipts/${id}`)
      set({
        list: get().list.filter((r) => r.id !== id),
        total: Math.max(0, get().total - 1),
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  flowAction: async (action, ids, operator, reason) => {
    set({ error: null })
    try {
      const res = await apiClient.post<{ results: FlowActionResult[] }>('/receipts/flow', {
        action,
        ids,
        operator,
        reason,
      })
      const failed = res.data.results.filter((r) => !r.ok)
      if (failed.length > 0) {
        set({ error: failed.map((f) => f.message).join('；') })
      }
      return res.data.results
    } catch (err) {
      set({ error: extractErrorMessage(err) })
      return ids.map((id) => ({ id, ok: false, message: extractErrorMessage(err) }))
    }
  },

  clearError: () => set({ error: null }),
}))
