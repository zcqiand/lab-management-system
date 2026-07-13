import { useCallback, useEffect, useState } from 'react'
import { useUserStore } from './userStore'
import { useRoleStore } from '../roles/roleStore'
import { UserFormModal, type UserFormValues } from './UserFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { HasPermission } from '../auth/hasPermission'
import type { UserRecord, UserQuery } from '../../types/api'

const PAGE_SIZE = 10

export function UserList() {
  const { list, total, loading, error, fetchUsers, createUser, updateUser, deleteUser } = useUserStore()
  const { list: roles, fetchRoles } = useRoleStore()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildQuery = useCallback((p: number): UserQuery => ({ page: p, pageSize: PAGE_SIZE, role: roleFilter || undefined }), [roleFilter])

  useEffect(() => { fetchRoles({ page: 1, pageSize: 50 }) }, [fetchRoles])
  useEffect(() => { fetchUsers(buildQuery(page)) }, [page, fetchUsers, buildQuery])

  const handleRoleFilter = (value: string) => { setRoleFilter(value); setPage(1); fetchUsers({ page: 1, pageSize: PAGE_SIZE, role: value || undefined }) }
  const openCreate = () => { setFormMode('create'); setEditing(null); setFormOpen(true) }
  const openEdit = (u: UserRecord) => { setFormMode('edit'); setEditing(u); setFormOpen(true) }

  const handleSubmit = async (values: UserFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') await createUser({ username: values.username, displayName: values.displayName, email: values.email, roleId: values.roleId, status: values.status })
      else if (values.id) await updateUser(values.id, { displayName: values.displayName, email: values.email, roleId: values.roleId, status: values.status })
      setFormOpen(false); await fetchUsers(buildQuery(page))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteUser(deleteTarget.id); setDeleteTarget(null); await fetchUsers(buildQuery(page)) }
    finally { setDeleting(false) }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4" data-fn="M01.F03.I01">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">用户管理</h2>
        <HasPermission permission="user:create"><button onClick={openCreate} data-fn="M01.F03.I02" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">新增用户</button></HasPermission>
      </div>
      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm">
        <label className="text-sm text-gray-600 flex items-center gap-1">角色筛选
          <select value={roleFilter} onChange={(e) => handleRoleFilter(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">全部</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      </div>
      {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-2 text-left">用户名</th><th className="px-4 py-2 text-left">显示名</th><th className="px-4 py-2 text-left">邮箱</th><th className="px-4 py-2 text-left">角色</th><th className="px-4 py-2 text-left">状态</th><th className="px-4 py-2 text-right">操作</th></tr></thead>
          <tbody>
            {loading && list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>}
            {list.map((u) => {
              const role = roles.find((r) => r.id === u.roleId)
              return (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{u.username}</td><td className="px-4 py-2">{u.displayName}</td><td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{role?.name ?? u.roleId}</td><td className="px-4 py-2">{u.status}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <HasPermission permission="user:update"><button onClick={() => openEdit(u)} data-fn="M01.F03.I02" className="px-2 py-1 text-blue-600 hover:underline">编辑</button></HasPermission>
                    <HasPermission permission="user:delete"><button onClick={() => setDeleteTarget(u)} data-fn="M01.F03.I03" className="px-2 py-1 text-red-600 hover:underline">删除</button></HasPermission>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="space-x-2"><button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button></div>
      </div>
      <UserFormModal open={formOpen} mode={formMode} initialValues={editing ?? undefined} roles={roles} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} loading={submitting} />
      <ConfirmModal open={deleteTarget !== null} title="删除确认" message={`确定删除用户「${deleteTarget?.displayName ?? ''}」？`} loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

export default UserList
