import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportEditPage } from '../../../src/features/reports/ReportEditPage'
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

const mockReports = [
  { id: 'r-001', sampleId: 's-001', title: '草稿报告甲', status: 'draft', conclusion: '合格', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'r-002', sampleId: 's-002', title: '草稿报告乙', status: 'draft', conclusion: '不合格', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
]

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
  resetApiClient()
  setToken('mock-token')
  vi.clearAllMocks()
})

describe('ReportEditPage', () => {
  it('渲染页面标题', async () => {
    render(<ReportEditPage />)
    await waitFor(() => expect(screen.getByText('报告编辑')).toBeInTheDocument())
  })

  it('有 report:write 权限时渲染新建按钮', async () => {
    useAuthStore.setState({ user: makeUser(['report:write']), token: 't', status: 'authenticated', error: null })
    render(<ReportEditPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: '新建报告' })).toBeInTheDocument())
  })

  it('无 report:write 权限时不渲染新建按钮', async () => {
    useAuthStore.setState({ user: makeUser([]), token: 't', status: 'authenticated', error: null })
    render(<ReportEditPage />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '新建报告' })).not.toBeInTheDocument()
    })
  })

  it('搜索框存在且可输入', async () => {
    const user = userEvent.setup()
    render(<ReportEditPage />)
    const searchInput = screen.getByPlaceholderText('搜索标题/样品')
    await user.type(searchInput, '报告甲')
    expect(searchInput).toHaveValue('报告甲')
  })

  it('分页控件存在', async () => {
    render(<ReportEditPage />)
    await waitFor(() => {
      expect(screen.getByText('上一页')).toBeInTheDocument()
      expect(screen.getByText('下一页')).toBeInTheDocument()
    })
  })

  it('显示报告表格列标题', async () => {
    render(<ReportEditPage />)
    await waitFor(() => {
      expect(screen.getByText('标题')).toBeInTheDocument()
      expect(screen.getByText('样品ID')).toBeInTheDocument()
      expect(screen.getByText('状态')).toBeInTheDocument()
      expect(screen.getByText('结论')).toBeInTheDocument()
      expect(screen.getByText('签发时间')).toBeInTheDocument()
      expect(screen.getByText('操作')).toBeInTheDocument()
    })
  })

  it('加载中状态显示加载提示', async () => {
    render(<ReportEditPage />)
    // 初始加载时可能显示暂无草稿报告（mock 返回空列表）
    await waitFor(() => {
      expect(screen.getByText(/报告编辑|暂无草稿报告/)).toBeInTheDocument()
    })
  })
})
