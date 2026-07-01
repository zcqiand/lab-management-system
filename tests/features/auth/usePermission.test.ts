import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermission } from '../../../src/features/auth/usePermission'
import { useAuthStore } from '../../../src/features/auth/authStore'
import type { User } from '../../../src/types/api'

const adminUser: User = {
  id: 'u-001',
  username: 'labadmin',
  displayName: '实验室管理员',
  role: { id: 'role-admin', name: 'admin', permissions: ['project:read', 'user:delete'] },
  permissions: ['project:read', 'user:delete'],
}

const techUser: User = {
  id: 'u-002',
  username: 'technician',
  displayName: '检测员',
  role: { id: 'role-tech', name: 'technician', permissions: ['project:read'] },
  permissions: ['project:read'],
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
})

describe('usePermission', () => {
  it('未登录时任意权限返回 false', () => {
    const { result } = renderHook(() => usePermission('project:read'))
    expect(result.current).toBe(false)
  })

  it('admin 用户拥有 project:read 返回 true', () => {
    useAuthStore.setState({ user: adminUser })
    const { result } = renderHook(() => usePermission('project:read'))
    expect(result.current).toBe(true)
  })

  it('admin 用户拥有 user:delete 返回 true', () => {
    useAuthStore.setState({ user: adminUser })
    const { result } = renderHook(() => usePermission('user:delete'))
    expect(result.current).toBe(true)
  })

  it('technician 用户无 user:delete 返回 false', () => {
    useAuthStore.setState({ user: techUser })
    const { result } = renderHook(() => usePermission('user:delete'))
    expect(result.current).toBe(false)
  })

  it('technician 用户有 project:read 返回 true', () => {
    useAuthStore.setState({ user: techUser })
    const { result } = renderHook(() => usePermission('project:read'))
    expect(result.current).toBe(true)
  })

  it('权限变更后响应更新', () => {
    useAuthStore.setState({ user: techUser })
    const { result, rerender } = renderHook(({ p }) => usePermission(p), {
      initialProps: { p: 'project:read' },
    })
    expect(result.current).toBe(true)
    rerender({ p: 'user:delete' })
    expect(result.current).toBe(false)
  })
})
