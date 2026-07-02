import { useEffect, useState } from 'react'
import { useReceiptStore } from './receiptStore'
import { useContractStore } from '../contracts/contractStore'
import { ReceiptFormModal, type ReceiptFormValues } from './ReceiptFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { SampleReceipt, ReceiptStatus } from '../../types/api'
import { ReceiptDetail } from './ReceiptDetail'

const PAGE_SIZE = 10

export function ReceiptList() {
  const { list, total, loading, error, fetchReceipts, createReceipt, updateReceipt, deleteReceipt } =
    useReceiptStore()
  const { list: contracts, fetchContracts } = useContractStore()

  const [page, setPage] = useState(1)
  const [keyword, setSearchKeyword] = useState('')
  const [status, setStatus] = useState<ReceiptStatus | ''>('')
  const [contractId, setContractId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<SampleReceipt | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SampleReceipt | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailReceiptId, setDetailReceiptId] = useState<string | null>(null)
  const [detailContractId, setDetailContractId] = useState<string>('')

  const buildQuery = (p: number) => ({
    page: p,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    status: status || undefined,
    contractId: contractId || undefined,
  })

  useEffect(() => {
    fetchReceipts(buildQuery(page))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (contracts.length === 0) {
      fetchContracts({ page: 1, pageSize: 100 })
    }
  }, [contracts.length, fetchContracts])

  const handleSearch = () => {
    setPage(1)
    fetchReceipts(buildQuery(1))
  }

  const handleStatusChange = (value: ReceiptStatus | '') => {
    setStatus(value)
    setPage(1)
    fetchReceipts(buildQuery(1))
  }

  const handleContractChange = (value: string) => {
    setContractId(value)
    setPage(1)
    fetchReceipts(buildQuery(1))
  }

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (receipt: SampleReceipt) => {
    setFormMode('edit')
    setEditing(receipt)
    setFormOpen(true)
  }

  const handleSubmit = async (values: ReceiptFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await createReceipt({
          contractId: values.contractId,
          receiptCode: values.receiptCode,
          receivedBy: values.receivedBy,
          sampleSource: values.sampleSource,
          testCategory: values.testCategory,
        })
        await fetchReceipts(buildQuery(page))
      } else if (values.id) {
        await updateReceipt(values.id, {
          contractId: values.contractId,
          receiptCode: values.receiptCode,
          receivedBy: values.receivedBy,
          sampleSource: values.sampleSource,
          testCategory: values.testCategory,
          testEnvironment: values.testEnvironment,
          mainEquipment: values.mainEquipment,
          representBatchSummary: values.representBatchSummary,
          remark: values.remark,
          status: values.status,
          receivedDate: values.receivedDate,
        })
      }
      setFormOpen(false)
      await fetchReceipts(buildQuery(page))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReceipt(deleteTarget.id)
      setDeleteTarget(null)
      await fetchReceipts(buildQuery(page))
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusLabel = (s: ReceiptStatus) => ({
    received: '已接收',
    testing: '检测中',
    completed: '已完成',
    rejected: '已拒收',
  }[s] ?? s)

  const sampleSourceLabel: Record<string, string> = {
    construction: '施工送检',
    field: '现场抽样',
    supervision: '监督抽查',
  }

  const testCategoryLabel: Record<string, string> = {
    entrusted: '委托检验',
    witnessed: '见证取样',
    supervision: '监督抽查',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">接样管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          新建接样
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm flex-wrap">
        <input
          placeholder="搜索接样编号/收样人"
          value={keyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <label className="text-sm text-gray-600 flex items-center gap-1">
          合同
          <select
            value={contractId}
            onChange={(e) => handleContractChange(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">全部</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contractCode}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-1">
          状态
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ReceiptStatus | '')}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">全部</option>
            <option value="received">已接收</option>
            <option value="testing">检测中</option>
            <option value="completed">已完成</option>
            <option value="rejected">已拒收</option>
          </select>
        </label>
        <button
          onClick={handleSearch}
          className="px-4 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-800"
        >
          搜索
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
              <th className="px-4 py-2 text-left">接样编号</th>
              <th className="px-4 py-2 text-left">合同编号</th>
              <th className="px-4 py-2 text-left">收样日期</th>
              <th className="px-4 py-2 text-left">收样人</th>
              <th className="px-4 py-2 text-left">样品来源</th>
              <th className="px-4 py-2 text-left">检测类别</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.receiptCode}</td>
                <td className="px-4 py-2">{r.contractId}</td>
                <td className="px-4 py-2">{r.receivedDate}</td>
                <td className="px-4 py-2">{r.receivedBy}</td>
                <td className="px-4 py-2">{sampleSourceLabel[r.sampleSource] ?? r.sampleSource}</td>
                <td className="px-4 py-2">{testCategoryLabel[r.testCategory] ?? r.testCategory}</td>
                <td className="px-4 py-2">{statusLabel(r.status)}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => { setDetailReceiptId(r.id); setDetailContractId(r.contractId) }}
                    className="px-2 py-1 text-green-600 hover:underline"
                  >
                    详情
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="px-2 py-1 text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
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

      {detailReceiptId && (
        <ReceiptDetail
          receiptId={detailReceiptId!}
          contractId={detailContractId}
          onClose={() => { setDetailReceiptId(null); setDetailContractId('') }}
        />
      )}

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <ReceiptFormModal
        open={formOpen}
        mode={formMode}
        initialValues={editing ?? undefined}
        contracts={contracts}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={submitting}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除接样「${deleteTarget?.receiptCode ?? ''}」？此操作不可撤销。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ReceiptList
