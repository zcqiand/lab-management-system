import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import Layout from './layouts/Layout'
import Dashboard from '../pages/Dashboard'
import Projects from '../pages/Projects'
import Samples from '../pages/Samples'
import Flow from '../pages/Flow'
import Login from '../pages/Login'
import Forbidden from '../pages/Forbidden'

// 路由配置数组（导出供测试用 createMemoryRouter 复用）。
// ch35 将在受保护路由外层包裹 ProtectedRoute，并替换 Login 为 features/auth/Login.tsx。
export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <Layout />,
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
