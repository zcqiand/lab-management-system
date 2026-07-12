import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { ContractCategory } from '../../types/api'

/** 拉取全部合同类别（码表） */
export function useContractCategories() {
  const [categories, setCategories] = useState<ContractCategory[]>([])
  const [loading, setLoading] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ items: ContractCategory[] }>('/contract-categories', {
        params: { page: 1, pageSize: 100 },
      })
      setCategories((res.data.items ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return { categories, loading, reload }
}
