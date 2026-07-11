import { useCallback, useEffect, useState } from 'react'
import { useRoleStore } from './roleStore'
import { RoleFormModal, type RoleFormValues } from './RoleFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { HasPermission } from '../auth/hasPermission'
import type { RoleRecord, RoleQuery } from '../../types/api'

const PAGE_SIZE = 20

export function RoleList() {
  const { list, loading, error, fetchRoles, createRole, updateRole, deleteRole } = useRoleStore()
  const [page] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<RoleRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildQuery = useCallback((p: number): RoleQuery => ({ page: p, pageSize: PAGE_SIZE }), [])

  useEffect(() => { fetchRoles(buildQuery(page)) }, [page, fetchRoles, buildQuery])

  const openCreate = () => { setFormMode('create'); setEditing(null); setFormOpen(true) }
  const openEdit = (r: RoleRecord) => { setFormMode('edit'); setEditing(r); setFormOpen(true) }

  const handleSubmit = async (values: RoleFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') await createRole({ name: values.name, description: values.description, permissions: values.permissions })
      else if (values.id) await updateRole(values.id, { name: values.name, description: values.description, permissions: values.permissions })
      setFormOpen(false); await fetchRoles(buildQuery(page))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteRole(deleteTarget.id); setDeleteTarget(null); await fetchRoles(buildQuery(page)) }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">角色管理</h2>
        <HasPermission permission="role:write"><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">新增角色</button></HasPermission>
      </div>
      {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-2 text-left">角色名</th><th className="px-4 py-2 text-left">描述</th><th className="px-4 py-2 text-left">权限</th><th className="px-4 py-2 text-right">操作</th></tr></thead>
          <tbody>
            {loading && list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.description}</td>
                <td className="px-4 py-2"><span className="text-xs text-gray-500">{r.permissions.length} 项</span></td>
                <td className="px-4 py-2 text-right space-x-2">
                  <HasPermission permission="role:write"><button onClick={() => openEdit(r)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button></HasPermission>
                  <HasPermission permission="role:write"><button onClick={() => setDeleteTarget(r)} className="px-2 py-1 text-red-600 hover:underline">删除</button></HasPermission>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RoleFormModal open={formOpen} mode={formMode} initialValues={editing ?? undefined} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} loading={submitting} />
      <ConfirmModal open={deleteTarget !== null} title="删除确认" message={`确定删除角色「${deleteTarget?.name ?? ''}」？`} loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

export default RoleList
