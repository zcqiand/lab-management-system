import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SampleFormModal } from '../../../src/features/samples/SampleFormModal'
import type { Sample } from '../../../src/types/api'

const sample: Sample = {
  id: 's-edit-1',
  projectId: 'p-001',
  name: '已存在样品',
  code: 'EDIT-SP',
  status: 'pending',
  receivedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('SampleFormModal 表单（create/edit 复用）', () => {
  it('create 模式: 标题"新建样品"，表单为空', () => {
    render(
      <SampleFormModal open mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    )
    expect(screen.getByText('新建样品')).toBeInTheDocument()
    expect((screen.getByLabelText(/样品名称/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/样品编号/) as HTMLInputElement).value).toBe('')
  })

  it('edit 模式: 填充 initialValues', () => {
    render(
      <SampleFormModal
        open
        mode="edit"
        initialValues={sample}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('编辑样品')).toBeInTheDocument()
    expect((screen.getByLabelText(/样品名称/) as HTMLInputElement).value).toBe('已存在样品')
    expect((screen.getByLabelText(/所属项目/) as HTMLInputElement).value).toBe('p-001')
  })

  it('create 提交触发 onSubmit with 表单值', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SampleFormModal open mode="create" onSubmit={onSubmit} onCancel={() => {}} />,
    )
    await user.type(screen.getByLabelText(/所属项目/), 'p-002')
    await user.type(screen.getByLabelText(/样品名称/), '新样品')
    await user.type(screen.getByLabelText(/样品编号/), 'NEW-SP')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p-002',
        name: '新样品',
        code: 'NEW-SP',
        status: 'pending',
      }),
    )
  })

  it('edit 提交触发 onSubmit with id', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SampleFormModal
        open
        mode="edit"
        initialValues={sample}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    const nameInput = screen.getByLabelText(/样品名称/) as HTMLInputElement
    await user.clear(nameInput)
    await user.type(nameInput, '已改名样品')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's-edit-1',
        name: '已改名样品',
        projectId: 'p-001',
      }),
    )
  })

  it('必填校验: projectId 为空显示错误', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SampleFormModal open mode="create" onSubmit={onSubmit} onCancel={() => {}} />,
    )
    await user.type(screen.getByLabelText(/样品名称/), 'X')
    await user.type(screen.getByLabelText(/样品编号/), 'X-1')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => {
      expect(screen.getByText(/请输入所属项目/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('必填校验: name 为空显示错误', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SampleFormModal open mode="create" onSubmit={onSubmit} onCancel={() => {}} />,
    )
    await user.type(screen.getByLabelText(/所属项目/), 'p-1')
    await user.type(screen.getByLabelText(/样品编号/), 'X-1')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => {
      expect(screen.getByText(/请输入样品名称/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('点取消触发 onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <SampleFormModal open mode="create" onSubmit={() => {}} onCancel={onCancel} />,
    )
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('loading 时保存按钮禁用', () => {
    render(
      <SampleFormModal open mode="create" loading onSubmit={() => {}} onCancel={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled()
  })

  it('open=false 不渲染', () => {
    render(
      <SampleFormModal open={false} mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    )
    expect(screen.queryByText('新建样品')).not.toBeInTheDocument()
  })

  it('切换 status 下拉', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SampleFormModal open mode="create" onSubmit={onSubmit} onCancel={() => {}} />,
    )
    await user.type(screen.getByLabelText(/所属项目/), 'p-1')
    await user.type(screen.getByLabelText(/样品名称/), 'X')
    await user.type(screen.getByLabelText(/样品编号/), 'X-1')
    await user.selectOptions(screen.getByLabelText(/状态/), 'testing')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'testing' }),
    )
  })
})
