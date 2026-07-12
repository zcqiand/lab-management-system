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
function DataEntryRowActions({ receipt, onEntry, onPreview }: { receipt: SampleReceipt; onEntry: (r: SampleReceipt) => void; onPreview: (r: SampleReceipt) => void }) {
  return (
    <>
      <button onClick={() => onEntry(receipt)} className="px-2 py-1 text-blue-600 hover:underline">
        录入结果
      </button>
      <button onClick={() => onPreview(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">
        生成报告
      </button>
    </>
  )
}

export function DataEntryPage() {
  const { categories } = useCategories()
  const [entryTarget, setEntryTarget] = useState<SampleReceipt | null>(null)
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null)
  const rowAction = useCallback((r: SampleReceipt) => (
    <DataEntryRowActions receipt={r} onEntry={setEntryTarget} onPreview={setPreviewTarget} />
  ), [])
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
        rowActions={rowAction}
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

/** 录入弹窗：左右分栏布局
 * 左侧：样品清单（高亮未录入样品）
 * 右侧：选中样品的检测录入表单 + 该样品已录入检测项表格
 */
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
  const [testValues, setTestValues] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [testEnvironment, setTestEnvironment] = useState(receipt.testEnvironment ?? '')
  const [mainEquipment, setMainEquipment] = useState(receipt.mainEquipment ?? '')

  const selectedSample = samples.find((s) => s.id === sampleId)
  const selectedParam = parameters.find((p) => p.code === parameterCode)

  // 判断某样品是否已录入检测项
  const sampleHasEntries = (sid: string) => items.some((i) => i.sampleId === sid)

  const fetchAll = useCallback(async () => {
    try {
      const [samplesRes, itemsRes] = await Promise.all([
        apiClient.get<{ items: Sample[] }>('/samples', { params: { receiptId: receipt.id, page: 1, pageSize: 100 } }),
        apiClient.get<{ items: TestItem[] }>('/test-items', { params: { receiptId: receipt.id } }),
      ])
      setSamples(samplesRes.data.items)
      setItems(itemsRes.data.items)
      if (samplesRes.data.items.length > 0 && !samplesRes.data.items.some((s) => s.id === sampleId)) {
        setSampleId(samplesRes.data.items[0]!.id)
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
    if (!sampleId || !parameterCode) return
    setSaving(true)
    setError(null)
    try {
      const numValues = testValues.map((v) => Number.parseFloat(v)).filter((v) => !Number.isNaN(v))
      if (numValues.length === 0) return
      const payload: Record<string, unknown> = { sampleId, parameterCode }
      if (numValues.length > 1) {
        payload.testValues = numValues
      } else {
        payload.result = String(numValues[0])
      }
      await apiClient.post('/test-items', payload)
      setTestValues([''])
      setParameterCode('')
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

  const paramLabel = (code: string) => parameters.find((p) => p.code === code)?.name ?? code
  const extDefs = category?.extFields ?? []

  // 选中样品已录入的检测项
  const sampleItems = items.filter((i) => i.sampleId === sampleId)

  // 计算代表值（前端预览）
  const previewRepresentative = (() => {
    const nums = testValues.map((v) => Number.parseFloat(v)).filter((v) => !Number.isNaN(v))
    if (nums.length === 0) return null
    if (nums.length === 1) return nums[0]
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    return Math.round(avg * 100) / 100
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div>
            <h3 className="text-lg font-semibold">录入检测结果 — {receipt.commissionCode}</h3>
            <p className="text-xs text-gray-500 mt-0.5">报告类别：{category?.name ?? receipt.categoryCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 检测环境/设备 */}
        <div className="grid grid-cols-3 gap-3 items-end px-5 py-3 border-b bg-gray-50 shrink-0">
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
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  await apiClient.put(`/receipts/${receipt.id}`, { testEnvironment, mainEquipment })
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : '保存失败')
                }
              }}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
            >
              保存
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="px-5 py-2 text-red-600 bg-red-50 text-sm shrink-0">{error}</div>
        )}

        {samples.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            该接样单暂无样品——请先在「接样管理 → 样品」中新建样品
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* ===== 左侧：样品清单 ===== */}
            <div className="w-48 border-r overflow-y-auto shrink-0 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">样品列表</p>
              {samples.map((s) => {
                const hasEntry = sampleHasEntries(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSampleId(s.id)
                      setParameterCode('')
                      setTestValues([''])
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${
                      s.id === sampleId
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : hasEntry
                        ? 'bg-green-50 text-green-800'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    <span className="font-medium">{s.sampleCode}</span>
                    <span className="ml-1 text-xs text-gray-400">{s.sampleName ?? ''}</span>
                    {!hasEntry && <span className="ml-1 text-xs text-orange-500">未录入</span>}
                  </button>
                )
              })}
            </div>

            {/* ===== 右侧：录入表单 ===== */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 选中样品信息 */}
              {selectedSample && (
                <div className="text-xs text-gray-600 bg-blue-50 rounded p-2 leading-relaxed">
                  <span className="font-semibold">样品信息：</span>
                  {selectedSample.sampleCode}
                  型号：{selectedSample.model ?? '—'}　规格：{selectedSample.specification ?? '—'}
                  等级：{selectedSample.grade ?? '—'}　牌号：{selectedSample.brand ?? '—'}
                  {selectedSample.batchNumber && <>　批号：{selectedSample.batchNumber}</>}
                  {selectedSample.supplyUnit && <>　供销单位：{selectedSample.supplyUnit}</>}
                  {extDefs.length > 0 && (
                    <>
                      <br />
                      <span className="font-semibold">扩展：</span>
                      {extDefs.map((f) => `${f.label}：${selectedSample.ext?.[f.key] ?? '—'}`).join('　')}
                    </>
                  )}
                </div>
              )}

              {/* 录入表单 */}
              <div className="bg-gray-50 rounded p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="de-param" className="block text-xs font-medium text-gray-600 mb-1">检测参数</label>
                    <select
                      id="de-param"
                      value={parameterCode}
                      onChange={(e) => {
                        setParameterCode(e.target.value)
                        const param = parameters.find((p) => p.code === e.target.value)
                        const count = param?.valueCount ?? 1
                        setTestValues(Array(count).fill(''))
                      }}
                      className="w-full border rounded px-2 py-1.5"
                    >
                      <option value="">请选择检测参数</option>
                      {parameters.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}{p.unit ? `（${p.unit}）` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {parameterCode && (
                    <div className="flex items-end">
                      {selectedParam?.unit && (
                        <span className="text-xs text-gray-500 mr-2">单位：{selectedParam.unit}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 动态列数输入（根据检测参数的 valueCount） */}
                {parameterCode && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      检测值
                      {(selectedParam?.valueCount ?? 1) > 1 ? `（需填 ${selectedParam?.valueCount} 个值）` : ''}
                    </p>
                    <div
                      className="grid gap-2 mb-2"
                      style={{ gridTemplateColumns: `repeat(${selectedParam?.valueCount ?? 1}, minmax(0, 1fr))` }}
                    >
                      {testValues.map((v, i) => (
                        <div key={i}>
                          <label className="block text-xs text-gray-400 mb-0.5">
                            {testValues.length > 1 ? `样本${i + 1}` : '检测值'}
                          </label>
                          <input
                            type="number"
                            value={v}
                            onChange={(e) => {
                              const next = [...testValues]
                              next[i] = e.target.value
                              setTestValues(next)
                            }}
                            placeholder="0.0"
                            className="w-full border rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    {previewRepresentative !== null && (
                      <div className="text-xs text-center text-blue-700 bg-blue-50 rounded px-2 py-1">
                        代表值：<span className="font-semibold">{previewRepresentative}</span>
                        {selectedParam?.unit ? ` ${selectedParam.unit}` : ''}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleAdd}
                    disabled={
                      saving ||
                      !sampleId ||
                      !parameterCode ||
                      testValues.filter((v) => v.trim()).length === 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                    {saving ? '录入中...' : '录入'}
                  </button>
                </div>
              </div>

              {/* 当前样品的已录入检测项 */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  已录入检测项
                  <span className="font-normal text-gray-400 ml-1">（{sampleItems.length} 条）</span>
                </p>
                {sampleItems.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">暂无检测记录</p>
                ) : (
                  <table className="w-full text-xs border rounded overflow-hidden">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-2 py-1.5 text-left">检测参数</th>
                        <th className="px-2 py-1.5 text-left">技术要求</th>
                        <th className="px-2 py-1.5 text-left">检测值</th>
                        <th className="px-2 py-1.5 text-left">代表值</th>
                        <th className="px-2 py-1.5 text-left">自动评定</th>
                        <th className="px-2 py-1.5 text-left">最终评定</th>
                        <th className="px-2 py-1.5 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-2 py-1.5">{paramLabel(item.parameterCode)}</td>
                          <td className="px-2 py-1.5 text-gray-500">{item.requirement || '—'}</td>
                          <td className="px-2 py-1.5">
                            {item.testValues
                              ? item.testValues.join(', ')
                              : item.result}
                            {item.unit ? ` ${item.unit}` : ''}
                          </td>
                          <td className="px-2 py-1.5 text-blue-700">
                            {item.representativeValue !== undefined
                              ? `${item.representativeValue}${item.unit ? ` ${item.unit}` : ''}`
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {item.autoPassed === true && <span className="text-green-700">合格</span>}
                            {item.autoPassed === false && <span className="text-red-600">不合格</span>}
                            {item.autoPassed === null && <span className="text-amber-600">需人工</span>}
                          </td>
                          <td className="px-2 py-1.5">
                            {item.passed ? (
                              <span className="text-green-700">合格</span>
                            ) : (
                              <span className="text-red-600">不合格</span>
                            )}
                            {item.autoPassed !== null && item.passed !== item.autoPassed && (
                              <span className="text-xs text-amber-600 ml-1">已修正</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleTogglePassed(item)}
                              className="px-1.5 py-0.5 text-amber-700 hover:underline"
                            >
                              改判
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="px-1.5 py-0.5 text-red-600 hover:underline"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        <div className="flex justify-between items-center px-5 py-3 border-t bg-gray-50 shrink-0">
          <p className="text-xs text-gray-500">
            全部合格 → 接样单整体结论「合格」
          </p>
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
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataEntryPage
