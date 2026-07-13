import { useCallback, useEffect, useRef, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { apiClient } from '../../api/client'
import { useCategories, categoryName } from '../categories/useCategories'
import { ReportPreviewModal } from '../report-doc/ReportPreviewModal'
import type { ReportCategory, Sample, SampleReceipt, TestItem, TestParameter, TechnicalRequirement } from '../../types/api'

function DataEntryRowActions({ receipt, onEntry, onPreview }: { receipt: SampleReceipt; onEntry: (r: SampleReceipt) => void; onPreview: (r: SampleReceipt) => void }) {
  return (
    <>
      <button onClick={() => onEntry(receipt)} className="px-2 py-1 text-blue-600 hover:underline">录入结果</button>
      <button onClick={() => onPreview(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">生成报告</button>
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
              r.result === 'pass' ? <span className="text-green-700">合格</span>
                : r.result === 'fail' ? <span className="text-red-600">不合格</span>
                : <span className="text-gray-400">未录入</span>,
          },
        ]}
        rowActions={rowAction}
      />
      {entryTarget && (
        <EntryModal
          receipt={entryTarget}
          onClose={() => setEntryTarget(null)}
          onPreview={() => { setPreviewTarget(entryTarget) }}
        />
      )}
      {previewTarget && <ReportPreviewModal receipt={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </>
  )
}

/** 根据样品规格自动派生 specimenArea 和 correctionFactor */
function deriveSpecimenParams(
  spec?: string,
): { area: number; correctionFactor: number; span?: number; width?: number; height?: number } {
  if (!spec) return { area: 22500, correctionFactor: 1.0 }
  const concrete = spec.match(/(\d+)×(\d+)×(\d+)mm/)
  if (concrete) {
    const b = Number(concrete[1])
    const h = Number(concrete[2])
    const l = Number(concrete[3])
    // 混凝土抗折试件：span=支座间距，非试件总长
    // 150×150×550mm → 跨度450mm；100×100×400mm → 跨度300mm
    if (l > 200) {
      const cf = (b === 150 && h === 150 && l === 550) ? 1.0
        : (b === 100 && h === 100 && l === 400) ? 0.85
        : 1.0
      const span = (b === 150 && h === 150) ? 450 : (b === 100 && h === 100) ? 300 : 400
      return { area: 22500, correctionFactor: cf, span, width: b, height: h }
    }
    // 混凝土抗压试件
    const side = b
    return { area: side * side, correctionFactor: side >= 150 ? 1.0 : 0.95 }
  }
  const diam = spec.match(/Φ(\d+)/)
  if (diam) {
    const d = Number(diam[1])
    const areas: Record<number, number> = {
      12: 113.1, 14: 153.9, 16: 201.1, 18: 254.5,
      20: 314.2, 22: 380.1, 25: 490.9, 28: 615.8, 32: 804.2,
    }
    return { area: areas[d] ?? 22500, correctionFactor: 1.0 }
  }
  return { area: 22500, correctionFactor: 1.0 }
}

/** 单项评定可选项：''=未评定（——），其余 4 个为改判结论 */
const VERDICT_OPTIONS = ['', '合格', '不合格', '符合', '不符合'] as const

/** 由评定文本推导 passed：合格/符合→true，不合格/不符合→false，空→null */
function verdictToPassed(v: string): boolean | null {
  if (v === '合格' || v === '符合') return true
  if (v === '不合格' || v === '不符合') return false
  return null
}

/** 当前生效的单项评定文本：优先 verdict，否则回退到 passed 的合格/不合格 */
function effectiveVerdict(item: TestItem): string {
  if (item.verdict) return item.verdict
  if (item.passed === true) return '合格'
  if (item.passed === false) return '不合格'
  return ''
}

/** 单项评定文本对应的颜色 */
function verdictColorClass(v: string): string {
  if (v === '合格' || v === '符合') return 'text-green-700'
  if (v === '不合格' || v === '不符合') return 'text-red-600'
  return 'text-gray-400'
}

/** 判定拉断面是否作废：输入"集中荷载之外"或超出加荷点 >7.5mm 则作废 */
function isDisqualifiedByPosition(pos?: string): boolean {
  if (!pos) return false
  if (pos === '集中荷载之外') return true
  const num = Number.parseFloat(pos)
  if (!Number.isNaN(num) && num > 7.5) return true
  return false
}

/** 录入弹窗：一个样品一个保存按钮 */
function EntryModal({ receipt, onClose, onPreview }: { receipt: SampleReceipt; onClose: () => void; onPreview: () => void }) {
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [items, setItems] = useState<TestItem[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [requirements, setRequirements] = useState<TechnicalRequirement[]>([])
  const [error, setError] = useState<string | null>(null)

  const [sampleId, setSampleId] = useState('')
  const [testEnvironment, setTestEnvironment] = useState(receipt.testEnvironment ?? '')
  const [mainEquipment, setMainEquipment] = useState(receipt.mainEquipment ?? '')
  const [testOperator, setTestOperator] = useState(receipt.testOperator ?? '')
  const [testStartDate, setTestStartDate] = useState(receipt.testStartDate ?? '')
  const [testEndDate, setTestEndDate] = useState(receipt.testEndDate ?? '')
  const [originalRecordNo, setOriginalRecordNo] = useState(receipt.originalRecordNo ?? '')
  const [remark, setRemark] = useState(receipt.remark ?? '')

  // 每样品每参数的荷载输入：Record<sampleId, Record<paramCode, string[]>>
  const [loads, setLoads] = useState<Record<string, Record<string, string[]>>>({})
  // CON006 抗折强度：每样品每参数每试件的拉断面位置（mm）
  const [fracturePositions, setFracturePositions] = useState<Record<string, Record<string, string[]>>>({})
  // CEM005 安定性：每样品每参数的试验方法（雷氏夹法/试饼法）
  const [soundnessMethods, setSoundnessMethods] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedSample = samples.find((s) => s.id === sampleId)
  const sampleHasEntries = (sid: string) => items.some((i) => i.sampleId === sid)
  const sampleItems = (sid: string) => items.filter((i) => i.sampleId === sid)

  const fetchAll = useCallback(async () => {
    try {
      const [sr, ir] = await Promise.all([
        apiClient.get<{ items: Sample[] }>('/samples', { params: { receiptId: receipt.id, page: 1, pageSize: 100 } }),
        apiClient.get<{ items: TestItem[] }>('/test-items', { params: { receiptId: receipt.id } }),
      ])
      setSamples(sr.data.items)
      setItems(ir.data.items)
      if (sr.data.items.length > 0 && !sr.data.items.some((s) => s.id === sampleId)) {
        setSampleId(sr.data.items[0]!.id)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [receipt.id, sampleId])

  useEffect(() => {
    fetchAll()
    apiClient.get<ReportCategory>(`/report-categories/${receipt.categoryCode}`)
      .then((r) => setCategory(r.data)).catch(() => setCategory(null))
    apiClient.get<{ items: TestParameter[] }>('/test-parameters', {
        params: { categoryCode: receipt.categoryCode, page: 1, pageSize: 200 },
      })
      .then((r) => {
        // 若接样单已选检测参数，只显示所选参数
        const filtered = receipt.testParameters?.length
          ? r.data.items.filter((p) => receipt.testParameters!.includes(p.code))
          : r.data.items
        setParameters(filtered)
      }).catch(() => setParameters([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.id, receipt.categoryCode])

  useEffect(() => {
    if (!selectedSample) return
    apiClient.get<{ items: TechnicalRequirement[] }>('/technical-requirements', {
        params: { categoryCode: receipt.categoryCode, page: 1, pageSize: 500 },
      })
      .then((r) => setRequirements(r.data.items)).catch(() => setRequirements([]))
    // 初始化所有样品所有参数的荷载空值
    setLoads((prev) => {
      const next: Record<string, Record<string, string[]>> = { ...prev }
      samples.forEach((s) => {
        if (!next[s.id]) next[s.id] = {}
        parameters.forEach((p) => {
          if (next[s.id]![p.code] === undefined) {
            const ex = items.find((i) => i.parameterCode === p.code && i.sampleId === s.id)
            next[s.id]![p.code] = ex
              ? (ex.testValues ? ex.testValues.map(String) : [ex.result ?? ''])
              : Array(p.valueCount ?? 1).fill('')
          }
        })
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSample, samples, parameters, items])

  // 同步已有录入（items 变化后用最新 samples 重算 loads 和 disqualified）
  // items 从空变为有数据时必须强制从 testValues 初始化，否则已定义的空字符串不会更新
  const prevItemsRef = useRef(items)
  useEffect(() => {
    if (!selectedSample) return
    const prevItems = prevItemsRef.current
    const itemsEmptyToPopulated = prevItems.length === 0 && items.length > 0
    prevItemsRef.current = items
    setLoads((prev) => {
      const next: Record<string, Record<string, string[]>> = { ...prev }
      samples.forEach((s) => {
        if (!next[s.id]) next[s.id] = {}
        parameters.forEach((p) => {
          const ex = items.find((i) => i.parameterCode === p.code && i.sampleId === s.id)
          if (ex?.testValues) {
            // 有检测记录：强制从 testValues（实际荷载）初始化，不管之前是否已有定义
            next[s.id]![p.code] = ex.testValues.map(String)
          } else if (ex?.result) {
            next[s.id]![p.code] = [ex.result]
          } else if (next[s.id]![p.code] === undefined) {
            next[s.id]![p.code] = Array(p.valueCount ?? 1).fill('')
          }
          // items 从空变有时，无记录的参数也补齐空值
          if (itemsEmptyToPopulated && !ex && next[s.id]![p.code] === undefined) {
            next[s.id]![p.code] = Array(p.valueCount ?? 1).fill('')
          }
        })
      })
      return next
    })
    // 同时初始化 fracturePositions（CON006 每试件的拉断面位置）
    setFracturePositions((prev) => {
      const next: Record<string, Record<string, string[]>> = { ...prev }
      samples.forEach((s) => {
        if (!next[s.id]) next[s.id] = {}
        parameters.forEach((p) => {
          const ex = items.find((i) => i.parameterCode === p.code && i.sampleId === s.id)
          if (p.code === 'CON006' && next[s.id]![p.code] === undefined) {
            next[s.id]![p.code] = Array(p.valueCount ?? 3).fill('')
          }
          if (ex?.loads && ex.loads.length > 0 && next[s.id]![p.code] === undefined) {
            // 已保存过的数据，从 loads 反推（赋空值，由用户重新填写位置）
            next[s.id]![p.code] = Array(ex.loads.length).fill('')
          }
        })
      })
      return next
    })
    // 同时初始化 soundnessMethods（CEM005 安定性试验方法）
    setSoundnessMethods((prev) => {
      const next = { ...prev }
      samples.forEach((s) => {
        const ex = items.find((i) => i.parameterCode === 'CEM005' && i.sampleId === s.id)
        if (ex?.testMethod && next[s.id] === undefined) {
          next[s.id] = ex.testMethod
        } else if (next[s.id] === undefined) {
          next[s.id] = ''
        }
      })
      return next
    })
  }, [selectedSample, items, samples, parameters])

  const matchReq = (paramCode: string, sample: Sample): TechnicalRequirement | undefined => {
    return requirements.find((r) => {
      if (r.parameterCode !== paramCode) return false
      const conflict = (a?: string, b?: string) => Boolean(a && b && a !== b)
      if (conflict(r.brand, sample.brand)) return false
      if (conflict(r.model, sample.model)) return false
      if (conflict(r.grade, sample.grade)) return false
      if (conflict(r.specification, sample.specification)) return false
      return true
    })
  }

  /** 某个样品某参数是否已录入（本地判断） */
  const isEntered = (sid: string, pcode: string) =>
    (loads[sid]?.[pcode] ?? []).some((v) => v.trim() !== '')

  /** 混凝土/钢筋：荷载→强度 */
  const calcStrengths = (loadsArr: number[], sample: Sample, paramCode: string) => {
    const { area, correctionFactor } = deriveSpecimenParams(sample.specification)
    if (paramCode === 'CON002' || paramCode === 'CON001') {
      return loadsArr.map((F) => Math.round((F * 1000 / area) * correctionFactor * 100) / 100)
    }
    if (paramCode === 'STE001' || paramCode === 'STE003') {
      return loadsArr.map((F) => Math.round((F * 1000 / area) * 100) / 100)
    }
    return loadsArr
  }

  /** 抗折强度（CON006）：f_f = F(N) × span / (b × h²) × 换算系数（MPa） */
  const calcFlexuralStrengths = (loadsArr: number[], sample: Sample): number[] => {
    const { span = 450, width = 150, height = 150, correctionFactor = 1.0 } = deriveSpecimenParams(sample.specification)
    // UI 输入极限荷载单位为 kN，需乘以 1000 转换为 N 再代入公式 f_f = F × span / (b × h²) × cf
    return loadsArr.map((F_kN) =>
      Math.round((F_kN * 1000 * span / (width * height * height)) * correctionFactor * 100) / 100,
    )
  }

  /** 混凝土代表值（±15%规则） */
  const calcConcreteRep = (strengths: number[]): number => {
    const s = [...strengths].sort((a, b) => a - b)
    const low = s[0]!, mid = s[1] ?? s[0]!, high = s[s.length - 1]!
    const range = mid * 0.15
    const rep = (high - mid > range || mid - low > range) ? mid
      : Math.round(strengths.reduce((a, b) => a + b, 0) / strengths.length * 100) / 100
    return Math.round(rep * 100) / 100
  }

  /** 保存单个样品全部录入 */
  const handleSaveSample = async (sid: string) => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.put(`/receipts/${receipt.id}`, {
        testEnvironment,
        mainEquipment,
        testOperator,
        testStartDate,
        testEndDate,
        originalRecordNo,
        remark,
      })
      const sample = samples.find((s) => s.id === sid)!
      for (const param of parameters) {
        const vals = (loads[sid]?.[param.code] ?? []).map((v) => Number.parseFloat(v)).filter((v) => !Number.isNaN(v))
        if (vals.length === 0) continue
        const existing = items.find((i) => i.parameterCode === param.code && i.sampleId === sid)
        if (param.code === 'CON002' || param.code === 'CON001') {
          // 混凝土抗压：testValues=荷载(kN)，result=强度代表值(MPa)
          // 先由荷载(kN)换算成强度(MPa)，再按±15%规则求代表值
          const strengths = calcStrengths(vals, sample, param.code)
          const rep = calcConcreteRep(strengths)
          await (existing
            ? apiClient.put(`/test-items/${existing.id}`, { testValues: vals, result: String(rep) })
            : apiClient.post('/test-items', { sampleId: sid, parameterCode: param.code, testValues: vals, result: String(rep) }))
        } else if (param.code === 'CON006') {
          // 抗折强度：loads=荷载(N)，disqualified 由拉断面位置自动判定
          const positions = fracturePositions[sid]?.[param.code] ?? []
          const isDisq = positions.map((p) => isDisqualifiedByPosition(p))
          const strengths = calcFlexuralStrengths(vals, sample)
          const rep = calcConcreteRep(strengths)
          await (existing
            ? apiClient.put(`/test-items/${existing.id}`, { loads: vals, disqualified: isDisq, result: String(rep) })
            : apiClient.post('/test-items', { sampleId: sid, parameterCode: param.code, loads: vals, disqualified: isDisq, result: String(rep) }))
        } else if (param.code === 'CEM005') {
          // 安定性：试验方法（testMethod）+ 检测结果（result）
          const method = soundnessMethods[sid] ?? ''
          const rawValue = loads[sid]?.[param.code]?.[0] ?? ''
          const result = method === '雷氏夹法'
            ? String(Number.parseFloat(rawValue) || '')
            : rawValue
          await (existing
            ? apiClient.put(`/test-items/${existing.id}`, { testMethod: method, result })
            : apiClient.post('/test-items', { sampleId: sid, parameterCode: param.code, testMethod: method, result }))
        } else {
          await (existing
            ? apiClient.put(`/test-items/${existing.id}`, { result: String(vals[0]) })
            : apiClient.post('/test-items', { sampleId: sid, parameterCode: param.code, result: String(vals[0]) }))
        }
      }
      await fetchAll()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } | null | undefined })?.response?.data?.message
      setError(msg ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSetVerdict = async (item: TestItem, verdict: string) => {
    setError(null)
    try {
      await apiClient.put(`/test-items/${item.id}`, { verdict, passed: verdictToPassed(verdict) })
      await fetchAll()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const handleDelete = async (item: TestItem) => {
    setError(null)
    try {
      await apiClient.delete(`/test-items/${item.id}`)
      await fetchAll()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const extDefs = category?.extFields ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div>
            <h3 className="text-lg font-semibold">录入检测结果 — {receipt.commissionCode}</h3>
            <p className="text-xs text-gray-500 mt-0.5">报告类别：{category?.name ?? receipt.categoryCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 检测信息 */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 bg-gray-50 shrink-0">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测环境</label>
              <input value={testEnvironment} onChange={(e) => setTestEnvironment(e.target.value)}
                placeholder="如 温度 20±2℃，湿度 50%RH"
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测设备</label>
              <input value={mainEquipment} onChange={(e) => setMainEquipment(e.target.value)}
                placeholder="如 WAW-1000 万能试验机"
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测人员</label>
              <input value={testOperator} onChange={(e) => setTestOperator(e.target.value)}
                placeholder="检测人员姓名"
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">原始记录单号</label>
              <input value={originalRecordNo} onChange={(e) => setOriginalRecordNo(e.target.value)}
                placeholder="原始记录单号"
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测开始日期</label>
              <input type="date" value={testStartDate} onChange={(e) => setTestStartDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">检测结束日期</label>
              <input type="date" value={testEndDate} onChange={(e) => setTestEndDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        {/* 备注行 */}
        <div className="px-5 py-2 border-b bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <label className="block text-xs font-medium text-gray-600">备注</label>
            <input value={remark} onChange={(e) => setRemark(e.target.value)}
              placeholder="备注信息"
              className="flex-1 border rounded px-2 py-1 text-sm" />
          </div>
        </div>

        {error && <div role="alert" className="px-5 py-2 text-red-600 bg-red-50 text-sm shrink-0">{error}</div>}

        {samples.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            该接样单暂无样品
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* 左侧：样品列表 */}
            <div className="w-44 border-r overflow-y-auto shrink-0 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">样品列表</p>
              {samples.map((s) => {
                const hasEntry = sampleHasEntries(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => setSampleId(s.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${
                      s.id === sampleId ? 'bg-blue-100 text-blue-800 font-medium'
                        : hasEntry ? 'bg-green-50 text-green-800'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    <span className="font-medium">{s.sampleCode}</span>
                    <br />
                    <span className="text-xs text-gray-400">{s.sampleName ?? ''}</span>
                    {!hasEntry && <span className="ml-1 text-xs text-orange-500">未录入</span>}
                  </button>
                )
              })}
            </div>

            {/* 右侧：当前样品 */}
            <div className="flex-1 overflow-y-auto">
              {selectedSample ? (
                <div>
                  {/* 样品信息头 */}
                  <div className="px-5 py-3 bg-blue-50 border-b text-xs text-blue-800 leading-relaxed">
                    <span className="font-semibold">当前样品：{selectedSample.sampleCode}</span>
                    <span className="ml-3">型号：{selectedSample.model ?? '—'}</span>
                    <span className="ml-2">规格：{selectedSample.specification ?? '—'}</span>
                    <span className="ml-2">等级：{selectedSample.grade ?? '—'}</span>
                    <span className="ml-2">牌号：{selectedSample.brand ?? '—'}</span>
                    {extDefs.length > 0 && (
                      <span className="ml-2">
                        {extDefs.map((f) => `${f.label}：${selectedSample.ext?.[f.key] ?? '—'}`).join('　')}
                      </span>
                    )}
                  </div>

                  {/* 检测参数录入区 */}
                  <div className="p-5 space-y-4">
                    {parameters.map((param) => {
                      const sampleLoads = loads[selectedSample.id]?.[param.code] ?? Array(param.valueCount ?? 1).fill('')
                      const req = matchReq(param.code, selectedSample)
                      const reqLabel = req ? `${req.comparison} ${req.value}${req.unit ? ` ${req.unit}` : ''}` : '—'
                      const entered = isEntered(selectedSample.id, param.code)
                      const numLoads = sampleLoads.map((v) => Number.parseFloat(v)).filter((v) => !Number.isNaN(v))
                      const isConcreteStrength = param.code === 'CON002' || param.code === 'CON001'
                      const isFlexural = param.code === 'CON006'
                      const strengths = isConcreteStrength && numLoads.length > 0
                        ? calcStrengths(numLoads, selectedSample, param.code)
                        : ([] as number[])
                      const flexuralStrengths = isFlexural && numLoads.length > 0
                        ? calcFlexuralStrengths(numLoads, selectedSample)
                        : ([] as number[])
                      const rep = isConcreteStrength && strengths.length >= (param.valueCount ?? 3)
                        ? calcConcreteRep(strengths)
                        : isFlexural && flexuralStrengths.length >= (param.valueCount ?? 3)
                          ? calcConcreteRep(flexuralStrengths)
                          : (numLoads.length > 0 ? numLoads[0]! : 0)
                      const existingItem = items.find((i) => i.parameterCode === param.code && i.sampleId === selectedSample.id)
                      // 抗折强度单项评定：代表值与技术要求比较
                      const flexuralVerdict = isFlexural && req && rep > 0
                        ? (req.comparison === '≥' ? (rep >= Number(req.value) ? '合格' : '不合格')
                          : (req.comparison === '≤' ? (rep <= Number(req.value) ? '合格' : '不合格')
                            : '—'))
                        : ''
                      // 混凝土抗压单项评定
                      const concreteVerdict = isConcreteStrength && req && rep > 0
                        ? (req.comparison === '≥' ? (rep >= Number(req.value) ? '合格' : '不合格')
                          : (req.comparison === '≤' ? (rep <= Number(req.value) ? '合格' : '不合格')
                            : '—'))
                        : ''
                      // 其他参数单项评定
                      const otherVerdict = !isFlexural && !isConcreteStrength && req && numLoads.length > 0
                        ? (req.comparison === '≥' ? (numLoads[0]! >= Number(req.value) ? '合格' : '不合格')
                          : (req.comparison === '≤' ? (numLoads[0]! <= Number(req.value) ? '合格' : '不合格')
                            : '—'))
                        : ''

                      return (
                        <div key={param.code} className={`border rounded p-4 ${entered ? 'bg-white border-green-200' : 'bg-orange-50/40 border-orange-100'}`}>
                          {/* 参数名 */}
                          <div className="flex items-center mb-3">
                            <span className="font-semibold text-gray-800">{param.name}</span>
                            {param.unit && <span className="ml-1 text-gray-400">（{param.unit}）</span>}
                          </div>

                          {/* 录入行 */}
                          <div className="flex items-end gap-4">
                            {isFlexural ? (
                              <>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="w-5 text-center text-gray-500 font-medium pb-1 px-1">序号</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">极限荷载(kN)</th>
                                      <th className="w-14 text-center text-gray-500 font-medium pb-1 px-2">抗折强度(MPa)</th>
                                      <th className="w-20 text-center text-gray-500 font-medium pb-1 px-2">拉断面位置</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">抗折强度代表值</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">技术要求</th>
                                      <th className="w-12 text-center text-gray-500 font-medium pb-1 px-2">单项评定</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: param.valueCount ?? 3 }).map((_, i) => {
                                      const pos = fracturePositions[selectedSample.id]?.[param.code]?.[i] ?? ''
                                      const disq = isDisqualifiedByPosition(pos)
                                      const fStrength = flexuralStrengths[i]
                                      return (
                                        <tr key={i}>
                                          <td className={`w-5 text-center font-medium px-1 ${disq ? 'text-red-500' : 'text-gray-600'}`}>#{i + 1}</td>
                                          <td className="w-16 px-2">
                                            <input
                                              type="number"
                                              value={sampleLoads[i] ?? ''}
                                              onChange={(e) => {
                                                const next = [...sampleLoads]
                                                next[i] = e.target.value
                                                setLoads((prev) => ({
                                                  ...prev,
                                                  [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: next },
                                                }))
                                              }}
                                              className="w-full border rounded px-2 py-1.5 text-center text-sm"
                                            />
                                          </td>
                                          <td className={`w-14 text-center border rounded px-2 py-1.5 text-sm font-medium ${disq ? 'bg-red-50 text-red-400 line-through' : 'bg-gray-50 text-blue-700'}`}>
                                            {fStrength ?? '—'}
                                          </td>
                                          <td className="w-20 px-2">
                                            <select
                                              value={pos}
                                              onChange={(e) => {
                                                setFracturePositions((prev) => {
                                                  const cur = prev[selectedSample.id]?.[param.code] ?? Array(param.valueCount ?? 3).fill('')
                                                  const next = [...cur]
                                                  next[i] = e.target.value
                                                  return { ...prev, [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: next } }
                                                })
                                              }}
                                              className="w-full border rounded px-2 py-1.5 text-sm"
                                            >
                                              <option value="">请选择</option>
                                              <option value="集中荷载之内">集中荷载之内</option>
                                              <option value="集中荷载之外">集中荷载之外</option>
                                            </select>
                                          </td>
                                          {i === 0 ? (
                                            <>
                                              <td className="w-16 px-2 text-xs text-gray-700 font-medium">{rep > 0 ? `${rep} MPa` : '—'}</td>
                                              <td className="w-16 px-2 text-xs text-gray-500">{flexuralVerdict ? reqLabel : '—'}</td>
                                              <td className={`w-12 px-2 text-xs font-medium ${existingItem ? verdictColorClass(effectiveVerdict(existingItem)) : ''}`}>
                                                {existingItem ? (effectiveVerdict(existingItem) || '—') : '—'}
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td className="w-16 px-2"></td>
                                              <td className="w-16 px-2"></td>
                                              <td className="w-12 px-2"></td>
                                            </>
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </>
                            ) : isConcreteStrength ? (
                              <>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="w-5 text-center text-gray-500 font-medium pb-1 px-1">序号</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">极限荷载(kN)</th>
                                      <th className="w-14 text-center text-gray-500 font-medium pb-1 px-2">抗压强度(MPa)</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">代表值</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">技术要求</th>
                                      <th className="w-12 text-center text-gray-500 font-medium pb-1 px-2">单项评定</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: param.valueCount ?? 3 }).map((_, i) => (
                                      <tr key={i}>
                                        <td className="w-5 text-center font-medium px-1 text-gray-600">#{i + 1}</td>
                                        <td className="w-16 px-2">
                                          <input
                                            type="number"
                                            value={sampleLoads[i] ?? ''}
                                            onChange={(e) => {
                                              const next = [...sampleLoads]
                                              next[i] = e.target.value
                                              setLoads((prev) => ({
                                                ...prev,
                                                [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: next },
                                              }))
                                            }}
                                            className="w-full border rounded px-2 py-1.5 text-center text-sm"
                                          />
                                        </td>
                                        <td className="w-14 text-center border rounded px-2 py-1.5 text-sm bg-gray-50 text-blue-700 font-medium">
                                          {strengths[i] ?? '—'}
                                        </td>
                                        {i === 0 ? (
                                          <>
                                            <td className="w-16 px-2 text-xs text-gray-700 font-medium">{rep > 0 ? `${rep} MPa` : '—'}</td>
                                            <td className="w-16 px-2 text-xs text-gray-500">{concreteVerdict ? reqLabel : '—'}</td>
                                            <td className={`w-12 px-2 text-xs font-medium ${existingItem ? verdictColorClass(effectiveVerdict(existingItem)) : ''}`}>
                                              {existingItem ? (effectiveVerdict(existingItem) || '—') : '—'}
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="w-16 px-2"></td>
                                            <td className="w-16 px-2"></td>
                                            <td className="w-12 px-2"></td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </>
                            ) : param.code === 'CEM005' ? (
                              <>
                                <div className="flex items-end gap-4">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">试验方法</label>
                                    <select
                                      value={soundnessMethods[selectedSample.id] ?? ''}
                                      onChange={(e) => {
                                        setSoundnessMethods((prev) => ({
                                          ...prev,
                                          [selectedSample.id]: e.target.value,
                                        }))
                                        // 切换方法时清空检测值
                                        setLoads((prev) => ({
                                          ...prev,
                                          [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: [''] },
                                        }))
                                      }}
                                      className="border rounded px-2 py-1.5 text-sm"
                                    >
                                      <option value="">请选择</option>
                                      <option value="雷氏夹法">雷氏夹法</option>
                                      <option value="试饼法">试饼法</option>
                                    </select>
                                  </div>
                                  {soundnessMethods[selectedSample.id] === '雷氏夹法' && (
                                    <div className="flex items-end gap-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">膨胀值(mm)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={sampleLoads[0] ?? ''}
                                          onChange={(e) => {
                                            setLoads((prev) => ({
                                              ...prev,
                                              [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: [e.target.value] },
                                            }))
                                          }}
                                          className="w-28 border rounded px-2 py-1.5 text-sm"
                                        />
                                      </div>
                                      <span className="text-xs text-gray-400 pb-1">安定性合格：膨胀值 ≤ 5.0mm</span>
                                    </div>
                                  )}
                                  {soundnessMethods[selectedSample.id] === '试饼法' && (
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">检测结果</label>
                                      <select
                                        value={sampleLoads[0] ?? ''}
                                        onChange={(e) => {
                                          setLoads((prev) => ({
                                            ...prev,
                                            [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: [e.target.value] },
                                          }))
                                        }}
                                        className="border rounded px-2 py-1.5 text-sm"
                                      >
                                        <option value="">请选择</option>
                                        <option value="无裂缝，无弯曲">无裂缝，无弯曲</option>
                                        <option value="无裂缝，有弯曲">无裂缝，有弯曲</option>
                                        <option value="有裂缝，无弯曲">有裂缝，无弯曲</option>
                                        <option value="有裂缝，有弯曲">有裂缝，有弯曲</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                                {/* 安定性合格判定说明 */}
                                <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                                  <span className="font-medium">合格判定：</span>
                                  雷氏夹法——膨胀值平均值 ≤ 5.0mm；试饼法——无裂缝且无弯曲
                                </div>
                              </>
                            ) : (
                              <>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="w-5 text-center text-gray-500 font-medium pb-1 px-1">序号</th>
                                      <th className="w-24 text-center text-gray-500 font-medium pb-1 px-2">检测结果</th>
                                      <th className="w-16 text-center text-gray-500 font-medium pb-1 px-2">技术要求</th>
                                      <th className="w-12 text-center text-gray-500 font-medium pb-1 px-2">单项评定</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="w-5 text-center font-medium px-1 text-gray-600">#1</td>
                                      <td className="w-24 px-2">
                                        <input
                                          type="number"
                                          value={sampleLoads[0] ?? ''}
                                          onChange={(e) => {
                                            setLoads((prev) => ({
                                              ...prev,
                                              [selectedSample.id]: { ...prev[selectedSample.id], [param.code]: [e.target.value] },
                                            }))
                                          }}
                                          className="w-full border rounded px-2 py-1.5 text-center text-sm"
                                        />
                                      </td>
                                      <td className="w-16 px-2 text-xs text-gray-500">
                                        {otherVerdict ? reqLabel : '—'}
                                      </td>
                                      <td className={`w-12 px-2 text-xs font-medium ${existingItem ? verdictColorClass(effectiveVerdict(existingItem)) : ''}`}>
                                        {existingItem ? (effectiveVerdict(existingItem) || '—') : '—'}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </>
                            )}

                            {/* 已录入标识 */}
                            {entered && existingItem && (
                              <div className="ml-auto flex items-center gap-2">
                                {existingItem.autoPassed !== null && existingItem.passed !== existingItem.autoPassed && (
                                  <span className="text-xs text-amber-500">（已修正）</span>
                                )}
                                <label className="text-xs text-amber-600 flex items-center gap-1">
                                  改判
                                  <select
                                    value={effectiveVerdict(existingItem)}
                                    onChange={(e) => handleSetVerdict(existingItem, e.target.value)}
                                    className="border rounded px-1 py-0.5 text-xs text-gray-700"
                                  >
                                    {VERDICT_OPTIONS.map((opt) => (
                                      <option key={opt || 'none'} value={opt}>{opt || '——'}</option>
                                    ))}
                                  </select>
                                </label>
                                <button onClick={() => handleDelete(existingItem)} className="text-xs text-red-600 hover:underline">删除</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  请从左侧选择一个样品
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="flex justify-between items-center px-5 py-3 border-t bg-gray-50 shrink-0">
          <p className="text-xs text-gray-500">
            {sampleItems(sampleId).length > 0 && `当前样品已录入 ${sampleItems(sampleId).length} 项　`}
            全部合格 → 接样单整体结论「合格」
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { if (selectedSample) handleSaveSample(selectedSample.id) }}
              disabled={saving || !selectedSample || !isEntered(selectedSample.id, parameters[0]?.code)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              保存
            </button>
            <button onClick={() => { onClose(); onPreview() }}
              disabled={items.length === 0}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
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
