import { useEffect, useState } from 'react'
import { useProjectStore } from './projectStore'
import { ProjectFormModal, type ProjectFormValues } from './ProjectFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { Project, ProjectStatus, ProjectQuery } from '../../types/api'

const PAGE_SIZE = 10

export function ProjectList() {
  const { list, total, loading, error, fetchProjects, createProject, updateProject, deleteProject } =
    useProjectStore()

  const [page, setPage] = useState(1)
  const [keyword, setSearchKeyword] = useState('')
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildQuery = (p: number): ProjectQuery => ({
    page: p,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    status: status || undefined,
  })

  useEffect(() => {
    fetchProjects(buildQuery(page))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchProjects(buildQuery(1))
  }

  const handleStatusChange = (value: ProjectStatus | '') => {
    setStatus(value)
    setPage(1)
    const q: ProjectQuery = {
      page: 1,
      pageSize: PAGE_SIZE,
      keyword: keyword || undefined,
      status: value || undefined,
    }
    fetchProjects(q)
  }

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (project: Project) => {
    setFormMode('edit')
    setEditing(project)
    setFormOpen(true)
  }

  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await createProject({
          name: values.name,
          code: values.code,
          status: values.status,
          ownerId: values.ownerId,
        })
      } else if (values.id) {
        await updateProject(values.id, {
          name: values.name,
          code: values.code,
          status: values.status,
          ownerId: values.ownerId,
        })
      }
      setFormOpen(false)
      await fetchProjects(buildQuery(page))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      await fetchProjects(buildQuery(page))
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">项目管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          新增项目
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm">
        <input
          placeholder="搜索项目名称/编号"
          value={keyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-1.5 text-sm flex-1"
        />
        <label className="text-sm text-gray-600 flex items-center gap-1">
          状态筛选
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus | '')}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">全部</option>
            <option value="active">进行中</option>
            <option value="paused">已暂停</option>
            <option value="archived">已归档</option>
          </select>
        </label>
        <button
          onClick={handleSearch}
          className="px-4 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-800"
        >
          搜索
        </button>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">项目名称</th>
              <th className="px-4 py-2 text-left">编号</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">负责人</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.code}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{p.ownerId}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="px-2 py-1 text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="px-2 py-1 text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {total} 条</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <ProjectFormModal
        open={formOpen}
        mode={formMode}
        initialValues={editing ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={submitting}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除确认"
        message={`确定删除项目「${deleteTarget?.name ?? ''}」？此操作不可撤销。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ProjectList
