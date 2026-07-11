import { useCallback, useState } from 'react'
import { FlowStagePage } from '../flow-pipeline/FlowStagePage'
import { ReportPreviewModal } from '../report-doc/ReportPreviewModal'
import { useCategories, categoryName } from '../categories/useCategories'
import type { SampleReceipt } from '../../types/api'

/** v2.0：报告发放——流程线第六环节（flowStatus='issuance'）。
 * 提交=发放并归档（支持批量），进入「报告归档」；退回「报告批准」；已提交的可撤回。
 */
function ReportPreviewButton({ receipt, onClick }: { receipt: SampleReceipt; onClick: (r: SampleReceipt) => void }) {
  return (
    <button onClick={() => onClick(receipt)} className="px-2 py-1 text-emerald-700 hover:underline">
      查看报告
    </button>
  )
}

export function ReportIssuePage() {
  const { categories } = useCategories()
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null)
  const rowAction = useCallback((r: SampleReceipt) => (
    <ReportPreviewButton receipt={r} onClick={setPreviewTarget} />
  ), [])
  return (
    <>
    <FlowStagePage
      title="报告发放"
      stage="issuance"
      submitLabel="发放并归档"
      subtitle="发放后进入报告归档"
      rowActions={rowAction}
      extraColumns={[
        { header: '报告类别', render: (r) => categoryName(categories, r.categoryCode) },
        {
          header: '签发时间',
          render: (r) =>
            r.issuedAt ? new Date(r.issuedAt).toLocaleString('zh-CN') : <span className="text-gray-400">—</span>,
        },
      ]}
    />
    {previewTarget && <ReportPreviewModal receipt={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </>
  )
}

export default ReportIssuePage
