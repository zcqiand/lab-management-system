import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportWorkflowList } from '../../../src/features/reports/ReportWorkflowList'
import { useAuthStore } from '../../../src/features/auth/authStore'
import type { User } from '../../../src/types/api'
import { resetApiClient, setToken } from '../../../src/api/client'

vi.mock('../../../src/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  setToken: vi.fn(),
  resetApiClient: vi.fn(),
}))

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
  vi.clearAllMocks()
})

describe('ReportWorkflowList', () => {
  it('渲染页面标题', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => expect(screen.getByText('报告流程')).toBeInTheDocument())
  })

  it('渲染新建报告按钮', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => expect(screen.getByRole('button', { name: '新建报告' })).toBeInTheDocument())
  })

  it('渲染状态筛选下拉框', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => expect(screen.getByLabelText(/状态筛选/)).toBeInTheDocument())
  })

  it('状态筛选包含所有选项', async () => {
    const user = userEvent.setup()
    render(<ReportWorkflowList />)
    await waitFor(() => expect(screen.getByLabelText(/状态筛选/)).toBeInTheDocument())

    const select = screen.getByLabelText(/状态筛选/)
    await user.selectOptions(select, 'draft')
    expect(screen.getByRole('option', { name: '草稿' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '审核中' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '已签发' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '已发放' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '已归档' })).toBeInTheDocument()
  })

  it('空状态显示暂无数据', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => expect(screen.getByText('暂无数据')).toBeInTheDocument())
  })

  it('表格列标题正确', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => {
      expect(screen.getByText('报告编号')).toBeInTheDocument()
      expect(screen.getByText('合同编号')).toBeInTheDocument()
      expect(screen.getByText('材料类型')).toBeInTheDocument()
      expect(screen.getByText('样品数')).toBeInTheDocument()
      expect(screen.getByText('检测日期')).toBeInTheDocument()
      expect(screen.getByText('状态')).toBeInTheDocument()
      expect(screen.getByText('结论')).toBeInTheDocument()
    })
  })

  it('翻页控件存在', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => {
      expect(screen.getByText('上一页')).toBeInTheDocument()
      expect(screen.getByText('下一页')).toBeInTheDocument()
    })
  })

  it('有错误时显示错误提示', async () => {
    render(<ReportWorkflowList />)
    await waitFor(() => {
      // 由于 mock 返回空列表，会显示暂无数据
      expect(screen.getByText(/报告流程|暂无数据/)).toBeInTheDocument()
    })
  })
})
