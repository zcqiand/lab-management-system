import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../../features/auth/authStore'

interface ProtectedRouteProps {
  /**
   * 允许访问的角色名列表（如 ['admin']）。
   * 不传时仅校验已登录，不校验角色。
   */
  roles?: string[]
  /**
   * 传入 children 时作为包裹组件；不传时渲染 Outlet 作为布局路由父级。
   */
  children?: ReactNode
}

/**
 * 路由守卫：
 * - 未登录 → 跳 /login（携带来源路径，登录后可回跳）
 * - 已登录但角色不匹配 → 跳 /forbidden
 * - 校验通过 → 渲染 children 或 Outlet
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role.name)) {
    return <Navigate to="/forbidden" replace />
  }

  return children !== undefined ? <>{children}</> : <Outlet />
}
