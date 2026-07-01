import { describe, it, expect, beforeEach } from 'vitest'
import { useFlowStore } from '../../../src/features/flow/flowStore'

beforeEach(() => {
  useFlowStore.getState().reset()
})

describe('flowStore Zustand 包装', () => {
  it('初始 status=draft, history=[]', () => {
    const s = useFlowStore.getState()
    expect(s.status).toBe('draft')
    expect(s.history).toEqual([])
    expect(s.error).toBeNull()
  })

  it('submit() 流转 draft → submitted', () => {
    useFlowStore.getState().submit('u-001', '提交')
    expect(useFlowStore.getState().status).toBe('submitted')
    expect(useFlowStore.getState().history).toHaveLength(1)
  })

  it('startTesting() 流转 submitted → testing', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().startTesting('u-002')
    expect(useFlowStore.getState().status).toBe('testing')
  })

  it('submitReview() 流转 testing → review', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().startTesting('u-002')
    useFlowStore.getState().submitReview('u-002')
    expect(useFlowStore.getState().status).toBe('review')
  })

  it('approve() admin 角色流转 review → approved', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().startTesting('u-002')
    useFlowStore.getState().submitReview('u-002')
    useFlowStore.getState().approve('u-001', 'admin', '通过')
    expect(useFlowStore.getState().status).toBe('approved')
  })

  it('approve() technician 角色被拒绝', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().startTesting('u-002')
    useFlowStore.getState().submitReview('u-002')
    useFlowStore.getState().approve('u-002', 'technician')
    expect(useFlowStore.getState().status).toBe('review')
    expect(useFlowStore.getState().error).toMatch(/权限/)
  })

  it('reject() admin 角色流转 review → rejected', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().startTesting('u-002')
    useFlowStore.getState().submitReview('u-002')
    useFlowStore.getState().reject('u-001', 'admin', '不合规')
    expect(useFlowStore.getState().status).toBe('rejected')
  })

  it('recall() 流转 submitted → draft', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().recall('u-001')
    expect(useFlowStore.getState().status).toBe('draft')
  })

  it('非法转换设置 error', () => {
    // draft 上直接 approve
    useFlowStore.getState().approve('u-001', 'admin')
    expect(useFlowStore.getState().status).toBe('draft')
    expect(useFlowStore.getState().error).toMatch(/非法转换/)
  })

  it('reset() 回到 draft 初态', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().reset()
    expect(useFlowStore.getState().status).toBe('draft')
    expect(useFlowStore.getState().history).toEqual([])
  })

  it('clearError() 清除 error', () => {
    useFlowStore.getState().approve('u-001', 'admin') // 非法
    expect(useFlowStore.getState().error).toBeTruthy()
    useFlowStore.getState().clearError()
    expect(useFlowStore.getState().error).toBeNull()
  })

  it('history 按时间顺序追加', () => {
    useFlowStore.getState().submit('u-1', '第一步')
    useFlowStore.getState().startTesting('u-2', '第二步')
    const s = useFlowStore.getState()
    expect(s.history).toHaveLength(2)
    expect(s.history[0].fromStatus).toBe('draft')
    expect(s.history[1].fromStatus).toBe('submitted')
  })

  it('transitionTo() 通用方法：显式指定目标状态', () => {
    useFlowStore.getState().submit('u-001')
    // 用通用方法流转到 testing
    useFlowStore.getState().transitionTo('testing', 'u-002')
    expect(useFlowStore.getState().status).toBe('testing')
  })

  it('transitionTo() 非法目标设置 error', () => {
    useFlowStore.getState().submit('u-001')
    useFlowStore.getState().transitionTo('approved', 'u-001', 'admin')
    expect(useFlowStore.getState().status).toBe('submitted')
    expect(useFlowStore.getState().error).toMatch(/非法转换/)
  })
})
