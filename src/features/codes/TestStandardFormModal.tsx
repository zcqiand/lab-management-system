import { useEffect, useState, type FormEvent } from 'react'
import type { TestStandard, StandardType } from '../../types/api'

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

/** 检测标准表单（v3）——标准与报告类别的关联在「报告类别标准」中维护 */
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

  useEffect(() => {
    if (open) {
      setCode(initialValues?.code ?? '')
      setName(initialValues?.name ?? '')
      setType(initialValues?.type ?? 'national')
      setRemark(initialValues?.remark ?? '')
      setErrors({})
    }
  }, [open, initialValues])

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!code.trim()) next.code = '请输入标准编号'
    if (!name.trim()) next.name = '请输入标准名称'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit({ code: code.trim(), name: name.trim(), type, remark: remark.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
          <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            标准与报告类别的关联关系请在「基础管理 → 报告类别标准」中维护。
          </p>
        </div>
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
