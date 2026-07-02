import { useEffect, useState } from 'react'
import { useReportStoreV2 } from './reportStore.v2'
import type { ReportRecord } from '../../types/api'
import { ReportWorkflowFormModal, type ReportWorkflowFormValues } from './ReportWorkflowFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { apiClient } from '../../api/client'

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  reviewing: '审核中',
  issued: '已签发',
  printed: '已发放',
  archived: '已归档',
}

const MATERIAL_LABELS: Record<string, string> = {
  steel: '钢材',
  cement: '水泥',
  concrete: '混凝土',
  sand: '砂',
  gravel: '碎石',
  rebar_mech: '钢筋机械连接',
  rebar_weld: '钢筋焊接连接',
}

export function ReportWorkflowList() {
  const { list, total, loading, error, fetchReports, createReport, deleteReport } = useReportStoreV2()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('draft')
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionTarget, setActionTarget] = useState<{ report: ReportRecord; action: WorkflowAction } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReportRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchReports({ page, pageSize: PAGE_SIZE, status })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status])

  const handleStatusChange = (val: string) => {
    setStatus(val)
    setPage(1)
    fetchReports({ page: 1, pageSize: PAGE_SIZE, status: val })
  }

  const handleCreate = async (values: ReportWorkflowFormValues) => {
    setSubmitting(true)
    try {
      await createReport({
        contractId: values.contractId,
        receiptId: values.receiptId,
        reportCode: values.reportCode,
        materialType: values.materialType,
        sampleIds: values.sampleIds,
        conclusion: values.conclusion,
        reportDate: values.reportDate,
        result: values.result,
      })
      setFormOpen(false)
      await fetchReports({ page, pageSize: PAGE_SIZE, status })
    } finally {
      setSubmitting(false)
    }
  }

  const handleWorkflowAction = async () => {
    if (!actionTarget) return
    setActionLoading(true)
    try {
      await apiClient.post(`/reports/${actionTarget.report.id}/review`, { action: actionTarget.action })
      setActionTarget(null)
      await fetchReports({ page, pageSize: PAGE_SIZE, status })
    } catch {
      // error is not critical for workflow actions
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReport(deleteTarget.id)
      setDeleteTarget(null)
      await fetchReports({ page, pageSize: PAGE_SIZE, status })
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const actionLabels: Record<WorkflowAction, string> = {
    submit: '提交审核',
    approve: '批准',
    reject: '退回',
    issue: '发放',
    archive: '归档',
  }

  const confirmMessages: Record<WorkflowAction, string> = {
    submit: '提交后报告将进入审核流程，是否继续？',
    approve: '批准后报告将签发，是否继续？',
    reject: '退回后报告将回到草稿状态，是否继续？',
    issue: '确认发放报告？',
    archive: '归档后报告将永久存档，是否继续？',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">报告流程</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          新建报告
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm">
        <label className="text-sm text-gray-600 flex items-center gap-1">
          状态筛选
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="draft">草稿</option>
            <option value="reviewing">审核中</option>
            <option value="issued">已签发</option>
            <option value="printed">已发放</option>
            <option value="archived">已归档</option>
          </select>
        </label>
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
              <th className="px-4 py-2 text-left">报告编号</th>
              <th className="px-4 py-2 text-left">合同编号</th>
              <th className="px-4 py-2 text-left">材料类型</th>
              <th className="px-4 py-2 text-left">样品数</th>
              <th className="px-4 py-2 text-left">检测日期</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">结论</th>
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
                <td className="px-4 py-2">{r.reportCode}</td>
                <td className="px-4 py-2">{r.contractId}</td>
                <td className="px-4 py-2">{MATERIAL_LABELS[r.materialType] ?? r.materialType}</td>
                <td className="px-4 py-2">{r.sampleIds?.length ?? 0}</td>
                <td className="px-4 py-2">{r.reportDate ? new Date(r.reportDate).toLocaleDateString('zh-CN') : '-'}</td>
                <td className="px-4 py-2">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="px-4 py-2">{r.conclusion || '-'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  {r.status === 'draft' && (
                    <>
                      <button
                        onClick={() => setActionTarget({ report: r, action: 'submit' })}
                        className="px-2 py-1 text-purple-600 hover:underline"
                      >
                        提交审核
                      </button>
                      <button
                        onClick={() => setFormOpen(true)}
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
                    </>
                  )}
                  {r.status === 'reviewing' && (
                    <>
                      <button
                        onClick={() => setActionTarget({ report: r, action: 'approve' })}
                        className="px-2 py-1 text-green-600 hover:underline"
                      >
                        批准
                      </button>
                      <button
                        onClick={() => setActionTarget({ report: r, action: 'reject' })}
                        className="px-2 py-1 text-orange-600 hover:underline"
                      >
                        退回
                      </button>
                    </>
                  )}
                  {r.status === 'issued' && (
                    <>
                      <button
                        onClick={() => setActionTarget({ report: r, action: 'issue' })}
                        className="px-2 py-1 text-green-600 hover:underline"
                      >
                        发放
                      </button>
                      <button
                        className="px-2 py-1 text-gray-400 cursor-default"
                      >
                        查看
                      </button>
                    </>
                  )}
                  {r.status === 'printed' && (
                    <>
                      <button
                        onClick={() => setActionTarget({ report: r, action: 'archive' })}
                        className="px-2 py-1 text-green-600 hover:underline"
                      >
                        归档
                      </button>
                      <button
                        className="px-2 py-1 text-gray-400 cursor-default"
                      >
                        查看
                      </button>
                    </>
                  )}
                  {r.status === 'archived' && (
                    <button className="px-2 py-1 text-gray-400 cursor-default">查看</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <ReportWorkflowFormModal
        open={formOpen}
        onSubmit={handleCreate}
        onCancel={() => setFormOpen(false)}
        loading={submitting}
      />

      {actionTarget && (
        <ConfirmModal
          open={true}
          title={`${actionLabels[actionTarget.action]}确认`}
          message={confirmMessages[actionTarget.action]}
          confirmText={actionLabels[actionTarget.action]}
          loading={actionLoading}
          danger={false}
          onConfirm={handleWorkflowAction}
          onCancel={() => setActionTarget(null)}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除报告「${deleteTarget?.reportCode ?? ''}」？此操作不可撤销。`}
        confirmText="确认删除"
        loading={deleting}
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

type WorkflowAction = 'submit' | 'approve' | 'reject' | 'issue' | 'archive'

export default ReportWorkflowList
