import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { TestStandard } from '../../types/api'

const TYPE_LABELS: Record<TestStandard['type'], string> = {
  national: '国标',
  industry: '行标',
  local: '地标',
  enterprise: '企标',
}

const MATERIAL_LABELS: Record<string, string> = {
  steel: '钢材',
  cement: '水泥',
  concrete: '混凝土',
  sand: '砂',
  gravel: '碎石',
  rebar_mech: '钢筋机械连接',
  rebar_weld: '钢筋焊接连接',
}

const PAGE_SIZE = 100

export function TestStandardList() {
  const [list, setList] = useState<TestStandard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStandards = () => {
    setLoading(true)
    setError(null)
    apiClient
      .get<{ items: TestStandard[]; total: number }>('/test-standards', {
        params: { page: '1', pageSize: String(PAGE_SIZE) },
      })
      .then((res) => {
        setList(res.data.items)
        setLoading(false)
      })
      .catch(() => {
        setError('加载检测标准失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchStandards() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">标准管理</h2>
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
              <th className="px-4 py-2 text-left">标准编号</th>
              <th className="px-4 py-2 text-left">标准名称</th>
              <th className="px-4 py-2 text-left">类型</th>
              <th className="px-4 py-2 text-left">适用材料</th>
              <th className="px-4 py-2 text-left">适用参数</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((s) => (
              <tr key={s.code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                    s.type === 'national' ? 'bg-green-50 text-green-700' :
                    s.type === 'industry' ? 'bg-blue-50 text-blue-700' :
                    s.type === 'local' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {TYPE_LABELS[s.type]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {s.applicableMaterials.map((m) => (
                      <span key={m} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                        {MATERIAL_LABELS[m] ?? m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {s.applicableParameters.join(', ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TestStandardList
