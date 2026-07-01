import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from '../../src/app/layouts/Layout'

describe('Layout 布局组件', () => {
  it('渲染应用标题', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    expect(screen.getByText(/建筑工程实验室管理系统/)).toBeInTheDocument()
  })

  it('渲染侧边栏导航链接（仪表盘/项目/样品/流程）', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    expect(screen.getByText('仪表盘')).toBeInTheDocument()
    expect(screen.getByText('项目管理')).toBeInTheDocument()
    expect(screen.getByText('样品管理')).toBeInTheDocument()
    expect(screen.getByText('检测流程')).toBeInTheDocument()
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
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="projects" element={<div>项目页</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const projectsLink = screen.getByText('项目管理').closest('a')
    expect(projectsLink).toHaveAttribute('href', '/projects')
    // 当前激活路由应带 active class
    expect(projectsLink?.className).toMatch(/active|bg-blue/)
  })
})
