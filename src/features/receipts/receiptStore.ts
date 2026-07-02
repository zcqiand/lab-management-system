import { create } from 'zustand'
import type { ReceiptState } from '../../types/store'
import type { SampleReceipt } from '../../types/api'
import { apiClient } from '../../api/client'

interface ReceiptActions {
  fetchReceipts: (query: { page: number; pageSize: number; keyword?: string; status?: string }) => Promise<void>
  createReceipt: (input: {
    contractId: string
    receiptCode: string
    receivedBy: string
    sampleSource: string
    testCategory: string
  }) => Promise<void>
  updateReceipt: (id: string, input: Partial<SampleReceipt>) => Promise<void>
  deleteReceipt: (id: string) => Promise<void>
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
      if (query.status) params.status = query.status
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

  clearError: () => set({ error: null }),
}))
