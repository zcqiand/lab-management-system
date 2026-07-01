import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useAuthStore } from '../../../src/features/auth/authStore'
import { resetApiClient } from '../../../src/api/client'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
  resetApiClient()
})

describe('authStore 状态流转', () => {
  it('初始状态: user=null, token=null, status=idle, error=null', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })

  it('login 成功: 设置 user/token, status=authenticated', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.user?.username).toBe('labadmin')
    expect(state.user?.role.name).toBe('admin')
    expect(state.token).toBeTruthy()
    expect(state.token?.split('.')).toHaveLength(3)
    expect(state.error).toBeNull()
  })

  it('login 失败: status=error, error 有消息, user/token 为 null', async () => {
    await useAuthStore.getState().login('labadmin', 'wrong-password')
    const state = useAuthStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBeTruthy()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('login 网络错误: status=error, error 有消息', async () => {
    server.use(
      http.post('*/auth/login', () => HttpResponse.error()),
    )
    await useAuthStore.getState().login('labadmin', 'lab123')
    const state = useAuthStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBeTruthy()
  })

  it('logout: 清除 user/token, status=idle', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })

  it('login 成功后 token 同步到 apiClient（后续请求带 Authorization）', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    server.use(
      http.get('*/auth/echo', ({ request }) => {
        return HttpResponse.json({
          authorization: request.headers.get('Authorization'),
        })
      }),
    )
    const { apiClient } = await import('../../../src/api/client')
    const res = await apiClient.get('/auth/echo')
    expect(res.data.authorization).toBe(`Bearer ${useAuthStore.getState().token}`)
  })

  it('persist: token 与 user 持久化到 localStorage', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    const persisted = JSON.parse(localStorage.getItem('lab-auth') || '{}')
    expect(persisted.state.token).toBeTruthy()
    expect(persisted.state.user.username).toBe('labadmin')
  })

  it('clearError: 清除 error 字段', async () => {
    await useAuthStore.getState().login('labadmin', 'wrong')
    expect(useAuthStore.getState().error).toBeTruthy()
    useAuthStore.getState().clearError()
    expect(useAuthStore.getState().error).toBeNull()
  })
})
