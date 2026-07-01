import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectList } from '../../src/features/projects/ProjectList'
import { useProjectStore } from '../../src/features/projects/projectStore'
import { resetApiClient } from '../../src/api/client'

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

describe('CRUD 集成测试：ProjectList 新增→列表更新全流程', () => {
  it('完整流程：列表加载→新增→列表更新→编辑→列表更新→删除→列表移除', async () => {
    const user = userEvent.setup()
    await seed(['初始项目A'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('初始项目A')).toBeInTheDocument())

    // 新增
    await user.click(screen.getByRole('button', { name: '新增项目' }))
    expect(screen.getByText('新建项目')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/项目名称/), '集成测试新增项')
    await user.type(screen.getByLabelText(/项目编号/), 'INT-001')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-001')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('集成测试新增项')).toBeInTheDocument())
    expect(screen.getByText(/共\s*2\s*条/)).toBeInTheDocument()

    // 编辑
    const row = screen.getByText('集成测试新增项').closest('tr')!
    await user.click(within(row).getByRole('button', { name: '编辑' }))
    expect(screen.getByText('编辑项目')).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/项目名称/) as HTMLInputElement
    await user.clear(nameInput)
    await user.type(nameInput, '已编辑的集成项')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('已编辑的集成项')).toBeInTheDocument())
    expect(screen.queryByText('集成测试新增项')).not.toBeInTheDocument()

    // 删除
    const updatedRow = screen.getByText('已编辑的集成项').closest('tr')!
    await user.click(within(updatedRow).getByRole('button', { name: '删除' }))
    expect(screen.getByText('删除确认')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认' }))
    await waitFor(() => expect(screen.queryByText('已编辑的集成项')).not.toBeInTheDocument())
    expect(screen.getByText(/共\s*1\s*条/)).toBeInTheDocument()
  })

  it('搜索流程：输入关键词→搜索→列表过滤→重置', async () => {
    const user = userEvent.setup()
    await seed(['可搜索项XYZ', '不匹配项ABC', '另一个XYZ'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('不匹配项ABC')).toBeInTheDocument())
    expect(screen.getByText(/共\s*3\s*条/)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/搜索/), 'XYZ')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => expect(screen.queryByText('不匹配项ABC')).not.toBeInTheDocument())
    expect(screen.getByText('可搜索项XYZ')).toBeInTheDocument()
    expect(screen.getByText('另一个XYZ')).toBeInTheDocument()
  })

  it('状态过滤流程：切换状态→列表过滤', async () => {
    const user = userEvent.setup()
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '归档项目', code: 'ARC', status: 'archived', ownerId: 'u-001' }),
    })
    await seed(['活跃项目B'])
    render(<ProjectList />)
    await waitFor(() => expect(screen.getByText('活跃项目B')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText(/状态筛选/), 'archived')
    await waitFor(() => expect(screen.getByText('归档项目')).toBeInTheDocument())
    expect(screen.queryByText('活跃项目B')).not.toBeInTheDocument()
  })

  it('分页流程：多页数据→翻页→内容更新', async () => {
    // mock DB 按 createdAt 倒序：最后创建的排在最前（第 1 页）
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
    // 第 1 页显示最新 10 条（分页项-24..分页项-15）
    expect(screen.getByText('分页项-24', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('分页项-0', { exact: true })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一页' }))
    // 第 2 页显示分页项-14..分页项-5
    await waitFor(() => expect(screen.getByText('分页项-14', { exact: true })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '下一页' }))
    // 第 3 页显示分页项-4..分页项-0
    await waitFor(() => expect(screen.getByText('分页项-0', { exact: true })).toBeInTheDocument())
  })
})
