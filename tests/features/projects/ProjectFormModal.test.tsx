import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectFormModal } from '../../../src/features/projects/ProjectFormModal'
import type { Project } from '../../../src/types/api'

const sampleProject: Project = {
  id: 'p-edit-1',
  name: '已存在项目',
  code: 'EDIT-001',
  status: 'active',
  ownerId: 'u-001',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  // 避免上一次表单状态残留
})

describe('ProjectFormModal 表单（create/edit 复用）', () => {
  it('create 模式: 标题"新建项目"，表单字段为空', () => {
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('新建项目')).toBeInTheDocument()
    expect((screen.getByLabelText(/项目名称/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/项目编号/) as HTMLInputElement).value).toBe('')
  })

  it('edit 模式: 标题"编辑项目"，填充 initialValues', () => {
    render(
      <ProjectFormModal
        open
        mode="edit"
        initialValues={sampleProject}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('编辑项目')).toBeInTheDocument()
    expect((screen.getByLabelText(/项目名称/) as HTMLInputElement).value).toBe('已存在项目')
    expect((screen.getByLabelText(/项目编号/) as HTMLInputElement).value).toBe('EDIT-001')
  })

  it('create 模式提交触发 onSubmit with 表单值', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await user.type(screen.getByLabelText(/项目名称/), '新项目')
    await user.type(screen.getByLabelText(/项目编号/), 'NEW-001')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-001')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '新项目',
        code: 'NEW-001',
        status: 'active',
        ownerId: 'u-001',
      }),
    )
  })

  it('edit 模式提交触发 onSubmit with id + 修改值', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="edit"
        initialValues={sampleProject}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    // 修改名称
    const nameInput = screen.getByLabelText(/项目名称/) as HTMLInputElement
    await user.clear(nameInput)
    await user.type(nameInput, '已改名项目')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p-edit-1',
        name: '已改名项目',
        code: 'EDIT-001',
      }),
    )
  })

  it('必填校验: name 为空时提交显示错误且不触发 onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await user.type(screen.getByLabelText(/项目编号/), 'CODE-1')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-001')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => {
      expect(screen.getByText(/请输入项目名称/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('必填校验: code 为空时显示错误', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await user.type(screen.getByLabelText(/项目名称/), '有名称')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-001')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => {
      expect(screen.getByText(/请输入项目编号/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('点取消触发 onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('loading 时保存按钮禁用且文本变化', () => {
    render(
      <ProjectFormModal
        open
        mode="create"
        loading
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    const btn = screen.getByRole('button', { name: /保存中/ })
    expect(btn).toBeDisabled()
  })

  it('open=false 时不渲染', () => {
    render(
      <ProjectFormModal
        open={false}
        mode="create"
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByText('新建项目')).not.toBeInTheDocument()
  })

  it('切换 status 下拉选项', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ProjectFormModal
        open
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await user.type(screen.getByLabelText(/项目名称/), 'X')
    await user.type(screen.getByLabelText(/项目编号/), 'X-1')
    await user.type(screen.getByLabelText(/负责人ID/), 'u-1')
    // status 默认 active，改为 paused
    await user.selectOptions(screen.getByLabelText(/状态/), 'paused')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused' }),
    )
  })
})
