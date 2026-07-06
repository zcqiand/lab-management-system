import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ReportApprovePage } from '../../../src/features/reports/ReportApprovePage'
import { useAuthStore } from '../../../src/features/auth/authStore'
import type { User } from '../../../src/types/api'
import { resetApiClient, setToken } from '../../../src/api/client'

function makeUser(perms: string[]): User {
  return {
    id: 'u-001',
    username: 'admin',
    displayName: '管理员',
    role: { id: 'role-admin', name: 'admin', permissions: perms },
    permissions: perms,
  }
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
  resetApiClient()
  setToken('mock-token')
})

describe('ReportApprovePage', () => {
  it('渲染页面标题和流程信息', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText('报告批准')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(/当前环节.*报告批准/)).toBeInTheDocument())
  })

  it('显示批准后进入报告发放的提示', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText(/批准后自动签发并进入报告发放/)).toBeInTheDocument())
  })

  it('显示提交后进入报告发放的提示', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText(/提交后进入.*报告发放/)).toBeInTheDocument())
  })

  it('显示退回至报告审核的提示', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText(/退回至.*报告审核/)).toBeInTheDocument())
  })

  it('显示批量批准按钮', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /批量批准/ })).toBeInTheDocument())
  })

  it('显示批量退回按钮', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /批量退回/ })).toBeInTheDocument())
  })

  it('显示搜索框', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByPlaceholderText(/搜索接样编号/)).toBeInTheDocument())
  })

  it('报告类别列正确渲染', async () => {
    render(<ReportApprovePage />)
    const categoryHeader = screen.queryByText('报告类别')
    expect(categoryHeader).toBeInTheDocument()
  })

  it('结论列正确渲染', async () => {
    render(<ReportApprovePage />)
    const conclusionHeader = screen.queryByText('结论')
    expect(conclusionHeader).toBeInTheDocument()
  })

  it('显示我提交的（可撤回）区块', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText(/我提交的.*可撤回/)).toBeInTheDocument())
  })

  it('分页控件正常显示', async () => {
    render(<ReportApprovePage />)
    await waitFor(() => {
      const pagination = screen.getByText(/共 \d+ 条/)
      expect(pagination).toBeInTheDocument()
    })
  })

  it('无 report:write 权限时仍可查看列表', async () => {
    useAuthStore.setState({ user: makeUser(['report:read']), token: 't', status: 'authenticated', error: null })
    render(<ReportApprovePage />)
    await waitFor(() => expect(screen.getByText('报告批准')).toBeInTheDocument())
  })
})
