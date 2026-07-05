import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { TestParameter } from '../../types/api'
import { TestParameterFormModal, type TestParameterFormValues } from './TestParameterFormModal'
import { useCategories, categoryName } from '../categories/useCategories'

const PAGE_SIZE = 100

export function TestParameterList() {
  const { categories } = useCategories()
  const [list, setList] = useState<TestParameter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryCode, setCategoryCode] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingItem, setEditingItem] = useState<Partial<TestParameter> | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const fetchParams = (cat: string) => {
    setLoading(true)
    setError(null)
    const params: Record<string, string> = { page: '1', pageSize: String(PAGE_SIZE) }
    if (cat !== 'all') params.categoryCode = cat
    apiClient
      .get<{ items: TestParameter[]; total: number }>('/test-parameters', { params })
      .then((res) => {
        setList(res.data.items)
        setLoading(false)
      })
      .catch(() => {
        setError('加载检测参数失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchParams(categoryCode) }, [categoryCode])

  const openCreate = () => {
    setEditingItem(undefined)
    setModalMode('create')
    setModalOpen(true)
  }

  const openEdit = (item: TestParameter) => {
    setEditingItem(item)
    setModalMode('edit')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingItem(undefined)
  }

  const handleCreate = async (values: TestParameterFormValues) => {
    setSubmitting(true)
    try {
      await apiClient.post('/test-parameters', values)
      closeModal()
      fetchParams(categoryCode)
    } catch {
      setError('新建参数失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: TestParameterFormValues) => {
    if (!editingItem?.code) return
    setSubmitting(true)
    try {
      await apiClient.put(`/test-parameters/${editingItem.code}`, values)
      closeModal()
      fetchParams(categoryCode)
    } catch {
      setError('更新参数失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确认删除该参数？')) return
    setDeleteLoading(code)
    try {
      await apiClient.delete(`/test-parameters/${code}`)
      fetchParams(categoryCode)
    } catch {
      setError('删除参数失败')
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">参数管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700"
        >
          新增参数
        </button>
      </div>

      <div className="flex gap-1 bg-white rounded shadow p-1 flex-wrap">
        {[{ code: 'all', name: '全部' }, ...categories].map((tab) => (
          <button
            key={tab.code}
            onClick={() => setCategoryCode(tab.code)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              categoryCode === tab.code
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.name}
          </button>
        ))}
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
              <th className="px-4 py-2 text-left">参数代码</th>
              <th className="px-4 py-2 text-left">参数名称</th>
              <th className="px-4 py-2 text-left">报告类别</th>
              <th className="px-4 py-2 text-left">分类</th>
              <th className="px-4 py-2 text-left">单位</th>
              <th className="px-4 py-2 text-left">说明</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((p) => (
              <tr key={p.code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                    {categoryName(categories, p.categoryCode)}
                  </span>
                </td>
                <td className="px-4 py-2">{p.group ?? '-'}</td>
                <td className="px-4 py-2">{p.unit ?? '-'}</td>
                <td className="px-4 py-2 text-gray-500">{p.description ?? '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(p.code)}
                      disabled={deleteLoading === p.code}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      {deleteLoading === p.code ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TestParameterFormModal
        open={modalOpen}
        mode={modalMode}
        initialValues={editingItem}
        onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}
        onCancel={closeModal}
        loading={submitting}
      />
    </div>
  )
}

export default TestParameterList
