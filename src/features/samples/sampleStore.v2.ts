import { create } from 'zustand'
import { apiClient } from '../../api/client'

/** Sample 四层模型（v2）——materialType/materialDetails/receiptId/contractId/sampleCode */
export interface SampleV2 {
  id: string
  contractId: string
  receiptId: string
  reportId: string | null
  sampleCode: string
  materialType: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleDescription?: string
  sampleQuantity?: string
  representQuantity?: string
  sampleCondition?: string
  materialDetails: Record<string, unknown>
  status: string
  createdAt: string
  updatedAt: string
  // legacy fallback fields
  projectId?: string
  name?: string
  code?: string
  receivedAt?: string
}

export interface SampleStateV2 {
  list: SampleV2[]
  total: number
  current: SampleV2 | null
  loading: boolean
  error: string | null
}

interface SampleActionsV2 {
  fetchSamples: (query: SampleQueryV2) => Promise<void>
  createSample: (input: SampleCreateInputV2) => Promise<void>
  updateSample: (id: string, input: SampleUpdateInputV2) => Promise<void>
  deleteSample: (id: string) => Promise<void>
  clearError: () => void
}

export type SampleStoreV2 = SampleStateV2 & SampleActionsV2

export interface SampleQueryV2 {
  page: number
  pageSize: number
  keyword?: string
  status?: string
  materialType?: string
  receiptId?: string
  contractId?: string
  projectId?: string
}

export interface SampleCreateInputV2 {
  contractId: string
  receiptId?: string
  sampleCode: string
  materialType: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleQuantity?: string
  representQuantity?: string
  sampleCondition?: string
  materialDetails: Record<string, unknown>
  status?: string
}

export interface SampleUpdateInputV2 {
  contractId?: string
  receiptId?: string
  sampleCode?: string
  materialType?: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleQuantity?: string
  representQuantity?: string
  sampleCondition?: string
  materialDetails?: Record<string, unknown>
  status?: string
}

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useSampleStoreV2 = create<SampleStoreV2>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchSamples: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = {
        page: String(query.page),
        pageSize: String(query.pageSize),
      }
      if (query.keyword) params.keyword = query.keyword
      if (query.status) params.status = query.status
      if (query.materialType) params.materialType = query.materialType
      if (query.receiptId) params.receiptId = query.receiptId
      if (query.contractId) params.contractId = query.contractId
      if (query.projectId) params.projectId = query.projectId
      const res = await apiClient.get<{ items: SampleV2[]; total: number; page: number; pageSize: number }>(
        '/samples',
        { params },
      )
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createSample: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<SampleV2>('/samples', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateSample: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<SampleV2>(`/samples/${id}`, input)
      set({
        list: get().list.map((s) => (s.id === id ? res.data : s)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteSample: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/samples/${id}`)
      set({
        list: get().list.filter((s) => s.id !== id),
        total: Math.max(0, get().total - 1),
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
