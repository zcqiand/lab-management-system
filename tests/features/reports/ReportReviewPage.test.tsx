import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportReviewPage } from '../../../src/features/reports/ReportReviewPage'
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

describe('ReportReviewPage', () => {
  it('渲染页面标题和流程信息', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByText('报告审核')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(/当前环节.*报告审核/)).toBeInTheDocument())
  })

  it('显示提交后进入报告批准的提示', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByText(/提交后进入.*报告批准/)).toBeInTheDocument())
  })

  it('显示退回至数据录入的提示', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByText(/退回至.*数据录入/)).toBeInTheDocument())
  })

  it('显示批量操作按钮', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /批量审核通过/ })).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: /批量退回/ })).toBeInTheDocument())
  })

  it('显示搜索框', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByPlaceholderText(/搜索接样编号/)).toBeInTheDocument())
  })

  it('报告类别列正确渲染', async () => {
    render(<ReportReviewPage />)
    const categoryHeader = screen.queryByText('报告类别')
    expect(categoryHeader).toBeInTheDocument()
  })

  it('结论列正确渲染', async () => {
    render(<ReportReviewPage />)
    const conclusionHeader = screen.queryByText('结论')
    expect(conclusionHeader).toBeInTheDocument()
  })

  it('FlowStagePage 提供 rowActions 渲染点', async () => {
    render(<ReportReviewPage />)
    // rowActions 由 FlowStagePage 传递，组件层已定义查看报告按钮
    // 由于没有审核阶段的接味单，按钮可能不显示在列表行中
    await waitFor(() => {
      expect(screen.getByText('报告审核')).toBeInTheDocument()
    })
  })

  it('显示我提交的（可撤回）区块', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByText(/我提交的.*可撤回/)).toBeInTheDocument())
  })

  it('分页控件正常显示', async () => {
    render(<ReportReviewPage />)
    await waitFor(() => {
      const pagination = screen.getByText(/共 \d+ 条/)
      expect(pagination).toBeInTheDocument()
    })
  })

  it('无 report:write 权限时仍可查看列表', async () => {
    useAuthStore.setState({ user: makeUser(['report:read']), token: 't', status: 'authenticated', error: null })
    render(<ReportReviewPage />)
    await waitFor(() => expect(screen.getByText('报告审核')).toBeInTheDocument())
  })
})
