import { useCallback, useEffect, useRef, useState } from 'react'
import { useContractStore } from '../contracts/contractStore'
import { ReceiptFormModal, type ReceiptFormValues } from './ReceiptFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { apiClient } from '../../api/client'
import { SampleManagerModal } from '../samples/SampleManagerModal'
import { useCategories, categoryName } from '../categories/useCategories'
import type { SampleReceipt } from '../../types/api'

/** v2.0：接样管理——流程线首环节（flowStatus='receiving'）。
 * 在此新建/编辑接样单；提交（支持批量）后进入「任务安排」；
 * 已提交但未被处理的单据可由提交人在下方「我提交的（可撤回）」区块撤回。
 */
function ReceiptRowActions({ receipt, onEdit, onSample, onDelete }: { receipt: SampleReceipt; onEdit: (r: SampleReceipt) => void; onSample: (r: SampleReceipt) => void; onDelete: (r: SampleReceipt) => void }) {
  return (
    <>
      <button onClick={() => onEdit(receipt)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
      <button onClick={() => onSample(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">样品</button>
      <button onClick={() => onDelete(receipt)} className="px-2 py-1 text-red-600 hover:underline">删除</button>
    </>
  )
}

export function ReceiptList() {
  const { list: contracts, fetchContracts } = useContractStore()
  const { categories } = useCategories()
  const [sampleTarget, setSampleTarget] = useState<SampleReceipt | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<SampleReceipt | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SampleReceipt | null>(null)
  const [deleting, setDeleting] = useState(false)
  const refreshRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (contracts.length === 0) {
      fetchContracts({ page: 1, pageSize: 100 })
    }
  }, [contracts.length, fetchContracts])

  const handleSubmit = async (values: ReceiptFormValues) => {
    setSubmitting(true)
    try {
      const payload = {
        contractId: values.contractId,
        categoryCode: values.categoryCode,
        receiptCode: values.receiptCode,
        receivedDate: values.receivedDate,
        receivedBy: values.receivedBy,
        sampleSource: values.sampleSource,
        testCategory: values.testCategory,
        testEnvironment: values.testEnvironment,
        mainEquipment: values.mainEquipment,
        remark: values.remark,
      }
      if (formMode === 'create') {
        await apiClient.post('/receipts', payload)
      } else if (editing) {
        await apiClient.put(`/receipts/${editing.id}`, payload)
      }
      setFormOpen(false)
      await refreshRef.current?.()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/receipts/${deleteTarget.id}`)
      setDeleteTarget(null)
      await refreshRef.current?.()
    } finally {
      setDeleting(false)
    }
  }

  const contractCode = (id: string) => contracts.find((c) => c.id === id)?.contractCode ?? id

  const toolbarAction = useCallback((refresh: () => Promise<void>) => {
    refreshRef.current = refresh
    return (
      <button
        onClick={() => {
          setFormMode('create')
          setEditing(null)
          setFormOpen(true)
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        新建接样
      </button>
    )
  }, [])

  const rowAction = useCallback((r: SampleReceipt) => (
    <ReceiptRowActions receipt={r} onEdit={(r) => { setFormMode('edit'); setEditing(r); setFormOpen(true) }} onSample={setSampleTarget} onDelete={setDeleteTarget} />
  ), [])

  return (
    <>
      <FlowStagePage
        title="接样管理"
        stage="receiving"
        submitLabel="提交"
        extraColumns={[
          { header: '合同编号', render: (r) => contractCode(r.contractId) },
          { header: '报告类别', render: (r) => categoryName(categories, r.categoryCode) },
          { header: '检测类别', render: (r) => r.testCategory },
        ]}
        toolbar={toolbarAction}
        rowActions={rowAction}
      />

      <ReceiptFormModal
        open={formOpen}
        mode={formMode}
        initialValues={editing ?? undefined}
        contracts={contracts}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={submitting}
      />

      {sampleTarget && (
        <SampleManagerModal receipt={sampleTarget} onClose={() => setSampleTarget(null)} />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除接样「${deleteTarget?.receiptCode ?? ''}」？其下样品与检测记录将一并删除。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default ReceiptList
