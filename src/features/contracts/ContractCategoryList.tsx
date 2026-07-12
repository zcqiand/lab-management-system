import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { ContractCategory } from '../../types/api'

/** 合同类别码表管理 */
export function ContractCategoryList() {
  const [list, setList] = useState<ContractCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContractCategory | null>(null)
  const [form, setForm] = useState({ name: '', sortOrder: 0, remark: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContractCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ items: ContractCategory[] }>('/contract-categories', {
        params: { page: 1, pageSize: 100 },
      })
      const sorted = [...res.data.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setList(sorted)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sortOrder: list.length, remark: '' })
    setFormOpen(true)
  }

  const openEdit = (c: ContractCategory) => {
    setEditing(c)
    setForm({ name: c.name, sortOrder: c.sortOrder ?? 0, remark: c.remark ?? '' })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await apiClient.put(`/contract-categories/${editing.id}`, form)
      } else {
        await apiClient.post('/contract-categories', form)
      }
      setFormOpen(false)
      await fetchList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await apiClient.delete(`/contract-categories/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '删除失败')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const moveSortOrder = async (c: ContractCategory, direction: 'up' | 'down') => {
    const idx = list.findIndex((x) => x.id === c.id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === list.length - 1) return
    const swapped = list[direction === 'up' ? idx - 1 : idx + 1]!
    try {
      await apiClient.put(`/contract-categories/${c.id}`, { sortOrder: swapped.sortOrder ?? 0 })
      await apiClient.put(`/contract-categories/${swapped.id}`, { sortOrder: c.sortOrder ?? 0 })
      await fetchList()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">合同类别</h2>
          <p className="text-xs text-gray-500 mt-1">合同类别码表，用于在新建/编辑合同时选择所属类别</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          新建类别
        </button>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left w-16">排序</th>
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((c, idx) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSortOrder(c, 'up')}
                      disabled={idx === 0}
                      className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      title="上移"
                    >
                      ↑
                    </button>
                    <span className="text-xs text-gray-400 w-4 text-center">{c.sortOrder ?? 0}</span>
                    <button
                      onClick={() => moveSortOrder(c, 'down')}
                      disabled={idx === list.length - 1}
                      className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      title="下移"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-gray-500">{c.remark || '—'}</td>
                <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => openEdit(c)}
                    className="px-2 py-1 text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="px-2 py-1 text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <h3 className="text-lg font-semibold">{editing ? '编辑类别' : '新建类别'}</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  名称 <span className="text-red-600">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如 检测委托合同"
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  排序号（越小越靠前）
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 shrink-0">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除合同类别「${deleteTarget?.name ?? ''}」？`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ContractCategoryList
