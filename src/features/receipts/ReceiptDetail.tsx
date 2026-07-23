import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { InspectionParameter as TestParameter } from '../../types/api'

interface ExtField { key: string; label: string }

interface TestRecord {
  id: string
  sampleId: string
  parameterCode: string
  requirementCode?: string
  requirement: string
  result: string
  unit?: string
  testValues?: number[]
  loads?: number[]
  disqualified?: boolean[]
  representativeValue?: number
  autoPassed: boolean | null
  passed: boolean | null
  verdict?: string
  remark?: string
  testMethod?: string
}

interface Sample {
  id: string
  sampleCode?: string
  sampleName?: string
  materialType?: string
  specification?: string
  grade?: string
  model?: string
  brand?: string
  manufacturer?: string
  structuralPart?: string
  representQuantity?: string
  sampleQuantity?: string
  batchNumber?: string
  supplyUnit?: string
  arrivalDate?: string
  samplingDate?: string
  curingCondition?: string
  age?: string
  remark?: string
  ext?: Record<string, string>
  status?: string
}

interface ReceiptDetailProps {
  receiptId: string
  categoryCode: string
}

export function ReceiptDetail({ receiptId, categoryCode }: ReceiptDetailProps) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [testItems, setTestRecords] = useState<TestRecord[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [extFields, setExtFields] = useState<ExtField[]>([])
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, tiRes, pRes, catRes] = await Promise.all([
        apiClient.get('/samples', { params: { receiptId, page: '1', pageSize: '200' } }),
        apiClient.get('/test-records', { params: { receiptId, page: '1', pageSize: '500' } }),
        apiClient.get<{ items: TestParameter[] }>('/test-parameters', { params: { page: '1', pageSize: '200' } }),
        apiClient.get<{ extFields: ExtField[] }>(`/report-categories/${categoryCode}`),
      ])
      const sItems: Sample[] = sRes.data.items ?? []
      const tiItems: TestRecord[] = tiRes.data.items ?? []
      setSamples(sItems)
      setTestRecords(tiItems)
      setParameters(pRes.data.items ?? [])
      setExtFields(catRes.data.extFields ?? [])
      if (sItems.length > 0 && !activeSampleId) {
        setActiveSampleId(sItems[0].id)
      }
    } catch {
      setExtFields([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeSampleId 仅为初始选中态，不参与数据获取
  }, [receiptId, categoryCode])

  useEffect(() => { fetchData() }, [fetchData])

  const paramName = (code?: string) => parameters.find(p => p.code === code)?.name ?? code ?? '—'

  const activeSample = samples.find((s) => s.id === activeSampleId)
  const activeItems = testItems.filter((i) => i.sampleId === activeSampleId)

  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      {samples.length > 0 && (
        <div className="flex border-b text-sm overflow-x-auto">
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSampleId(s.id)}
              className={`px-4 py-2 whitespace-nowrap border-b-2 ${s.id === activeSampleId ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {s.sampleCode ?? s.sampleName ?? s.id}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 py-4 text-center">加载中...</p>}
      {error && <p role="alert" className="text-sm text-red-600 py-2">{error}</p>}

      {activeSample && (
        <>
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-2">样品信息</h4>
            <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-sm">
              {/* 基本信息 */}
              <div><span className="text-gray-500">样品编号：</span>{activeSample.sampleCode ?? '—'}</div>
              <div><span className="text-gray-500">样品名称：</span>{activeSample.sampleName ?? '—'}</div>
              {/* 规格信息 */}
              <div><span className="text-gray-500">型号：</span>{activeSample.model ?? '—'}</div>
              <div><span className="text-gray-500">规格：</span>{activeSample.specification ?? '—'}</div>
              <div><span className="text-gray-500">等级：</span>{activeSample.grade ?? '—'}</div>
              <div><span className="text-gray-500">牌号：</span>{activeSample.brand ?? '—'}</div>
              {/* 生产信息 */}
              <div><span className="text-gray-500">出厂编号/批号：</span>{activeSample.batchNumber ?? '—'}</div>
              <div><span className="text-gray-500">生产厂家/产地：</span>{activeSample.manufacturer ?? '—'}</div>
              <div><span className="text-gray-500">供销单位：</span>{activeSample.supplyUnit ?? '—'}</div>
              <div><span className="text-gray-500">进场日期：</span>{activeSample.arrivalDate ?? '—'}</div>
              {/* 施工信息 */}
              <div><span className="text-gray-500">结构部位：</span>{activeSample.structuralPart ?? '—'}</div>
              <div><span className="text-gray-500">取（制）样日期：</span>{activeSample.samplingDate ?? '—'}</div>
              <div><span className="text-gray-500">养护条件：</span>{activeSample.curingCondition ?? '—'}</div>
              <div><span className="text-gray-500">龄期：</span>{activeSample.age ?? '—'}</div>
              {/* 数量 */}
              <div><span className="text-gray-500">代表数量：</span>{activeSample.representQuantity ?? '—'}</div>
              <div><span className="text-gray-500">样品数量：</span>{activeSample.sampleQuantity ?? '—'}</div>
              {/* 备注 */}
              {activeSample.remark && <div className="col-span-4"><span className="text-gray-500">备注：</span>{activeSample.remark}</div>}
            </div>
            {/* 扩展属性 */}
            {extFields.length > 0 && (
              <div className="mt-2 pt-2 border-t grid grid-cols-4 gap-x-4 gap-y-1 text-sm">
                {extFields.map(f => (
                  <div key={f.key}>
                    <span className="text-gray-500">{f.label}：</span>{activeSample.ext?.[f.key] ?? '—'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-2">检测数据</h4>
            {activeItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">暂无检测数据</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-1.5 text-left">检测参数</th>
                    <th className="px-3 py-1.5 text-left">技术要求</th>
                    <th className="px-3 py-1.5 text-left">检测值</th>
                    <th className="px-3 py-1.5 text-left">单位</th>
                    <th className="px-3 py-1.5 text-left">代表值</th>
                    <th className="px-3 py-1.5 text-left">单项结论</th>
                    <th className="px-3 py-1.5 text-left">自动评定</th>
                    <th className="px-3 py-1.5 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-1.5">{item.parameterCode}-{paramName(item.parameterCode)}</td>
                      <td className="px-3 py-1.5">{item.requirement ?? '—'}</td>
                      <td className="px-3 py-1.5">{item.testValues ? item.testValues.join(', ') : (item.result || '—')}</td>
                      <td className="px-3 py-1.5">{item.unit ?? '—'}</td>
                      <td className="px-3 py-1.5">{item.representativeValue ?? '—'}</td>
                      <td className="px-3 py-1.5">
                        <span className={item.passed === false ? 'text-red-600' : 'text-green-600'}>
                          {item.verdict ? item.verdict : (item.passed === false ? '不合格' : '合格')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {item.autoPassed === null ? '—' : (item.autoPassed ? '合格' : '不合格')}
                      </td>
                      <td className="px-3 py-1.5">{item.remark ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ReceiptDetail
