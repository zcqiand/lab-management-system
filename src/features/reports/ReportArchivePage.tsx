import { useCallback, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { ReportPreviewModal } from '../report-doc/ReportPreviewModal'
import { useCategories, categoryName } from '../categories/useCategories'
import type { SampleReceipt } from '../../types/api'

/** v2.0：报告归档——流程线终点（flowStatus='archived'）。
 * 归档件不可再提交；如需回溯可退回「报告发放」。
 */
function ReportPreviewButton({ receipt, onClick }: { receipt: SampleReceipt; onClick: (r: SampleReceipt) => void }) {
  return (
    <button onClick={() => onClick(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">
      查看报告
    </button>
  )
}

export function ReportArchivePage() {
  const { categories } = useCategories()
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null)
  const rowAction = useCallback((r: SampleReceipt) => (
    <ReportPreviewButton receipt={r} onClick={setPreviewTarget} />
  ), [])
  return (
    <>
    <FlowStagePage
      title="报告归档"
      stage="archived"
      canSubmit={false}
      subtitle="流程终点；如需回溯可退回报告发放"
      rowActions={rowAction}
      extraColumns={[
        { header: '报告类别', render: (r) => categoryName(categories, r.categoryCode) },
        {
          header: '签发时间',
          render: (r) =>
            r.issuedAt ? new Date(r.issuedAt).toLocaleString('zh-CN') : <span className="text-gray-400">—</span>,
        },
        {
          header: '结论',
          render: (r) => (
            <span className="text-gray-600 line-clamp-1 max-w-[240px] inline-block align-middle">
              {r.conclusion || '—'}
            </span>
          ),
        },
      ]}
    />
    {previewTarget && <ReportPreviewModal receipt={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </>
  )
}

export default ReportArchivePage
