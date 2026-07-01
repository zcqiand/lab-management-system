import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../../src/app/router'
import { useAuthStore } from '../../src/features/auth/authStore'
import type { User } from '../../src/types/api'

const adminUser: User = {
  id: 'u-001',
  username: 'labadmin',
  displayName: '实验室管理员',
  role: { id: 'role-admin', name: 'admin', permissions: ['project:read'] },
  permissions: ['project:read'],
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
})

describe('router 路由配置（含认证守卫）', () => {
  it('未登录访问 / 跳转 /login', () => {
    renderAt('/')
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
  })

  it('未登录访问 /dashboard 跳转 /login', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
  })

  it('登录后访问 / 重定向到 /dashboard', () => {
    useAuthStore.setState({
      user: adminUser,
      token: 'mock.jwt.token',
      status: 'authenticated',
      error: null,
    })
    renderAt('/')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
  })

  it('登录后访问 /dashboard 渲染仪表盘页（含布局侧边栏）', () => {
    useAuthStore.setState({ user: adminUser, token: 't', status: 'authenticated', error: null })
    renderAt('/dashboard')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
    expect(screen.getByText('检测流程')).toBeInTheDocument()
  })

  it('登录后访问 /projects 渲染项目管理页', async () => {
    useAuthStore.setState({ user: adminUser, token: 't', status: 'authenticated', error: null })
    renderAt('/projects')
    // ch36：projects 路由接入 ProjectList，含"新增项目"按钮
    expect(await screen.findByRole('button', { name: '新增项目' })).toBeInTheDocument()
  })

  it('登录后访问 /samples 渲染样品管理页', async () => {
    useAuthStore.setState({ user: adminUser, token: 't', status: 'authenticated', error: null })
    renderAt('/samples')
    expect(await screen.findByRole('button', { name: '新增样品' })).toBeInTheDocument()
  })

  it('登录后访问 /flow 渲染检测流程页', async () => {
    useAuthStore.setState({ user: adminUser, token: 't', status: 'authenticated', error: null })
    renderAt('/flow')
    // ch37：flow 路由接入 FlowPanel，初始状态渲染"提交检测"按钮
    expect(await screen.findByRole('button', { name: '提交检测' })).toBeInTheDocument()
  })

  it('未登录访问 /login 渲染登录表单（无布局侧边栏）', () => {
    renderAt('/login')
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
    expect(screen.queryByText('检测流程')).not.toBeInTheDocument()
  })

  it('登录后访问未知路径重定向到 /dashboard', () => {
    useAuthStore.setState({ user: adminUser, token: 't', status: 'authenticated', error: null })
    renderAt('/nonexistent-path')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
  })

  it('未登录访问未知路径最终跳转 /login', () => {
    renderAt('/nonexistent-path')
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
  })
})
