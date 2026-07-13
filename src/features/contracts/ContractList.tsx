import { useEffect, useState } from 'react'
import { useContractStore } from './contractStore'
import { ContractFormModal, type ContractFormValues } from './ContractFormModal'
import { ConfirmModal } from '../../components/ConfirmModal'
import type { Contract, ContractStatus } from '../../types/api'

const PAGE_SIZE = 10

export function ContractList() {
  const { list, total, loading, error, fetchContracts, createContract, updateContract, deleteContract } =
    useContractStore()

  const [page, setPage] = useState(1)
  const [keyword, setSearchKeyword] = useState('')
  const [status, setStatus] = useState<ContractStatus | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Contract | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildQuery = (p: number) => ({
    page: p,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    status: status || undefined,
  })

  useEffect(() => {
    fetchContracts(buildQuery(page))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchContracts(buildQuery(1))
  }

  const handleStatusChange = (value: ContractStatus | '') => {
    setStatus(value)
    setPage(1)
    fetchContracts(buildQuery(1))
  }

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (contract: Contract) => {
    setFormMode('edit')
    setEditing(contract)
    setFormOpen(true)
  }

  const handleSubmit = async (values: ContractFormValues) => {
    setSubmitting(true)
    try {
      if (formMode === 'create') {
        await createContract({
          contractCode: values.contractCode,
          projectName: values.projectName,
          clientUnit: values.clientUnit,
          constructionUnit: values.constructionUnit,
          contractCategory: values.contractCategory,
          buildingUnit: values.buildingUnit,
          supervisorUnit: values.supervisorUnit,
          inspectionPerson: values.inspectionPerson,
          inspectionPhone: values.inspectionPhone,
          witnessUnit: values.witnessUnit,
          witness: values.witness,
        })
      } else if (values.id) {
        await updateContract(values.id, {
          contractCode: values.contractCode,
          projectName: values.projectName,
          clientUnit: values.clientUnit,
          constructionUnit: values.constructionUnit,
          contractCategory: values.contractCategory,
          buildingUnit: values.buildingUnit,
          supervisorUnit: values.supervisorUnit,
          inspectionPerson: values.inspectionPerson,
          inspectionPhone: values.inspectionPhone,
          witnessUnit: values.witnessUnit,
          witness: values.witness,
          witnessPhone: values.witnessPhone,
          contactPerson: values.contactPerson,
          contactPhone: values.contactPhone,
          entrustedDate: values.entrustedDate,
          projectLocation: values.projectLocation,
          status: values.status,
        })
      }
      setFormOpen(false)
      await fetchContracts(buildQuery(page))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteContract(deleteTarget.id)
      setDeleteTarget(null)
      await fetchContracts(buildQuery(page))
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusLabel = (s: ContractStatus) => (s === 'active' ? '进行中' : '已归档')

  return (
    <div className="space-y-4" data-fn="M02.F01.I01">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">合同管理</h2>
        <button
          onClick={openCreate}
          data-fn="M02.F01.I02"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          新建合同
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded shadow-sm">
        <input
          placeholder="搜索合同编号/工程名称/委托单位"
          value={keyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-1.5 text-sm flex-1"
        />
        <label className="text-sm text-gray-600 flex items-center gap-1">
          状态
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ContractStatus | '')}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">全部</option>
            <option value="active">进行中</option>
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
              <th className="px-4 py-2 text-left">合同编号</th>
              <th className="px-4 py-2 text-left">工程名称</th>
              <th className="px-4 py-2 text-left">委托单位</th>
              <th className="px-4 py-2 text-left">合同类别</th>
              <th className="px-4 py-2 text-left">建设单位</th>
              <th className="px-4 py-2 text-left">监理单位</th>
              <th className="px-4 py-2 text-left">送检人员</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{c.contractCode}</td>
                <td className="px-4 py-2">{c.projectName}</td>
                <td className="px-4 py-2">{c.clientUnit}</td>
                <td className="px-4 py-2">{c.contractCategory || '—'}</td>
                <td className="px-4 py-2">{c.buildingUnit || '—'}</td>
                <td className="px-4 py-2">{c.supervisorUnit || '—'}</td>
                <td className="px-4 py-2">{c.inspectionPerson || '—'}</td>
                <td className="px-4 py-2">{statusLabel(c.status)}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => openEdit(c)}
                    data-fn="M02.F01.I02"
                    className="px-2 py-1 text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    data-fn="M02.F01.I03"
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

      <ContractFormModal
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
        message={`确定删除合同「${deleteTarget?.contractCode ?? ''}」？此操作不可撤销。`}
        confirmText="确认"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ContractList
