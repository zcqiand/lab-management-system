// 报告文档渲染：将报告模板（带 {{标签}} 的 HTML）与业务数据合成为最终报告 HTML。
// 特殊标签 {{samplesTable}} / {{testItemsTable}} 渲染为数据表格；
// 其余标签按 {{路径.字段}} 从上下文取值。

import type { Contract, OrgInfo, ReportCategory, Sample, SampleReceipt, TestItem } from '../../types/api'

export interface ReportContext {
  org: OrgInfo | null
  contract: Contract | null
  receipt: SampleReceipt
  category: ReportCategory | null
  samples: Sample[]
  items: TestItem[]
  parameterNames: Record<string, string>
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildSamplesTable(ctx: ReportContext): string {
  const extDefs = ctx.category?.extFields ?? []
  const heads = ['样品编号', '样品名称', '型号', '规格', '等级', '牌号', '数量', ...extDefs.map((f) => f.label)]
  const rows = ctx.samples.map((s) => {
    const cells = [
      s.sampleCode,
      s.sampleName ?? '',
      s.model ?? '',
      s.specification ?? '',
      s.grade ?? '',
      s.brand ?? '',
      s.sampleQuantity ?? '',
      ...extDefs.map((f) => s.ext?.[f.key] ?? ''),
    ]
    return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`
  })
  return `<table class="data"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}">（无样品）</td></tr>`}</tbody></table>`
}

function buildTestItemsTable(ctx: ReportContext): string {
  const sampleCode = (id: string) => ctx.samples.find((s) => s.id === id)?.sampleCode ?? id
  const paramName = (code: string) => ctx.parameterNames[code] ?? code
  const heads = ['样品编号', '检测参数', '技术要求', '检测值', '单项评定']
  const rows = ctx.items.map((i) => {
    const cells = [
      sampleCode(i.sampleId),
      paramName(i.parameterCode),
      i.requirement || '—',
      `${i.result}${i.unit ? ` ${i.unit}` : ''}`,
      i.verdict ? i.verdict : (i.passed === false ? '不合格' : '合格'),
    ]
    return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`
  })
  return `<table class="data"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}">（无检测记录）</td></tr>`}</tbody></table>`
}

/** 渲染模板：替换 {{path.to.value}} 标签 */
export function renderReportHtml(template: string, ctx: ReportContext): string {
  const receiptView = {
    ...ctx.receipt,
    resultLabel: ctx.receipt.result === 'pass' ? '合格' : ctx.receipt.result === 'fail' ? '不合格' : '待评定',
    issuedAt: ctx.receipt.issuedAt ? new Date(ctx.receipt.issuedAt).toLocaleDateString('zh-CN') : '',
  }
  const scope: Record<string, unknown> = {
    org: ctx.org ?? {},
    contract: ctx.contract ?? {},
    receipt: receiptView,
    category: ctx.category ?? {},
  }
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    if (path === 'samplesTable') return buildSamplesTable(ctx)
    if (path === 'testItemsTable') return buildTestItemsTable(ctx)
    const segments = path.split('.')
    let value: unknown = scope
    for (const seg of segments) {
      if (value && typeof value === 'object' && seg in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[seg]
      } else {
        return ''
      }
    }
    return esc(value)
  })
}

/** 报告文档样式（预览 / 打印 / 下载共用） */
export const REPORT_CSS = `
  body { font-family: "SimSun", "Songti SC", serif; color: #111; margin: 24px; }
  h1 { font-size: 22px; } h2 { font-size: 16px; } h3 { font-size: 15px; margin-top: 18px; border-left: 4px solid #444; padding-left: 8px; }
  h4 { font-size: 13px; margin-top: 16px; }
  p { font-size: 13px; line-height: 1.8; margin: 4px 0; }
  table.kv { width: 100%; border-collapse: collapse; margin-top: 12px; }
  table.kv td { border: 1px solid #999; padding: 5px 8px; font-size: 12px; }
  table.kv td:nth-child(odd) { background: #f5f5f5; width: 90px; white-space: nowrap; }
  table.data { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.data th, table.data td { border: 1px solid #999; padding: 5px 8px; font-size: 12px; text-align: center; }
  table.data th { background: #f0f0f0; }
  ol.notes { font-size: 11px; color: #555; line-height: 1.8; padding-left: 18px; }
  p.sign { margin-top: 14px; }
`

/** 组装完整 HTML 文档（用于新窗口打印 / 下载 Word） */
export function wrapReportDocument(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${REPORT_CSS}</style></head><body>${bodyHtml}</body></html>`
}
