import { useCallback, useEffect, useRef, useState } from 'react'
import { useContractStore } from '../contracts/contractStore'
import { ReceiptFormModal, type ReceiptFormValues } from './ReceiptFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { apiClient } from '../../api/client'
import { useCategories, categoryName } from '../categories/useCategories'
import type { SampleReceipt } from '../../types/api'

/** v2.0：接样管理——显示全部接样单，已提交到后续阶段的单不可编辑/删除，仅可查看。 */
function ReceiptRowActions({ receipt, onEdit, onDelete }: { receipt: SampleReceipt; onEdit: (r: SampleReceipt) => void; onDelete: (r: SampleReceipt) => void }) {
  return (
    <>
      <button onClick={() => onEdit(receipt)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
      <button onClick={() => onDelete(receipt)} className="px-2 py-1 text-red-600 hover:underline">删除</button>
    </>
  )
}

export function ReceiptList() {
  const { list: contracts, fetchContracts } = useContractStore()
  const { categories } = useCategories()
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
        commissionCode: values.commissionCode,
        commissionDate: values.commissionDate,
        projectName: values.projectName,
        clientUnit: values.clientUnit,
        buildingUnit: values.buildingUnit,
        supervisorUnit: values.supervisorUnit,
        constructionUnit: values.constructionUnit,
        witnessUnit: values.witnessUnit,
        samplingLocation: values.samplingLocation,
        witness: values.witness,
        witnessPhone: values.witnessPhone,
        inspector: values.inspector,
        inspectorPhone: values.inspectorPhone,
        receivedBy: values.receivedBy,
        sampleSource: values.sampleSource,
        testCategory: values.testCategory,
        judgmentBasis: values.judgmentBasis,
        testingBasis: values.testingBasis,
        testParameters: values.testParameters,
        remark: values.remark,
      }
      if (formMode === 'create') {
        const res = await apiClient.post<SampleReceipt>('/receipts', payload)
        setFormMode('edit')
        setEditing(res.data)
      } else if (editing) {
        await apiClient.put(`/receipts/${editing.id}`, payload)
      }
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

  const rowActions = useCallback((r: SampleReceipt) => {
    if (r.flowStatus === 'receiving') {
      return <ReceiptRowActions receipt={r} onEdit={(r) => { setFormMode('edit'); setEditing(r); setFormOpen(true) }} onDelete={setDeleteTarget} />
    }
    return <span className="text-gray-400 text-xs">已提交</span>
  }, [])

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
        rowActions={rowActions}
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

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除接样「${deleteTarget?.commissionCode ?? ''}」？其下样品与检测记录将一并删除。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default ReceiptList
