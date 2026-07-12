import { useCallback, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { ConfirmModal } from '../../components/ConfirmModal'
import { apiClient } from '../../api/client'
import type { SampleReceipt } from '../../types/api'

/** v2.0：任务安排——流程线第二环节（flowStatus='task_assignment'）。
 * 为接样单指定检测人员与计划检测日期；提交（支持批量）后进入「数据录入」；
 * 可退回「接样」；已提交的可由提交人撤回。
 * （原独立「检测任务表」已移除，任务信息直接记录在合并后的接样单上。）
 */
function AssignButton({ receipt, onAssign, refresh }: { receipt: SampleReceipt; onAssign: (r: SampleReceipt, refresh: () => Promise<void>) => void; refresh: () => Promise<void> }) {
  return (
    <button onClick={() => onAssign(receipt, refresh)} className="px-2 py-1 text-purple-600 hover:underline">
      安排
    </button>
  )
}

export function TaskAssignmentPage() {
  const [target, setTarget] = useState<SampleReceipt | null>(null)
  const [assigneeName, setAssigneeName] = useState('')
  const [plannedTestDate, setPlannedTestDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshAfterSave, setRefreshAfterSave] = useState<(() => Promise<void>) | null>(null)

  const openAssign = (r: SampleReceipt, refresh: () => Promise<void>) => {
    setTarget(r)
    setAssigneeName(r.assigneeName ?? '')
    setPlannedTestDate(r.plannedTestDate ?? new Date().toISOString().split('T')[0] ?? '')
    setRefreshAfterSave(() => refresh)
  }

  const rowAction = useCallback((r: SampleReceipt, refresh: () => Promise<void>) => (
    <AssignButton receipt={r} onAssign={openAssign} refresh={refresh} />
  ), [])

  const handleSave = async () => {
    if (!target) return
    setSaving(true)
    try {
      await apiClient.put(`/receipts/${target.id}`, {
        assigneeName: assigneeName.trim(),
        assigneeId: assigneeName.trim() ? `u-${assigneeName.trim()}` : undefined,
        plannedTestDate,
      })
      setTarget(null)
      await refreshAfterSave?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <FlowStagePage
        title="任务安排"
        stage="task_assignment"
        subtitle="指定检测人员后提交进入数据录入"
        extraColumns={[
          {
            header: '检测人员',
            render: (r) => r.assigneeName ?? <span className="text-gray-400">待安排</span>,
          },
          {
            header: '计划检测日期',
            render: (r) => r.plannedTestDate ?? <span className="text-gray-400">—</span>,
          },
        ]}
        rowActions={rowAction}
      />

      <ConfirmModal
        open={target !== null}
        title={`任务安排 — ${target?.commissionCode ?? ''}`}
        message={
          <div className="space-y-3 text-left text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测人员</label>
              <input
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="如：张三"
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">计划检测日期</label>
              <input
                type="date"
                value={plannedTestDate}
                onChange={(e) => setPlannedTestDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        }
        confirmText="保存"
        loading={saving}
        onConfirm={handleSave}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}

export default TaskAssignmentPage
