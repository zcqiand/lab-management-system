import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface TechRow {
  id: string
  inspectionObjectCode: string
  inspectionParameterCode: string
  objectName?: string
  parameterName?: string
  judgmentStandardCode: string
  brand?: string
  model?: string
  grade?: string
  spec?: string
  minValue?: number
  maxValue?: number
  comparison: string
  remark?: string
  sortOrder?: number
}

interface Opt {
  code: string
  name: string
}

const COMPARISONS = ['≥', '≤', '=', 'range', 'eq']
const PAGE_SIZE = 50
const emptyForm = {
  inspectionObjectCode: '',
  inspectionParameterCode: '',
  judgmentStandardCode: '',
  brand: '',
  model: '',
  grade: '',
  spec: '',
  minValue: '',
  maxValue: '',
  comparison: '≥',
  remark: '',
}

function requirementText(r: TechRow): string {
  const parts: string[] = []
  if (r.minValue != null) parts.push(`${r.comparison ?? '≥'}${r.minValue}`)
  if (r.maxValue != null) parts.push(`≤${r.maxValue}`)
  return parts.length > 0 ? parts.join(' ') : (r.comparison ?? '-')
}

export function TechnicalRequirementList() {
  const [rows, setRows] = useState<TechRow[]>([])
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
      .get<{ items: TechRow[]; total: number }>('/inspection-technical-requirements', { params: { page, pageSize: String(PAGE_SIZE) } })
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
  const openEdit = (row: TechRow) => {
    setEditId(row.id)
    setForm({
      inspectionObjectCode: row.inspectionObjectCode,
      inspectionParameterCode: row.inspectionParameterCode,
      judgmentStandardCode: row.judgmentStandardCode,
      brand: row.brand ?? '',
      model: row.model ?? '',
      grade: row.grade ?? '',
      spec: row.spec ?? '',
      minValue: row.minValue != null ? String(row.minValue) : '',
      maxValue: row.maxValue != null ? String(row.maxValue) : '',
      comparison: row.comparison ?? '≥',
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
      judgmentStandardCode: form.judgmentStandardCode,
      brand: form.brand || undefined,
      model: form.model || undefined,
      grade: form.grade || undefined,
      spec: form.spec || undefined,
      minValue: form.minValue === '' ? undefined : Number(form.minValue),
      maxValue: form.maxValue === '' ? undefined : Number(form.maxValue),
      comparison: form.comparison,
      remark: form.remark || undefined,
    }
    try {
      if (editId) await apiClient.put(`/inspection-technical-requirements/${editId}`, payload)
      else await apiClient.post('/inspection-technical-requirements', payload)
      setOpen(false)
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败')
    }
  }

  const remove = async (id: string) => {
    await apiClient.delete(`/inspection-technical-requirements/${id}`)
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4" data-fn="M06.F06.I01">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">技术要求</h2>
        <button type="button" onClick={openCreate} data-fn="M06.F06.I02" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          新建技术要求
        </button>
      </header>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">检测项目</th>
              <th className="px-3 py-2 text-left">检测标准</th>
              <th className="px-3 py-2 text-left">检测参数</th>
              <th className="px-3 py-2 text-left">牌号</th>
              <th className="px-3 py-2 text-left">型号</th>
              <th className="px-3 py-2 text-left">等级</th>
              <th className="px-3 py-2 text-left">规格</th>
              <th className="px-3 py-2 text-left">要求</th>
              <th className="px-3 py-2 text-left">备注</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.objectName ?? r.inspectionObjectCode}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.judgmentStandardCode}</td>
                <td className="px-3 py-2">{r.parameterName ?? r.inspectionParameterCode}</td>
                <td className="px-3 py-2 text-xs">{r.brand ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{r.model ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{r.grade ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{r.spec ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{requirementText(r)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.remark ?? '-'}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <button type="button" onClick={() => openEdit(r)} data-fn="M06.F06.I02" aria-label={`编辑 ${r.id}`} className="text-blue-600 hover:underline mr-3">编辑</button>
                  <button type="button" onClick={() => remove(r.id)} data-fn="M06.F06.I03" aria-label={`删除 ${r.id}`} className="text-red-600 hover:underline">删除</button>
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
            <h3 className="text-lg font-semibold">{editId ? '编辑技术要求' : '新建技术要求'}</h3>
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
              <span className="text-xs text-gray-600">判定标准</span>
              <select aria-label="判定标准" value={form.judgmentStandardCode} onChange={(e) => setForm({ ...form, judgmentStandardCode: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                <option value="">选择判定标准</option>
                {standards.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm"><span className="text-xs text-gray-600">牌号</span><input aria-label="牌号" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
              <label className="block text-sm"><span className="text-xs text-gray-600">型号</span><input aria-label="型号" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
              <label className="block text-sm"><span className="text-xs text-gray-600">等级</span><input aria-label="等级" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
              <label className="block text-sm"><span className="text-xs text-gray-600">规格</span><input aria-label="规格" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-sm"><span className="text-xs text-gray-600">比较</span>
                <select aria-label="比较" value={form.comparison} onChange={(e) => setForm({ ...form, comparison: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5">
                  {COMPARISONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="text-xs text-gray-600">下限</span><input aria-label="下限" type="number" value={form.minValue} onChange={(e) => setForm({ ...form, minValue: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
              <label className="block text-sm"><span className="text-xs text-gray-600">上限</span><input aria-label="上限" type="number" value={form.maxValue} onChange={(e) => setForm({ ...form, maxValue: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
            </div>
            <label className="block text-sm"><span className="text-xs text-gray-600">备注</span><input aria-label="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
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

export default TechnicalRequirementList
