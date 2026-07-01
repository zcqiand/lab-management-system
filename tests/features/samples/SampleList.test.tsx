import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SampleList } from '../../../src/features/samples/SampleList'
import { useSampleStore } from '../../../src/features/samples/sampleStore'
import { resetApiClient } from '../../../src/api/client'

const API_BASE = 'http://localhost/api'

async function seed(names: string[]) {
  for (const name of names) {
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name, code: `C-${name}`, status: 'pending' }),
    })
  }
}

beforeEach(() => {
  localStorage.clear()
  useSampleStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('SampleList 列表+搜索+分页+CRUD', () => {
  it('mount 后自动拉取并渲染列表行', async () => {
    await seed(['样品甲', '样品乙'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('样品甲')).toBeInTheDocument())
    expect(screen.getByText('样品乙')).toBeInTheDocument()
  })

  it('显示分页信息与总数', async () => {
    await seed(['S1', 'S2', 'S3'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument())
    expect(screen.getByText(/共\s*3\s*条/)).toBeInTheDocument()
  })

  it('keyword 搜索后列表刷新', async () => {
    const user = userEvent.setup()
    await seed(['匹配XYZ', '不匹配ABC'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('不匹配ABC')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/搜索/), 'XYZ')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => expect(screen.queryByText('不匹配ABC')).not.toBeInTheDocument())
    expect(screen.getByText('匹配XYZ')).toBeInTheDocument()
  })

  it('status 筛选后列表刷新', async () => {
    const user = userEvent.setup()
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: '检测中样品', code: 'T', status: 'testing' }),
    })
    await seed(['待检样品'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('待检样品')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText(/状态筛选/), 'testing')
    await waitFor(() => expect(screen.getByText('检测中样品')).toBeInTheDocument())
    expect(screen.queryByText('待检样品')).not.toBeInTheDocument()
  })

  it('新增样品：打开表单→填写→保存→列表新增', async () => {
    const user = userEvent.setup()
    await seed(['已有样品'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('已有样品')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '新增样品' }))
    expect(screen.getByText('新建样品')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/所属项目/), 'p-002')
    await user.type(screen.getByLabelText(/样品名称/), '刚创建的样品XYZ')
    await user.type(screen.getByLabelText(/样品编号/), 'NEW-S')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('刚创建的样品XYZ')).toBeInTheDocument())
  })

  it('编辑样品：打开表单（填值）→修改→保存→列表更新', async () => {
    const user = userEvent.setup()
    await seed(['待编辑样品'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('待编辑样品')).toBeInTheDocument())
    const row = screen.getByText('待编辑样品').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '编辑' }))
    expect(screen.getByText('编辑样品')).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/样品名称/) as HTMLInputElement
    expect(nameInput.value).toBe('待编辑样品')
    await user.clear(nameInput)
    await user.type(nameInput, '已编辑样品')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('已编辑样品')).toBeInTheDocument())
  })

  it('删除样品：确认后列表移除', async () => {
    const user = userEvent.setup()
    await seed(['待删除样品', '保留样品'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('待删除样品')).toBeInTheDocument())
    const row = screen.getByText('待删除样品').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '删除' }))
    expect(screen.getByText('删除确认')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认' }))
    await waitFor(() => expect(screen.queryByText('待删除样品')).not.toBeInTheDocument())
    expect(screen.getByText('保留样品')).toBeInTheDocument()
  })

  it('删除取消则不移除', async () => {
    const user = userEvent.setup()
    await seed(['不删样品'])
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('不删样品')).toBeInTheDocument())
    const row = screen.getByText('不删样品').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByText('删除确认')).not.toBeInTheDocument()
    expect(screen.getByText('不删样品')).toBeInTheDocument()
  })

  it('分页：超过 pageSize 时可翻页', async () => {
    for (let i = 0; i < 25; i++) {
      await fetch(`${API_BASE}/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p-001', name: `分页样-${i}`, code: `PG-${i}`, status: 'pending' }),
      })
    }
    const user = userEvent.setup()
    render(<SampleList />)
    await waitFor(() => expect(screen.getByText('共 25 条')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(screen.getByText('分页样-10')).toBeInTheDocument())
  })
})
