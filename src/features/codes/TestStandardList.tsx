import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { TestStandard, StandardType } from '../../types/api'
import { TestStandardFormModal, type TestStandardFormValues } from './TestStandardFormModal'

const TYPE_LABELS: Record<StandardType, string> = {
  national: '国家标准',
  industry: '行业标准',
  local: '地方标准',
  enterprise: '企业标准',
}

const PAGE_SIZE = 100

/** 标准管理（v3）——标准 code/name/type；与报告类别的关联经「报告类别标准」维护 */
export function TestStandardList() {
  const [list, setList] = useState<TestStandard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingItem, setEditingItem] = useState<Partial<TestStandard> | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const fetchStandards = (kw: string) => {
    setLoading(true)
    setError(null)
    const params: Record<string, string> = { page: '1', pageSize: String(PAGE_SIZE) }
    if (kw.trim()) params.keyword = kw.trim()
    apiClient
      .get<{ items: TestStandard[]; total: number }>('/test-standards', { params })
      .then((res) => {
        setList(res.data.items)
        setLoading(false)
      })
      .catch(() => {
        setError('加载标准失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchStandards('') }, [])

  const handleCreate = async (values: TestStandardFormValues) => {
    setSubmitting(true)
    try {
      await apiClient.post('/test-standards', values)
      setModalOpen(false)
      fetchStandards(keyword)
    } catch {
      setError('新建标准失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: TestStandardFormValues) => {
    if (!editingItem?.code) return
    setSubmitting(true)
    try {
      await apiClient.put(`/test-standards/${encodeURIComponent(editingItem.code)}`, values)
      setModalOpen(false)
      fetchStandards(keyword)
    } catch {
      setError('更新标准失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确认删除该标准？其与报告类别的关联将一并删除。')) return
    setDeleteLoading(code)
    try {
      await apiClient.delete(`/test-standards/${encodeURIComponent(code)}`)
      fetchStandards(keyword)
    } catch {
      setError('删除标准失败')
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">标准管理</h2>
        <button
          onClick={() => {
            setEditingItem(undefined)
            setModalMode('create')
            setModalOpen(true)
          }}
          className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700"
        >
          新增标准
        </button>
      </div>

      <div className="flex gap-2 bg-white rounded shadow p-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchStandards(keyword)}
          placeholder="按编号/名称搜索"
          className="border rounded px-3 py-1.5 text-sm flex-1 max-w-xs"
        />
        <button onClick={() => fetchStandards(keyword)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
          搜索
        </button>
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
              <th className="px-4 py-2 text-left">类型</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {list.map((s) => (
              <tr key={s.code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                    {TYPE_LABELS[s.type]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{s.remark ?? '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(s)
                        setModalMode('edit')
                        setModalOpen(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(s.code)}
                      disabled={deleteLoading === s.code}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      {deleteLoading === s.code ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TestStandardFormModal
        open={modalOpen}
        mode={modalMode}
        initialValues={editingItem}
        onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}
        onCancel={() => setModalOpen(false)}
        loading={submitting}
      />
    </div>
  )
}

export default TestStandardList
