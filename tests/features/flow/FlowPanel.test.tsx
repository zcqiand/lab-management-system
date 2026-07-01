import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlowPanel } from '../../../src/features/flow/FlowPanel'
import { useFlowStore } from '../../../src/features/flow/flowStore'

beforeEach(() => {
  useFlowStore.getState().reset()
})

describe('FlowPanel 流程面板', () => {
  it('draft 状态渲染"提交检测"按钮，不渲染"通过复审"', () => {
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    expect(screen.getByRole('button', { name: '提交检测' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '通过复审' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始检测' })).not.toBeInTheDocument()
  })

  it('点击"提交检测"后状态变 submitted，渲染"开始检测"与"撤回"', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    expect(screen.getByRole('button', { name: '开始检测' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '撤回' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交检测' })).not.toBeInTheDocument()
  })

  it('submitted 状态点"开始检测"进入 testing，渲染"提交复审"', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    expect(screen.getByRole('button', { name: '提交复审' })).toBeInTheDocument()
  })

  it('testing 状态点"提交复审"进入 review，admin 渲染"通过复审"与"拒绝"', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    await user.click(screen.getByRole('button', { name: '提交复审' }))
    expect(screen.getByRole('button', { name: '通过复审' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '拒绝' })).toBeInTheDocument()
  })

  it('review 状态点"通过复审"进入 approved（终态），无操作按钮', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    await user.click(screen.getByRole('button', { name: '提交复审' }))
    await user.click(screen.getByRole('button', { name: '通过复审' }))
    // 终态文案 + 状态标签
    expect(screen.getByText(/流程已完成/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '通过复审' })).not.toBeInTheDocument()
  })

  it('review 状态点"拒绝"进入 rejected（终态）', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    await user.click(screen.getByRole('button', { name: '提交复审' }))
    await user.click(screen.getByRole('button', { name: '拒绝' }))
    expect(screen.getByText(/流程已终止/)).toBeInTheDocument()
  })

  it('technician 在 review 状态不渲染"通过复审"（权限不足）', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-002" operatorRole="technician" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    await user.click(screen.getByRole('button', { name: '提交复审' }))
    expect(screen.queryByRole('button', { name: '通过复审' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '拒绝' })).not.toBeInTheDocument()
  })

  it('历史记录列表显示已发生的转换', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '开始检测' }))
    // 历史列表有 2 条
    expect(screen.getByText(/操作历史/)).toBeInTheDocument()
    const items = screen.getAllByText(/→/)
    expect(items).toHaveLength(2)
  })

  it('非法转换时显示错误信息', async () => {
    // 直接调 store 触发非法转换
    useFlowStore.getState().approve('u-001', 'admin')
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    expect(screen.getByText(/非法转换|权限/)).toBeInTheDocument()
  })

  it('显示当前状态标签', () => {
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    expect(screen.getByText(/草稿/)).toBeInTheDocument()
  })

  it('点"重置"回到 draft', async () => {
    const user = userEvent.setup()
    render(<FlowPanel operatorId="u-001" operatorRole="admin" />)
    await user.click(screen.getByRole('button', { name: '提交检测' }))
    await user.click(screen.getByRole('button', { name: '重置' }))
    expect(screen.getByRole('button', { name: '提交检测' })).toBeInTheDocument()
  })
})
