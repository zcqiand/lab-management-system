import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useSampleStore } from '../../../src/features/samples/sampleStore'
import { resetApiClient } from '../../../src/api/client'
import type { SampleQuery } from '../../../src/types/api'

const API_BASE = 'http://localhost/api'

async function seedSamples(n: number) {
  for (let i = 0; i < n; i++) {
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: `样品-${i}`, code: `S-${i}`, status: 'pending' }),
    })
  }
}

beforeEach(() => {
  localStorage.clear()
  useSampleStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('sampleStore 状态流转', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useSampleStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchSamples 成功后 list/total 填充', async () => {
    await seedSamples(3)
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 })
    const s = useSampleStore.getState()
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(3)
    expect(s.loading).toBe(false)
  })

  it('fetchSamples 支持 keyword 搜索', async () => {
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: '特殊样品-XYZ', code: 'S-KW', status: 'pending' }),
    })
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: '普通样品', code: 'S-NM', status: 'pending' }),
    })
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10, keyword: 'XYZ' })
    const s = useSampleStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].name).toContain('XYZ')
  })

  it('fetchSamples 支持 projectId 过滤', async () => {
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-target', name: '目标样品', code: 'S-T', status: 'pending' }),
    })
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-other', name: '其他样品', code: 'S-O', status: 'pending' }),
    })
    const query: SampleQuery = { page: 1, pageSize: 10, projectId: 'p-target' }
    await useSampleStore.getState().fetchSamples(query)
    const s = useSampleStore.getState()
    expect(s.list.every((item) => item.projectId === 'p-target')).toBe(true)
  })

  it('fetchSamples 支持 status 过滤', async () => {
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: '检测中', code: 'S-1', status: 'testing' }),
    })
    await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p-001', name: '待检', code: 'S-2', status: 'pending' }),
    })
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10, status: 'testing' })
    const s = useSampleStore.getState()
    expect(s.list.every((item) => item.status === 'testing')).toBe(true)
  })

  it('fetchSamples 网络错误后 error 填充', async () => {
    server.use(http.get('*/samples', () => HttpResponse.error()))
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 })
    const s = useSampleStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeTruthy()
  })

  it('createSample 成功后追加到 list', async () => {
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 })
    await useSampleStore.getState().createSample({
      projectId: 'p-001',
      name: '新建样品',
      code: 'S-NEW',
    })
    const s = useSampleStore.getState()
    expect(s.list.some((item) => item.code === 'S-NEW')).toBe(true)
  })

  it('createSample 失败后 error 填充', async () => {
    await useSampleStore.getState().createSample({ projectId: '', name: '缺projectId', code: 'S-X' })
    expect(useSampleStore.getState().error).toBeTruthy()
  })

  it('updateSample 成功后 list 中对应项更新', async () => {
    await seedSamples(1)
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 })
    const target = useSampleStore.getState().list[0]
    await useSampleStore.getState().updateSample(target.id, { name: '已改名', status: 'testing' })
    const s = useSampleStore.getState()
    const updated = s.list.find((item) => item.id === target.id)
    expect(updated?.name).toBe('已改名')
    expect(updated?.status).toBe('testing')
  })

  it('deleteSample 成功后从 list 移除', async () => {
    await seedSamples(2)
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 })
    const target = useSampleStore.getState().list[0]
    await useSampleStore.getState().deleteSample(target.id)
    const s = useSampleStore.getState()
    expect(s.list.some((item) => item.id === target.id)).toBe(false)
    expect(s.total).toBe(1)
  })

  it('deleteSample 不存在时 error 填充', async () => {
    await useSampleStore.getState().deleteSample('nonexistent')
    expect(useSampleStore.getState().error).toBeTruthy()
  })

  it('clearError 清除 error', async () => {
    await useSampleStore.getState().deleteSample('nonexistent')
    expect(useSampleStore.getState().error).toBeTruthy()
    useSampleStore.getState().clearError()
    expect(useSampleStore.getState().error).toBeNull()
  })
})
