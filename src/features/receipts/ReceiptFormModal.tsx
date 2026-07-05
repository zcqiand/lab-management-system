import { useEffect, useState, type FormEvent } from 'react'
import type { Contract, ReportCategory, SampleReceipt } from '../../types/api'
import { useCategories } from '../categories/useCategories'

export interface ReceiptFormValues {
  id?: string
  contractId: string
  categoryCode: string
  receiptCode: string
  receivedDate: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  testEnvironment?: string
  mainEquipment?: string
  remark?: string
}

interface ReceiptFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<SampleReceipt>
  contracts: Contract[]
  onSubmit: (values: ReceiptFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const SAMPLE_SOURCES = ['施工送检', '现场抽样', '监督抽查']
const TEST_CATEGORIES = ['委托检验', '见证取样', '监督抽查']

/** 接样单表单（v3）——核心字段 + 报告类别；样品经列表「样品」操作单独维护 */
export function ReceiptFormModal({
  open,
  mode,
  initialValues,
  contracts,
  onSubmit,
  onCancel,
  loading = false,
}: ReceiptFormModalProps) {
  const { categories } = useCategories()
  const [contractId, setContractId] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [receiptCode, setReceiptCode] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [receivedBy, setReceivedBy] = useState('')
  const [sampleSource, setSampleSource] = useState('施工送检')
  const [testCategory, setTestCategory] = useState('委托检验')
  const [testEnvironment, setTestEnvironment] = useState('')
  const [mainEquipment, setMainEquipment] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState<{ contractId?: string; categoryCode?: string; receiptCode?: string; receivedBy?: string }>({})

  useEffect(() => {
    if (!open) return
    setContractId(initialValues?.contractId ?? '')
    setCategoryCode(initialValues?.categoryCode ?? '')
    setReceiptCode(initialValues?.receiptCode ?? '')
    setReceivedDate(initialValues?.receivedDate ?? new Date().toISOString().split('T')[0])
    setReceivedBy(initialValues?.receivedBy ?? '')
    setSampleSource(initialValues?.sampleSource ?? '施工送检')
    setTestCategory(initialValues?.testCategory ?? '委托检验')
    setTestEnvironment(initialValues?.testEnvironment ?? '')
    setMainEquipment(initialValues?.mainEquipment ?? '')
    setRemark(initialValues?.remark ?? '')
    setErrors({})
  }, [open, initialValues])

  if (!open) return null

  const contract = contracts.find((c) => c.id === contractId)
  const category: ReportCategory | undefined = categories.find((c) => c.code === categoryCode)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!contractId) nextErrors.contractId = '请选择合同'
    if (!categoryCode) nextErrors.categoryCode = '请选择报告类别'
    if (!receiptCode.trim()) nextErrors.receiptCode = '接样编号必填'
    if (!receivedBy.trim()) nextErrors.receivedBy = '接样人必填'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      id: initialValues?.id,
      contractId,
      categoryCode,
      receiptCode: receiptCode.trim(),
      receivedDate,
      receivedBy: receivedBy.trim(),
      sampleSource,
      testCategory,
      testEnvironment,
      mainEquipment,
      remark,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">{mode === 'create' ? '新建接样单' : '编辑接样单'}</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rf-contract" className="block text-xs font-medium text-gray-600 mb-1">所属合同 *</label>
                <select
                  id="rf-contract"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                >
                  <option value="">请选择合同</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.contractCode}　{c.projectName}</option>
                  ))}
                </select>
                {errors.contractId && <p role="alert" className="text-red-600 text-xs mt-1">{errors.contractId}</p>}
              </div>
              <div>
                <label htmlFor="rf-category" className="block text-xs font-medium text-gray-600 mb-1">报告类别 *</label>
                <select
                  id="rf-category"
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  disabled={mode === 'edit'}
                  className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100"
                >
                  <option value="">请选择报告类别</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryCode && <p role="alert" className="text-red-600 text-xs mt-1">{errors.categoryCode}</p>}
              </div>
            </div>

            {contract && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                委托单位：{contract.clientUnit}　施工单位：{contract.constructionUnit}　见证单位：{contract.witnessUnit}
              </p>
            )}
            {category && (
              <p className="text-xs text-blue-700 bg-blue-50 rounded p-2">
                该类别样品扩展属性：{category.extFields.map((f) => f.label).join('、') || '无'}（在「样品」中录入）
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rf-code" className="block text-xs font-medium text-gray-600 mb-1">接样编号 *</label>
                <input id="rf-code" value={receiptCode} onChange={(e) => setReceiptCode(e.target.value)} placeholder="如 RC-2024-0801-01" className="w-full border rounded px-2 py-1.5" />
                {errors.receiptCode && <p role="alert" className="text-red-600 text-xs mt-1">{errors.receiptCode}</p>}
              </div>
              <div>
                <label htmlFor="rf-date" className="block text-xs font-medium text-gray-600 mb-1">接样日期</label>
                <input id="rf-date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="w-full border rounded px-2 py-1.5" />
              </div>
              <div>
                <label htmlFor="rf-by" className="block text-xs font-medium text-gray-600 mb-1">接样人 *</label>
                <input id="rf-by" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="w-full border rounded px-2 py-1.5" />
                {errors.receivedBy && <p role="alert" className="text-red-600 text-xs mt-1">{errors.receivedBy}</p>}
              </div>
              <div>
                <label htmlFor="rf-source" className="block text-xs font-medium text-gray-600 mb-1">样品来源</label>
                <select id="rf-source" value={sampleSource} onChange={(e) => setSampleSource(e.target.value)} className="w-full border rounded px-2 py-1.5">
                  {SAMPLE_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rf-testcat" className="block text-xs font-medium text-gray-600 mb-1">检测类别</label>
                <select id="rf-testcat" value={testCategory} onChange={(e) => setTestCategory(e.target.value)} className="w-full border rounded px-2 py-1.5">
                  {TEST_CATEGORIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rf-env" className="block text-xs font-medium text-gray-600 mb-1">检测环境</label>
                <input id="rf-env" value={testEnvironment} onChange={(e) => setTestEnvironment(e.target.value)} placeholder="如 温度 20±2℃，湿度 50%RH" className="w-full border rounded px-2 py-1.5" />
              </div>
              <div className="col-span-2">
                <label htmlFor="rf-equip" className="block text-xs font-medium text-gray-600 mb-1">主要设备</label>
                <input id="rf-equip" value={mainEquipment} onChange={(e) => setMainEquipment(e.target.value)} placeholder="如 WAW-1000 万能试验机" className="w-full border rounded px-2 py-1.5" />
              </div>
              <div className="col-span-2">
                <label htmlFor="rf-remark" className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <input id="rf-remark" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border rounded px-2 py-1.5" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">取消</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReceiptFormModal
