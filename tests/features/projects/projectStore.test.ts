import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useProjectStore } from '../../../src/features/projects/projectStore'
import { resetApiClient } from '../../../src/api/client'
import type { ProjectQuery } from '../../../src/types/api'

const API_BASE = 'http://localhost/api'

async function seedProjects(n: number) {
  for (let i = 0; i < n; i++) {
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `项目-${i}`, code: `P-${i}`, status: 'active', ownerId: 'u-001' }),
    })
  }
}

beforeEach(() => {
  localStorage.clear()
  useProjectStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('projectStore 状态流转', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useProjectStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('fetchProjects 成功后 list/total 填充，loading 流转', async () => {
    await seedProjects(3)
    const promise = useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10 })
    expect(useProjectStore.getState().loading).toBe(true)
    await promise
    const s = useProjectStore.getState()
    expect(s.loading).toBe(false)
    expect(s.list).toHaveLength(3)
    expect(s.total).toBe(3)
    expect(s.error).toBeNull()
  })

  it('fetchProjects 支持 keyword 搜索', async () => {
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '关键词匹配-XYZ', code: 'KW-1', status: 'active', ownerId: 'u-001' }),
    })
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '其他项目', code: 'KW-2', status: 'active', ownerId: 'u-001' }),
    })
    await useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10, keyword: 'XYZ' })
    const s = useProjectStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].name).toContain('XYZ')
  })

  it('fetchProjects 支持 status 过滤', async () => {
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '归档', code: 'A-1', status: 'archived', ownerId: 'u-001' }),
    })
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '活跃', code: 'A-2', status: 'active', ownerId: 'u-001' }),
    })
    const query: ProjectQuery = { page: 1, pageSize: 10, status: 'archived' }
    await useProjectStore.getState().fetchProjects(query)
    const s = useProjectStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].status).toBe('archived')
  })

  it('fetchProjects 网络错误后 error 填充', async () => {
    server.use(http.get('*/projects', () => HttpResponse.error()))
    await useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10 })
    const s = useProjectStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeTruthy()
    expect(s.list).toEqual([])
  })

  it('createProject 成功后追加到 list', async () => {
    await useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10 })
    await useProjectStore.getState().createProject({
      name: '新建项目',
      code: 'NEW-1',
      ownerId: 'u-001',
    })
    const s = useProjectStore.getState()
    expect(s.list.some((p) => p.code === 'NEW-1')).toBe(true)
  })

  it('createProject 失败（缺字段）后 error 填充', async () => {
    await useProjectStore.getState().createProject({ name: '缺code', code: '', ownerId: 'u-001' })
    const s = useProjectStore.getState()
    expect(s.error).toBeTruthy()
  })

  it('updateProject 成功后 list 中对应项更新', async () => {
    await seedProjects(1)
    await useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10 })
    const target = useProjectStore.getState().list[0]
    await useProjectStore.getState().updateProject(target.id, { name: '已改名', status: 'paused' })
    const s = useProjectStore.getState()
    const updated = s.list.find((p) => p.id === target.id)
    expect(updated?.name).toBe('已改名')
    expect(updated?.status).toBe('paused')
  })

  it('updateProject 不存在时 error 填充', async () => {
    await useProjectStore.getState().updateProject('nonexistent', { name: 'x' })
    expect(useProjectStore.getState().error).toBeTruthy()
  })

  it('deleteProject 成功后从 list 移除', async () => {
    await seedProjects(2)
    await useProjectStore.getState().fetchProjects({ page: 1, pageSize: 10 })
    const target = useProjectStore.getState().list[0]
    await useProjectStore.getState().deleteProject(target.id)
    const s = useProjectStore.getState()
    expect(s.list.some((p) => p.id === target.id)).toBe(false)
    expect(s.total).toBe(1)
  })

  it('deleteProject 不存在时 error 填充', async () => {
    await useProjectStore.getState().deleteProject('nonexistent')
    expect(useProjectStore.getState().error).toBeTruthy()
  })

  it('clearError 清除 error', async () => {
    await useProjectStore.getState().deleteProject('nonexistent')
    expect(useProjectStore.getState().error).toBeTruthy()
    useProjectStore.getState().clearError()
    expect(useProjectStore.getState().error).toBeNull()
  })
})
