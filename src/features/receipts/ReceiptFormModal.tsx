import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../api/client'
import type { Contract, ReceiptStatus, SampleReceipt } from '../../types/api'
import { SampleFormModalV2, type SampleFormValuesV2 } from '../samples/SampleFormModal.v2'
import { ConfirmModal } from '../../components/ConfirmModal'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySample = any

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

  // 样品列表状态
  const [samples, setSamples] = useState<AnySample[]>([])
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [sampleModalOpen, setSampleModalOpen] = useState(false)
  const [sampleMode, setSampleMode] = useState<'create' | 'edit'>('create')
  const [editingSample, setEditingSample] = useState<AnySample>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnySample>(null)
  const [deleting, setDeleting] = useState(false)
  const [sampleSaving, setSampleSaving] = useState(false)
  const [samplesExpanded, setSamplesExpanded] = useState(false)

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
      setSamplesExpanded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  // 合同变更时加载该合同下的样品
  useEffect(() => {
    if (contractId) {
      setSamplesLoading(true)
      apiClient.get('/samples', { params: { contractId, page: 1, pageSize: 100 } })
        .then((r) => setSamples(r.data.items ?? []))
        .catch(() => setSamples([]))
        .finally(() => setSamplesLoading(false))
    } else {
      setSamples([])
    }
  }, [contractId])

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

  const handleSampleSubmit = async (values: SampleFormValuesV2) => {
    setSampleSaving(true)
    try {
      if (sampleMode === 'create') {
        await apiClient.post('/samples', {
          ...values,
          materialDetails: { kind: values.materialType },
        })
      } else if (values.id) {
        const { id, receiptId: _ri, contractId: _ci, sampleCode: _sc, ...patch } = values
        await apiClient.put(`/samples/${values.id}`, patch)
      }
      setSampleModalOpen(false)
      // 刷新样品列表
      const r = await apiClient.get('/samples', { params: { contractId, page: 1, pageSize: 100 } })
      setSamples(r.data.items ?? [])
    } finally {
      setSampleSaving(false)
    }
  }

  const handleDeleteSample = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/samples/${deleteTarget.id}`)
      setDeleteTarget(null)
      const r = await apiClient.get('/samples', { params: { contractId, page: 1, pageSize: 100 } })
      setSamples(r.data.items ?? [])
    } finally {
      setDeleting(false)
    }
  }

  const openSampleCreate = () => {
    if (!contractId) return
    setSampleMode('create')
    setEditingSample(null)
    setSampleModalOpen(true)
  }

  const openSampleEdit = (s: AnySample) => {
    setSampleMode('edit')
    setEditingSample(s)
    setSampleModalOpen(true)
  }

  const materialLabel = (m?: string) =>
    ({ steel: '钢材', cement: '水泥', concrete: '混凝土', sand: '砂', gravel: '碎石', rebar_mech: '钢筋机械连接', rebar_weld: '钢筋焊接连接' }[m ?? ''] ?? m ?? '')

  const statusLabel = (s: string) =>
    ({ pending: '待检', testing: '检测中', completed: '已完成', rejected: '已拒收' }[s] ?? s)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-[1100px] max-w-[98vw] max-h-[94vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5">

          {/* 第一区块：基本信息（3列） */}
          <div className="bg-gray-50 rounded-lg p-5 space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">基本信息</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label htmlFor="receipt-code" className="block text-sm font-medium mb-1">接样编号 <span className="text-red-600">*</span></label>
                <input id="receipt-code" value={receiptCode} onChange={(e) => setReceiptCode(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.receiptCode && <p className="text-red-600 text-xs mt-1">{errors.receiptCode}</p>}
              </div>
              <div>
                <label htmlFor="receipt-contract" className="block text-sm font-medium mb-1">关联合同 <span className="text-red-600">*</span></label>
                <select id="receipt-contract" value={contractId} onChange={(e) => setContractId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择合同</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractCode} - {c.projectName}</option>)}
                </select>
                {errors.contractId && <p className="text-red-600 text-xs mt-1">{errors.contractId}</p>}
              </div>
              <div>
                <label htmlFor="received-date" className="block text-sm font-medium mb-1">收样日期 <span className="text-red-600">*</span></label>
                <input id="received-date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.receivedDate && <p className="text-red-600 text-xs mt-1">{errors.receivedDate}</p>}
              </div>
              <div>
                <label htmlFor="received-by" className="block text-sm font-medium mb-1">收样人 <span className="text-red-600">*</span></label>
                <input id="received-by" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.receivedBy && <p className="text-red-600 text-xs mt-1">{errors.receivedBy}</p>}
              </div>
              <div>
                <label htmlFor="sample-source" className="block text-sm font-medium mb-1">样品来源</label>
                <select id="sample-source" value={sampleSource} onChange={(e) => setSampleSource(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SAMPLE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="test-category" className="block text-sm font-medium mb-1">检测类别</label>
                <select id="test-category" value={testCategory} onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TEST_CATEGORIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="test-environment" className="block text-sm font-medium mb-1">检测环境</label>
                <input id="test-environment" value={testEnvironment} onChange={(e) => setTestEnvironment(e.target.value)}
                  placeholder="如：温度 20°C，湿度 60%RH"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="main-equipment" className="block text-sm font-medium mb-1">主要设备</label>
                <input id="main-equipment" value={mainEquipment} onChange={(e) => setMainEquipment(e.target.value)}
                  placeholder="如：万能试验机、试验筛"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* 第二区块：样品列表（委托单样式嵌入式表格） */}
          <div className="bg-gray-50 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">样品信息</div>
              <div className="flex items-center gap-3">
                {contractId && (
                  <button type="button" onClick={openSampleCreate}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                    + 新增样品
                  </button>
                )}
                <button type="button" onClick={() => setSamplesExpanded(!samplesExpanded)}
                  className="text-xs text-blue-600 hover:underline">
                  {samplesExpanded ? '收起' : `展开`}({samples.length})
                </button>
              </div>
            </div>

            {samplesExpanded && (
              <>
                {samplesLoading && <p className="text-sm text-gray-400 py-2">加载中...</p>}
                {!samplesLoading && samples.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 rounded">
                    暂无样品，请点击"新增样品"添加
                  </div>
                )}
                {!samplesLoading && samples.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-200 rounded">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">序号</th>
                          <th className="px-2 py-1.5 text-left font-medium">样品名称</th>
                          <th className="px-2 py-1.5 text-left font-medium">型号/规格/等级/牌号</th>
                          <th className="px-2 py-1.5 text-left font-medium">生产厂家/产地</th>
                          <th className="px-2 py-1.5 text-left font-medium">代表批量</th>
                          <th className="px-2 py-1.5 text-left font-medium">样品数量</th>
                          <th className="px-2 py-1.5 text-left font-medium">结构部位</th>
                          <th className="px-2 py-1.5 text-left font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samples.map((s, i) => (
                          <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-1.5">{i + 1}</td>
                            <td className="px-2 py-1.5">{s.sampleName ?? s.name ?? '—'}</td>
                            <td className="px-2 py-1.5">
                              <div className="font-medium">{s.sampleType ?? s.specification ?? '—'}</div>
                              <div className="text-gray-400">{s.sampleGrade ?? ''}</div>
                            </td>
                            <td className="px-2 py-1.5 text-gray-600">{s.manufacturer ?? '—'}</td>
                            <td className="px-2 py-1.5">{s.representQuantity ?? '—'}</td>
                            <td className="px-2 py-1.5">{s.sampleQuantity ?? '—'}</td>
                            <td className="px-2 py-1.5 text-gray-500">{s.structuralPart ?? '—'}</td>
                            <td className="px-2 py-1.5">
                              <button onClick={() => openSampleEdit(s)} className="text-blue-600 hover:underline mr-2">编辑</button>
                              <button onClick={() => setDeleteTarget(s)} className="text-red-600 hover:underline">删除</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 第三区块：备注与状态（3列） */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="represent-batch" className="block text-sm font-medium mb-1">代表批量汇总</label>
              <textarea id="represent-batch" value={representBatchSummary} onChange={(e) => setRepresentBatchSummary(e.target.value)}
                rows={2} placeholder="如：C30混凝土 120m³，HRB400钢筋 60t"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label htmlFor="receipt-remark" className="block text-sm font-medium mb-1">备注</label>
              <textarea id="receipt-remark" value={remark} onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label htmlFor="receipt-status" className="block text-sm font-medium mb-1">状态</label>
              <select id="receipt-status" value={status} onChange={(e) => setStatus(e.target.value as ReceiptStatus)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={loading}
            className="px-5 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>

      {/* 样品表单弹窗 */}
      <SampleFormModalV2
        open={sampleModalOpen}
        mode={sampleMode}
        initialValues={editingSample}
        contractId={contractId}
        receiptId={initialValues?.id ?? ''}
        onSubmit={handleSampleSubmit}
        onCancel={() => setSampleModalOpen(false)}
        loading={sampleSaving}
      />

      {/* 删除确认 */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="删除样品"
        message={`确定删除样品「${deleteTarget?.sampleCode ?? ''}」？`}
        loading={deleting}
        onConfirm={handleDeleteSample}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ReceiptFormModal
