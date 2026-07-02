import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../api/client'
import type { OrgInfo } from '../../types/api'

export function OrgInfoForm() {
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [orgName, setOrgName] = useState('')
  const [registeredAddress, setRegisteredAddress] = useState('')
  const [testingSiteAddress, setTestingSiteAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [email, setEmail] = useState('')
  const [qualificationCertNo, setQualificationCertNo] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchOrg = () => {
    setLoading(true)
    setError(null)
    apiClient
      .get<OrgInfo>('/org-info')
      .then((res) => {
        const data = res.data
        setOrg(data)
        setOrgName(data.orgName)
        setRegisteredAddress(data.registeredAddress)
        setTestingSiteAddress(data.testingSiteAddress)
        setPostalCode(data.postalCode)
        setContactPhone(data.contactPhone)
        setEmail(data.email)
        setQualificationCertNo(data.qualificationCertNo)
        setLoading(false)
      })
      .catch(() => {
        setError('加载机构信息失败')
        setLoading(false)
      })
  }

  useEffect(() => { fetchOrg() }, [])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!orgName.trim()) next.orgName = '请输入机构名称'
    if (!qualificationCertNo.trim()) next.qualificationCertNo = '请输入资质证书编号'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSuccessMsg(null)
    apiClient
      .put<OrgInfo>('/org-info', {
        orgName: orgName.trim(),
        registeredAddress: registeredAddress.trim(),
        testingSiteAddress: testingSiteAddress.trim(),
        postalCode: postalCode.trim(),
        contactPhone: contactPhone.trim(),
        email: email.trim(),
        qualificationCertNo: qualificationCertNo.trim(),
      })
      .then((res) => {
        setOrg(res.data)
        setSuccessMsg('保存成功')
        setTimeout(() => setSuccessMsg(null), 3000)
      })
      .catch(() => { setError('保存失败') })
      .finally(() => { setSaving(false) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  if (error && !org) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <h2 className="text-lg font-bold text-blue-900">机构信息</h2>
          <p className="text-sm text-blue-600 mt-0.5">
            机构名称：{orgName || '-'} &nbsp;|&nbsp; 资质证书编号：{qualificationCertNo || '-'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
              机构名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.orgName && <p className="text-red-600 text-xs mt-1">{errors.orgName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="registeredAddress" className="block text-sm font-medium text-gray-700 mb-1">注册地址</label>
              <input
                id="registeredAddress"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="testingSiteAddress" className="block text-sm font-medium text-gray-700 mb-1">检测场所地址</label>
              <input
                id="testingSiteAddress"
                value={testingSiteAddress}
                onChange={(e) => setTestingSiteAddress(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">邮编</label>
              <input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
              <input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="qualificationCertNo" className="block text-sm font-medium text-gray-700 mb-1">
              资质证书编号 <span className="text-red-500">*</span>
            </label>
            <input
              id="qualificationCertNo"
              value={qualificationCertNo}
              onChange={(e) => setQualificationCertNo(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.qualificationCertNo && <p className="text-red-600 text-xs mt-1">{errors.qualificationCertNo}</p>}
          </div>
        </div>

        <div className="px-6 py-3 flex items-center gap-3 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {successMsg && <span className="text-green-600 text-sm">{successMsg}</span>}
          {error && org && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
    </div>
  )
}

export default OrgInfoForm
