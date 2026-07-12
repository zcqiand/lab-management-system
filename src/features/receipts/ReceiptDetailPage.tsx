import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { apiClient } from '../../api/client'
import { FLOW_STAGE_LABELS, type SampleReceipt, type TestParameter } from '../../types/api'
import { ReceiptDetail } from './ReceiptDetail'

export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<SampleReceipt | null>(null)
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipt = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [receiptRes, paramRes] = await Promise.all([
        apiClient.get<SampleReceipt>(`/receipts/${id}`),
        apiClient.get<{ items: TestParameter[] }>('/test-parameters', { params: { page: 1, pageSize: 200 } }),
      ])
      setReceipt(receiptRes.data)
      setParameters(paramRes.data.items ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchReceipt() }, [fetchReceipt])

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!receipt) return null

  const paramName = (code?: string) => parameters.find(p => p.code === code)?.name ?? code ?? '—'
  const paramLabels = receipt.testParameters?.map(c => `${c}-${paramName(c)}`).join(', ') ?? '—'

  return (
    <div className="space-y-4">
      {/* 接样信息 —— 顺序与表单一致 */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="text-base font-semibold text-gray-700 mb-3">接样信息</h3>
        <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-sm">
          {/* 委托书信息 */}
          <div><span className="text-gray-500">委托书编号：</span>{receipt.commissionCode}</div>
          <div><span className="text-gray-500">委托书登记号：</span>{receipt.commissionRegisterCode ?? '—'}</div>
          <div><span className="text-gray-500">委托日期：</span>{receipt.commissionDate}</div>
          <div><span className="text-gray-500">委托书登记日期：</span>{receipt.commissionRegisterDate ?? '—'}</div>
          {/* 从合同带出 */}
          <div><span className="text-gray-500">工程名称：</span>{receipt.projectName ?? '—'}</div>
          <div><span className="text-gray-500">委托单位：</span>{receipt.clientUnit ?? '—'}</div>
          <div><span className="text-gray-500">建设单位：</span>{receipt.buildingUnit ?? '—'}</div>
          <div><span className="text-gray-500">监理单位：</span>{receipt.supervisorUnit ?? '—'}</div>
          <div><span className="text-gray-500">施工单位：</span>{receipt.constructionUnit ?? '—'}</div>
          <div><span className="text-gray-500">见证单位：</span>{receipt.witnessUnit ?? '—'}</div>
          <div><span className="text-gray-500">见证人：</span>{receipt.witness ?? '—'}</div>
          <div><span className="text-gray-500">见证人电话：</span>{receipt.witnessPhone ?? '—'}</div>
          <div><span className="text-gray-500">送检人：</span>{receipt.inspector ?? '—'}</div>
          <div><span className="text-gray-500">送检人电话：</span>{receipt.inspectorPhone ?? '—'}</div>
          {/* 取样信息 */}
          <div><span className="text-gray-500">取样地点：</span>{receipt.samplingLocation ?? '—'}</div>
          <div><span className="text-gray-500">接样人：</span>{receipt.receivedBy}</div>
          {/* 报告类别 + 检测类别 */}
          <div><span className="text-gray-500">报告类别：</span>{receipt.categoryCode}</div>
          <div><span className="text-gray-500">检测类别：</span>{receipt.testCategory}</div>
          <div><span className="text-gray-500">样品来源：</span>{receipt.sampleSource}</div>
          <div><span className="text-gray-500">合同编号：</span>{receipt.contractId}</div>
          {/* 判定/检测依据 + 参数 */}
          <div className="col-span-2"><span className="text-gray-500">判定依据：</span>{receipt.judgmentBasis?.length ? receipt.judgmentBasis.join(', ') : '—'}</div>
          <div className="col-span-2"><span className="text-gray-500">检测依据：</span>{receipt.testingBasis?.length ? receipt.testingBasis.join(', ') : '—'}</div>
          <div className="col-span-4"><span className="text-gray-500">检测参数：</span>{paramLabels}</div>
          {/* 流程信息 */}
          <div><span className="text-gray-500">流程状态：</span>{FLOW_STAGE_LABELS[receipt.flowStatus]}</div>
          <div><span className="text-gray-500">检测结果：</span>{receipt.result ? (receipt.result === 'pass' ? '合格' : '不合格') : '—'}</div>
          {receipt.reportCode && <div><span className="text-gray-500">报告编号：</span>{receipt.reportCode}</div>}
          {receipt.assigneeName && <div><span className="text-gray-500">检测人员：</span>{receipt.assigneeName}</div>}
          {receipt.plannedTestDate && <div><span className="text-gray-500">计划检测日期：</span>{receipt.plannedTestDate}</div>}
          {receipt.remark && <div className="col-span-4"><span className="text-gray-500">备注：</span>{receipt.remark}</div>}
        </div>
      </div>

      {/* 样品信息 + 检测数据 */}
      <ReceiptDetail
        receiptId={receipt.id}
        categoryCode={receipt.categoryCode}
        onClose={() => window.history.back()}
      />
    </div>
  )
}

export default ReceiptDetailPage
