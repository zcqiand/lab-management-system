import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { TechnicalRequirement, MaterialType } from '../../types/api'

const MATERIAL_TABS: { label: string; value: MaterialType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '钢材', value: 'steel' },
  { label: '水泥', value: 'cement' },
  { label: '混凝土', value: 'concrete' },
  { label: '砂', value: 'sand' },
  { label: '碎石', value: 'gravel' },
  { label: '钢筋机械连接', value: 'rebar_mech' },
  { label: '钢筋焊接连接', value: 'rebar_weld' },
]

const PAGE_SIZE = 100

export function TechnicalRequirementList() {
  const [list, setList] = useState<TechnicalRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [materialType, setMaterialType] = useState<MaterialType | 'all'>('all')

  const fetchRequirements = (mt: MaterialType | 'all') => {
    setLoading(true)
    setError(null)
    const params: Record<string, string> = { page: '1', pageSize: String(PAGE_SIZE) }
    if (mt !== 'all') params.materialType = mt
    apiClient
      .get<{ items: TechnicalRequirement[]; total: number }>('/technical-requirements', { params })
      .then((res) => {
        setList(res.data.items)
        setLoading(false)
      })
      .catch(() => {
        setError('加载技术要求失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchRequirements(materialType) }, [materialType])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">技术要求</h2>
      </div>

      <div className="flex gap-1 bg-white rounded shadow p-1">
        {MATERIAL_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setMaterialType(tab.value)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              materialType === tab.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
              <th className="px-4 py-2 text-left">组合码</th>
              <th className="px-4 py-2 text-left">标准编号</th>
              <th className="px-4 py-2 text-left">参数代码</th>
              <th className="px-4 py-2 text-left">材料</th>
              <th className="px-4 py-2 text-left">等级</th>
              <th className="px-4 py-2 text-left">规格</th>
              <th className="px-4 py-2 text-left">比较方式</th>
              <th className="px-4 py-2 text-left">要求值</th>
              <th className="px-4 py-2 text-left">单位</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.standardCode}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.parameterCode}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                    {MATERIAL_TABS.find((t) => t.value === r.materialType)?.label ?? r.materialType}
                  </span>
                </td>
                <td className="px-4 py-2">{r.materialGrade ?? '-'}</td>
                <td className="px-4 py-2">{r.specification ?? '-'}</td>
                <td className="px-4 py-2">
                  <span className="font-mono text-xs bg-gray-100 px-1 rounded">{r.comparison}</span>
                </td>
                <td className="px-4 py-2 font-medium">{r.value}</td>
                <td className="px-4 py-2">{r.unit ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TechnicalRequirementList
