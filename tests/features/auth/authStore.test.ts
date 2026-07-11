import { describe, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { useAuthStore } from '../../../src/features/auth/authStore'
import { resetApiClient } from '../../../src/api/client'
import { fnTest } from '../../fn'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
  resetApiClient()
})

describe('authStore 状态流转', () => {
  fnTest(['M01.F05.I01', 'M01.F05.I02'], '初始状态', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })

  fnTest(['M01.F05.I01', 'M01.F05.I02'], 'login 成功', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.user?.username).toBe('labadmin')
    expect(state.user?.role.name).toBe('admin')
    expect(state.token).toBeTruthy()
    expect(state.token?.split('.')).toHaveLength(3)
    expect(state.error).toBeNull()
  })

  fnTest(['M01.F05.I01'], 'login 失败', async () => {
    await useAuthStore.getState().login('labadmin', 'wrong-password')
    const state = useAuthStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBeTruthy()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  fnTest(['M01.F05.I01'], 'login 网络错误', async () => {
    server.use(
      http.post('*/auth/login', () => HttpResponse.error()),
    )
    await useAuthStore.getState().login('labadmin', 'lab123')
    const state = useAuthStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBeTruthy()
  })

  fnTest(['M01.F05.I01'], 'logout', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })

  fnTest(['M01.F05.I02'], 'token 同步到 apiClient', async () => {
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

  fnTest(['M01.F05.I01'], 'token 持久化', async () => {
    await useAuthStore.getState().login('labadmin', 'lab123')
    const persisted = JSON.parse(localStorage.getItem('lab-auth') || '{}')
    expect(persisted.state.token).toBeTruthy()
    expect(persisted.state.user.username).toBe('labadmin')
  })

  fnTest(['M01.F05.I01'], 'clearError', async () => {
    await useAuthStore.getState().login('labadmin', 'wrong')
    expect(useAuthStore.getState().error).toBeTruthy()
    useAuthStore.getState().clearError()
    expect(useAuthStore.getState().error).toBeNull()
  })
})
