import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportList } from '../../../src/features/reports/ReportList'
import { useReportStore } from '../../../src/features/reports/reportStore'
import { useAuthStore } from '../../../src/features/auth/authStore'
import type { User } from '../../../src/types/api'
import { resetApiClient, setToken } from '../../../src/api/client'

const API_BASE = 'http://localhost/api'

async function seed(names: string[]) {
  for (const name of names) {
    await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: 's-001', title: name, conclusion: '合格' }),
    })
  }
}

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
  useReportStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
  resetApiClient()
  setToken('mock-token')
})

describe('ReportList', () => {
  it('mount 后拉取并渲染列表', async () => {
    await seed(['报告甲', '报告乙'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('报告甲')).toBeInTheDocument())
  })

  it('有 report:write 权限时渲染新增按钮', async () => {
    useAuthStore.setState({ user: makeUser(['report:write']), token: 't', status: 'authenticated', error: null })
    await seed(['A'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '新增报告' })).toBeInTheDocument()
  })

  it('无 report:write 权限时不渲染新增按钮', async () => {
    useAuthStore.setState({ user: makeUser([]), token: 't', status: 'authenticated', error: null })
    await seed(['A'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '新增报告' })).not.toBeInTheDocument()
  })

  it('新增报告流程', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ user: makeUser(['report:write']), token: 't', status: 'authenticated', error: null })
    await seed(['已有'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('已有')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '新增报告' }))
    await user.type(screen.getByLabelText(/标题/), '新报告XYZ')
    await user.type(screen.getByLabelText(/样品ID/), 's-002')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('新报告XYZ')).toBeInTheDocument())
  })

  it('编辑报告流程', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ user: makeUser(['report:write']), token: 't', status: 'authenticated', error: null })
    await seed(['待编辑'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('待编辑')).toBeInTheDocument())
    const row = screen.getByText('待编辑').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '编辑' }))
    const titleInput = screen.getByLabelText(/标题/) as HTMLInputElement
    await user.clear(titleInput)
    await user.type(titleInput, '已编辑XYZ')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('已编辑XYZ')).toBeInTheDocument())
  })

  it('删除报告流程', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ user: makeUser(['report:write']), token: 't', status: 'authenticated', error: null })
    await seed(['待删除', '保留'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('待删除')).toBeInTheDocument())
    const row = screen.getByText('待删除').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: '确认' }))
    await waitFor(() => expect(screen.queryByText('待删除')).not.toBeInTheDocument())
  })

  it('审核流程：提交审核 → 通过签发', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ user: makeUser(['report:write', 'report:issue']), token: 't', status: 'authenticated', error: null })
    await seed(['待审核报告'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('待审核报告')).toBeInTheDocument())
    const row = screen.getByText('待审核报告').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '提交审核' }))
    await waitFor(() => {
      const updatedRow = screen.getByText('待审核报告').closest('tr')!
      expect(within(updatedRow).getByText('reviewing')).toBeInTheDocument()
    })
    const reviewingRow = screen.getByText('待审核报告').closest('tr')!
    await user.click(within(reviewingRow).getByRole('button', { name: '通过' }))
    await waitFor(() => {
      const issuedRow = screen.getByText('待审核报告').closest('tr')!
      expect(within(issuedRow).getByText('issued')).toBeInTheDocument()
    })
  })

  it('状态筛选', async () => {
    const user = userEvent.setup()
    await seed(['草稿A'])
    render(<ReportList />)
    await waitFor(() => expect(screen.getByText('草稿A')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText(/状态筛选/), 'issued')
    await waitFor(() => expect(screen.getByText('暂无数据')).toBeInTheDocument())
  })
})
