import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../../src/app/router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('router 路由配置', () => {
  it('访问 / 重定向到 /dashboard', () => {
    renderAt('/')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
  })

  it('访问 /dashboard 渲染仪表盘页（含布局侧边栏）', () => {
    renderAt('/dashboard')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
    // 布局侧边栏也在
    expect(screen.getByText('检测流程')).toBeInTheDocument()
  })

  it('访问 /projects 渲染项目管理页', () => {
    renderAt('/projects')
    expect(screen.getByText('检测项目列表')).toBeInTheDocument()
  })

  it('访问 /samples 渲染样品管理页', () => {
    renderAt('/samples')
    expect(screen.getByText('样品登记与流转记录')).toBeInTheDocument()
  })

  it('访问 /flow 渲染检测流程页', () => {
    renderAt('/flow')
    expect(screen.getByText('检测流程配置与状态跟踪')).toBeInTheDocument()
  })

  it('访问 /login 渲染登录页（无布局侧边栏）', () => {
    renderAt('/login')
    expect(screen.getByText('登录')).toBeInTheDocument()
    // 登录页不渲染布局侧边栏
    expect(screen.queryByText('检测流程')).not.toBeInTheDocument()
  })

  it('访问未知路径重定向到 /dashboard', () => {
    renderAt('/nonexistent-path')
    expect(screen.getByText('实验室概览与待办事项')).toBeInTheDocument()
  })
})
