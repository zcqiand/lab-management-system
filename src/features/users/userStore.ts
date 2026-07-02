import { create } from 'zustand'
import type { UserRecord, UserQuery, UserCreateInput, UserUpdateInput } from '../../types/api'
import { apiClient } from '../../api/client'

interface UserState {
  list: UserRecord[]
  total: number
  current: UserRecord | null
  loading: boolean
  error: string | null
}

interface UserActions {
  fetchUsers: (query: UserQuery) => Promise<void>
  createUser: (input: UserCreateInput) => Promise<void>
  updateUser: (id: string, input: UserUpdateInput) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  clearError: () => void
}

export type UserStore = UserState & UserActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useUserStore = create<UserStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchUsers: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = { page: String(query.page), pageSize: String(query.pageSize) }
      if (query.keyword) params.keyword = query.keyword
      if (query.role) params.role = query.role
      if (query.status) params.status = query.status
      const res = await apiClient.get<{ items: UserRecord[]; total: number }>('/users', { params })
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createUser: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<UserRecord>('/users', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateUser: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<UserRecord>(`/users/${id}`, input)
      set({ list: get().list.map((u) => (u.id === id ? res.data : u)), error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteUser: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/users/${id}`)
      set({ list: get().list.filter((u) => u.id !== id), total: Math.max(0, get().total - 1), error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
