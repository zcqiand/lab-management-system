import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { renderReportHtml, wrapReportDocument, type ReportContext } from './renderReport'
import type { Contract, OrgInfo, ReportCategory, ReportTemplate, Sample, SampleReceipt, TestItem, TestParameter } from '../../types/api'

interface Props {
  receipt: SampleReceipt
  onClose: () => void
}

/** 报告文档预览——按接样单的报告类别取对应模板，合成数据后可打印或下载 Word 文档 */
export function ReportPreviewModal({ receipt, onClose }: Props) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [tplRes, catRes, contractRes, orgRes, samplesRes, itemsRes, paramsRes] = await Promise.all([
          apiClient.get<{ items: ReportTemplate[] }>('/report-templates', { params: { categoryCode: receipt.categoryCode } }),
          apiClient.get<ReportCategory>(`/report-categories/${receipt.categoryCode}`).catch(() => null),
          apiClient.get<Contract>(`/contracts/${receipt.contractId}`).catch(() => null),
          apiClient.get<OrgInfo>('/org-info').catch(() => null),
          apiClient.get<{ items: Sample[] }>('/samples', { params: { receiptId: receipt.id, page: 1, pageSize: 100 } }),
          apiClient.get<{ items: TestItem[] }>('/test-items', { params: { receiptId: receipt.id } }),
          apiClient.get<{ items: TestParameter[] }>('/test-parameters', { params: { page: 1, pageSize: 200, categoryCode: receipt.categoryCode } }),
        ])
        const template = tplRes.data.items[0]
        if (!template) {
          setError('该报告类别尚无报告模板，请先在「基础管理 → 报告模板」中维护')
          setLoading(false)
          return
        }
        const ctx: ReportContext = {
          org: orgRes?.data ?? null,
          contract: contractRes?.data ?? null,
          receipt,
          category: catRes?.data ?? null,
          samples: samplesRes.data.items,
          items: itemsRes.data.items,
          parameterNames: Object.fromEntries(paramsRes.data.items.map((p) => [p.code, p.name])),
        }
        setHtml(renderReportHtml(template.content, ctx))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '报告生成失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [receipt])

  const docTitle = `${receipt.reportCode ?? receipt.receiptCode} 检测报告`

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(wrapReportDocument(html, docTitle))
    w.document.close()
    w.focus()
    w.print()
  }

  const handleDownload = () => {
    // 以 HTML 内容 + application/msword 类型下载，Word 可直接打开编辑
    const blob = new Blob(['\ufeff', wrapReportDocument(html, docTitle)], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${receipt.reportCode ?? receipt.receiptCode}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">报告文档 — {receipt.reportCode ?? receipt.receiptCode}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} disabled={loading || Boolean(error)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              下载 Word
            </button>
            <button onClick={handlePrint} disabled={loading || Boolean(error)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100 disabled:opacity-50">
              打印
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">×</button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 bg-gray-100 flex-1">
          {loading && <p className="text-center text-gray-400 py-10">报告生成中...</p>}
          {error && (
            <p role="alert" className="text-center text-red-600 py-10">{error}</p>
          )}
          {!loading && !error && (
            <div className="bg-white shadow mx-auto max-w-3xl p-8">
              <style>{`
                .report-doc h1{font-size:22px} .report-doc h2{font-size:16px}
                .report-doc h3{font-size:15px;margin-top:18px;border-left:4px solid #444;padding-left:8px}
                .report-doc h4{font-size:13px;margin-top:16px}
                .report-doc p{font-size:13px;line-height:1.8;margin:4px 0}
                .report-doc table.kv{width:100%;border-collapse:collapse;margin-top:12px}
                .report-doc table.kv td{border:1px solid #999;padding:5px 8px;font-size:12px}
                .report-doc table.kv td:nth-child(odd){background:#f5f5f5;width:90px;white-space:nowrap}
                .report-doc table.data{width:100%;border-collapse:collapse;margin:8px 0}
                .report-doc table.data th,.report-doc table.data td{border:1px solid #999;padding:5px 8px;font-size:12px;text-align:center}
                .report-doc table.data th{background:#f0f0f0}
                .report-doc ol.notes{font-size:11px;color:#555;line-height:1.8;padding-left:18px}
              `}</style>
              <div className="report-doc" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportPreviewModal
