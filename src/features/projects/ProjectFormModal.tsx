import { useEffect, useState, type FormEvent } from 'react'
import type { Project, ProjectStatus } from '../../types/api'

export interface ProjectFormValues {
  id?: string
  name: string
  code: string
  status: ProjectStatus
  ownerId: string
}

interface ProjectFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<Project>
  onSubmit: (values: ProjectFormValues) => void
  onCancel: () => void
  loading?: boolean
}

/**
 * 项目表单弹窗：create 与 edit 复用同一组件，由 mode 区分标题与提交载荷。
 *
 * - create: 表单空，提交时 onSubmit(values)（无 id）
 * - edit: 表单填 initialValues，提交时 onSubmit(values)（含 id）
 *
 * 父组件根据 mode 决定调 createProject 还是 updateProject：
 *   create → createProject(values)
 *   edit   → updateProject(values.id, values)
 */
export function ProjectFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: ProjectFormModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [code, setCode] = useState(initialValues?.code ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initialValues?.status ?? 'active')
  const [ownerId, setOwnerId] = useState(initialValues?.ownerId ?? '')
  const [errors, setErrors] = useState<{ name?: string; code?: string; ownerId?: string }>({})

  // open 从 false→true 或 initialValues 变化时，重置表单为最新值（支持 edit 切换不同记录）
  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? '')
      setCode(initialValues?.code ?? '')
      setStatus(initialValues?.status ?? 'active')
      setOwnerId(initialValues?.ownerId ?? '')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建项目' : '编辑项目'

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!name.trim()) next.name = '请输入项目名称'
    if (!code.trim()) next.code = '请输入项目编号'
    if (!ownerId.trim()) next.ownerId = '请输入负责人ID'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const values: ProjectFormValues = {
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      name: name.trim(),
      code: code.trim(),
      status,
      ownerId: ownerId.trim(),
    }
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-[480px] max-w-[90vw]"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm mb-1 font-medium">
              项目名称
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="project-code" className="block text-sm mb-1 font-medium">
              项目编号
            </label>
            <input
              id="project-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="project-status" className="block text-sm mb-1 font-medium">
              状态
            </label>
            <select
              id="project-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">进行中</option>
              <option value="paused">已暂停</option>
              <option value="archived">已归档</option>
            </select>
          </div>
          <div>
            <label htmlFor="project-owner" className="block text-sm mb-1 font-medium">
              负责人ID
            </label>
            <input
              id="project-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.ownerId && <p className="text-red-600 text-xs mt-1">{errors.ownerId}</p>}
          </div>
        </div>
        <div className="px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProjectFormModal
