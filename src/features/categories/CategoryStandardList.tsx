import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useCategories } from '../categories/useCategories'
import type { CategoryStandard, TestStandard } from '../../types/api'

/** 报告类别标准——维护 报告类别 ↔ 检测标准 的关联关系 */
export function CategoryStandardList() {
  const { categories } = useCategories()
  const [categoryCode, setCategoryCode] = useState('')
  const [links, setLinks] = useState<CategoryStandard[]>([])
  const [standards, setStandards] = useState<TestStandard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addStandard, setAddStandard] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CategoryStandard | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!categoryCode && categories.length > 0) setCategoryCode(categories[0]!.code)
  }, [categories, categoryCode])

  useEffect(() => {
    apiClient
      .get<{ items: TestStandard[] }>('/test-standards', { params: { page: 1, pageSize: 200 } })
      .then((res) => setStandards(res.data.items))
      .catch(() => setStandards([]))
  }, [])

  const fetchLinks = useCallback(async () => {
    if (!categoryCode) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ items: CategoryStandard[] }>('/category-standards', {
        params: { page: 1, pageSize: 200, categoryCode },
      })
      setLinks(res.data.items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [categoryCode])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const linkedCodes = new Set(links.map((l) => l.standardCode))
  const addable = standards.filter((s) => !linkedCodes.has(s.code))
  const standardName = (code: string) => standards.find((s) => s.code === code)?.name ?? ''

  const handleAdd = async () => {
    if (!addStandard) return
    setSaving(true)
    setError(null)
    try {
      await apiClient.post('/category-standards', { categoryCode, standardCode: addStandard })
      setAddOpen(false)
      setAddStandard('')
      await fetchLinks()
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
      await apiClient.delete(`/category-standards/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchLinks()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">报告类别标准</h2>
          <p className="text-xs text-gray-500 mt-1">维护每个报告类别适用的检测标准（报告类别 ↔ 标准 关联）</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          disabled={!categoryCode}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          关联标准
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm text-sm">
        <label className="text-gray-600">报告类别：</label>
        <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className="border rounded px-2 py-1.5">
          {categories.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">标准编号</th>
              <th className="px-4 py-2 text-left">标准名称</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && links.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && links.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">该报告类别暂未关联标准</td></tr>
            )}
            {links.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{l.standardCode}</td>
                <td className="px-4 py-2">{standardName(l.standardCode)}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDeleteTarget(l)} className="px-2 py-1 text-red-600 hover:underline">取消关联</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={addOpen}
        title="关联检测标准"
        message={
          <div className="text-left text-sm">
            <label className="block text-xs font-medium text-gray-600 mb-1">选择标准</label>
            <select value={addStandard} onChange={(e) => setAddStandard(e.target.value)} className="w-full border rounded px-2 py-1.5">
              <option value="">请选择</option>
              {addable.map((s) => (
                <option key={s.code} value={s.code}>{s.code}　{s.name}</option>
              ))}
            </select>
          </div>
        }
        confirmText="关联"
        loading={saving}
        onConfirm={handleAdd}
        onCancel={() => setAddOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="取消关联确认"
        message={`确定取消关联「${deleteTarget?.standardCode ?? ''}」？`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CategoryStandardList
