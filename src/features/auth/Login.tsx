import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from './authStore'

interface LocationState {
  from?: string
}

export function Login() {
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as LocationState | null)?.from || '/dashboard'
  const loading = status === 'loading'

  // 已登录用户访问登录页，直接跳转
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login(username, password)
    // 登录成功后回跳来源路径或首页
    if (useAuthStore.getState().status === 'authenticated') {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-96 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">登录</h2>
        {error && (
          <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="username" className="block text-sm mb-1 font-medium">
            用户名
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm mb-1 font-medium">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}

export default Login
