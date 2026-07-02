import { useEffect, useState, type FormEvent } from 'react'
import type { TestStandard, MaterialType } from '../../types/api'

export interface TestStandardFormValues {
  code: string
  name: string
  type: TestStandard['type']
  applicableMaterials: MaterialType[]
  applicableParameters: string[]
}

interface TestStandardFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<TestStandard>
  onSubmit: (values: TestStandardFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const TYPE_OPTIONS: { label: string; value: TestStandard['type'] }[] = [
  { label: '国标', value: 'national' },
  { label: '行标', value: 'industry' },
  { label: '地标', value: 'local' },
  { label: '企标', value: 'enterprise' },
]

const MATERIAL_OPTIONS: { label: string; value: MaterialType }[] = [
  { label: '钢材', value: 'steel' },
  { label: '水泥', value: 'cement' },
  { label: '混凝土', value: 'concrete' },
  { label: '砂', value: 'sand' },
  { label: '碎石', value: 'gravel' },
  { label: '钢筋机械连接', value: 'rebar_mech' },
  { label: '钢筋焊接连接', value: 'rebar_weld' },
]

export function TestStandardFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: TestStandardFormModalProps) {
  const [code, setCode] = useState(initialValues?.code ?? '')
  const [name, setName] = useState(initialValues?.name ?? '')
  const [type, setType] = useState<TestStandard['type']>(initialValues?.type ?? 'national')
  const [applicableMaterials, setApplicableMaterials] = useState<MaterialType[]>(initialValues?.applicableMaterials ?? [])
  const [applicableParameters, setApplicableParameters] = useState(initialValues?.applicableParameters?.join(', ') ?? '')
  const [errors, setErrors] = useState<{ code?: string; name?: string; type?: string }>({})

  useEffect(() => {
    if (open) {
      setCode(initialValues?.code ?? '')
      setName(initialValues?.name ?? '')
      setType(initialValues?.type ?? 'national')
      setApplicableMaterials(initialValues?.applicableMaterials ?? [])
      setApplicableParameters(initialValues?.applicableParameters?.join(', ') ?? '')
      setErrors({})
    }
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建标准' : '编辑标准'

  const toggleMaterial = (mat: MaterialType) => {
    setApplicableMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat],
    )
  }

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!code.trim()) next.code = '请输入标准编号'
    if (!name.trim()) next.name = '请输入标准名称'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const params = applicableParameters
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const values: TestStandardFormValues = {
      code: code.trim(),
      name: name.trim(),
      type,
      applicableMaterials,
      applicableParameters: params,
    }
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
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
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="ts-name" className="block text-sm mb-1 font-medium">
              标准名称 <span className="text-red-600">*</span>
            </label>
            <input
              id="ts-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="ts-type" className="block text-sm mb-1 font-medium">
              类型 <span className="text-red-600">*</span>
            </label>
            <select
              id="ts-type"
              value={type}
              onChange={(e) => setType(e.target.value as TestStandard['type'])}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium">适用材料</label>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={applicableMaterials.includes(opt.value)}
                    onChange={() => toggleMaterial(opt.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ts-params" className="block text-sm mb-1 font-medium">
              适用参数
            </label>
            <input
              id="ts-params"
              value={applicableParameters}
              onChange={(e) => setApplicableParameters(e.target.value)}
              placeholder="参数代码，多个用逗号分隔"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TestStandardFormModal
