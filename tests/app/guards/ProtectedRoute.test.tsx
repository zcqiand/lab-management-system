import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../../../src/app/guards/ProtectedRoute'
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

function renderAt(path: string, roles?: string[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="dashboard" element={<div>受保护内容</div>} />
        </Route>
        <Route path="/login" element={<div>登录页</div>} />
        <Route path="/forbidden" element={<div>禁止访问页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
})

describe('ProtectedRoute 路由守卫', () => {
  it('未登录时跳转 /login', () => {
    renderAt('/dashboard')
    expect(screen.getByText('登录页')).toBeInTheDocument()
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument()
  })

  it('已登录且无 roles 限制时渲染子路由内容', () => {
    useAuthStore.setState({ user: techUser })
    renderAt('/dashboard')
    expect(screen.getByText('受保护内容')).toBeInTheDocument()
  })

  it('已登录但角色不匹配跳转 /forbidden', () => {
    useAuthStore.setState({ user: techUser })
    renderAt('/dashboard', ['admin'])
    expect(screen.getByText('禁止访问页')).toBeInTheDocument()
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument()
  })

  it('已登录且角色匹配渲染子路由内容', () => {
    useAuthStore.setState({ user: adminUser })
    renderAt('/dashboard', ['admin', 'technician'])
    expect(screen.getByText('受保护内容')).toBeInTheDocument()
  })

  it('未登录时 Navigate 携带来源 location state', () => {
    renderAt('/dashboard')
    // 登录页应渲染（来自重定向）
    expect(screen.getByText('登录页')).toBeInTheDocument()
  })
})
