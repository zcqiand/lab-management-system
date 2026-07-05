import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { TechnicalRequirement } from '../../types/api'
import { TechnicalRequirementFormModal, type TechnicalRequirementFormValues } from './TechnicalRequirementFormModal'
import { useCategories, categoryName } from '../categories/useCategories'

const PAGE_SIZE = 100

/** 技术要求（v3）——按 报告类别 + 牌号/型号/等级/规格 匹配样品，数据录入时自动评定 */
export function TechnicalRequirementList() {
  const { categories } = useCategories()
  const [list, setList] = useState<TechnicalRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryCode, setCategoryCode] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingItem, setEditingItem] = useState<Partial<TechnicalRequirement> | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const fetchList = (cat: string) => {
    setLoading(true)
    setError(null)
    const params: Record<string, string> = { page: '1', pageSize: String(PAGE_SIZE) }
    if (cat !== 'all') params.categoryCode = cat
    apiClient
      .get<{ items: TechnicalRequirement[]; total: number }>('/technical-requirements', { params })
      .then((res) => {
        setList(res.data.items)
        setLoading(false)
      })
      .catch(() => {
        setError('加载技术要求失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchList(categoryCode) }, [categoryCode])

  const handleCreate = async (values: TechnicalRequirementFormValues) => {
    setSubmitting(true)
    try {
      await apiClient.post('/technical-requirements', values)
      setModalOpen(false)
      fetchList(categoryCode)
    } catch {
      setError('新建技术要求失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: TechnicalRequirementFormValues) => {
    if (!editingItem?.code) return
    setSubmitting(true)
    try {
      await apiClient.put(`/technical-requirements/${encodeURIComponent(editingItem.code)}`, values)
      setModalOpen(false)
      fetchList(categoryCode)
    } catch {
      setError('更新技术要求失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确认删除该技术要求？')) return
    setDeleteLoading(code)
    try {
      await apiClient.delete(`/technical-requirements/${encodeURIComponent(code)}`)
      fetchList(categoryCode)
    } catch {
      setError('删除技术要求失败')
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">技术要求</h2>
          <p className="text-xs text-gray-500 mt-1">按报告类别 + 牌号/型号/等级/规格匹配样品；数据录入时按此自动评定合格/不合格</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(undefined)
            setModalMode('create')
            setModalOpen(true)
          }}
          className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700"
        >
          新增技术要求
        </button>
      </div>

      <div className="flex gap-1 bg-white rounded shadow p-1 flex-wrap">
        {[{ code: 'all', name: '全部' }, ...categories].map((tab) => (
          <button
            key={tab.code}
            onClick={() => setCategoryCode(tab.code)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              categoryCode === tab.code ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">编码</th>
              <th className="px-3 py-2 text-left">报告类别</th>
              <th className="px-3 py-2 text-left">参数</th>
              <th className="px-3 py-2 text-left">牌号</th>
              <th className="px-3 py-2 text-left">型号</th>
              <th className="px-3 py-2 text-left">等级</th>
              <th className="px-3 py-2 text-left">规格</th>
              <th className="px-3 py-2 text-left">要求</th>
              <th className="px-3 py-2 text-left">标准</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {list.map((r) => (
              <tr key={r.code} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2">{categoryName(categories, r.categoryCode)}</td>
                <td className="px-3 py-2">{r.parameterCode}</td>
                <td className="px-3 py-2">{r.brand ?? '—'}</td>
                <td className="px-3 py-2">{r.model ?? '—'}</td>
                <td className="px-3 py-2">{r.grade ?? '—'}</td>
                <td className="px-3 py-2">{r.specification ?? '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.comparison === 'range' ? r.value : `${r.comparison} ${r.value}`}{r.unit ? ` ${r.unit}` : ''}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.standardCode}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(r)
                        setModalMode('edit')
                        setModalOpen(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(r.code)}
                      disabled={deleteLoading === r.code}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      {deleteLoading === r.code ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TechnicalRequirementFormModal
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

export default TechnicalRequirementList
