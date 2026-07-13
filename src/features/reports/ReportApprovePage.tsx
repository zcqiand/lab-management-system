import { useCallback, useState } from "react";
import { FlowStagePage } from "../flow-pipeline/FlowStagePage";
import { ReportPreviewModal } from "../report-doc/ReportPreviewModal";
import { useCategories, categoryName } from "../categories/useCategories";
import type { SampleReceipt } from "../../types/api";

/** v2.0：报告批准——流程线第五环节（flowStatus='approval'）。
 * 提交=批准签发（支持批量，签发时间自动写入），进入「报告发放」；退回「报告审核」；已提交的可撤回。
 */
function ReportPreviewButton({
  receipt,
  onClick,
}: {
  receipt: SampleReceipt;
  onClick: (r: SampleReceipt) => void;
}) {
  return (
    <button
      onClick={() => onClick(receipt)}
      data-fn="M03.F06.I02"
      className="px-2 py-1 text-emerald-700 hover:underline"
    >
      查看报告
    </button>
  );
}

export function ReportApprovePage() {
  const { categories } = useCategories();
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null);
  const rowAction = useCallback(
    (r: SampleReceipt) => <ReportPreviewButton receipt={r} onClick={setPreviewTarget} />,
    [],
  );
  return (
    // @entry M03.F06.I01
    // @entry M03.F06.I03
    // @entry M03.F06.I04
    <>
      <FlowStagePage
        title="报告批准"
        stage="approval"
        submitLabel="批准"
        subtitle="批准后自动签发并进入报告发放"
        dataFn="M03.F06.I01"
        filterDataFn="M03.F06.I04"
        rowActions={rowAction}
        extraColumns={[
          { header: "报告类别", render: (r) => categoryName(categories, r.categoryCode) },
          {
            header: "结论",
            render: (r) => (
              <span className="text-gray-600 line-clamp-1 max-w-[280px] inline-block align-middle">
                {r.conclusion || "—"}
              </span>
            ),
          },
        ]}
      />
      {previewTarget && (
        <ReportPreviewModal
          receipt={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </>
  );
}

export default ReportApprovePage;
