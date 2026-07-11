import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { useCategories } from '../categories/useCategories'
import type { Contract, SummaryData } from '../../types/api'

/** 统计汇总——按报告类别输出试验报告汇总表（对应线下的
 * 钢材/水泥/混凝土/砂/碎（卵）石/钢筋机械连接/钢筋焊接连接 汇总表），
 * 行粒度为样品，只统计已生成报告的接样单，可按工程（合同）过滤。
 */
export function SummaryPage() {
  const { categories } = useCategories()
  const [categoryCode, setCategoryCode] = useState('')
  const [contractId, setContractId] = useState('')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryCode && categories.length > 0) setCategoryCode(categories[0]!.code)
  }, [categories, categoryCode])

  useEffect(() => {
    apiClient
      .get<{ items: Contract[] }>('/contracts', { params: { page: 1, pageSize: 100 } })
      .then((res) => setContracts(res.data.items))
      .catch(() => setContracts([]))
  }, [])

  const fetchSummary = useCallback(async () => {
    if (!categoryCode) return
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { categoryCode }
      if (contractId) params.contractId = contractId
      const res = await apiClient.get<SummaryData>('/summary', { params })
      setData(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [categoryCode, contractId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const contractName = contracts.find((c) => c.id === contractId)?.projectName

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">统计汇总</h2>
        <p className="text-xs text-gray-500 mt-1">
          按报告类别输出试验报告汇总表（行粒度：样品；只统计已生成报告的接样单）
        </p>
      </div>

      {/* 报告类别 tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.code}
            onClick={() => setCategoryCode(c.code)}
            className={`px-3 py-1.5 rounded text-sm border ${
              categoryCode === c.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm text-sm">
        <label className="text-gray-600">工程（合同）：</label>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="border rounded px-2 py-1.5 min-w-56">
          <option value="">全部工程</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>{c.contractCode}　{c.projectName}</option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <div className="px-4 pt-4">
          <h3 className="text-center font-bold text-base">{data?.summaryName ?? ''}</h3>
          <p className="text-center text-xs text-gray-500 mb-2">
            工程名称：{contractName ?? '（全部）'}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 border">序号</th>
              {data?.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 border whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={(data?.columns.length ?? 0) + 1} className="px-3 py-8 text-center text-gray-400 border">加载中...</td></tr>
            )}
            {!loading && (data?.rows.length ?? 0) === 0 && (
              <tr><td colSpan={(data?.columns.length ?? 0) + 1} className="px-3 py-8 text-center text-gray-400 border">该类别暂无已出报告的记录</td></tr>
            )}
            {!loading &&
              data?.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border text-center">{i + 1}</td>
                  {data.columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 border text-center">{row[col.key] || '—'}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-gray-400">
          注：汇总表按单位工程汇总，经项目经理和总监理工程师签字盖章。
        </p>
      </div>
    </div>
  )
}

export default SummaryPage
