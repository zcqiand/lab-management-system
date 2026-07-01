import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import Layout from './layouts/Layout'
import { ProtectedRoute } from './guards/ProtectedRoute'
import { Login } from '../features/auth/Login'
import Dashboard from '../pages/Dashboard'
import Projects from '../pages/Projects'
import Samples from '../pages/Samples'
import Flow from '../pages/Flow'
import Forbidden from '../pages/Forbidden'

// 路由配置数组（导出供测试用 createMemoryRouter 复用）。
// ch35：受保护路由用 ProtectedRoute 包裹 Layout，未登录跳 /login；/login 用 features/auth/Login。
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
    ],
  },
  { path: '/forbidden', element: <Forbidden /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]

export const router = createBrowserRouter(routes)
