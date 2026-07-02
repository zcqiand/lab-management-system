import { useContractStore } from './contractStore'
import { apiClient } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import type { SteelSummaryRow, MaterialType } from '../../types/api'

interface ContractSummaryProps {
  contractId: string
  materialType: MaterialType
}

export function ContractSummary({ contractId, materialType }: ContractSummaryProps) {
  const { current } = useContractStore()

  const fetcher = async (): Promise<SteelSummaryRow[]> => {
    if (!contractId) return []
    const res = await apiClient.get<SteelSummaryRow[]>(`/contracts/${contractId}/summary`, {
      params: { materialType },
    })
    return res.data
  }

  const { data: rows, loading, error } = useFetch(fetcher, [contractId, materialType])

  const contract = current

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          材料汇总表
          {contract && <span className="ml-2 text-sm font-normal text-gray-600">({contract.contractCode})</span>}
        </h3>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">序号</th>
              <th className="px-3 py-2 text-left">品种规格</th>
              <th className="px-3 py-2 text-left">牌号</th>
              <th className="px-3 py-2 text-left">质保单编号</th>
              <th className="px-3 py-2 text-left">生产厂家</th>
              <th className="px-3 py-2 text-left">代表数量</th>
              <th className="px-3 py-2 text-left">试验报告编号</th>
              <th className="px-3 py-2 text-left">检测日期</th>
              <th className="px-3 py-2 text-left">判定结果</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && (!rows || rows.length === 0) && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {!loading && rows && rows.length > 0 && rows.map((row) => (
              <tr key={row.seq} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{row.seq}</td>
                <td className="px-3 py-2">{row.spec}</td>
                <td className="px-3 py-2">{row.steelGrade}</td>
                <td className="px-3 py-2">{row.qualityCertNo}</td>
                <td className="px-3 py-2">{row.manufacturer}</td>
                <td className="px-3 py-2">{row.representQuantity}</td>
                <td className="px-3 py-2">{row.reportCode}</td>
                <td className="px-3 py-2">{row.testDate}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      row.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {row.result === 'pass' ? '合格' : '不合格'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ContractSummary
