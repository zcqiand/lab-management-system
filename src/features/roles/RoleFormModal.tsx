import { useEffect, useState, type FormEvent } from 'react'
import type { RoleRecord, Permission } from '../../types/api'

/** 固定权限码列表（供角色权限勾选） */
const AVAILABLE_PERMISSIONS: { code: Permission; label: string }[] = [
  { code: 'project:read', label: '项目-查看' },
  { code: 'project:write', label: '项目-编辑' },
  { code: 'sample:read', label: '样品-查看' },
  { code: 'sample:write', label: '样品-编辑' },
  { code: 'report:read', label: '报告-查看' },
  { code: 'report:write', label: '报告-编辑' },
  { code: 'report:issue', label: '报告-签发' },
  { code: 'user:read', label: '用户-查看' },
  { code: 'user:create', label: '用户-新增' },
  { code: 'user:update', label: '用户-编辑' },
  { code: 'user:delete', label: '用户-删除' },
  { code: 'role:read', label: '角色-查看' },
  { code: 'role:write', label: '角色-编辑' },
]

export interface RoleFormValues {
  id?: string
  name: string
  description: string
  permissions: Permission[]
}

interface RoleFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<RoleRecord>
  onSubmit: (values: RoleFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function RoleFormModal({ open, mode, initialValues, onSubmit, onCancel, loading = false }: RoleFormModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [permissions, setPermissions] = useState<Permission[]>(initialValues?.permissions ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? '')
      setDescription(initialValues?.description ?? '')
      setPermissions(initialValues?.permissions ?? [])
      setErrors({})
    }
     
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建角色' : '编辑角色'

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = '请输入角色名'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const togglePerm = (code: Permission) => {
    setPermissions((prev) => prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code])
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      name: name.trim(), description: description.trim(), permissions,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[520px] max-w-[90vw]">
        <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold">{title}</h3></div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label htmlFor="role-name" className="block text-sm mb-1 font-medium">角色名</label>
            <input id="role-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="role-desc" className="block text-sm mb-1 font-medium">描述</label>
            <input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">权限</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map((p) => (
                <label key={p.code} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={permissions.includes(p.code)} onChange={() => togglePerm(p.code)} />{p.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{loading ? '保存中...' : '保存'}</button>
        </div>
      </form>
    </div>
  )
}

export default RoleFormModal
