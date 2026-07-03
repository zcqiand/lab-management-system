import { useEffect, useState, type FormEvent } from 'react'
import type { Contract, ReceiptStatus, SampleReceipt } from '../../types/api'

export interface ReceiptFormValues {
  id?: string
  receiptCode: string
  contractId: string
  receivedDate: string
  receivedBy: string
  sampleSource: string
  testCategory: string
  testEnvironment?: string
  mainEquipment?: string
  representBatchSummary?: string
  remark?: string
  status: ReceiptStatus
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

const SAMPLE_SOURCES = [
  { value: 'construction', label: '施工送检' },
  { value: 'field', label: '现场抽样' },
  { value: 'supervision', label: '监督抽查' },
]

const TEST_CATEGORIES = [
  { value: 'entrusted', label: '委托检验' },
  { value: 'witnessed', label: '见证取样' },
  { value: 'supervision', label: '监督抽查' },
]

const STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: 'received', label: '已接收' },
  { value: 'testing', label: '检测中' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '已拒收' },
]

export function ReceiptFormModal({
  open,
  mode,
  initialValues,
  contracts,
  onSubmit,
  onCancel,
  loading = false,
}: ReceiptFormModalProps) {
  const [receiptCode, setReceiptCode] = useState(initialValues?.receiptCode ?? '')
  const [contractId, setContractId] = useState(initialValues?.contractId ?? '')
  const [receivedDate, setReceivedDate] = useState(
    initialValues?.receivedDate ?? new Date().toISOString().split('T')[0],
  )
  const [receivedBy, setReceivedBy] = useState(initialValues?.receivedBy ?? '')
  const [sampleSource, setSampleSource] = useState(initialValues?.sampleSource ?? 'construction')
  const [testCategory, setTestCategory] = useState(initialValues?.testCategory ?? 'entrusted')
  const [testEnvironment, setTestEnvironment] = useState(initialValues?.testEnvironment ?? '')
  const [mainEquipment, setMainEquipment] = useState(initialValues?.mainEquipment ?? '')
  const [representBatchSummary, setRepresentBatchSummary] = useState(initialValues?.representBatchSummary ?? '')
  const [remark, setRemark] = useState(initialValues?.remark ?? '')
  const [status, setStatus] = useState<ReceiptStatus>(initialValues?.status ?? 'received')
  const [errors, setErrors] = useState<{
    receiptCode?: string
    contractId?: string
    receivedDate?: string
    receivedBy?: string
  }>({})

  useEffect(() => {
    if (open) {
      setReceiptCode(initialValues?.receiptCode ?? '')
      setContractId(initialValues?.contractId ?? '')
      setReceivedDate(initialValues?.receivedDate ?? new Date().toISOString().split('T')[0])
      setReceivedBy(initialValues?.receivedBy ?? '')
      setSampleSource(initialValues?.sampleSource ?? 'construction')
      setTestCategory(initialValues?.testCategory ?? 'entrusted')
      setTestEnvironment(initialValues?.testEnvironment ?? '')
      setMainEquipment(initialValues?.mainEquipment ?? '')
      setRepresentBatchSummary(initialValues?.representBatchSummary ?? '')
      setRemark(initialValues?.remark ?? '')
      setStatus(initialValues?.status ?? 'received')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建接样' : '编辑接样'

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!receiptCode.trim()) next.receiptCode = '请输入接样编号'
    if (!contractId.trim()) next.contractId = '请选择关联合同'
    if (!receivedDate.trim()) next.receivedDate = '请选择收样日期'
    if (!receivedBy.trim()) next.receivedBy = '请输入收样人'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const values: ReceiptFormValues = {
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      receiptCode: receiptCode.trim(),
      contractId: contractId.trim(),
      receivedDate: receivedDate.trim(),
      receivedBy: receivedBy.trim(),
      sampleSource,
      testCategory,
      testEnvironment: testEnvironment.trim() || undefined,
      mainEquipment: mainEquipment.trim() || undefined,
      representBatchSummary: representBatchSummary.trim() || undefined,
      remark: remark.trim() || undefined,
      status,
    }
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[92vh] overflow-y-auto"
      >
        <div className="px-8 py-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* 3-column grid layout */}
        <div className="px-8 py-5 space-y-4">
          {/* Row 1: 接样编号 | 关联合同 | 收样日期 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="receipt-code" className="block text-sm font-medium mb-1">
                接样编号 <span className="text-red-600">*</span>
              </label>
              <input
                id="receipt-code"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.receiptCode && <p className="text-red-600 text-xs mt-1">{errors.receiptCode}</p>}
            </div>

            <div>
              <label htmlFor="receipt-contract" className="block text-sm font-medium mb-1">
                关联合同 <span className="text-red-600">*</span>
              </label>
              <select
                id="receipt-contract"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择合同</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractCode} - {c.projectName}
                  </option>
                ))}
              </select>
              {errors.contractId && <p className="text-red-600 text-xs mt-1">{errors.contractId}</p>}
            </div>

            <div>
              <label htmlFor="received-date" className="block text-sm font-medium mb-1">
                收样日期 <span className="text-red-600">*</span>
              </label>
              <input
                id="received-date"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.receivedDate && <p className="text-red-600 text-xs mt-1">{errors.receivedDate}</p>}
            </div>
          </div>

          {/* Row 2: 收样人 | 样品来源 | 检测类别 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="received-by" className="block text-sm font-medium mb-1">
                收样人 <span className="text-red-600">*</span>
              </label>
              <input
                id="received-by"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.receivedBy && <p className="text-red-600 text-xs mt-1">{errors.receivedBy}</p>}
            </div>

            <div>
              <label htmlFor="sample-source" className="block text-sm font-medium mb-1">
                样品来源
              </label>
              <select
                id="sample-source"
                value={sampleSource}
                onChange={(e) => setSampleSource(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SAMPLE_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="test-category" className="block text-sm font-medium mb-1">
                检测类别
              </label>
              <select
                id="test-category"
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TEST_CATEGORIES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: 检测环境 | 主要检测设备 | 状态 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="test-environment" className="block text-sm font-medium mb-1">
                检测环境
              </label>
              <input
                id="test-environment"
                value={testEnvironment}
                onChange={(e) => setTestEnvironment(e.target.value)}
                placeholder="如：温度 20°C，湿度 60%RH"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="main-equipment" className="block text-sm font-medium mb-1">
                主要检测设备
              </label>
              <input
                id="main-equipment"
                value={mainEquipment}
                onChange={(e) => setMainEquipment(e.target.value)}
                placeholder="如：万能试验机、干燥箱"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="receipt-status" className="block text-sm font-medium mb-1">
                状态
              </label>
              <select
                id="receipt-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReceiptStatus)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: 代表批量汇总 (full width) */}
          <div>
            <label htmlFor="represent-batch" className="block text-sm font-medium mb-1">
              代表批量汇总
            </label>
            <textarea
              id="represent-batch"
              value={representBatchSummary}
              onChange={(e) => setRepresentBatchSummary(e.target.value)}
              rows={2}
              placeholder="如：C30 混凝土 120m³，HRB400 钢筋 60t"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Row 5: 备注 (full width) */}
          <div>
            <label htmlFor="receipt-remark" className="block text-sm font-medium mb-1">
              备注
            </label>
            <textarea
              id="receipt-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="其他说明"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="px-8 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReceiptFormModal
