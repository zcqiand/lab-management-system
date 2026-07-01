// Store 状态类型定义
// ch34：为 Zustand store 提供状态契约（authStore 在 ch35 实现）

import type { User, Project, Sample } from './api'

/** 认证状态机：空闲 → 加载中 → 已认证 / 出错 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

/** 认证 store 状态切片 */
export interface AuthState {
  user: User | null
  token: string | null
  status: AuthStatus
  error: string | null
}

/** 项目 store 状态切片 */
export interface ProjectState {
  list: Project[]
  total: number
  current: Project | null
  loading: boolean
  error: string | null
}

/** 样品 store 状态切片 */
export interface SampleState {
  list: Sample[]
  total: number
  current: Sample | null
  loading: boolean
  error: string | null
}
