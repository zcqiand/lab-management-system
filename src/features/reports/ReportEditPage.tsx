import { useEffect, useState } from 'react'
import { useReportStore } from './reportStore'
import { ReportFormModal, type ReportFormValues } from './ReportFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { HasPermission } from '../auth/hasPermission'
import type { Report, ReportQuery } from '../../types/api'

const PAGE_SIZE = 10

export function ReportEditPage() {
  const { list, total, loading, error, fetchReports, createReport, updateReport, deleteReport, reviewReport } =
    useReportStore()

  const [page, setPage] = useState(1)
  const [keyword, setSearchKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Report | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildQuery = (p: number): ReportQuery => ({
    page: p, pageSize: PAGE_SIZE, status: 'draft', keyword: keyword || undefined,
  })

  useEffect(() => { fetchReports(buildQuery(page)) }, [page]) // eslint-disable-line

  const handleSearch = () => { setPage(1); fetchReports(buildQuery(1)) }

  const openCreate = () => { setFormMode('create'); setEditing(null); setFormOpen(true) }
  const openEdit = (r: Report) => { setFormMode('edit'); setEditing(r); setFormOpen(true) }

  const handleSubmit = async (values: ReportFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await createReport({ sampleId: values.sampleId, title: values.title, conclusion: values.conclusion })
      } else if (values.id) {
        await updateReport(values.id, { title: values.title, conclusion: values.conclusion })
      }
      setFormOpen(false); await fetchReports(buildQuery(page))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteReport(deleteTarget.id); setDeleteTarget(null); await fetchReports(buildQuery(page)) }
    finally { setDeleting(false) }
  }

  const handleSubmitReview = async (r: Report) => {
    await reviewReport(r.id, 'submit')
    await fetchReports(buildQuery(page))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">报告编辑</h2>
        <HasPermission permission="report:write">
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">新建报告</button>
        </HasPermission>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm">
        <input
          placeholder="搜索标题/样品"
          value={keyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-50"
        />
        <button onClick={handleSearch} className="px-4 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-800">搜索</button>
      </div>

      {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">标题</th>
              <th className="px-4 py-2 text-left">样品ID</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">结论</th>
              <th className="px-4 py-2 text-left">签发时间</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无草稿报告</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.sampleId}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.conclusion}</td>
                <td className="px-4 py-2">{r.issuedAt ?? '-'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <HasPermission permission="report:write">
                    <button onClick={() => openEdit(r)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
                  </HasPermission>
                  <HasPermission permission="report:write">
                    <button onClick={() => handleSubmitReview(r)} className="px-2 py-1 text-purple-600 hover:underline">提交审核</button>
                  </HasPermission>
                  <HasPermission permission="report:write">
                    <button onClick={() => setDeleteTarget(r)} className="px-2 py-1 text-red-600 hover:underline">删除</button>
                  </HasPermission>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
        </div>
      </div>

      <ReportFormModal open={formOpen} mode={formMode} initialValues={editing ?? undefined} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} loading={submitting} />
      <ConfirmModal open={deleteTarget !== null} title="删除确认" message={`确定删除报告「${deleteTarget?.title ?? ''}」？`} loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

export default ReportEditPage
