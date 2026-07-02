import { useEffect, useState, type FormEvent } from 'react'
import type { Report, ReportCreateInput, ReportUpdateInput } from '../../types/api'

export interface ReportFormValues {
  id?: string
  sampleId: string
  title: string
  conclusion: string
}

interface ReportFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<Report>
  onSubmit: (values: ReportFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function ReportFormModal({ open, mode, initialValues, onSubmit, onCancel, loading = false }: ReportFormModalProps) {
  const [sampleId, setSampleId] = useState(initialValues?.sampleId ?? '')
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [conclusion, setConclusion] = useState(initialValues?.conclusion ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setSampleId(initialValues?.sampleId ?? '')
      setTitle(initialValues?.title ?? '')
      setConclusion(initialValues?.conclusion ?? '')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title_text = mode === 'create' ? '新建报告' : '编辑报告'

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!sampleId.trim()) next.sampleId = '请输入样品ID'
    if (!title.trim()) next.title = '请输入标题'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      sampleId: sampleId.trim(),
      title: title.trim(),
      conclusion: conclusion.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-[480px] max-w-[90vw]">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title_text}</h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label htmlFor="report-sample" className="block text-sm mb-1 font-medium">样品ID</label>
            <input id="report-sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)} disabled={mode === 'edit'} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            {errors.sampleId && <p className="text-red-600 text-xs mt-1">{errors.sampleId}</p>}
          </div>
          <div>
            <label htmlFor="report-title" className="block text-sm mb-1 font-medium">标题</label>
            <input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="report-conclusion" className="block text-sm mb-1 font-medium">结论</label>
            <textarea id="report-conclusion" value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
          </div>
        </div>
        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{loading ? '保存中...' : '保存'}</button>
        </div>
      </form>
    </div>
  )
}

export default ReportFormModal
