import { useEffect, useState, type FormEvent } from 'react'
import { useContractStore } from '../contracts/contractStore'
import { useReceiptStore } from '../receipts/receiptStore'
import { useSampleStoreV2 } from '../samples/sampleStore.v2'

export interface ReportWorkflowFormValues {
  reportCode: string
  contractId: string
  receiptId: string
  materialType: string
  sampleIds: string[]
  reportDate: string
  conclusion?: string
  result?: 'pass' | 'fail'
}

interface ReportWorkflowFormModalProps {
  open: boolean
  onSubmit: (values: ReportWorkflowFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const MATERIAL_OPTIONS = [
  { value: 'steel', label: '钢材' },
  { value: 'cement', label: '水泥' },
  { value: 'concrete', label: '混凝土' },
  { value: 'sand', label: '砂' },
  { value: 'gravel', label: '碎石' },
  { value: 'rebar_mech', label: '钢筋机械连接' },
  { value: 'rebar_weld', label: '钢筋焊接连接' },
]

export function ReportWorkflowFormModal({
  open, onSubmit, onCancel, loading = false,
}: ReportWorkflowFormModalProps) {
  const { list: contracts, fetchContracts } = useContractStore()
  const { list: receipts, fetchReceipts } = useReceiptStore()
  const { list: samples, fetchSamples } = useSampleStoreV2()

  const [reportCode, setReportCode] = useState('')
  const [contractId, setContractId] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [materialType, setMaterialType] = useState('concrete')
  const [sampleIds, setSampleIds] = useState<string[]>([])
  const [reportDate, setReportDate] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [result, setResult] = useState<'pass' | 'fail'>('pass')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => { if (open) { fetchContracts({ page: 1, pageSize: 100 }) } }, [open, fetchContracts])
  useEffect(() => { if (contractId) { fetchReceipts({ page: 1, pageSize: 100, status: undefined }) } }, [contractId, fetchReceipts])
  useEffect(() => { if (receiptId) { fetchSamples({ page: 1, pageSize: 100, receiptId }) } }, [receiptId, fetchSamples])

  useEffect(() => {
    if (open) {
      setReportCode(''); setContractId(''); setReceiptId('')
      setMaterialType('concrete'); setSampleIds([])
      setReportDate(''); setConclusion(''); setResult('pass')
      setErrors({})
    }
  }, [open])

  const filteredReceipts = contractId ? receipts.filter((r) => r.contractId === contractId) : []
  const filteredSamples = receiptId ? samples.filter((s) => s.receiptId === receiptId && s.materialType === materialType) : []

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!reportCode.trim()) next.reportCode = '请输入报告编号'
    if (!contractId) next.contractId = '请选择合同'
    if (!receiptId) next.receiptId = '请选择接样单'
    if (sampleIds.length === 0) next.sampleIds = '请选择至少一个样品'
    if (!reportDate.trim()) next.reportDate = '请输入检测日期'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      reportCode: reportCode.trim(),
      contractId,
      receiptId,
      materialType,
      sampleIds,
      reportDate: reportDate.trim(),
      conclusion: conclusion.trim() || undefined,
      result,
    })
  }

  const toggleSample = (id: string) => {
    setSampleIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[92vh] overflow-y-auto">
        <div className="px-8 py-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold">新建报告</h3>
        </div>

        <div className="px-8 py-5 space-y-4">
          {/* Row 1: 报告编号 | 合同 | 接样单 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="rwl-reportCode" className="block text-sm font-medium mb-1">
                报告编号 <span className="text-red-600">*</span>
              </label>
              <input id="rwl-reportCode" value={reportCode} onChange={(e) => setReportCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.reportCode && <p className="text-red-600 text-xs mt-1">{errors.reportCode}</p>}
            </div>

            <div>
              <label htmlFor="rwl-contract" className="block text-sm font-medium mb-1">
                合同 <span className="text-red-600">*</span>
              </label>
              <select id="rwl-contract" value={contractId}
                onChange={(e) => { setContractId(e.target.value); setReceiptId(''); setSampleIds([]) }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择合同</option>
                {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractCode} - {c.projectName}</option>)}
              </select>
              {errors.contractId && <p className="text-red-600 text-xs mt-1">{errors.contractId}</p>}
            </div>

            <div>
              <label htmlFor="rwl-receipt" className="block text-sm font-medium mb-1">
                接样单 <span className="text-red-600">*</span>
              </label>
              <select id="rwl-receipt" value={receiptId}
                onChange={(e) => { setReceiptId(e.target.value); setSampleIds([]) }}
                disabled={!contractId}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="">请选择接样单</option>
                {filteredReceipts.map((r) => <option key={r.id} value={r.id}>{r.receiptCode} - {r.sampleSource}</option>)}
              </select>
              {errors.receiptId && <p className="text-red-600 text-xs mt-1">{errors.receiptId}</p>}
            </div>
          </div>

          {/* Row 2: 材料类型 | 检测日期 | 检测结论 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="rwl-material" className="block text-sm font-medium mb-1">
                材料类型 <span className="text-red-600">*</span>
              </label>
              <select id="rwl-material" value={materialType} onChange={(e) => { setMaterialType(e.target.value); setSampleIds([]) }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MATERIAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="rwl-reportDate" className="block text-sm font-medium mb-1">
                检测日期 <span className="text-red-600">*</span>
              </label>
              <input id="rwl-reportDate" type="date" value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.reportDate && <p className="text-red-600 text-xs mt-1">{errors.reportDate}</p>}
            </div>

            <div>
              <label htmlFor="rwl-result" className="block text-sm font-medium mb-1">
                检测结论
              </label>
              <select id="rwl-result" value={result} onChange={(e) => setResult(e.target.value as 'pass' | 'fail')}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pass">合格</option>
                <option value="fail">不合格</option>
              </select>
            </div>
          </div>

          {/* Row 3: 样品选择 (full width) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              关联样品 <span className="text-red-600">*</span>
            </label>
            {receiptId ? (
              filteredSamples.length > 0 ? (
                <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
                  {filteredSamples.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                      <input type="checkbox" checked={sampleIds.includes(s.id)}
                        onChange={() => toggleSample(s.id)} className="accent-blue-600" />
                      <span className="font-mono text-gray-800">{s.sampleCode}</span>
                      <span className="text-gray-500">{s.sampleName ?? s.sampleType ?? s.materialType}</span>
                      <span className="text-gray-400 ml-auto">{s.specification ?? ''}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="border rounded px-3 py-2 text-sm text-gray-400">
                  该接样下暂无此材料类型样品
                </div>
              )
            ) : (
              <div className="border rounded px-3 py-2 text-sm text-gray-400">
                请先选择合同和接样单
              </div>
            )}
            {errors.sampleIds && <p className="text-red-600 text-xs mt-1">{errors.sampleIds}</p>}
          </div>

          {/* Row 4: 备注 (full width) */}
          <div>
            <label htmlFor="rwl-conclusion" className="block text-sm font-medium mb-1">备注</label>
            <textarea id="rwl-conclusion" value={conclusion} onChange={(e) => setConclusion(e.target.value)}
              rows={2} placeholder="其他说明"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        <div className="px-8 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading}
            className="px-5 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            取消
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReportWorkflowFormModal
