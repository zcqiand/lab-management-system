import { useCallback, useState } from "react";
import { FlowStagePage } from "../flow-pipeline/FlowStagePage";
import { ReportPreviewModal } from "../report-doc/ReportPreviewModal";
import { useCategories, categoryName } from "../categories/useCategories";
import type { SampleReceipt } from "../../types/api";

/** v2.0：报告发放——流程线第六环节（flowStatus='issuance'）。
 * 提交=发放（支持批量），进入「报告归档」环节；归档是 archived 阶段的独立动作。
 * 退回「报告批准」；已提交的可撤回。
 */
function PreviewReportButton({
  receipt,
  onClick,
}: {
  receipt: SampleReceipt;
  onClick: (r: SampleReceipt) => void;
}) {
  return (
    <button
      onClick={() => onClick(receipt)}
      data-fn="M03.F07.I02"
      className="px-2 py-1 text-emerald-700 hover:underline"
    >
      查看报告
    </button>
  );
}

export function ReportIssuePage() {
  const { categories } = useCategories();
  const [previewTarget, setPreviewTarget] = useState<SampleReceipt | null>(null);
  const rowAction = useCallback(
    (r: SampleReceipt) => <PreviewReportButton receipt={r} onClick={setPreviewTarget} />,
    [],
  );
  return (
    // @entry M03.F07.I01
    // @entry M03.F07.I03
    // @entry M03.F07.I04
    <>
      <FlowStagePage
        title="报告发放"
        stage="issuance"
        submitLabel="发放"
        dataFn="M03.F07.I01"
        filterDataFn="M03.F07.I04"
        rowActions={rowAction}
        extraColumns={[
          { header: "报告类别", render: (r) => categoryName(categories, r.categoryCode) },
          {
            header: "签发时间",
            render: (r) =>
              r.issuedAt ? (
                new Date(r.issuedAt).toLocaleString("zh-CN")
              ) : (
                <span className="text-gray-400">—</span>
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

export default ReportIssuePage;
