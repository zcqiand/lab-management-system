import { create } from 'zustand'
import type { RoleRecord, RoleQuery, RoleCreateInput, RoleUpdateInput } from '../../types/api'
import { apiClient } from '../../api/client'

interface RoleState {
  list: RoleRecord[]
  total: number
  current: RoleRecord | null
  loading: boolean
  error: string | null
}

interface RoleActions {
  fetchRoles: (query: RoleQuery) => Promise<void>
  createRole: (input: RoleCreateInput) => Promise<void>
  updateRole: (id: string, input: RoleUpdateInput) => Promise<void>
  deleteRole: (id: string) => Promise<void>
  clearError: () => void
}

export type RoleStore = RoleState & RoleActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useRoleStore = create<RoleStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchRoles: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = { page: String(query.page), pageSize: String(query.pageSize) }
      if (query.keyword) params.keyword = query.keyword
      const res = await apiClient.get<{ items: RoleRecord[]; total: number }>('/roles', { params })
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createRole: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<RoleRecord>('/roles', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateRole: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<RoleRecord>(`/roles/${id}`, input)
      set({ list: get().list.map((r) => (r.id === id ? res.data : r)), error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteRole: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/roles/${id}`)
      set({ list: get().list.filter((r) => r.id !== id), total: Math.max(0, get().total - 1), error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
