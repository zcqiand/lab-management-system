import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../api/client'
import type { TechnicalRequirement, TestParameter, TestStandard, ComparisonOp } from '../../types/api'
import { useCategories } from '../categories/useCategories'

export interface TechnicalRequirementFormValues {
  code: string
  standardCode: string
  parameterCode: string
  categoryCode: string
  brand?: string
  model?: string
  grade?: string
  specification?: string
  comparison: ComparisonOp
  value: string
  unit?: string
  remark?: string
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<TechnicalRequirement>
  onSubmit: (values: TechnicalRequirementFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const COMPARISON_OPTIONS: { label: string; value: ComparisonOp }[] = [
  { label: '≥（不小于）', value: '≥' },
  { label: '≤（不大于）', value: '≤' },
  { label: '=（等于）', value: '=' },
  { label: 'range（区间，如 2.3~3.0）', value: 'range' },
]

/** 技术要求表单（v3）——按 报告类别 + 牌号/型号/等级/规格 维度匹配样品 */
export function TechnicalRequirementFormModal({ open, mode, initialValues, onSubmit, onCancel, loading = false }: Props) {
  const { categories } = useCategories()
  const [code, setCode] = useState('')
  const [categoryCode, setCategoryCode] = useState('steel')
  const [standardCode, setStandardCode] = useState('')
  const [parameterCode, setParameterCode] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [grade, setGrade] = useState('')
  const [specification, setSpecification] = useState('')
  const [comparison, setComparison] = useState<ComparisonOp>('≥')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [standards, setStandards] = useState<TestStandard[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])

  useEffect(() => {
    if (open) {
      setCode(initialValues?.code ?? '')
      setCategoryCode(initialValues?.categoryCode ?? 'steel')
      setStandardCode(initialValues?.standardCode ?? '')
      setParameterCode(initialValues?.parameterCode ?? '')
      setBrand(initialValues?.brand ?? '')
      setModel(initialValues?.model ?? '')
      setGrade(initialValues?.grade ?? '')
      setSpecification(initialValues?.specification ?? '')
      setComparison(initialValues?.comparison ?? '≥')
      setValue(initialValues?.value ?? '')
      setUnit(initialValues?.unit ?? '')
      setRemark(initialValues?.remark ?? '')
      setErrors({})
    }
  }, [open, initialValues])

  // 标准（按类别关联过滤）+ 参数（按类别过滤）
  useEffect(() => {
    if (!open || !categoryCode) return
    apiClient
      .get<{ items: TestStandard[] }>('/test-standards', { params: { categoryCode, page: 1, pageSize: 200 } })
      .then((res) => setStandards(res.data.items))
      .catch(() => setStandards([]))
    apiClient
      .get<{ items: TestParameter[] }>('/test-parameters', { params: { categoryCode, page: 1, pageSize: 200 } })
      .then((res) => setParameters(res.data.items))
      .catch(() => setParameters([]))
  }, [open, categoryCode])

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!code.trim()) next.code = '请输入编码'
    if (!standardCode) next.standardCode = '请选择标准'
    if (!parameterCode) next.parameterCode = '请选择参数'
    if (!value.trim()) next.value = '请输入指标值'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit({
      code: code.trim(),
      standardCode,
      parameterCode,
      categoryCode,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      grade: grade.trim() || undefined,
      specification: specification.trim() || undefined,
      comparison,
      value: value.trim(),
      unit: unit.trim() || undefined,
      remark: remark.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[560px] max-w-[92vw] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{mode === 'create' ? '新建技术要求' : '编辑技术要求'}</h3>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tr-code" className="block text-xs mb-1 font-medium">编码 <span className="text-red-600">*</span></label>
              <input id="tr-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={mode === 'edit'} className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100" />
              {errors.code && <p role="alert" className="text-red-600 text-xs mt-1">{errors.code}</p>}
            </div>
            <div>
              <label htmlFor="tr-cat" className="block text-xs mb-1 font-medium">报告类别 <span className="text-red-600">*</span></label>
              <select id="tr-cat" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className="w-full border rounded px-2 py-1.5">
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tr-std" className="block text-xs mb-1 font-medium">检测标准 <span className="text-red-600">*</span></label>
              <select id="tr-std" value={standardCode} onChange={(e) => setStandardCode(e.target.value)} className="w-full border rounded px-2 py-1.5">
                <option value="">请选择（该类别关联的标准）</option>
                {standards.map((s) => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>
              {errors.standardCode && <p role="alert" className="text-red-600 text-xs mt-1">{errors.standardCode}</p>}
            </div>
            <div>
              <label htmlFor="tr-param" className="block text-xs mb-1 font-medium">检测参数 <span className="text-red-600">*</span></label>
              <select id="tr-param" value={parameterCode} onChange={(e) => setParameterCode(e.target.value)} className="w-full border rounded px-2 py-1.5">
                <option value="">请选择</option>
                {parameters.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}（{p.code}）</option>
                ))}
              </select>
              {errors.parameterCode && <p role="alert" className="text-red-600 text-xs mt-1">{errors.parameterCode}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            匹配维度（选填）：填写了的维度必须与样品一致才会命中该要求；留空 = 不限。
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label htmlFor="tr-brand" className="block text-xs mb-1 font-medium">牌号</label>
              <input id="tr-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="HRB400E" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label htmlFor="tr-model" className="block text-xs mb-1 font-medium">型号</label>
              <input id="tr-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="P·O 42.5 / C30" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label htmlFor="tr-grade" className="block text-xs mb-1 font-medium">等级</label>
              <input id="tr-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ⅰ级 / Ⅱ类" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label htmlFor="tr-spec" className="block text-xs mb-1 font-medium">规格</label>
              <input id="tr-spec" value={specification} onChange={(e) => setSpecification(e.target.value)} placeholder="Φ22" className="w-full border rounded px-2 py-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="tr-cmp" className="block text-xs mb-1 font-medium">比较方式</label>
              <select id="tr-cmp" value={comparison} onChange={(e) => setComparison(e.target.value as ComparisonOp)} className="w-full border rounded px-2 py-1.5">
                {COMPARISON_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tr-value" className="block text-xs mb-1 font-medium">指标值 <span className="text-red-600">*</span></label>
              <input id="tr-value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="400 或 2.3~3.0" className="w-full border rounded px-2 py-1.5" />
              {errors.value && <p role="alert" className="text-red-600 text-xs mt-1">{errors.value}</p>}
            </div>
            <div>
              <label htmlFor="tr-unit" className="block text-xs mb-1 font-medium">单位</label>
              <input id="tr-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="MPa / %" className="w-full border rounded px-2 py-1.5" />
            </div>
          </div>

          <div>
            <label htmlFor="tr-remark" className="block text-xs mb-1 font-medium">备注</label>
            <input id="tr-remark" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border rounded px-2 py-1.5" />
          </div>
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

export default TechnicalRequirementFormModal
