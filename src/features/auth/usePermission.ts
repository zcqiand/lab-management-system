import { useAuthStore } from './authStore'

/**
 * 权限判定 hook：当前用户是否拥有指定权限码。
 * @param permission 权限码，如 'project:read'、'user:delete'
 * @returns true 表示有权限
 */
export function usePermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user)
  if (!user) return false
  return user.permissions.includes(permission)
}
