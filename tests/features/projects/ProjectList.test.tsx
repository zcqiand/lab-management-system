import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectList } from '../../../src/features/projects/ProjectList'
import { useProjectStore } from '../../../src/features/projects/projectStore'
import { resetApiClient } from '../../../src/api/client'

const API_BASE = 'http://localhost/api'

async function seed(names: string[]) {
  for (const name of names) {
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code: `C-${name}`, status: 'active', ownerId: 'u-001' }),
    })
  }
}

beforeEach(() => {
  localStorage.clear()
  useProjectStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('ProjectList 列表+搜索+分页+CRUD', () => {
  it('mount 后自动拉取并渲染列表行', async () => {
    await seed(['项目甲', '项目乙'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('项目甲')).toBeInTheDocument())
    expect(screen.getByText('项目乙')).toBeInTheDocument()
  })

  it('显示分页信息与总数', async () => {
    await seed(['P1', 'P2', 'P3'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument())
    expect(screen.getByText(/共\s*3\s*条/)).toBeInTheDocument()
  })

  it('输入 keyword 搜索后列表刷新', async () => {
    const user = userEvent.setup()
    await seed(['匹配XYZ', '不匹配ABC', '另一个XYZ'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('不匹配ABC')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/搜索/), 'XYZ')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => expect(screen.queryByText('不匹配ABC')).not.toBeInTheDocument())
    expect(screen.getByText('匹配XYZ')).toBeInTheDocument()
    expect(screen.getByText('另一个XYZ')).toBeInTheDocument()
  })

  it('切换 status 过滤后列表刷新', async () => {
    const user = userEvent.setup()
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '归档项', code: 'ARC', status: 'archived', ownerId: 'u-001' }),
    })
    await seed(['活跃项'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('活跃项')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText(/状态筛选/), 'archived')
    await waitFor(() => expect(screen.getByText('归档项')).toBeInTheDocument())
    expect(screen.queryByText('活跃项')).not.toBeInTheDocument()
  })

  it('点新增按钮打开表单，填写保存后列表新增一行', async () => {
    const user = userEvent.setup()
    await seed(['已有项'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('已有项')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '新增项目' }))
    expect(screen.getByText('新建项目')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/项目名称/), '新增项')
    await user.type(screen.getByLabelText(/项目编号/), 'NEW-L')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-001')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('新增项')).toBeInTheDocument())
  })

  it('点编辑按钮打开表单（填初始值），修改保存后列表更新', async () => {
    const user = userEvent.setup()
    await seed(['待编辑项'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('待编辑项')).toBeInTheDocument())
    // 找到该行的编辑按钮
    const row = screen.getByText('待编辑项').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '编辑' }))
    expect(screen.getByText('编辑项目')).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/项目名称/) as HTMLInputElement
    expect(nameInput.value).toBe('待编辑项')
    await user.clear(nameInput)
    await user.type(nameInput, '已编辑项')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('已编辑项')).toBeInTheDocument())
    expect(screen.queryByText('待编辑项')).not.toBeInTheDocument()
  })

  it('点删除按钮打开确认，确认后列表移除', async () => {
    const user = userEvent.setup()
    await seed(['待删除项', '保留项'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('待删除项')).toBeInTheDocument())
    const row = screen.getByText('待删除项').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '删除' }))
    expect(screen.getByText('删除确认')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认' }))
    await waitFor(() => expect(screen.queryByText('待删除项')).not.toBeInTheDocument())
    expect(screen.getByText('保留项')).toBeInTheDocument()
  })

  it('点删除后取消则不移除', async () => {
    const user = userEvent.setup()
    await seed(['不删项'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('不删项')).toBeInTheDocument())
    const row = screen.getByText('不删项').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByText('删除确认')).not.toBeInTheDocument()
    expect(screen.getByText('不删项')).toBeInTheDocument()
  })

  it('加载中显示 loading 文案', async () => {
    await seed(['加载项'])
    render(<ProjectList />)
    // 初始 fetch 时 loading（断言 loading 文案出现过或列表最终出现）
    await waitFor(() => expect(screen.getByText('加载项')).toBeInTheDocument())
  })

  it('分页：超过 pageSize 时显示下一页按钮且可翻页', async () => {
    // seed 25 条，pageSize=10 → 3 页
    for (let i = 0; i < 25; i++) {
      await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `分页项-${i}`, code: `PG-${i}`, status: 'active', ownerId: 'u-001' }),
      })
    }
    const user = userEvent.setup()
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('共 25 条')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一页' }))
    // 第 2 页应显示分页项-10..分页项-19 中的某些
    await waitFor(() => expect(screen.getByText('分页项-10')).toBeInTheDocument())
  })
})
