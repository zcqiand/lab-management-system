import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { AlgorithmType, CalculationRule } from '../../types/api'

const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  simple_avg: '简单平均',
  compressive_strength: '混凝土抗压',
}

interface FormValues {
  parameterCode: string
  algorithmType: AlgorithmType
  specimenCount: string
  unit: string
  remark: string
}

/** 计算规则管理页 */
export function CalculationRuleList() {
  const [parameterCode, setParameterCode] = useState('')
  const [list, setList] = useState<CalculationRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalculationRule | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({
    parameterCode: '',
    algorithmType: 'simple_avg',
    specimenCount: '',
    unit: '',
    remark: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CalculationRule | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: '1', pageSize: '200' }
      if (parameterCode) params.parameterCode = parameterCode
      const res = await apiClient.get<{ items: CalculationRule[] }>('/calculation-rules', { params })
      setList(res.data.items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [parameterCode])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openCreate = () => {
    setEditing(null)
    setFormValues({
      parameterCode: parameterCode,
      algorithmType: 'simple_avg',
      specimenCount: '',
      unit: '',
      remark: '',
    })
    setFormOpen(true)
  }

  const openEdit = (item: CalculationRule) => {
    setEditing(item)
    setFormValues({
      parameterCode: item.parameterCode,
      algorithmType: item.algorithmType,
      specimenCount: String(item.specimenCount),
      unit: item.unit ?? '',
      remark: item.remark ?? '',
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formValues.parameterCode || !formValues.specimenCount.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        parameterCode: formValues.parameterCode,
        algorithmType: formValues.algorithmType,
        specimenCount: Number(formValues.specimenCount),
        unit: formValues.unit || undefined,
        remark: formValues.remark || undefined,
      }
      if (editing) {
        await apiClient.put(`/calculation-rules/${editing.id}`, payload)
      } else {
        await apiClient.post('/calculation-rules', payload)
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
    try {
      await apiClient.delete(`/calculation-rules/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchList()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">计算规则</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          新建
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm text-sm">
        <label className="text-gray-600">检测参数：</label>
        <input
          value={parameterCode}
          onChange={(e) => setParameterCode(e.target.value)}
          placeholder="参数编码"
          className="border rounded px-2 py-1.5 w-40"
        />
        <button
          onClick={fetchList}
          className="px-3 py-1.5 bg-gray-100 border rounded hover:bg-gray-200 text-gray-700 text-xs"
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
              <th className="px-4 py-2 text-left">检测参数编码</th>
              <th className="px-4 py-2 text-left">算法类型</th>
              <th className="px-4 py-2 text-left">试件数量</th>
              <th className="px-4 py-2 text-left">单位</th>
              <th className="px-4 py-2 text-left">备注</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
            {list.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{item.parameterCode}</td>
                <td className="px-4 py-2">{ALGORITHM_LABELS[item.algorithmType] ?? item.algorithmType}</td>
                <td className="px-4 py-2">{item.specimenCount}</td>
                <td className="px-4 py-2">{item.unit ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{item.remark ?? ''}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => openEdit(item)} className="px-2 py-1 text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => setDeleteTarget(item)} className="px-2 py-1 text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={formOpen}
        title={editing ? '编辑计算规则' : '新建计算规则'}
        message={
          <div className="space-y-3 text-left text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测参数编码</label>
              <input
                value={formValues.parameterCode}
                onChange={(e) => setFormValues((v) => ({ ...v, parameterCode: e.target.value }))}
                disabled={Boolean(editing)}
                className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">算法类型</label>
              <select
                value={formValues.algorithmType}
                onChange={(e) => setFormValues((v) => ({ ...v, algorithmType: e.target.value as AlgorithmType }))}
                className="w-full border rounded px-2 py-1.5"
              >
                {Object.entries(ALGORITHM_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">试件数量</label>
              <input
                type="number"
                value={formValues.specimenCount}
                onChange={(e) => setFormValues((v) => ({ ...v, specimenCount: e.target.value }))}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">单位</label>
              <input
                value={formValues.unit}
                onChange={(e) => setFormValues((v) => ({ ...v, unit: e.target.value }))}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
              <input
                value={formValues.remark}
                onChange={(e) => setFormValues((v) => ({ ...v, remark: e.target.value }))}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
          </div>
        }
        confirmText="保存"
        loading={saving}
        onConfirm={handleSave}
        onCancel={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除「${deleteTarget?.parameterCode ?? ''}」？`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CalculationRuleList
