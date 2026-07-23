import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { AssociationManager } from './AssociationManager'

interface ReportName {
  id: string
  code: string
  name: string
  fullName?: string
  templatePath?: string
  description?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const PAGE_SIZE = 50

type AssocKind = 'objects' | 'testing' | 'judgment' | 'parameters' | null

const emptyForm = {
  code: '',
  name: '',
  fullName: '',
  templatePath: '',
  description: '',
  sortOrder: '0',
}

export function ReportNameList() {
  const [rows, setRows] = useState<ReportName[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [assocTarget, setAssocTarget] = useState<{ row: ReportName; kind: AssocKind } | null>(null)

  const load = () => {
    setLoading(true)
    apiClient
      .get<{ items: ReportName[]; total: number }>('/report-names', {
        params: { page, pageSize: String(PAGE_SIZE) },
      })
      .then((res) => {
        setRows(Array.isArray(res.data?.items) ? res.data.items : [])
        setTotal(typeof res.data?.total === 'number' ? res.data.total : 0)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [page])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setError(null)
    setFormOpen(true)
  }
  const openEdit = (row: ReportName) => {
    setEditId(row.id)
    setForm({
      code: row.code,
      name: row.name,
      fullName: row.fullName ?? '',
      templatePath: row.templatePath ?? '',
      description: row.description ?? '',
      sortOrder: String(row.sortOrder ?? 0),
    })
    setError(null)
    setFormOpen(true)
  }

  const save = async () => {
    setError(null)
    const payload = {
      code: form.code,
      name: form.name,
      fullName: form.fullName || undefined,
      templatePath: form.templatePath || undefined,
      description: form.description || undefined,
      sortOrder: Number(form.sortOrder) || 0,
    }
    try {
      if (editId) await apiClient.put(`/report-names/${editId}`, payload)
      else await apiClient.post('/report-names', payload)
      setFormOpen(false)
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败')
    }
  }

  const remove = async (id: string) => {
    try {
      await apiClient.delete(`/report-names/${id}`)
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '删除失败')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const assocTitle: Record<Exclude<AssocKind, null>, string> = {
    objects: '关联检测项目',
    testing: '关联检测依据',
    judgment: '关联判定依据',
    parameters: '关联检测参数',
  }

  return (
    <div className="space-y-4" data-fn="M06.F07.I01">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">报告名称</h2>
        <button
          type="button"
          onClick={openCreate}
          data-fn="M06.F07.I02"
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          新建报告名称
        </button>
      </header>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">编码</th>
              <th className="px-4 py-2 text-left">简称</th>
              <th className="px-4 py-2 text-left">全称</th>
              <th className="px-4 py-2 text-left">模板路径</th>
              <th className="px-4 py-2 text-left">排序</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{r.fullName ?? '-'}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.templatePath ?? '-'}</td>
                <td className="px-4 py-2 text-xs">{r.sortOrder}</td>
                <td className="px-4 py-2 text-xs whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    data-fn="M06.F07.I02"
                    aria-label={`编辑 ${r.id}`}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    data-fn="M06.F07.I03"
                    aria-label={`删除 ${r.id}`}
                    className="text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="上一页"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            上一页
          </button>
          <span>第 {page} / {totalPages} 页</span>
          <button
            type="button"
            aria-label="下一页"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 4 个关联按钮组 */}
      <div className="bg-white rounded shadow p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">关联管理</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={rows.length === 0}
            data-fn="M06.F07.I04"
            onClick={() => rows[0] && setAssocTarget({ row: rows[0], kind: 'objects' })}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            关联检测项目
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            data-fn="M06.F07.I05"
            onClick={() => rows[0] && setAssocTarget({ row: rows[0], kind: 'testing' })}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            关联检测依据
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            data-fn="M06.F07.I06"
            onClick={() => rows[0] && setAssocTarget({ row: rows[0], kind: 'judgment' })}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            关联判定依据
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            data-fn="M06.F07.I07"
            onClick={() => rows[0] && setAssocTarget({ row: rows[0], kind: 'parameters' })}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            关联检测参数
          </button>
        </div>
        <p className="text-xs text-gray-400">提示：关联按钮作用于列表第一条记录；精细管理可在「关联」弹窗内切换报告名称。</p>
      </div>

      {formOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">{editId ? '编辑报告名称' : '新建报告名称'}</h3>
            {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <label className="block text-sm">
              <span className="text-xs text-gray-600">编码</span>
              <input aria-label="编码" value={form.code} disabled={!!editId} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5 disabled:bg-gray-100" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">简称（主显示名）</span>
              <input aria-label="简称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">全称（可选）</span>
              <input aria-label="全称" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">模板路径（可选）</span>
              <input aria-label="模板路径" value={form.templatePath} onChange={(e) => setForm({ ...form, templatePath: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5 font-mono text-xs" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">描述（可选）</span>
              <input aria-label="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">排序</span>
              <input aria-label="排序" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100">取消</button>
              <button type="button" onClick={save} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {assocTarget && assocTarget.kind && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{assocTitle[assocTarget.kind]} — {assocTarget.row.code}（{assocTarget.row.name}）</h3>
              <button type="button" onClick={() => setAssocTarget(null)} className="text-gray-400 hover:text-gray-700">×</button>
            </div>
            {assocTarget.kind === 'objects' && (
              <AssociationManager
                ariaLabel={`${assocTarget.row.code} 关联检测项目`}
                endpoint="/inspection-object-report-names"
                parentParam="reportNameCode"
                parentCode={assocTarget.row.code}
                targetLabel="检测项目"
                targetEndpoint="/inspection-objects"
                targetParam="inspectionObjectCode"
                targetValueKey="code"
                targetTextKey="name"
                fnId="M06.F07.I04"
              />
            )}
            {assocTarget.kind === 'testing' && (
              <AssociationManager
                ariaLabel={`${assocTarget.row.code} 关联检测依据`}
                endpoint="/inspection-report-name-standards"
                parentParam="reportNameCode"
                parentCode={assocTarget.row.code}
                targetLabel="检测标准"
                targetEndpoint="/inspection-standards"
                targetParam="inspectionStandardCode"
                targetValueKey="code"
                targetTextKey="code"
                fnId="M06.F07.I05"
              />
            )}
            {assocTarget.kind === 'judgment' && (
              <AssociationManager
                ariaLabel={`${assocTarget.row.code} 关联判定依据`}
                endpoint="/inspection-report-name-standards"
                parentParam="reportNameCode"
                parentCode={assocTarget.row.code}
                targetLabel="检测标准"
                targetEndpoint="/inspection-standards"
                targetParam="inspectionStandardCode"
                targetValueKey="code"
                targetTextKey="code"
                fnId="M06.F07.I06"
              />
            )}
            {assocTarget.kind === 'parameters' && (
              <AssociationManager
                ariaLabel={`${assocTarget.row.code} 关联检测参数`}
                endpoint="/inspection-report-name-parameters"
                parentParam="reportNameCode"
                parentCode={assocTarget.row.code}
                targetLabel="检测参数"
                targetEndpoint="/inspection-parameters"
                targetParam="inspectionParameterCode"
                targetValueKey="code"
                targetTextKey="name"
                fnId="M06.F07.I07"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportNameList