import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import type { DashboardStats } from '../types/api'
import { FLOW_STAGE_LABELS, FLOW_STAGE_ORDER } from '../types/api'

/** 仪表盘：合同/接样/样品总量 + 各流程阶段分布 + 各报告类别分布 */
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<DashboardStats>('/stats')
      .then((res) => setStats(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">仪表盘</h2>
        <p className="text-gray-600 text-sm mt-1">实验室概览与待办事项</p>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded shadow p-4">
              <p className="text-xs text-gray-500">合同数</p>
              <p className="text-3xl font-bold mt-1">{stats.contractCount}</p>
            </div>
            <div className="bg-white rounded shadow p-4">
              <p className="text-xs text-gray-500">接样单数</p>
              <p className="text-3xl font-bold mt-1">{stats.receiptCount}</p>
            </div>
            <div className="bg-white rounded shadow p-4">
              <p className="text-xs text-gray-500">样品数</p>
              <p className="text-3xl font-bold mt-1">{stats.sampleCount}</p>
            </div>
            <div className="bg-white rounded shadow p-4">
              <p className="text-xs text-gray-500">待安排任务</p>
              <p className="text-3xl font-bold mt-1 text-amber-600">{stats.pendingTaskCount}</p>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="text-sm font-semibold mb-3">流程阶段分布</h3>
            <div className="grid grid-cols-7 gap-2">
              {FLOW_STAGE_ORDER.map((stage) => (
                <div key={stage} className="text-center border rounded p-3">
                  <p className="text-xs text-gray-500">{FLOW_STAGE_LABELS[stage]}</p>
                  <p className="text-xl font-bold mt-1">{stats.receiptCountByStage[stage] ?? 0}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="text-sm font-semibold mb-3">各报告类别</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">报告类别</th>
                  <th className="px-3 py-2 text-right">接样单数</th>
                  <th className="px-3 py-2 text-right">已出报告</th>
                </tr>
              </thead>
              <tbody>
                {stats.receiptCountByCategory.map((c) => (
                  <tr key={c.categoryCode} className="border-t">
                    <td className="px-3 py-2">{c.categoryName}</td>
                    <td className="px-3 py-2 text-right">{c.count}</td>
                    <td className="px-3 py-2 text-right">{c.reported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
