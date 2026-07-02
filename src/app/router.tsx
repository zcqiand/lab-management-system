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
import OrgInfo from '../pages/OrgInfo'

// ch35: ProtectedRoute wraps Layout; unauthenticated → /login; /login → features/auth/Login
// extend batch1: add reports/settings/users settings/roles child routes (only add, don't modify existing routes)
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
      // v1.3-001: old routes kept for ch36 compatibility; Layout menu no longer shows them
      { path: 'projects', element: <Projects /> },
      { path: 'samples', element: <Samples /> },
      { path: 'flow', element: <Flow /> },
      // v1.3-001: new routes (placeholder components reuse existing pages)
      { path: 'contracts', element: <Projects /> },
      { path: 'receipts', element: <Samples /> },
      { path: 'test-records', element: <Flow /> },
      { path: 'reports', element: <Reports /> },
      { path: 'org-info', element: <OrgInfo /> },
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

// lazy browserRouter factory: avoids module-level createBrowserRouter call
// which causes side-effects (Navigate triggers undici AbortSignal compat issues in jsdom).
// Tests use createMemoryRouter(routes) directly — no dependency on this instance.
let _router: ReturnType<typeof createBrowserRouter> | null = null
export function getRouter(): ReturnType<typeof createBrowserRouter> {
  if (!_router) {
    _router = createBrowserRouter(routes)
  }
  return _router
}
