import { useCallback, useEffect, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { apiClient } from '../../api/client'
import { useCategories, categoryName } from '../categories/useCategories'
import { ReportPreviewModal } from '../report-doc/ReportPreviewModal'
import type { ReportCategory, Sample, SampleReceipt, TestItem, TestParameter } from '../../types/api'

/** 数据录入（流程线第 3 环节）——检测项归属样品：
 * 选样品 → 选检测参数（按接样单的报告类别过滤）→ 填检测值 →
 * 系统按 报告类别+牌号/型号/等级/规格 匹配技术要求并自动评定（可手工改判）；
 * 录入完成后可直接生成报告文档。
 */
export function DataEntryPage() {
  const { categories } = useCategories()
  const [entryTarget, setEntryTarget] = useState<SampleReceipt | null>(null)
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null)

  return (
    <>
      <FlowStagePage
        title="数据录入"
        stage="data_entry"
        subtitle="录入各样品的检测结果；系统按报告类别与样品的牌号/型号/等级/规格自动匹配技术要求并评定"
        submitLabel="提交审核"
        canReturn
        extraColumns={[
          { header: '报告类别', render: (r) => categoryName(categories, r.categoryCode) },
          { header: '检测人员', render: (r) => r.assigneeName ?? '—' },
          {
            header: '整体结论',
            render: (r) =>
              r.result === 'pass' ? (
                <span className="text-green-700">合格</span>
              ) : r.result === 'fail' ? (
                <span className="text-red-600">不合格</span>
              ) : (
                <span className="text-gray-400">未录入</span>
              ),
          },
        ]}
        rowActions={(r, refresh) => (
          <>
            <button
              onClick={() => setEntryTarget(r)}
              className="px-2 py-1 text-blue-600 hover:underline"
            >
              录入结果
            </button>
            <button
              onClick={() => {
                setPreviewTarget(r)
                void refresh
              }}
              className="px-2 py-1 text-emerald-700 hover:underline"
            >
              生成报告
            </button>
          </>
        )}
      />

      {entryTarget && (
        <EntryModal
          receipt={entryTarget}
          onClose={() => setEntryTarget(null)}
          onPreview={() => {
            setPreviewTarget(entryTarget)
          }}
        />
      )}

      {previewTarget && <ReportPreviewModal receipt={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </>
  )
}

/** 录入弹窗：样品（含扩展属性展示）+ 检测项表格 */
function EntryModal({
  receipt,
  onClose,
  onPreview,
}: {
  receipt: SampleReceipt
  onClose: () => void
  onPreview: () => void
}) {
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [items, setItems] = useState<TestItem[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [error, setError] = useState<string | null>(null)

  const [sampleId, setSampleId] = useState('')
  const [parameterCode, setParameterCode] = useState('')
  const [resultValue, setResultValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [testEnvironment, setTestEnvironment] = useState(receipt.testEnvironment ?? '')
  const [mainEquipment, setMainEquipment] = useState(receipt.mainEquipment ?? '')
  const [receiptSaving, setReceiptSaving] = useState(false)

  const selectedSample = samples.find((s) => s.id === sampleId)

  const fetchAll = useCallback(async () => {
    try {
      const [samplesRes, itemsRes] = await Promise.all([
        apiClient.get<{ items: Sample[] }>('/samples', { params: { receiptId: receipt.id, page: 1, pageSize: 100 } }),
        apiClient.get<{ items: TestItem[] }>('/test-items', { params: { receiptId: receipt.id } }),
      ])
      setSamples(samplesRes.data.items)
      setItems(itemsRes.data.items)
      if (samplesRes.data.items.length > 0 && !samplesRes.data.items.some((s) => s.id === sampleId)) {
        setSampleId(samplesRes.data.items[0].id)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [receipt.id, sampleId])

  useEffect(() => {
    fetchAll()
    apiClient
      .get<ReportCategory>(`/report-categories/${receipt.categoryCode}`)
      .then((res) => setCategory(res.data))
      .catch(() => setCategory(null))
    apiClient
      .get<{ items: TestParameter[] }>('/test-parameters', {
        params: { categoryCode: receipt.categoryCode, page: 1, pageSize: 200 },
      })
      .then((res) => setParameters(res.data.items))
      .catch(() => setParameters([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.id, receipt.categoryCode])

  const handleAdd = async () => {
    if (!sampleId || !parameterCode || !resultValue.trim()) return
    setSaving(true)
    setError(null)
    try {
      await apiClient.post('/test-items', {
        sampleId,
        parameterCode,
        result: resultValue.trim(),
      })
      setResultValue('')
      await fetchAll()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '录入失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePassed = async (item: TestItem) => {
    setError(null)
    try {
      await apiClient.put(`/test-items/${item.id}`, { passed: !item.passed })
      await fetchAll()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '改判失败')
    }
  }

  const handleDelete = async (item: TestItem) => {
    setError(null)
    try {
      await apiClient.delete(`/test-items/${item.id}`)
      await fetchAll()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  const sampleLabel = (id: string) => samples.find((s) => s.id === id)?.sampleCode ?? id
  const paramLabel = (code: string) => parameters.find((p) => p.code === code)?.name ?? code
  const extDefs = category?.extFields ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="text-lg font-semibold">录入检测结果 — {receipt.receiptCode}</h3>
            <p className="text-xs text-gray-500 mt-0.5">报告类别：{category?.name ?? receipt.categoryCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {error && (
            <div role="alert" className="text-red-600 bg-red-50 p-2 rounded">{error}</div>
          )}

          {samples.length === 0 ? (
            <p className="text-gray-400 py-4 text-center">该接样单暂无样品——请先在「接样管理 → 样品」中新建样品</p>
          ) : (
            <>
              {/* 检测环境与设备（接样信息在数据录入环节可补录） */}
              <div className="grid grid-cols-2 gap-3 items-end bg-gray-50 p-3 rounded">
                <div>
                  <label htmlFor="de-env" className="block text-xs font-medium text-gray-600 mb-1">检测环境</label>
                  <input
                    id="de-env"
                    value={testEnvironment}
                    onChange={(e) => setTestEnvironment(e.target.value)}
                    placeholder="如 温度 20±2℃，湿度 50%RH"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="de-equip" className="block text-xs font-medium text-gray-600 mb-1">主要检测设备</label>
                  <input
                    id="de-equip"
                    value={mainEquipment}
                    onChange={(e) => setMainEquipment(e.target.value)}
                    placeholder="如 WAW-1000 万能试验机"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={async () => {
                      setReceiptSaving(true)
                      setError(null)
                      try {
                        await apiClient.put(`/receipts/${receipt.id}`, {
                          ...receipt,
                          testEnvironment,
                          mainEquipment,
                        })
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : '保存失败')
                      } finally {
                        setReceiptSaving(false)
                      }
                    }}
                    disabled={receiptSaving}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    {receiptSaving ? '保存中...' : '保存检测环境/设备'}
                  </button>
                </div>
              </div>

              {/* 录入区 */}
              <div className="grid grid-cols-4 gap-3 items-end bg-gray-50 p-3 rounded">
                <div>
                  <label htmlFor="de-sample" className="block text-xs font-medium text-gray-600 mb-1">样品</label>
                  <select id="de-sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="w-full border rounded px-2 py-1.5">
                    {samples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sampleCode}（{s.sampleName ?? '样品'}）
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="de-param" className="block text-xs font-medium text-gray-600 mb-1">检测参数</label>
                  <select id="de-param" value={parameterCode} onChange={(e) => setParameterCode(e.target.value)} className="w-full border rounded px-2 py-1.5">
                    <option value="">请选择</option>
                    {parameters.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}{p.unit ? `（${p.unit}）` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="de-result" className="block text-xs font-medium text-gray-600 mb-1">检测值</label>
                  <input
                    id="de-result"
                    value={resultValue}
                    onChange={(e) => setResultValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="如 425"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={saving || !sampleId || !parameterCode || !resultValue.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {saving ? '录入中...' : '录入'}
                </button>
              </div>

              {/* 当前样品信息（型号/规格/等级/牌号 + 扩展属性） */}
              {selectedSample && (
                <div className="text-xs text-gray-600 bg-blue-50 rounded p-2 leading-relaxed">
                  <span className="font-semibold">当前样品：</span>
                  型号：{selectedSample.model ?? '—'}　规格：{selectedSample.specification ?? '—'}　
                  等级：{selectedSample.grade ?? '—'}　牌号：{selectedSample.brand ?? '—'}
                  {extDefs.length > 0 && (
                    <>
                      <br />
                      <span className="font-semibold">扩展属性：</span>
                      {extDefs
                        .map((f) => `${f.label}：${selectedSample.ext?.[f.key] ?? '—'}`)
                        .join('　')}
                    </>
                  )}
                </div>
              )}

              {/* 检测项表格 */}
              <table className="w-full text-sm border rounded overflow-hidden">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">样品</th>
                    <th className="px-3 py-2 text-left">检测参数</th>
                    <th className="px-3 py-2 text-left">技术要求</th>
                    <th className="px-3 py-2 text-left">检测值</th>
                    <th className="px-3 py-2 text-left">自动评定</th>
                    <th className="px-3 py-2 text-left">最终评定</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">暂无检测记录</td></tr>
                  )}
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{sampleLabel(item.sampleId)}</td>
                      <td className="px-3 py-2">{paramLabel(item.parameterCode)}</td>
                      <td className="px-3 py-2 text-gray-600">{item.requirement || '—'}</td>
                      <td className="px-3 py-2">{item.result}{item.unit ? ` ${item.unit}` : ''}</td>
                      <td className="px-3 py-2">
                        {item.autoPassed === true && <span className="text-green-700">合格</span>}
                        {item.autoPassed === false && <span className="text-red-600">不合格</span>}
                        {item.autoPassed === null && <span className="text-amber-600">需人工判定</span>}
                      </td>
                      <td className="px-3 py-2">
                        {item.passed ? <span className="text-green-700">合格</span> : <span className="text-red-600">不合格</span>}
                        {item.autoPassed !== null && item.passed !== item.autoPassed && (
                          <span className="text-xs text-amber-600 ml-1">（已手工修正）</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => handleTogglePassed(item)} className="px-2 py-1 text-amber-700 hover:underline">
                          改判
                        </button>
                        <button onClick={() => handleDelete(item)} className="px-2 py-1 text-red-600 hover:underline">
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t bg-gray-50">
          <p className="text-xs text-gray-500">检测项归属样品；全部合格 → 接样单整体结论「合格」</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose()
                onPreview()
              }}
              disabled={items.length === 0}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              生成报告
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">关闭</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataEntryPage
