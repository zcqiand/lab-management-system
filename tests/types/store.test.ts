import { describe, it, expect } from 'vitest'
import type { AuthState, ProjectState, SampleState } from '../../src/types/store'

describe('types/store store 状态类型', () => {
  it('AuthState 类型可构造且字段符合预期', () => {
    const auth: AuthState = {
      user: null,
      token: null,
      status: 'idle',
      error: null,
    }
    expect(auth.user).toBeNull()
    expect(auth.token).toBeNull()
    expect(auth.status).toBe('idle')
  })

  it('AuthState 已登录态可构造', () => {
    const auth: AuthState = {
      user: {
        id: 'u-001',
        username: 'labadmin',
        displayName: '实验室管理员',
        role: { id: 'role-admin', name: 'admin', permissions: ['project:read'] },
        permissions: ['project:read'],
      },
      token: 'mock.jwt.token',
      status: 'authenticated',
      error: null,
    }
    expect(auth.status).toBe('authenticated')
    expect(auth.user?.username).toBe('labadmin')
  })

  it('ProjectState 类型可构造且字段符合预期', () => {
    const project: ProjectState = {
      list: [],
      total: 0,
      current: null,
      loading: false,
      error: null,
    }
    expect(project.loading).toBe(false)
    expect(project.current).toBeNull()
  })

  it('SampleState 类型可构造且字段符合预期', () => {
    const sample: SampleState = {
      list: [],
      total: 0,
      current: null,
      loading: false,
      error: null,
    }
    expect(sample.list).toEqual([])
    expect(sample.total).toBe(0)
  })
})
