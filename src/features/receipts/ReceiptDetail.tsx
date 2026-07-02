import { useCallback } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { apiClient } from '../../api/client'
import type { Sample, SampleStatus } from '../../types/api'

interface ReceiptDetailProps {
  receiptId: string
  onClose: () => void
}

export function ReceiptDetail({ receiptId, onClose }: ReceiptDetailProps) {
  const fetchSamples = useCallback(
    () =>
      apiClient
        .get<{ items: Sample[]; total: number }>('/samples', { params: { receiptId, page: 1, pageSize: 100 } })
        .then((r) => r.data.items),
    [receiptId],
  )

  const { data: samples, loading, error } = useFetch(fetchSamples, [receiptId])

  const statusLabel = (s: SampleStatus) =>
    ({
      pending: '待检',
      testing: '检测中',
      completed: '已完成',
      rejected: '已拒收',
    }[s] ?? s)

  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-700">样品列表</h3>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border rounded"
        >
          关闭
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">加载中...</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {samples && samples.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">该接样下暂无样品</p>
          )}
          {samples && samples.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-1.5 text-left">样品编号</th>
                  <th className="px-3 py-1.5 text-left">样品名称</th>
                  <th className="px-3 py-1.5 text-left">所属项目</th>
                  <th className="px-3 py-1.5 text-left">状态</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-1.5">{s.code}</td>
                    <td className="px-3 py-1.5">{s.name}</td>
                    <td className="px-3 py-1.5">{s.projectId}</td>
                    <td className="px-3 py-1.5">{statusLabel(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default ReceiptDetail
