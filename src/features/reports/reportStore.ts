import { create } from 'zustand'
import type { ReportState } from '../../types/store'
import type { Report, ReportQuery, ReportCreateInput, ReportUpdateInput, ReviewAction } from '../../types/api'
import { apiClient } from '../../api/client'

// extend 批1：报告 store 状态切片（复用 ReportState 类型）
interface ReportStore extends ReportState {
  fetchReports: (query: ReportQuery) => Promise<void>
  fetchReport: (id: string) => Promise<void>
  createReport: (input: ReportCreateInput) => Promise<void>
  updateReport: (id: string, input: ReportUpdateInput) => Promise<void>
  deleteReport: (id: string) => Promise<void>
  reviewReport: (id: string, action: ReviewAction) => Promise<void>
  clearError: () => void
}

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useReportStore = create<ReportStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchReports: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = { page: String(query.page), pageSize: String(query.pageSize) }
      if (query.keyword) params.keyword = query.keyword
      if (query.sampleId) params.sampleId = query.sampleId
      if (query.status) params.status = query.status
      const res = await apiClient.get<{ items: Report[]; total: number }>('/reports', { params })
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  fetchReport: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await apiClient.get<Report>(`/reports/${id}`)
      set({ current: res.data, loading: false, error: null })
    } catch (err) {
      set({ current: null, loading: false, error: extractErrorMessage(err) })
    }
  },

  createReport: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<Report>('/reports', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateReport: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<Report>(`/reports/${id}`, input)
      set({
        list: get().list.map((r) => (r.id === id ? res.data : r)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteReport: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/reports/${id}`)
      set({ list: get().list.filter((r) => r.id !== id), total: Math.max(0, get().total - 1), error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  reviewReport: async (id, action) => {
    set({ error: null })
    try {
      const res = await apiClient.post<Report>(`/reports/${id}/review`, { action })
      set({
        list: get().list.map((r) => (r.id === id ? res.data : r)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
