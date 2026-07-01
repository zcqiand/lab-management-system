import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState } from '../../types/store'
import type { User } from '../../types/api'
import { apiClient, setToken } from '../../api/client'

interface AuthActions {
  /** 登录：POST /auth/login，成功后存 token/user 并同步 apiClient */
  login: (username: string, password: string) => Promise<void>
  /** 登出：清除本地认证状态 */
  logout: () => void
  /** 清除错误信息（不改变认证状态） */
  clearError: () => void
}

export type AuthStore = AuthState & AuthActions

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  }
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message
  if (axiosErr.message) return axiosErr.message
  return '登录失败'
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      status: 'idle',
      error: null,

      login: async (username, password) => {
        set({ status: 'loading', error: null })
        try {
          const res = await apiClient.post<{ token: string; user: User }>(
            '/auth/login',
            { username, password },
          )
          const { token, user } = res.data
          setToken(token)
          set({ user, token, status: 'authenticated', error: null })
        } catch (err) {
          setToken(null)
          set({
            user: null,
            token: null,
            status: 'error',
            error: extractErrorMessage(err),
          })
        }
      },

      logout: () => {
        setToken(null)
        set({ user: null, token: null, status: 'idle', error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lab-auth',
      // 仅持久化 token 与 user（status/error 不持久化，每次进入为 idle）
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
