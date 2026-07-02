import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { SampleFormModalV2, type SampleFormValuesV2 } from '../samples/SampleFormModal.v2'
import { ConfirmModal } from '../../components/ConfirmModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySample = any

interface ReceiptDetailProps {
  receiptId: string
  contractId: string
  onClose: () => void
}

export function ReceiptDetail({ receiptId, contractId, onClose }: ReceiptDetailProps) {
  const [samples, setSamples] = useState<AnySample[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<AnySample>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AnySample>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchSamples = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get('/samples', { params: { receiptId, page: 1, pageSize: 100 } })
      setSamples(res.data.items ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSamples() }, [receiptId])

  const statusLabel = (s: string) =>
    ({ pending: '待检', testing: '检测中', completed: '已完成', rejected: '已拒收' }[s] ?? s)

  const materialLabel = (m?: string) =>
    ({ steel: '钢材', cement: '水泥', concrete: '混凝土', sand: '砂', gravel: '碎石', rebar_mech: '钢筋机械连接', rebar_weld: '钢筋焊接连接' }[m ?? ''] ?? m ?? '')

  const openCreate = () => { setFormMode('create'); setEditing(null); setFormOpen(true) }
  const openEdit = (s: AnySample) => { setFormMode('edit'); setEditing(s); setFormOpen(true) }

  const handleSubmit = async (values: SampleFormValuesV2) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await apiClient.post('/samples', { ...values, materialDetails: { kind: values.materialType } })
      } else if (values.id) {
        const { id, receiptId: _ri, contractId: _ci, sampleCode: _sc, ...patch } = values
        await apiClient.put(`/samples/${values.id}`, patch)
      }
      setFormOpen(false)
      await fetchSamples()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/samples/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchSamples()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-700">样品列表</h3>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">新增样品</button>
          <button onClick={onClose} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border rounded">关闭</button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">加载中...</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {!loading && !error && samples.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">该接样下暂无样品</p>
      )}

      {!loading && !error && samples.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-1.5 text-left">样品编号</th>
              <th className="px-3 py-1.5 text-left">样品名称</th>
              <th className="px-3 py-1.5 text-left">材料类型</th>
              <th className="px-3 py-1.5 text-left">规格</th>
              <th className="px-3 py-1.5 text-left">状态</th>
              <th className="px-3 py-1.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-1.5">{s.sampleCode ?? s.code}</td>
                <td className="px-3 py-1.5">{s.sampleName ?? s.name ?? '—'}</td>
                <td className="px-3 py-1.5">{materialLabel(s.materialType)}</td>
                <td className="px-3 py-1.5">{s.specification ?? '—'}</td>
                <td className="px-3 py-1.5">{statusLabel(s.status)}</td>
                <td className="px-3 py-1.5 text-right space-x-2">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => setDeleteTarget(s)} className="text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SampleFormModalV2
        open={formOpen}
        mode={formMode}
        initialValues={editing}
        contractId={contractId}
        receiptId={receiptId}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={submitting}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除样品「${deleteTarget?.sampleCode ?? deleteTarget?.code ?? ''}」？`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ReceiptDetail
