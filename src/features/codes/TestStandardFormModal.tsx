import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { TestStandard, StandardType, TestParameter } from '../../types/api'
import { apiClient } from '../../api/client'

export interface TestStandardFormValues {
  code: string
  name: string
  type: StandardType
  remark?: string
}

interface TestStandardFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<TestStandard>
  onSubmit: (values: TestStandardFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const TYPE_OPTIONS: { label: string; value: StandardType }[] = [
  { label: '国家标准', value: 'national' },
  { label: '行业标准', value: 'industry' },
  { label: '地方标准', value: 'local' },
  { label: '企业标准', value: 'enterprise' },
]

/** 检测标准表单（v3）——编辑时可维护标准↔检测参数关联 */
export function TestStandardFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: TestStandardFormModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<StandardType>('national')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})

  // 关联参数
  const [linkedParams, setLinkedParams] = useState<{ parameterCode: string; name: string }[]>([])
  const [allParams, setAllParams] = useState<TestParameter[]>([])
  const [addParamOpen, setAddParamOpen] = useState(false)
  const [selectedParam, setSelectedParam] = useState('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    apiClient.get<{ items: TestParameter[] }>('/test-parameters', { params: { page: 1, pageSize: 200 } })
      .then((res) => setAllParams(res.data.items))
  }, [])

  const loadLinkedParams = useCallback((standardCode: string) => {
    apiClient.get<{ items: { parameterCode: string }[] }>('/standard-parameters', { params: { standardCode, page: 1, pageSize: 200 } })
      .then((res) => {
        const linked = res.data.items.map((sp) => {
          const param = allParams.find((p) => p.code === sp.parameterCode)
          return { parameterCode: sp.parameterCode, name: param?.name ?? sp.parameterCode }
        })
        setLinkedParams(linked)
      })
  }, [allParams])

  useEffect(() => {
    if (open && mode === 'edit' && initialValues?.code) {
      loadLinkedParams(initialValues.code)
    }
    if (open) {
      setCode(initialValues?.code ?? '')
      setName(initialValues?.name ?? '')
      setType(initialValues?.type ?? 'national')
      setRemark(initialValues?.remark ?? '')
      setErrors({})
      setLinkedParams([])
      setAddParamOpen(false)
      setSelectedParam('')
    }
  }, [open, initialValues, mode, loadLinkedParams])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!code.trim()) next.code = '请输入标准编号'
    if (!name.trim()) next.name = '请输入标准名称'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit({ code: code.trim(), name: name.trim(), type, remark: remark.trim() || undefined })
  }

  const handleAddParam = async () => {
    if (!selectedParam || !initialValues?.code) return
    setLinking(true)
    try {
      await apiClient.post('/standard-parameters', { standardCode: initialValues.code, parameterCode: selectedParam })
      setAddParamOpen(false)
      setSelectedParam('')
      loadLinkedParams(initialValues.code)
    } catch {
      // ignore
    } finally {
      setLinking(false)
    }
  }

  const handleRemoveParam = async (parameterCode: string) => {
    if (!initialValues?.code) return
    // 找到对应的 id
    try {
      const res = await apiClient.get<{ items: { id: string; parameterCode: string }[] }>('/standard-parameters', {
        params: { standardCode: initialValues.code, page: 1, pageSize: 200 }
      })
      const link = res.data.items.find((item) => item.parameterCode === parameterCode)
      if (link) {
        await apiClient.delete(`/standard-parameters/${link.id}`)
        loadLinkedParams(initialValues.code)
      }
    } catch {
      // ignore
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{mode === 'create' ? '新建标准' : '编辑标准'}</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="ts-code" className="block text-sm mb-1 font-medium">
              标准编号 <span className="text-red-600">*</span>
            </label>
            <input
              id="ts-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={mode === 'edit'}
              placeholder="如 GB 1499.2-2024"
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.code && <p role="alert" className="text-red-600 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="ts-name" className="block text-sm mb-1 font-medium">
              标准名称 <span className="text-red-600">*</span>
            </label>
            <input id="ts-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
            {errors.name && <p role="alert" className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="ts-type" className="block text-sm mb-1 font-medium">标准类型</label>
            <select id="ts-type" value={type} onChange={(e) => setType(e.target.value as StandardType)} className="w-full border rounded px-3 py-2">
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ts-remark" className="block text-sm mb-1 font-medium">备注</label>
            <input id="ts-remark" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          {mode === 'edit' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">关联检测参数</label>
                <button
                  type="button"
                  onClick={() => setAddParamOpen(true)}
                  // @entry M04.F03.I04
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 添加关联
                </button>
              </div>
              <div className="border rounded p-2 min-h-[60px]">
                {linkedParams.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">暂无关联参数</p>
                )}
                {linkedParams.map((p) => (
                  <div key={p.parameterCode} className="flex items-center justify-between py-1">
                    <span className="text-sm">
                      <span className="font-mono text-xs">{p.parameterCode}</span>
                      {' '}
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParam(p.parameterCode)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              标准与报告类别的关联关系请在「基础管理 → 报告类别标准」中维护。
            </p>
          )}
        </div>

        {addParamOpen && (
          <div className="px-6 pb-4">
            <div className="border rounded p-3 space-y-2">
              <label className="block text-sm font-medium">选择检测参数</label>
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">请选择</option>
                {allParams
                  .filter((p) => !linkedParams.some((lp) => lp.parameterCode === p.code))
                  .map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setAddParamOpen(false); setSelectedParam('') }}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddParam}
                  disabled={!selectedParam || linking}
                  className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {linking ? '添加中...' : '确认添加'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            取消
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TestStandardFormModal
