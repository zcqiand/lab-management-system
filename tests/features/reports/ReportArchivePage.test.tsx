import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ReportArchivePage } from '../../../src/features/reports/ReportArchivePage'
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

describe('ReportArchivePage', () => {
  it('渲染页面标题和流程信息', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText('报告归档')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(/当前环节.*已归档/)).toBeInTheDocument())
  })

  it('显示归档页特有的提示信息', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText(/流程终点.*如需回溯可退回报告发放/)).toBeInTheDocument())
  })

  it('不显示批量提交按钮（canSubmit=false）', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => {
      // 归档页不应显示批量审核通过/批量批准等提交类按钮
      expect(screen.queryByRole('button', { name: /批量审核通过/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /批量批准/ })).not.toBeInTheDocument()
    })
  })

  it('显示批量退回按钮（canReturn默认为true，有上一阶段）', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => {
      // 归档页有上一阶段 issuance，可以退回
      expect(screen.getByRole('button', { name: /批量退回/ })).toBeInTheDocument()
    })
  })

  it('显示搜索框', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByPlaceholderText(/搜索接样编号/)).toBeInTheDocument())
  })

  it('报告类别列正确渲染', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText('报告类别')).toBeInTheDocument())
  })

  it('签发时间列正确渲染', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText('签发时间')).toBeInTheDocument())
  })

  it('结论列正确渲染', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText('结论')).toBeInTheDocument())
  })

  it('不显示我提交的（可撤回）区块（归档为终点无下一阶段）', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => {
      // 归档是终点，没有下一阶段，所以不应显示"我提交的（可撤回）"
      expect(screen.queryByText(/我提交的.*可撤回/)).not.toBeInTheDocument()
    })
  })

  it('分页控件正常显示', async () => {
    render(<ReportArchivePage />)
    await waitFor(() => {
      expect(screen.getByText(/共 \d+ 条/)).toBeInTheDocument()
    })
  })

  it('无权限时仍可查看列表', async () => {
    useAuthStore.setState({ user: makeUser([]), token: 't', status: 'authenticated', error: null })
    render(<ReportArchivePage />)
    await waitFor(() => expect(screen.getByText('报告归档')).toBeInTheDocument())
  })
})
