import { useCallback, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { ReportPreviewModal } from '../report-doc/ReportPreviewModal'
import { useCategories, categoryName } from '../categories/useCategories'
import type { SampleReceipt } from '../../types/api'

/** v2.0：报告审核——流程线第四环节（flowStatus='review'）。
 * 提交=审核通过（支持批量），进入「报告批准」；退回「数据录入」；已提交的可撤回。
 */
function ReportPreviewButton({ receipt, onClick }: { receipt: SampleReceipt; onClick: (r: SampleReceipt) => void }) {
  return (
    <button onClick={() => onClick(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">
      查看报告
    </button>
  )
}

export function ReportReviewPage() {
  const { categories } = useCategories()
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null)
  const rowAction = useCallback((r: SampleReceipt) => (
    <ReportPreviewButton receipt={r} onClick={setPreviewTarget} />
  ), [])
  return (
    <>
    <FlowStagePage
      title="报告审核"
      stage="review"
      submitLabel="审核通过"
      subtitle="审核通过后进入报告批准"
      rowActions={rowAction}
      extraColumns={[
        { header: '报告类别', render: (r) => categoryName(categories, r.categoryCode) },
        {
          header: '结论',
          render: (r) => (
            <span className="text-gray-600 line-clamp-1 max-w-[280px] inline-block align-middle">
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

export default ReportReviewPage
