import axios, { type AxiosInstance, type AxiosError } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// 当前 token（由 authStore 在 login/logout 时通过 setToken 同步）
let currentToken: string | null = null
// 401 回调（由 App 在启动时通过 onUnauthorized 注册，通常跳 /login）
let unauthorizedHandler: (() => void) | null = null

/** 同步当前 token，供请求拦截器注入 Authorization */
export function setToken(token: string | null) {
  currentToken = token
}

/** 注册 401 未授权回调（如跳转登录页 + 清除用户状态） */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

/** 测试用：重置 token 与 401 回调，保证测试隔离 */
export function resetApiClient() {
  currentToken = null
  unauthorizedHandler = null
}

export const apiClient: AxiosInstance = axios.create({ baseURL })

// 请求拦截器：注入 Bearer token
apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`
  }
  return config
})

// 响应拦截器：401 清除 token 并触发未授权回调
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      currentToken = null
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)
