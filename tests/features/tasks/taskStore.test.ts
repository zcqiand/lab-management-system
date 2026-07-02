import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useTaskStore } from '../../../src/features/tasks/taskStore'
import { resetApiClient } from '../../../src/api/client'
import { taskTable, resetMockDb } from '../../../msw/db'

beforeEach(() => {
  localStorage.clear()
  resetMockDb()
  taskTable.reset()
  useTaskStore.setState({ list: [], total: 0, current: null, loading: false, error: null })
  resetApiClient()
})

describe('taskStore 初始状态', () => {
  it('初始状态: list=[], loading=false, error=null', () => {
    const s = useTaskStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })
})

describe('taskStore fetchTasks', () => {
  it('fetchTasks 成功后 list/total 填充，loading 流转', async () => {
    taskTable.insert({
      id: 'task-001',
      sampleId: 'sample-steel-001',
      assigneeId: 'u-001',
      testItems: 'STE003,STE004',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    taskTable.insert({
      id: 'task-002',
      sampleId: 'sample-steel-002',
      assigneeId: 'u-002',
      testItems: 'STE001',
      status: 'testing',
      resultData: '{}',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const promise = useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    expect(useTaskStore.getState().loading).toBe(true)
    await promise
    const s = useTaskStore.getState()
    expect(s.loading).toBe(false)
    expect(s.list).toHaveLength(2)
    expect(s.total).toBe(2)
    expect(s.error).toBeNull()
  })

  it('fetchTasks 支持 keyword 搜索', async () => {
    taskTable.insert({
      id: 'task-kw-001',
      sampleId: 'sample-001',
      assigneeId: 'u-001',
      testItems: 'STE003',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    taskTable.insert({
      id: 'task-kw-002',
      sampleId: 'sample-002',
      assigneeId: 'u-002',
      testItems: 'CONCRETE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10, keyword: 'STE003' })
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].testItems).toContain('STE003')
  })

  it('fetchTasks 支持 status 过滤', async () => {
    taskTable.insert({
      id: 'task-status-001',
      sampleId: 'sample-001',
      assigneeId: 'u-001',
      testItems: 'STE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    taskTable.insert({
      id: 'task-status-002',
      sampleId: 'sample-002',
      assigneeId: 'u-002',
      testItems: 'STE002',
      status: 'completed',
      resultData: '{}',
      conclusion: '合格',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10, status: 'completed' })
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].status).toBe('completed')
  })

  it('fetchTasks 支持 sampleId 过滤', async () => {
    taskTable.insert({
      id: 'task-sample-001',
      sampleId: 'sample-concrete-A',
      assigneeId: 'u-001',
      testItems: 'CON001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    taskTable.insert({
      id: 'task-sample-002',
      sampleId: 'sample-steel-B',
      assigneeId: 'u-002',
      testItems: 'STE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10, sampleId: 'sample-concrete-A' })
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].sampleId).toBe('sample-concrete-A')
  })

  it('fetchTasks 支持 assigneeId 过滤', async () => {
    taskTable.insert({
      id: 'task-assign-001',
      sampleId: 'sample-001',
      assigneeId: 'u-labor-A',
      testItems: 'STE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    taskTable.insert({
      id: 'task-assign-002',
      sampleId: 'sample-002',
      assigneeId: 'u-labor-B',
      testItems: 'STE002',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10, assigneeId: 'u-labor-B' })
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].assigneeId).toBe('u-labor-B')
  })

  it('fetchTasks — 空列表场景', async () => {
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(0)
    expect(s.total).toBe(0)
    expect(s.loading).toBe(false)
  })

  it('fetchTasks — 网络错误场景', async () => {
    server.use(
      http.get('*/tasks', () => {
        return HttpResponse.json({ message: 'Network error' }, { status: 500 })
      }),
    )
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    const s = useTaskStore.getState()
    expect(s.list).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.error).not.toBeNull()
  })
})

describe('taskStore createTask', () => {
  it('createTask POST 成功返回新 task 并追加 list', async () => {
    const promise = useTaskStore.getState().createTask({
      sampleId: 'sample-new-001',
      assigneeId: 'u-new-001',
      testItems: 'STE100,STE101',
    })
    await promise
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(1)
    expect(s.list[0].sampleId).toBe('sample-new-001')
    expect(s.list[0].assigneeId).toBe('u-new-001')
    expect(s.list[0].testItems).toBe('STE100,STE101')
    expect(s.list[0].status).toBe('pending')
    expect(s.total).toBe(1)
  })

  it('createTask 失败时设置 error', async () => {
    server.use(
      http.post('*/tasks', () => {
        return HttpResponse.json({ message: '创建失败' }, { status: 400 })
      }),
    )
    await useTaskStore.getState().createTask({
      sampleId: 'sample-bad',
      assigneeId: 'u-bad',
      testItems: 'BAD',
    })
    const s = useTaskStore.getState()
    expect(s.error).not.toBeNull()
  })
})

describe('taskStore updateTask', () => {
  it('updateTask PUT 成功同步 list 中对应项', async () => {
    taskTable.insert({
      id: 'task-update-001',
      sampleId: 'sample-001',
      assigneeId: 'u-001',
      testItems: 'STE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    await useTaskStore.getState().updateTask('task-update-001', { status: 'testing' })
    const s = useTaskStore.getState()
    expect(s.list[0].status).toBe('testing')
    expect(s.error).toBeNull()
  })

  it('updateTask 失败时设置 error', async () => {
    server.use(
      http.put('*/tasks/:id', ({ params }) => {
        return HttpResponse.json({ message: '更新失败' }, { status: 400 })
      }),
    )
    await useTaskStore.getState().updateTask('non-existent', { status: 'testing' })
    const s = useTaskStore.getState()
    expect(s.error).not.toBeNull()
  })
})

describe('taskStore deleteTask', () => {
  it('deleteTask DELETE 成功从 list 移除', async () => {
    taskTable.insert({
      id: 'task-del-001',
      sampleId: 'sample-001',
      assigneeId: 'u-001',
      testItems: 'STE001',
      status: 'pending',
      resultData: '',
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    expect(useTaskStore.getState().list).toHaveLength(1)
    await useTaskStore.getState().deleteTask('task-del-001')
    const s = useTaskStore.getState()
    expect(s.list).toHaveLength(0)
    expect(s.total).toBe(0)
    expect(s.error).toBeNull()
  })

  it('deleteTask 失败时设置 error', async () => {
    server.use(
      http.delete('*/tasks/:id', () => {
        return HttpResponse.json({ message: '删除失败' }, { status: 400 })
      }),
    )
    await useTaskStore.getState().deleteTask('non-existent')
    const s = useTaskStore.getState()
    expect(s.error).not.toBeNull()
  })
})

describe('taskStore clearError', () => {
  it('clearError 清除 error', async () => {
    server.use(
      http.get('*/tasks', () => {
        return HttpResponse.json({ message: 'Network error' }, { status: 500 })
      }),
    )
    await useTaskStore.getState().fetchTasks({ page: 1, pageSize: 10 })
    expect(useTaskStore.getState().error).not.toBeNull()
    useTaskStore.getState().clearError()
    expect(useTaskStore.getState().error).toBeNull()
  })
})
