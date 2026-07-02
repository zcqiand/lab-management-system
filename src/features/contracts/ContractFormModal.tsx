import { useEffect, useState, type FormEvent } from 'react'
import type { Contract, ContractStatus } from '../../types/api'

export interface ContractFormValues {
  id?: string
  contractCode: string
  projectName: string
  clientUnit: string
  constructionUnit: string
  witnessUnit: string
  witness: string
  witnessPhone?: string
  contactPerson?: string
  contactPhone?: string
  entrustedDate?: string
  projectLocation?: string
  status: ContractStatus
}

interface ContractFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Partial<Contract>
  onSubmit: (values: ContractFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function ContractFormModal({
  open,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}: ContractFormModalProps) {
  const [contractCode, setContractCode] = useState(initialValues?.contractCode ?? '')
  const [projectName, setProjectName] = useState(initialValues?.projectName ?? '')
  const [clientUnit, setClientUnit] = useState(initialValues?.clientUnit ?? '')
  const [constructionUnit, setConstructionUnit] = useState(initialValues?.constructionUnit ?? '')
  const [witnessUnit, setWitnessUnit] = useState(initialValues?.witnessUnit ?? '')
  const [witness, setWitness] = useState(initialValues?.witness ?? '')
  const [witnessPhone, setWitnessPhone] = useState(initialValues?.witnessPhone ?? '')
  const [contactPerson, setContactPerson] = useState(initialValues?.contactPerson ?? '')
  const [contactPhone, setContactPhone] = useState(initialValues?.contactPhone ?? '')
  const [entrustedDate, setEntrustedDate] = useState(initialValues?.entrustedDate ?? '')
  const [projectLocation, setProjectLocation] = useState(initialValues?.projectLocation ?? '')
  const [status, setStatus] = useState<ContractStatus>(initialValues?.status ?? 'active')
  const [errors, setErrors] = useState<{
    contractCode?: string
    projectName?: string
    clientUnit?: string
    constructionUnit?: string
    witnessUnit?: string
    witness?: string
  }>({})

  useEffect(() => {
    if (open) {
      setContractCode(initialValues?.contractCode ?? '')
      setProjectName(initialValues?.projectName ?? '')
      setClientUnit(initialValues?.clientUnit ?? '')
      setConstructionUnit(initialValues?.constructionUnit ?? '')
      setWitnessUnit(initialValues?.witnessUnit ?? '')
      setWitness(initialValues?.witness ?? '')
      setWitnessPhone(initialValues?.witnessPhone ?? '')
      setContactPerson(initialValues?.contactPerson ?? '')
      setContactPhone(initialValues?.contactPhone ?? '')
      setEntrustedDate(initialValues?.entrustedDate ?? '')
      setProjectLocation(initialValues?.projectLocation ?? '')
      setStatus(initialValues?.status ?? 'active')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  if (!open) return null

  const title = mode === 'create' ? '新建合同' : '编辑合同'

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!contractCode.trim()) next.contractCode = '请输入合同编号'
    if (!projectName.trim()) next.projectName = '请输入工程名称'
    if (!clientUnit.trim()) next.clientUnit = '请输入委托单位'
    if (!constructionUnit.trim()) next.constructionUnit = '请输入施工单位'
    if (!witnessUnit.trim()) next.witnessUnit = '请输入见证单位'
    if (!witness.trim()) next.witness = '请输入见证人'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const values: ContractFormValues = {
      ...(mode === 'edit' && initialValues?.id ? { id: initialValues.id } : {}),
      contractCode: contractCode.trim(),
      projectName: projectName.trim(),
      clientUnit: clientUnit.trim(),
      constructionUnit: constructionUnit.trim(),
      witnessUnit: witnessUnit.trim(),
      witness: witness.trim(),
      witnessPhone: witnessPhone.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      entrustedDate: entrustedDate.trim() || undefined,
      projectLocation: projectLocation.trim() || undefined,
      status,
    }
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="contract-code" className="block text-sm mb-1 font-medium">
              合同编号 <span className="text-red-600">*</span>
            </label>
            <input
              id="contract-code"
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.contractCode && <p className="text-red-600 text-xs mt-1">{errors.contractCode}</p>}
          </div>
          <div>
            <label htmlFor="project-name" className="block text-sm mb-1 font-medium">
              工程名称 <span className="text-red-600">*</span>
            </label>
            <input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.projectName && <p className="text-red-600 text-xs mt-1">{errors.projectName}</p>}
          </div>
          <div>
            <label htmlFor="client-unit" className="block text-sm mb-1 font-medium">
              委托单位 <span className="text-red-600">*</span>
            </label>
            <input
              id="client-unit"
              value={clientUnit}
              onChange={(e) => setClientUnit(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.clientUnit && <p className="text-red-600 text-xs mt-1">{errors.clientUnit}</p>}
          </div>
          <div>
            <label htmlFor="construction-unit" className="block text-sm mb-1 font-medium">
              施工单位 <span className="text-red-600">*</span>
            </label>
            <input
              id="construction-unit"
              value={constructionUnit}
              onChange={(e) => setConstructionUnit(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.constructionUnit && <p className="text-red-600 text-xs mt-1">{errors.constructionUnit}</p>}
          </div>
          <div>
            <label htmlFor="witness-unit" className="block text-sm mb-1 font-medium">
              见证单位 <span className="text-red-600">*</span>
            </label>
            <input
              id="witness-unit"
              value={witnessUnit}
              onChange={(e) => setWitnessUnit(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.witnessUnit && <p className="text-red-600 text-xs mt-1">{errors.witnessUnit}</p>}
          </div>
          <div>
            <label htmlFor="witness" className="block text-sm mb-1 font-medium">
              见证人 <span className="text-red-600">*</span>
            </label>
            <input
              id="witness"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.witness && <p className="text-red-600 text-xs mt-1">{errors.witness}</p>}
          </div>
          <div>
            <label htmlFor="witness-phone" className="block text-sm mb-1 font-medium">
              见证人电话
            </label>
            <input
              id="witness-phone"
              value={witnessPhone}
              onChange={(e) => setWitnessPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact-person" className="block text-sm mb-1 font-medium">
              联系人
            </label>
            <input
              id="contact-person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="block text-sm mb-1 font-medium">
              联系电话
            </label>
            <input
              id="contact-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="entrusted-date" className="block text-sm mb-1 font-medium">
              合同日期
            </label>
            <input
              id="entrusted-date"
              type="date"
              value={entrustedDate}
              onChange={(e) => setEntrustedDate(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="project-location" className="block text-sm mb-1 font-medium">
              工程地点
            </label>
            <input
              id="project-location"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {mode === 'edit' && (
            <div>
              <label htmlFor="contract-status" className="block text-sm mb-1 font-medium">
                状态
              </label>
              <select
                id="contract-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">进行中</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          )}
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

export default ContractFormModal
