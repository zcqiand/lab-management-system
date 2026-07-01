import { describe, it, expect } from 'vitest'
import { flowReducer, initialState } from '../../../src/features/flow/flowReducer'
import type { FlowState } from '../../../src/features/flow/types'
import { TRANSITIONS } from '../../../src/features/flow/transitions'

describe('flowReducer 状态机', () => {
  it('initialState.status === draft', () => {
    expect(initialState.status).toBe('draft')
    expect(initialState.history).toEqual([])
  })

  it('TRANSITIONS 定义了完整的状态转换表', () => {
    expect(TRANSITIONS.draft).toEqual(['submitted'])
    expect(TRANSITIONS.submitted).toContain('testing')
    expect(TRANSITIONS.submitted).toContain('draft')
    expect(TRANSITIONS.testing).toContain('review')
    expect(TRANSITIONS.review).toContain('approved')
    expect(TRANSITIONS.review).toContain('rejected')
    expect(TRANSITIONS.approved).toEqual([])
    expect(TRANSITIONS.rejected).toEqual([])
  })

  it('SUBMIT: draft → submitted，追加 history', () => {
    const next = flowReducer(initialState, { type: 'SUBMIT', operator: 'u-001', comment: '提交检测' })
    expect(next.status).toBe('submitted')
    expect(next.history).toHaveLength(1)
    expect(next.history[0]).toMatchObject({
      fromStatus: 'draft',
      toStatus: 'submitted',
      operator: 'u-001',
      comment: '提交检测',
    })
    expect(next.history[0].timestamp).toBeTruthy()
  })

  it('START_TESTING: submitted → testing', () => {
    const submitted: FlowState = { ...initialState, status: 'submitted' }
    const next = flowReducer(submitted, { type: 'START_TESTING', operator: 'u-002' })
    expect(next.status).toBe('testing')
    expect(next.history).toHaveLength(1)
  })

  it('SUBMIT_REVIEW: testing → review', () => {
    const testing: FlowState = { ...initialState, status: 'testing' }
    const next = flowReducer(testing, { type: 'SUBMIT_REVIEW', operator: 'u-002' })
    expect(next.status).toBe('review')
  })

  it('APPROVE: review → approved', () => {
    const review: FlowState = { ...initialState, status: 'review' }
    const next = flowReducer(review, { type: 'APPROVE', operator: 'u-001' })
    expect(next.status).toBe('approved')
  })

  it('REJECT: review → rejected', () => {
    const review: FlowState = { ...initialState, status: 'review' }
    const next = flowReducer(review, { type: 'REJECT', operator: 'u-001', comment: '不合规' })
    expect(next.status).toBe('rejected')
    expect(next.history[0].comment).toBe('不合规')
  })

  it('RECALL: submitted → draft（撤回）', () => {
    const submitted: FlowState = { ...initialState, status: 'submitted' }
    const next = flowReducer(submitted, { type: 'RECALL', operator: 'u-001' })
    expect(next.status).toBe('draft')
  })

  it('非法转换: draft → approved 应保持不变且记录错误', () => {
    const next = flowReducer(initialState, { type: 'APPROVE', operator: 'u-001' })
    expect(next.status).toBe('draft')
    expect(next.error).toBeTruthy()
    expect(next.history).toEqual([])
  })

  it('非法转换: testing → submitted（不能逆流）应保持不变', () => {
    const testing: FlowState = { ...initialState, status: 'testing' }
    const next = flowReducer(testing, { type: 'RECALL', operator: 'u-001' })
    expect(next.status).toBe('testing')
    expect(next.error).toBeTruthy()
  })

  it('终态 approved 上任何操作都保持不变', () => {
    const approved: FlowState = { ...initialState, status: 'approved' }
    const next = flowReducer(approved, { type: 'SUBMIT', operator: 'u-001' })
    expect(next.status).toBe('approved')
    expect(next.error).toBeTruthy()
  })

  it('RESET: 回到 draft 初态（清空 history 与 error）', () => {
    const submitted: FlowState = {
      status: 'submitted',
      history: [{ fromStatus: 'draft', toStatus: 'submitted', operator: 'u-1', timestamp: 't', comment: '' }],
      error: 'some error',
    }
    const next = flowReducer(submitted, { type: 'RESET' })
    expect(next.status).toBe('draft')
    expect(next.history).toEqual([])
    expect(next.error).toBeNull()
  })

  it('CLEAR_ERROR: 清除 error 字段', () => {
    const state: FlowState = { ...initialState, error: '非法转换' }
    const next = flowReducer(state, { type: 'CLEAR_ERROR' })
    expect(next.error).toBeNull()
  })

  it('连续转换：draft → submitted → testing → review → approved', () => {
    let state = initialState
    state = flowReducer(state, { type: 'SUBMIT', operator: 'u-1' })
    expect(state.status).toBe('submitted')
    state = flowReducer(state, { type: 'START_TESTING', operator: 'u-2' })
    expect(state.status).toBe('testing')
    state = flowReducer(state, { type: 'SUBMIT_REVIEW', operator: 'u-2' })
    expect(state.status).toBe('review')
    state = flowReducer(state, { type: 'APPROVE', operator: 'u-1' })
    expect(state.status).toBe('approved')
    expect(state.history).toHaveLength(4)
  })

  it('权限校验：仅 admin 可 APPROVE，technician 触发 APPROVE 应被拒绝', () => {
    const review: FlowState = { ...initialState, status: 'review' }
    const next = flowReducer(review, { type: 'APPROVE', operator: 'u-002', operatorRole: 'technician' })
    expect(next.status).toBe('review')
    expect(next.error).toMatch(/权限/)
  })

  it('权限校验：admin 触发 APPROVE 通过', () => {
    const review: FlowState = { ...initialState, status: 'review' }
    const next = flowReducer(review, { type: 'APPROVE', operator: 'u-001', operatorRole: 'admin' })
    expect(next.status).toBe('approved')
  })
})
