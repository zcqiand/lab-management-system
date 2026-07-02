import { create } from 'zustand'
import type { TaskState } from '../../types/store'
import type { TaskRecord, TaskQuery, TaskCreateInput, TaskUpdateInput } from '../../types/api'
import { apiClient } from '../../api/client'

interface TaskActions {
  fetchTasks: (query: TaskQuery) => Promise<void>
  createTask: (input: TaskCreateInput) => Promise<void>
  updateTask: (id: string, input: TaskUpdateInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  clearError: () => void
}

export type TaskStore = TaskState & TaskActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchTasks: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = {
        page: String(query.page),
        pageSize: String(query.pageSize),
      }
      if (query.keyword) params.keyword = query.keyword
      if (query.status) params.status = query.status
      if (query.sampleId) params.sampleId = query.sampleId
      if (query.assigneeId) params.assigneeId = query.assigneeId
      const res = await apiClient.get<{ items: TaskRecord[]; total: number; page: number; pageSize: number }>(
        '/tasks',
        { params },
      )
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createTask: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<TaskRecord>('/tasks', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateTask: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<TaskRecord>(`/tasks/${id}`, input)
      set({
        list: get().list.map((t) => (t.id === id ? res.data : t)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteTask: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/tasks/${id}`)
      set({
        list: get().list.filter((t) => t.id !== id),
        total: Math.max(0, get().total - 1),
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
