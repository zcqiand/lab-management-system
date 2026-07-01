import { create } from 'zustand'
import type { ProjectState } from '../../types/store'
import type { Project, ProjectQuery, ProjectCreateInput, ProjectUpdateInput } from '../../types/api'
import { apiClient } from '../../api/client'

interface ProjectActions {
  /** 拉取项目列表（支持分页/搜索/过滤） */
  fetchProjects: (query: ProjectQuery) => Promise<void>
  /** 新建项目，成功后追加到当前 list */
  createProject: (input: ProjectCreateInput) => Promise<void>
  /** 更新项目，成功后同步 list 中对应项 */
  updateProject: (id: string, input: ProjectUpdateInput) => Promise<void>
  /** 删除项目，成功后从 list 移除 */
  deleteProject: (id: string) => Promise<void>
  /** 清除错误信息 */
  clearError: () => void
}

export type ProjectStore = ProjectState & ProjectActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '操作失败'
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  list: [],
  total: 0,
  current: null,
  loading: false,
  error: null,

  fetchProjects: async (query) => {
    set({ loading: true, error: null })
    try {
      const params: Record<string, string> = {
        page: String(query.page),
        pageSize: String(query.pageSize),
      }
      if (query.keyword) params.keyword = query.keyword
      if (query.status) params.status = query.status
      if (query.ownerId) params.ownerId = query.ownerId
      if (query.dateFrom) params.dateFrom = query.dateFrom
      if (query.dateTo) params.dateTo = query.dateTo
      const res = await apiClient.get<{ items: Project[]; total: number; page: number; pageSize: number }>(
        '/projects',
        { params },
      )
      set({ list: res.data.items, total: res.data.total, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: extractErrorMessage(err) })
    }
  },

  createProject: async (input) => {
    set({ error: null })
    try {
      const res = await apiClient.post<Project>('/projects', input)
      set({ list: [res.data, ...get().list], total: get().total + 1, error: null })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  updateProject: async (id, input) => {
    set({ error: null })
    try {
      const res = await apiClient.put<Project>(`/projects/${id}`, input)
      set({
        list: get().list.map((p) => (p.id === id ? res.data : p)),
        current: get().current?.id === id ? res.data : get().current,
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  deleteProject: async (id) => {
    set({ error: null })
    try {
      await apiClient.delete(`/projects/${id}`)
      set({
        list: get().list.filter((p) => p.id !== id),
        total: Math.max(0, get().total - 1),
        error: null,
      })
    } catch (err) {
      set({ error: extractErrorMessage(err) })
    }
  },

  clearError: () => set({ error: null }),
}))
