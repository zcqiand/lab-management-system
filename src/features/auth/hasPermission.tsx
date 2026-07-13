import { type ReactNode } from 'react'
import { usePermission } from './usePermission'

interface HasPermissionProps {
  /** 权限码，如 'user:delete' */
  permission: string
  /** 有权限时渲染的内容 */
  children: ReactNode
  /** 无权限时渲染的降级内容，默认为 null（不渲染） */
  fallback?: ReactNode
  /** 功能 ID（用于 data-fn 入口标记），格式 Mxx.Fyy.Izz */
  dataFn?: string
}

// @entry M01.F04.I03
/**
 * 按钮级/区块级权限组件：根据当前用户权限条件渲染。
 *
 * 用法：
 *   <HasPermission permission="user:delete">
 *     <button>删除用户</button>
 *   </HasPermission>
 *
 *   <HasPermission permission="user:delete" fallback={<span>无权操作</span>}>
 *     <button>删除用户</button>
 *   </HasPermission>
 */
export function HasPermission({
  permission,
  children,
  fallback = null,
  dataFn,
}: HasPermissionProps) {
  const has = usePermission(permission)
  return <span data-fn={dataFn}>{has ? children : fallback}</span>
}
