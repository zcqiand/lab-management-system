import { create } from 'zustand'
import type { ReportStateV2 } from '../../types/store'
import type { ReportRecord } from '../../types/api'
import { apiClient } from '../../api/client'

interface ReportActionsV2 {
  fetchReports: (query: ReportQueryV2) => Promise<void>
  createReport: (input: ReportCreateInputV2) => Promise<void>
  updateReport: (id: string, input: ReportUpdateInputV2) => Promise<void>
  deleteReport: (id: string) => Promise<void>
  clearError: () => void
}

export type ReportStoreV2 = ReportStateV2 & ReportActionsV2

export interface ReportQueryV2 {
  page: number
  pageSize: number
  keyword?: string
  status?: string
  materialType?: string
  sampleId?: string
  contractId?: string
}

export interface ReportCreateInputV2 {
  contractId: string
  receiptId: string
  reportCode: string
  materialType: string
  sampleIds: string[]
  conclusion?: string
  reportDate?: string
  result?: 'pass' | 'fail'
}

export interface ReportUpdateInputV2 {
  reportCode?: string
  conclusion?: string
  status?: string
  result?: 'pass' | 'fail'
  remark?: string
  materialType?: string
  sampleIds?: string[]
}

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return 'Operation failed'
}

export const useReportStoreV2 = create<ReportStoreV2>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchReports: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = {
        page: String(query.page),
        pageSize: String(query.pageSize),
      }
      if (query.keyword) params.keyword = query.keyword
      if (query.status) params.status = query.status
      if (query.materialType) params.materialType = query.materialType
      if (query.sampleId) params.sampleId = query.sampleId
      if (query.contractId) params.contractId = query.contractId
      const res = await apiClient.get<{ items: ReportRecord[]; total: number; page: number; pageSize: number }>(
        '/reports',
        { params },
      )
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createReport: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<ReportRecord>('/reports', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateReport: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<ReportRecord>(`/reports/${id}`, input)
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
