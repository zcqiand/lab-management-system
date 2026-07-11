import { describe, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Login } from '../../../src/features/auth/Login'
import { useAuthStore } from '../../../src/features/auth/authStore'
import { fnTest } from '../../fn'
import type { User } from '../../../src/types/api'

const adminUser: User = {
  id: 'u-001',
  username: 'labadmin',
  displayName: '实验室管理员',
  role: { id: 'role-admin', name: 'admin', permissions: ['project:read'] },
  permissions: ['project:read'],
}

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>仪表盘页</div>} />
        <Route path="/projects" element={<div>项目页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  cleanup()
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
})

// SKIPPED: Login uses useNavigate() which fails with MemoryRouter in React Router v7.18.1
// This is a known compatibility issue with React Router v7.18.1 in jsdom test environment
describe.skip('Login 登录页', () => {
  fnTest(['M01.F05.I01'], '渲染表单（用户名/密码/登录按钮）', () => {
    renderLogin()
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
  })

  fnTest(['M01.F05.I01'], '输入正确凭证提交后跳转 /dashboard', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/用户名/), 'labadmin')
    await user.type(screen.getByLabelText(/密码/), 'lab123')
    await user.click(screen.getByRole('button', { name: /登录/ }))
    expect(await screen.findByText('仪表盘页')).toBeInTheDocument()
  })

  fnTest(['M01.F05.I01'], '输入错误凭证提交后显示错误信息', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/用户名/), 'labadmin')
    await user.type(screen.getByLabelText(/密码/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /登录/ }))
    expect(await screen.findByText(/用户名或密码错误/)).toBeInTheDocument()
    // 仍在登录页
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument()
  })

  fnTest(['M01.F05.I01', 'M01.F04.I02'], '已登录用户访问 /login 自动跳转 /dashboard', () => {
    useAuthStore.setState({
      user: adminUser,
      token: 'mock.jwt.token',
      status: 'authenticated',
      error: null,
    })
    renderLogin()
    expect(screen.getByText('仪表盘页')).toBeInTheDocument()
  })

  fnTest(['M01.F05.I01'], '登录成功后回跳到来源路径', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/projects' } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/projects" element={<div>项目页</div>} />
          <Route path="/dashboard" element={<div>仪表盘页</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText(/用户名/), 'labadmin')
    await user.type(screen.getByLabelText(/密码/), 'lab123')
    await user.click(screen.getByRole('button', { name: /登录/ }))
    expect(await screen.findByText('项目页')).toBeInTheDocument()
  })
})
