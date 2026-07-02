import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../api/client'
import type { TechnicalRequirement, MaterialType, TestStandard, TestParameter } from '../../types/api'

export interface TechnicalRequirementFormValues {
  code: string
  standardCode: string
  parameterCode: string
  materialType: MaterialType
  materialGrade?: string
  specification?: string
  comparison: TechnicalRequirement['comparison']
  value: string
  unit?: string
  remark?: string
}

interface TechnicalRequirementFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<TechnicalRequirement>
  onSubmit: (values: TechnicalRequirementFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const COMPARISON_OPTIONS: { label: string; value: TechnicalRequirement['comparison'] }[] = [
  { label: '≥', value: '≥' },
  { label: '≤', value: '≤' },
  { label: '=', value: '=' },
  { label: 'range', value: 'range' },
  { label: 'eq', value: 'eq' },
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

export function TechnicalRequirementFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: TechnicalRequirementFormModalProps) {
  const [code, setCode] = useState(initialValues?.code ?? '')
  const [standardCode, setStandardCode] = useState(initialValues?.standardCode ?? '')
  const [parameterCode, setParameterCode] = useState(initialValues?.parameterCode ?? '')
  const [materialType, setMaterialType] = useState<MaterialType>(initialValues?.materialType ?? 'steel')
  const [materialGrade, setMaterialGrade] = useState(initialValues?.materialGrade ?? '')
  const [specification, setSpecification] = useState(initialValues?.specification ?? '')
  const [comparison, setComparison] = useState<TechnicalRequirement['comparison']>(initialValues?.comparison ?? '≥')
  const [value, setValue] = useState(initialValues?.value ?? '')
  const [unit, setUnit] = useState(initialValues?.unit ?? '')
  const [remark, setRemark] = useState(initialValues?.remark ?? '')
  const [standards, setStandards] = useState<TestStandard[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [errors, setErrors] = useState<{
    code?: string; standardCode?: string; parameterCode?: string;
    materialType?: string; comparison?: string; value?: string
  }>({})

  useEffect(() => {
    if (open) {
      setCode(initialValues?.code ?? '')
      setStandardCode(initialValues?.standardCode ?? '')
      setParameterCode(initialValues?.parameterCode ?? '')
      setMaterialType(initialValues?.materialType ?? 'steel')
      setMaterialGrade(initialValues?.materialGrade ?? '')
      setSpecification(initialValues?.specification ?? '')
      setComparison(initialValues?.comparison ?? '≥')
      setValue(initialValues?.value ?? '')
      setUnit(initialValues?.unit ?? '')
      setRemark(initialValues?.remark ?? '')
      setErrors({})
    }
  }, [open, initialValues])

  useEffect(() => {
    if (open) {
      apiClient.get<{ items: TestStandard[] }>('/test-standards', { params: { page: '1', pageSize: '999' } })
        .then((res) => setStandards(res.data.items))
        .catch(() => setStandards([]))
      apiClient.get<{ items: TestParameter[] }>('/test-parameters', { params: { page: '1', pageSize: '999' } })
        .then((res) => setParameters(res.data.items))
        .catch(() => setParameters([]))
    }
  }, [open])

  if (!open) return null

  const title = mode === 'create' ? '新建技术要求' : '编辑技术要求'

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!code.trim()) next.code = '请输入组合码'
    if (!standardCode.trim()) next.standardCode = '请选择标准编号'
    if (!parameterCode.trim()) next.parameterCode = '请选择参数代码'
    if (!value.trim()) next.value = '请输入要求值'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const values: TechnicalRequirementFormValues = {
      code: code.trim(),
      standardCode: standardCode.trim(),
      parameterCode: parameterCode.trim(),
      materialType,
      materialGrade: materialGrade.trim() || undefined,
      specification: specification.trim() || undefined,
      comparison,
      value: value.trim(),
      unit: unit.trim() || undefined,
      remark: remark.trim() || undefined,
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
            <label htmlFor="tr-code" className="block text-sm mb-1 font-medium">
              组合码 <span className="text-red-600">*</span>
            </label>
            <input
              id="tr-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="tr-standard" className="block text-sm mb-1 font-medium">
              标准编号 <span className="text-red-600">*</span>
            </label>
            <select
              id="tr-standard"
              value={standardCode}
              onChange={(e) => setStandardCode(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 请选择 --</option>
              {standards.map((s) => (
                <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
              ))}
            </select>
            {errors.standardCode && <p className="text-red-600 text-xs mt-1">{errors.standardCode}</p>}
          </div>
          <div>
            <label htmlFor="tr-param" className="block text-sm mb-1 font-medium">
              参数代码 <span className="text-red-600">*</span>
            </label>
            <select
              id="tr-param"
              value={parameterCode}
              onChange={(e) => setParameterCode(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 请选择 --</option>
              {parameters.map((p) => (
                <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
              ))}
            </select>
            {errors.parameterCode && <p className="text-red-600 text-xs mt-1">{errors.parameterCode}</p>}
          </div>
          <div>
            <label htmlFor="tr-material" className="block text-sm mb-1 font-medium">
              材料类型 <span className="text-red-600">*</span>
            </label>
            <select
              id="tr-material"
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
            <label htmlFor="tr-grade" className="block text-sm mb-1 font-medium">
              材料等级
            </label>
            <input
              id="tr-grade"
              value={materialGrade}
              onChange={(e) => setMaterialGrade(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="tr-spec" className="block text-sm mb-1 font-medium">
              规格
            </label>
            <input
              id="tr-spec"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="tr-comparison" className="block text-sm mb-1 font-medium">
              比较方式 <span className="text-red-600">*</span>
            </label>
            <select
              id="tr-comparison"
              value={comparison}
              onChange={(e) => setComparison(e.target.value as TechnicalRequirement['comparison'])}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMPARISON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tr-value" className="block text-sm mb-1 font-medium">
              要求值 <span className="text-red-600">*</span>
            </label>
            <input
              id="tr-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.value && <p className="text-red-600 text-xs mt-1">{errors.value}</p>}
          </div>
          <div>
            <label htmlFor="tr-unit" className="block text-sm mb-1 font-medium">
              单位
            </label>
            <input
              id="tr-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="tr-remark" className="block text-sm mb-1 font-medium">
              备注
            </label>
            <textarea
              id="tr-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
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

export default TechnicalRequirementFormModal
