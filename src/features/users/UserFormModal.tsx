import { useEffect, useState, type FormEvent } from 'react'
import type { UserRecord } from '../../types/api'
import type { RoleRecord } from '../../types/api'

export interface UserFormValues {
  id?: string
  username: string
  displayName: string
  email: string
  roleId: string
  status: 'active' | 'disabled'
}

interface UserFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<UserRecord>
  roles: RoleRecord[]
  onSubmit: (values: UserFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function UserFormModal({ open, mode, initialValues, roles, onSubmit, onCancel, loading = false }: UserFormModalProps) {
  const [username, setUsername] = useState(initialValues?.username ?? '')
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [roleId, setRoleId] = useState(initialValues?.roleId ?? '')
  const [status, setStatus] = useState<'active' | 'disabled'>(initialValues?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setUsername(initialValues?.username ?? '')
      setDisplayName(initialValues?.displayName ?? '')
      setEmail(initialValues?.email ?? '')
      setRoleId(initialValues?.roleId ?? (roles[0]?.id ?? ''))
      setStatus(initialValues?.status ?? 'active')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建用户' : '编辑用户'

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!username.trim()) next.username = '请输入用户名'
    if (!displayName.trim()) next.displayName = '请输入显示名'
    if (!email.trim()) next.email = '请输入邮箱'
    if (!roleId) next.roleId = '请选择角色'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      username: username.trim(),
      displayName: displayName.trim(),
      email: email.trim(),
      roleId,
      status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[92vh] overflow-y-auto">
        <div className="px-8 py-5 border-b border-gray-200"><h3 className="text-lg font-semibold">{title}</h3></div>
        <div className="px-8 py-5 space-y-4">
          {/* Row 1: 用户名 | 显示名 | 邮箱 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="user-username" className="block text-sm font-medium mb-1">用户名 <span className="text-red-600">*</span></label>
              <input id="user-username" value={username} onChange={(e) => setUsername(e.target.value)}
                disabled={mode === 'edit'}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
              {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username}</p>}
            </div>
            <div>
              <label htmlFor="user-display" className="block text-sm font-medium mb-1">显示名 <span className="text-red-600">*</span></label>
              <input id="user-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.displayName && <p className="text-red-600 text-xs mt-1">{errors.displayName}</p>}
            </div>
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium mb-1">邮箱 <span className="text-red-600">*</span></label>
              <input id="user-email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
          {/* Row 2: 角色 | 状态 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium mb-1">角色 <span className="text-red-600">*</span></label>
              <select id="user-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.roleId && <p className="text-red-600 text-xs mt-1">{errors.roleId}</p>}
            </div>
            <div>
              <label htmlFor="user-status" className="block text-sm font-medium mb-1">状态</label>
              <select id="user-status" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'disabled')}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">活跃</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-8 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading} className="px-5 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{loading ? '保存中...' : '保存'}</button>
        </div>
      </form>
    </div>
  )
}

export default UserFormModal
