import { useEffect, useState, type FormEvent } from 'react'
import type { MaterialType } from '../../types/api'

export interface SampleFormValuesV2 {
  id?: string
  sampleCode: string
  materialType: MaterialType
  receiptId: string
  contractId: string
  sampleName?: string
  sampleType?: string
  specification?: string
  sampleGrade?: string
  structuralPart?: string
  manufacturer?: string
  sampleQuantity?: string
  representQuantity?: string
  sampleCondition?: string
  status: SampleStatus
}

type SampleStatus = 'pending' | 'testing' | 'completed' | 'rejected'

interface SampleFormModalV2Props {
  open: boolean
  mode: 'create' | 'edit'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialValues?: any
  contractId: string
  receiptId: string
  onSubmit: (values: SampleFormValuesV2) => void
  onCancel: () => void
  loading?: boolean
}

const MATERIAL_TYPES: MaterialType[] = ['steel', 'cement', 'concrete', 'sand', 'gravel', 'rebar_mech', 'rebar_weld']

const MATERIAL_LABELS: Record<MaterialType, string> = {
  steel: '钢材',
  cement: '水泥',
  concrete: '混凝土',
  sand: '砂',
  gravel: '碎石',
  rebar_mech: '钢筋机械连接',
  rebar_weld: '钢筋焊接连接',
}

export function SampleFormModalV2({
  open,
  mode,
  initialValues,
  contractId,
  receiptId,
  onSubmit,
  onCancel,
  loading = false,
}: SampleFormModalV2Props) {
  const [sampleCode, setSampleCode] = useState(initialValues?.sampleCode ?? '')
  const [materialType, setMaterialType] = useState<MaterialType>((initialValues?.materialType as MaterialType) ?? 'steel')
  const [sampleName, setSampleName] = useState(initialValues?.sampleName ?? '')
  const [sampleType, setSampleType] = useState(initialValues?.sampleType ?? '')
  const [specification, setSpecification] = useState(initialValues?.specification ?? '')
  const [sampleGrade, setSampleGrade] = useState(initialValues?.sampleGrade ?? '')
  const [structuralPart, setStructuralPart] = useState(initialValues?.structuralPart ?? '')
  const [manufacturer, setManufacturer] = useState(initialValues?.manufacturer ?? '')
  const [sampleQuantity, setSampleQuantity] = useState(initialValues?.sampleQuantity ?? '')
  const [representQuantity, setRepresentQuantity] = useState(initialValues?.representQuantity ?? '')
  const [sampleCondition, setSampleCondition] = useState(initialValues?.sampleCondition ?? '')
  const [status, setStatus] = useState<SampleStatus>((initialValues?.status as SampleStatus) ?? 'pending')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setSampleCode(initialValues?.sampleCode ?? '')
      setMaterialType((initialValues?.materialType as MaterialType) ?? 'steel')
      setSampleName(initialValues?.sampleName ?? '')
      setSampleType(initialValues?.sampleType ?? '')
      setSpecification(initialValues?.specification ?? '')
      setSampleGrade(initialValues?.sampleGrade ?? '')
      setStructuralPart(initialValues?.structuralPart ?? '')
      setManufacturer(initialValues?.manufacturer ?? '')
      setSampleQuantity(initialValues?.sampleQuantity ?? '')
      setRepresentQuantity(initialValues?.representQuantity ?? '')
      setSampleCondition(initialValues?.sampleCondition ?? '')
      setStatus((initialValues?.status as SampleStatus) ?? 'pending')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建样品' : '编辑样品'

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!sampleCode.trim()) next.sampleCode = '请输入样品编号'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      sampleCode: sampleCode.trim(),
      materialType,
      receiptId,
      contractId,
      sampleName: sampleName.trim() || undefined,
      sampleType: sampleType.trim() || undefined,
      specification: specification.trim() || undefined,
      sampleGrade: sampleGrade.trim() || undefined,
      structuralPart: structuralPart.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      sampleQuantity: sampleQuantity.trim() || undefined,
      representQuantity: representQuantity.trim() || undefined,
      sampleCondition: sampleCondition.trim() || undefined,
      status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-code" className="block text-sm mb-1 font-medium">样品编号 *</label>
              <input id="sample-code" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} disabled={mode === 'edit'} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
              {errors.sampleCode && <p className="text-red-600 text-xs mt-1">{errors.sampleCode}</p>}
            </div>
            <div>
              <label htmlFor="sample-material" className="block text-sm mb-1 font-medium">材料类型 *</label>
              <select id="sample-material" value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{MATERIAL_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-name" className="block text-sm mb-1 font-medium">样品名称</label>
              <input id="sample-name" value={sampleName} onChange={(e) => setSampleName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：钢筋、水泥、砂" />
            </div>
            <div>
              <label htmlFor="sample-type" className="block text-sm mb-1 font-medium">型号/牌号</label>
              <input id="sample-type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：HRB400、P.O 42.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-spec" className="block text-sm mb-1 font-medium">规格</label>
              <input id="sample-spec" value={specification} onChange={(e) => setSpecification(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：Φ22、150×150×150mm" />
            </div>
            <div>
              <label htmlFor="sample-grade" className="block text-sm mb-1 font-medium">等级/牌号</label>
              <input id="sample-grade" value={sampleGrade} onChange={(e) => setSampleGrade(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-struct" className="block text-sm mb-1 font-medium">结构部位</label>
              <input id="sample-struct" value={structuralPart} onChange={(e) => setStructuralPart(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="sample-mfr" className="block text-sm mb-1 font-medium">生产厂家/产地</label>
              <input id="sample-mfr" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-qty" className="block text-sm mb-1 font-medium">样品数量</label>
              <input id="sample-qty" value={sampleQuantity} onChange={(e) => setSampleQuantity(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：3根、12kg" />
            </div>
            <div>
              <label htmlFor="sample-rep-qty" className="block text-sm mb-1 font-medium">代表批量</label>
              <input id="sample-rep-qty" value={representQuantity} onChange={(e) => setRepresentQuantity(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：60t、200个" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-condition" className="block text-sm mb-1 font-medium">样品状态</label>
              <select id="sample-condition" value={sampleCondition} onChange={(e) => setSampleCondition(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                <option value="完好">完好</option>
                <option value="有锈蚀">有锈蚀</option>
                <option value="破损">破损</option>
              </select>
            </div>
            <div>
              <label htmlFor="sample-status" className="block text-sm mb-1 font-medium">状态</label>
              <select id="sample-status" value={status} onChange={(e) => setStatus(e.target.value as SampleStatus)} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">待检</option>
                <option value="testing">检测中</option>
                <option value="completed">已完成</option>
                <option value="rejected">已拒收</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{loading ? '保存中...' : '保存'}</button>
        </div>
      </form>
    </div>
  )
}

export default SampleFormModalV2
