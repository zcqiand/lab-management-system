import { useEffect, useState, type FormEvent } from 'react'
import type { TestParameter, MaterialType } from '../../types/api'

export interface TestParameterFormValues {
  code: string
  name: string
  materialType: MaterialType
  category: string
  unit?: string
  description?: string
}

interface TestParameterFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<TestParameter>
  onSubmit: (values: TestParameterFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const MATERIAL_OPTIONS: { label: string; value: MaterialType }[] = [
  { label: '钢材', value: 'steel' },
  { label: '水泥', value: 'cement' },
  { label: '混凝土', value: 'concrete' },
  { label: '砂', value: 'sand' },
  { label: '碎石', value: 'gravel' },
  { label: '钢筋机械连接', value: 'rebar_mech' },
  { label: '钢筋焊接连接', value: 'rebar_weld' },
]

export function TestParameterFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: TestParameterFormModalProps) {
  const [code, setCode] = useState(initialValues?.code ?? '')
  const [name, setName] = useState(initialValues?.name ?? '')
  const [materialType, setMaterialType] = useState<MaterialType>(initialValues?.materialType ?? 'steel')
  const [category, setCategory] = useState(initialValues?.category ?? '')
  const [unit, setUnit] = useState(initialValues?.unit ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [errors, setErrors] = useState<{ code?: string; name?: string; materialType?: string; category?: string }>({})

  useEffect(() => {
    if (open) {
      setCode(initialValues?.code ?? '')
      setName(initialValues?.name ?? '')
      setMaterialType(initialValues?.materialType ?? 'steel')
      setCategory(initialValues?.category ?? '')
      setUnit(initialValues?.unit ?? '')
      setDescription(initialValues?.description ?? '')
      setErrors({})
    }
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建参数' : '编辑参数'

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!code.trim()) next.code = '请输入参数代码'
    if (!name.trim()) next.name = '请输入参数名称'
    if (!category.trim()) next.category = '请输入分类'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const values: TestParameterFormValues = {
      code: code.trim(),
      name: name.trim(),
      materialType,
      category: category.trim(),
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    }
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="tp-code" className="block text-sm mb-1 font-medium">
              参数代码 <span className="text-red-600">*</span>
            </label>
            <input
              id="tp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="tp-name" className="block text-sm mb-1 font-medium">
              参数名称 <span className="text-red-600">*</span>
            </label>
            <input
              id="tp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="tp-material" className="block text-sm mb-1 font-medium">
              适用材料 <span className="text-red-600">*</span>
            </label>
            <select
              id="tp-material"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as MaterialType)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MATERIAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tp-category" className="block text-sm mb-1 font-medium">
              分类 <span className="text-red-600">*</span>
            </label>
            <input
              id="tp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="mechanical / process / physical / chemistry / strength"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label htmlFor="tp-unit" className="block text-sm mb-1 font-medium">
              单位
            </label>
            <input
              id="tp-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="tp-desc" className="block text-sm mb-1 font-medium">
              说明
            </label>
            <textarea
              id="tp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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

export default TestParameterFormModal
