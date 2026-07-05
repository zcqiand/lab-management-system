import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from '../../src/app/layouts/Layout'
import { useAuthStore } from '../../src/features/auth/authStore'
import type { User } from '../../src/types/api'

const adminUser: User = {
  id: 'u-001',
  username: 'labadmin',
  displayName: '实验室管理员',
  role: { id: 'role-admin', name: 'admin', permissions: ['project:read', 'sample:read', 'report:read', 'report:write', 'report:issue', 'role:read', 'user:read'] },
  permissions: ['project:read', 'sample:read', 'report:read', 'report:write', 'report:issue', 'role:read', 'user:read'],
}

beforeEach(() => {
  useAuthStore.setState({ user: adminUser, token: 'mock-token', status: 'authenticated', error: null })
})

describe('Layout 布局组件', () => {
  it('渲染应用标题', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    expect(screen.getByText(/建筑工程实验室管理系统/)).toBeInTheDocument()
  })

  it('渲染侧边栏导航链接（仪表盘/合同/接样/报告）', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    expect(screen.getByText('仪表盘')).toBeInTheDocument()
    expect(screen.getByText('合同管理')).toBeInTheDocument()
    expect(screen.getByText('接样管理')).toBeInTheDocument()
    expect(screen.getByText('任务安排')).toBeInTheDocument()
    expect(screen.getByText('报告审核')).toBeInTheDocument()
  })

  it('通过 Outlet 渲染子路由内容', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<div>仪表盘内容区</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('仪表盘内容区')).toBeInTheDocument()
  })

  it('导航链接使用 NavLink 且当前路由高亮', () => {
    render(
      <MemoryRouter initialEntries={['/contracts']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="contracts" element={<div>合同页</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const contractsLink = screen.getByText('合同管理').closest('a')
    expect(contractsLink).toHaveAttribute('href', '/contracts')
    expect(contractsLink?.className).toMatch(/active|bg-blue/)
  })
})
