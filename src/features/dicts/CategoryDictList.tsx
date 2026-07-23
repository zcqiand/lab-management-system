import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { CategoryDictItem } from '../../types/api'
import type { InspectionObject } from '../../types/inspection'

interface Props {
  /** API 路径：models / specifications / grades / brands */
  endpoint: string
  title: string
  hint?: string
  /** 功能 ID（用于 data-fn 入口标记），格式 Mxx.Fyy.Izz */
  dataFn?: string
  /** 新建按钮 data-fn */
  createDataFn?: string
  /** 编辑按钮 data-fn */
  editDataFn?: string
  /** 删除按钮 data-fn */
  deleteDataFn?: string
}

// @entry M04.F06.I02
// @entry M04.F06.I03
// @entry M04.F07.I02
// @entry M04.F07.I03
// @entry M04.F08.I02
// @entry M04.F08.I03
// @entry M04.F09.I02
// @entry M04.F09.I03
/** 型号/规格/等级/牌号 通用码表管理页（REQ-2026-005 起按检测项目过滤） */
export function CategoryDictList({ endpoint, title, hint, dataFn, createDataFn, editDataFn, deleteDataFn }: Props) {
  const [objects, setObjects] = useState<InspectionObject[]>([])
  const [objectCode, setObjectCode] = useState('')
  const [list, setList] = useState<CategoryDictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryDictItem | null>(null)
  const [formObject, setFormObject] = useState('')
  const [formName, setFormName] = useState('')
  const [formRemark, setFormRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CategoryDictItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiClient
      .get<{ items: InspectionObject[] }>('/inspection-objects', { params: { page: 1, pageSize: '200' } })
      .then((r) => setObjects(Array.isArray(r.data?.items) ? r.data.items : []))
      .catch(() => {})
  }, [])

  const objectName = (code?: string) => objects.find((o) => o.code === code)?.name ?? code ?? '-'

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: '1', pageSize: '200' }
      if (objectCode) params.inspectionObjectCode = objectCode
      const res = await apiClient.get<{ items: CategoryDictItem[] }>(`/${endpoint}`, { params })
      setList(res.data.items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [endpoint, objectCode])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openCreate = () => {
    setEditing(null)
    setFormObject(objectCode || objects[0]?.code || '')
    setFormName('')
    setFormRemark('')
    setFormOpen(true)
  }

  const openEdit = (item: CategoryDictItem) => {
    setEditing(item)
    setFormObject(item.inspectionObjectCode)
    setFormName(item.name)
    setFormRemark(item.remark ?? '')
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formObject || !formName.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await apiClient.put(`/${endpoint}/${editing.id}`, { name: formName.trim(), remark: formRemark })
      } else {
        await apiClient.post(`/${endpoint}`, { inspectionObjectCode: formObject, name: formName.trim(), remark: formRemark })
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
    try {
      await apiClient.delete(`/${endpoint}/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4" data-fn={dataFn}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
        <button onClick={openCreate} data-fn={createDataFn} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          新建
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm text-sm">
        <label className="text-gray-600">检测项目：</label>
        <select value={objectCode} onChange={(e) => setObjectCode(e.target.value)} className="border rounded px-2 py-1.5">
          <option value="">全部</option>
          {objects.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
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
              <th className="px-4 py-2 text-left">检测项目</th>
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {list.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{objectName(item.inspectionObjectCode)}</td>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2 text-gray-500">{item.remark ?? ''}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => openEdit(item)} data-fn={editDataFn} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => setDeleteTarget(item)} data-fn={deleteDataFn} className="px-2 py-1 text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={formOpen}
        title={editing ? `编辑${title.replace('管理', '')}` : `新建${title.replace('管理', '')}`}
        message={
          <div className="space-y-3 text-left text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测项目</label>
              <select
                value={formObject}
                onChange={(e) => setFormObject(e.target.value)}
                disabled={Boolean(editing)}
                className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100"
              >
                {objects.map((o) => (
                  <option key={o.code} value={o.code}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">名称</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
              <input value={formRemark} onChange={(e) => setFormRemark(e.target.value)} className="w-full border rounded px-2 py-1.5" />
            </div>
          </div>
        }
        confirmText="保存"
        loading={saving}
        onConfirm={handleSave}
        onCancel={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除「${deleteTarget?.name ?? ''}」？`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CategoryDictList