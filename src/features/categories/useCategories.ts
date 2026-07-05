import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import type { ReportCategory } from '../../types/api'

/** 拉取全部报告类别（基础码表，各页面共用） */
export function useCategories() {
  const [categories, setCategories] = useState<ReportCategory[]>([])
  const [loading, setLoading] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ items: ReportCategory[] }>('/report-categories', {
        params: { page: 1, pageSize: 100 },
      })
      setCategories(res.data.items.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { categories, loading, reload }
}

/** code → 中文名 */
export function categoryName(categories: ReportCategory[], code?: string) {
  return categories.find((c) => c.code === code)?.name ?? code ?? '—'
}
