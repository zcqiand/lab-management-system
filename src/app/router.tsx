import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import Layout from './layouts/Layout'
import { ProtectedRoute } from './guards/ProtectedRoute'
import { Login } from '../features/auth/Login'
import Dashboard from '../pages/Dashboard'
import Projects from '../pages/Projects'
import Samples from '../pages/Samples'
import Flow from '../pages/Flow'
import Forbidden from '../pages/Forbidden'
import Reports from '../pages/Reports'
import Users from '../pages/Users'
import Roles from '../pages/Roles'

// 路由配置数组（导出供测试用 createMemoryRouter 复用）。
// ch35：受保护路由用 ProtectedRoute 包裹 Layout，未登录跳 /login；/login 用 features/auth/Login。
// extend 批1：追加 reports/settings/users settings/roles 子路由（只增不改现有路由）。
export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'projects', element: <Projects /> },
      { path: 'samples', element: <Samples /> },
      { path: 'flow', element: <Flow /> },
      { path: 'reports', element: <Reports /> },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/settings/users" replace /> },
          { path: 'users', element: <Users /> },
          { path: 'roles', element: <Roles /> },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <Forbidden /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]

// lazy 创建 browserRouter：避免 module 级别调用 createBrowserRouter
// 在 jsdom 测试环境下的副作用（Navigate 触发 undici AbortSignal 兼容问题）。
// 测试用 createMemoryRouter(routes) 直接复用 routes 数组，不依赖此实例。
let _router: ReturnType<typeof createBrowserRouter> | null = null
export function getRouter(): ReturnType<typeof createBrowserRouter> {
  if (!_router) {
    _router = createBrowserRouter(routes)
  }
  return _router
}
