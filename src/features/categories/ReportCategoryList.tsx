import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { ReportCategory, ExtFieldDef, SummaryType } from '../../types/api'

const SUMMARY_TYPE_LABELS: Record<SummaryType, string> = {
  material: '原材料汇总（品种/规格/牌号/厂家/代表数量）',
  concrete: '混凝土抗压汇总（部位/浇筑时间/强度值）',
  connection: '连接接头汇总（结构部位/品种规格/浇筑时间）',
}

/** 报告类别管理——原「材料种类」升级为可维护码表：
 * 报告标题、汇总口径、样品扩展属性（新建样品时按此动态渲染）均在此维护。
 */
export function ReportCategoryList() {
  const [list, setList] = useState<ReportCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ReportCategory | null>(null)
  const [form, setForm] = useState({ code: '', name: '', reportTitle: '', summaryType: 'material' as SummaryType, summaryName: '', remark: '' })
  const [extFields, setExtFields] = useState<ExtFieldDef[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReportCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ items: ReportCategory[] }>('/report-categories', { params: { page: 1, pageSize: 100 } })
      setList(res.data.items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openCreate = () => {
    setEditing(null)
    setForm({ code: '', name: '', reportTitle: '', summaryType: 'material', summaryName: '', remark: '' })
    setExtFields([])
    setFormOpen(true)
  }

  const openEdit = (c: ReportCategory) => {
    setEditing(c)
    setForm({ code: c.code, name: c.name, reportTitle: c.reportTitle, summaryType: c.summaryType, summaryName: c.summaryName, remark: c.remark ?? '' })
    setExtFields(c.extFields.map((f) => ({ ...f })))
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        extFields: extFields.filter((f) => f.key.trim() && f.label.trim()),
      }
      if (editing) {
        await apiClient.put(`/report-categories/${editing.code}`, payload)
      } else {
        await apiClient.post('/report-categories', payload)
      }
      setFormOpen(false)
      await fetchList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await apiClient.delete(`/report-categories/${deleteTarget.code}`)
      setDeleteTarget(null)
      await fetchList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '删除失败')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">报告类别</h2>
          <p className="text-xs text-gray-500 mt-1">
            报告类别决定：样品扩展属性、可选型号/规格/等级/牌号、关联的检测标准、报告模板与统计汇总口径
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          新建类别
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
              <th className="px-4 py-2 text-left">编码</th>
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">报告标题</th>
              <th className="px-4 py-2 text-left">汇总口径</th>
              <th className="px-4 py-2 text-left">扩展属性</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {list.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-gray-600">{c.reportTitle}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{SUMMARY_TYPE_LABELS[c.summaryType].split('（')[0]}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{c.extFields.map((f) => f.label).join('、') || '—'}</td>
                <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => setDeleteTarget(c)} className="px-2 py-1 text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">{editing ? '编辑报告类别' : '新建报告类别'}</h3>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">编码（不可改）</label>
                  <input
                    value={form.code}
                    disabled={Boolean(editing)}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="如 steel"
                    className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 钢材" className="w-full border rounded px-2 py-1.5" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">报告标题</label>
                <input value={form.reportTitle} onChange={(e) => setForm({ ...form, reportTitle: e.target.value })} placeholder="如 钢筋力学性能、工艺性能、重量偏差检测报告" className="w-full border rounded px-2 py-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">汇总口径</label>
                  <select value={form.summaryType} onChange={(e) => setForm({ ...form, summaryType: e.target.value as SummaryType })} className="w-full border rounded px-2 py-1.5">
                    {(Object.keys(SUMMARY_TYPE_LABELS) as SummaryType[]).map((t) => (
                      <option key={t} value={t}>{SUMMARY_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">汇总表名称</label>
                  <input value={form.summaryName} onChange={(e) => setForm({ ...form, summaryName: e.target.value })} placeholder="如 钢材试验报告汇总表" className="w-full border rounded px-2 py-1.5" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">样品扩展属性（新建样品时按此渲染输入项）</label>
                  <button onClick={() => setExtFields([...extFields, { key: '', label: '' }])} className="text-blue-600 text-xs hover:underline">
                    + 添加属性
                  </button>
                </div>
                <div className="space-y-2">
                  {extFields.length === 0 && <p className="text-xs text-gray-400">暂无扩展属性</p>}
                  {extFields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={f.key}
                        onChange={(e) => setExtFields(extFields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                        placeholder="字段键（英文，如 furnaceNo）"
                        className="border rounded px-2 py-1.5 flex-1 font-mono text-xs"
                      />
                      <input
                        value={f.label}
                        onChange={(e) => setExtFields(extFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                        placeholder="显示名（如 炉号（批号））"
                        className="border rounded px-2 py-1.5 flex-1"
                      />
                      <button onClick={() => setExtFields(extFields.filter((_, j) => j !== i))} className="text-red-500 hover:underline text-xs">
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="w-full border rounded px-2 py-1.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">取消</button>
              <button onClick={handleSave} disabled={saving || !form.code.trim() || !form.name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除报告类别「${deleteTarget?.name ?? ''}」？已被接样单引用的类别不能删除。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ReportCategoryList
