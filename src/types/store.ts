// Store 状态切片类型（v3）

import type { User, Contract, SampleReceipt, Sample, Report, ReportRecord, TaskRecord } from './api'

/** 认证状态机 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

/** 认证状态 */
export interface AuthState {
  user: User | null
  token: string | null
  status: AuthStatus
  error: string | null
}

/** 合同 store 状态切片 */
export interface ContractState {
  list: Contract[]
  total: number
  current: Contract | null
  loading: boolean
  error: string | null
}

/** 接样单 store 状态切片 */
export interface ReceiptState {
  list: SampleReceipt[]
  total: number
  current: SampleReceipt | null
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


/** 报告 store 状态切片 */
export interface ReportState {
  list: Report[]
  total: number
  current: Report | null
  loading: boolean
  error: string | null
}

/** 报告 store v2 状态切片（与 v1 共存） */
export interface ReportStateV2 {
  list: ReportRecord[]
  total: number
  current: ReportRecord | null
  loading: boolean
  error: string | null
}

/** 任务 store 状态切片 */
export interface TaskState {
  list: TaskRecord[]
  total: number
  current: TaskRecord | null
  loading: boolean
  error: string | null
}

