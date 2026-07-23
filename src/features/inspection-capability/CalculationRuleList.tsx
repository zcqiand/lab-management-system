import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface CalcRow {
  id: string
  inspectionObjectCode: string
  inspectionParameterCode: string
  objectName?: string
  parameterName?: string
  testingStandardCode?: string
  algorithmType: string
  specimenCount: number
  remark?: string
  sortOrder?: number
}

interface Opt {
  code: string
  name: string
}

const ALGORITHMS = ['simple_avg', 'compressive_strength', 'flexural_strength', 'steel_tensile', 'formula', 'manual']
const PAGE_SIZE = 50
const emptyForm = {
  inspectionObjectCode: '',
  inspectionParameterCode: '',
  testingStandardCode: '',
  algorithmType: 'manual',
  specimenCount: '1',
  remark: '',
}

export function CalculationRuleList() {
  const [rows, setRows] = useState<CalcRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [objects, setObjects] = useState<Opt[]>([])
  const [params, setParams] = useState<Opt[]>([])
  const [standards, setStandards] = useState<Opt[]>([])
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiClient
      .get<{ items: CalcRow[]; total: number }>('/inspection-calculation-rules', { params: { page, pageSize: String(PAGE_SIZE) } })
      .then((res) => {
        setRows(Array.isArray(res.data?.items) ? res.data.items : [])
        setTotal(typeof res.data?.total === 'number' ? res.data.total : 0)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [page])

  useEffect(() => {
    apiClient.get<{ items: Opt[] }>('/inspection-objects', { params: { page: 1, pageSize: '1000' } }).then((r) => setObjects(r.data?.items ?? [])).catch(() => {})
    apiClient.get<{ items: Opt[] }>('/inspection-parameters', { params: { page: 1, pageSize: '1000' } }).then((r) => setParams(r.data?.items ?? [])).catch(() => {})
    apiClient.get<{ items: Opt[] }>('/inspection-standards', { params: { page: 1, pageSize: '1000' } }).then((r) => setStandards(r.data?.items ?? [])).catch(() => {})
  }, [])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }
  const openEdit = (row: CalcRow) => {
    setEditId(row.id)
    setForm({
      inspectionObjectCode: row.inspectionObjectCode,
      inspectionParameterCode: row.inspectionParameterCode,
      testingStandardCode: row.testingStandardCode ?? '',
      algorithmType: row.algorithmType,
      specimenCount: String(row.specimenCount ?? 1),
      remark: row.remark ?? '',
    })
    setError(null)
    setOpen(true)
  }

  const save = async () => {
    setError(null)
    const payload = {
      inspectionObjectCode: form.inspectionObjectCode,
      inspectionParameterCode: form.inspectionParameterCode,
      testingStandardCode: form.testingStandardCode || undefined,
      algorithmType: form.algorithmType,
      specimenCount: Number(form.specimenCount) || 1,
      remark: form.remark || undefined,
    }
    try {
      if (editId) await apiClient.put(`/inspection-calculation-rules/${editId}`, payload)
      else await apiClient.post('/inspection-calculation-rules', payload)
      setOpen(false)
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败')
    }
  }

  const remove = async (id: string) => {
    await apiClient.delete(`/inspection-calculation-rules/${id}`)
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4" data-fn="M06.F05.I01">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">计算规则</h2>
        <button type="button" onClick={openCreate} data-fn="M06.F05.I02" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          新建计算规则
        </button>
      </header>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">检测项目</th>
              <th className="px-4 py-2 text-left">检测标准</th>
              <th className="px-4 py-2 text-left">检测参数</th>
              <th className="px-4 py-2 text-left">算法类型</th>
              <th className="px-4 py-2 text-left">试件数量</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.objectName ?? r.inspectionObjectCode}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.testingStandardCode ?? '-'}</td>
                <td className="px-4 py-2">{r.parameterName ?? r.inspectionParameterCode}</td>
                <td className="px-4 py-2 text-xs">{r.algorithmType}</td>
                <td className="px-4 py-2 text-xs">{r.specimenCount}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{r.remark ?? '-'}</td>
                <td className="px-4 py-2 text-xs whitespace-nowrap">
                  <button type="button" onClick={() => openEdit(r)} data-fn="M06.F05.I02" aria-label={`编辑 ${r.id}`} className="text-blue-600 hover:underline mr-3">编辑</button>
                  <button type="button" onClick={() => remove(r.id)} data-fn="M06.F05.I03" aria-label={`删除 ${r.id}`} className="text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="上一页" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-40">上一页</button>
          <span>第 {page} / {totalPages} 页</span>
          <button type="button" aria-label="下一页" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">下一页</button>
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">{editId ? '编辑计算规则' : '新建计算规则'}</h3>
            {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <label className="block text-sm">
              <span className="text-xs text-gray-600">检测项目</span>
              <select aria-label="检测项目" value={form.inspectionObjectCode} onChange={(e) => setForm({ ...form, inspectionObjectCode: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                <option value="">选择检测项目</option>
                {objects.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">检测参数</span>
              <select aria-label="检测参数" value={form.inspectionParameterCode} onChange={(e) => setForm({ ...form, inspectionParameterCode: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                <option value="">选择检测参数</option>
                {params.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">检测标准（可选）</span>
              <select aria-label="检测标准" value={form.testingStandardCode} onChange={(e) => setForm({ ...form, testingStandardCode: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                <option value="">不限</option>
                {standards.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">算法类型</span>
              <select aria-label="算法类型" value={form.algorithmType} onChange={(e) => setForm({ ...form, algorithmType: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                {ALGORITHMS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">试件数量</span>
              <input aria-label="试件数量" type="number" value={form.specimenCount} onChange={(e) => setForm({ ...form, specimenCount: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-gray-600">备注</span>
              <input aria-label="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100">取消</button>
              <button type="button" onClick={save} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalculationRuleList
