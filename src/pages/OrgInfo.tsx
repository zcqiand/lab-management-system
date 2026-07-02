import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import type { OrgInfo } from '../types/api'

export default function OrgInfo() {
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<OrgInfo>('/org-info')
      .then((res) => {
        setOrg(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError('加载机构信息失败')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded">
        {error ?? '未找到机构信息'}
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6">机构信息</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50 w-40">机构名称</td>
              <td className="px-4 py-3">{org.orgName}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">注册地址</td>
              <td className="px-4 py-3">{org.registeredAddress}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">检测场所地址</td>
              <td className="px-4 py-3">{org.testingSiteAddress}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">资质证书编号</td>
              <td className="px-4 py-3">{org.qualificationCertNo}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">邮编</td>
              <td className="px-4 py-3">{org.postalCode}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">联系电话</td>
              <td className="px-4 py-3">{org.contactPhone}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">电子邮箱</td>
              <td className="px-4 py-3">{org.email}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
