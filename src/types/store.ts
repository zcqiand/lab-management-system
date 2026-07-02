// Store 状态类型定义
// ch34：为 Zustand store 提供状态契约（authStore 在 ch35 实现）

import type { User, Project, Sample, Report } from './api'
import type { SampleReceipt } from './api'

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

/** 报告 store 状态切片（extend 批1：只增不改现有切片） */
export interface ReportState {
  list: Report[]
  total: number
  current: Report | null
  loading: boolean
  error: string | null
}

/** 接样 store 状态切片 */
export interface ReceiptState {
  list: SampleReceipt[]
  total: number
  current: SampleReceipt | null
  loading: boolean
  error: string | null
}

/** 合同 store 状态切片 */
export interface ContractState {
  list: import('./api').Contract[]
  total: number
  current: import('./api').Contract | null
  loading: boolean
  error: string | null
}

/** 样品 store 状态切片（新 SampleReceipt 四层模型版本） */
export interface SampleStateV2 {
  list: import('./api').Sample[]
  total: number
  current: import('./api').Sample | null
  loading: boolean
  error: string | null
}

/** 报告 store 状态切片（新 Report 四层模型版本：sampleIds[]/reportCode/materialType） */
export interface ReportStateV2 {
  list: import('./api').Report[]
  total: number
  current: import('./api').Report | null
  loading: boolean
  error: string | null
}

/** 任务 store 状态切片 */
export interface TaskState {
  list: import('./api').TaskRecord[]
  total: number
  current: import('./api').TaskRecord | null
  loading: boolean
  error: string | null
}
