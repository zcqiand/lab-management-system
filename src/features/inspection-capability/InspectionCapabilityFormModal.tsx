import { useEffect, useState } from "react"
import { apiClient } from "../../api/client"

type Resource = "specialties" | "objects" | "parameters" | "standards"

const TITLES: Record<Resource, string> = {
  specialties: "新建检测专项",
  objects: "新建检测项目",
  parameters: "新建检测参数",
  standards: "新建检测标准",
}

const EDIT_TITLES: Record<Resource, string> = {
  specialties: "编辑检测专项",
  objects: "编辑检测项目",
  parameters: "编辑检测参数",
  standards: "编辑检测标准",
}

const PATHS: Record<Resource, string> = {
  specialties: "/inspection-specialties",
  objects: "/inspection-objects",
  parameters: "/inspection-parameters",
  standards: "/inspection-standards",
}

const FIELDS: Record<Resource, Array<{ name: string; label: string; placeholder?: string; required?: boolean }>> = {
  specialties: [
    { name: "code", label: "编码", required: true, placeholder: "SP10" },
    { name: "officialNo", label: "官方序号", placeholder: "十" },
    { name: "name", label: "名称", required: true },
  ],
  objects: [
    { name: "code", label: "编码", required: true, placeholder: "OBJ-SP01-P24" },
    { name: "inspectionSpecialtyCode", label: "检测专项编码", required: true, placeholder: "SP01" },
    { name: "sourceProjectNo", label: "来源行号", placeholder: "24" },
    { name: "sourceProjectName", label: "来源行名称", placeholder: "自定义项目" },
    { name: "name", label: "名称", required: true },
  ],
  parameters: [
    { name: "code", label: "编码", required: true, placeholder: "IP-CUSTOM-1" },
    { name: "name", label: "名称", required: true },
    { name: "canonicalName", label: "规范名" },
    { name: "unit", label: "单位", placeholder: "MPa" },
  ],
  standards: [
    { name: "code", label: "编码", required: true, placeholder: "GB/T CUSTOM-2026" },
    { name: "name", label: "名称", required: true },
    { name: "version", label: "版本", placeholder: "2026" },
  ],
}

interface Props {
  resource: Resource
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: { id: string;[k: string]: unknown } | null
}

export function InspectionCapabilityFormModal({ resource, open, onClose, onSaved, editing = null }: Props) {
  const fields = FIELDS[resource]
  const initialValues: Record<string, string> = {}
  for (const f of fields) initialValues[f.name] = ""
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [internalOpen, setInternalOpen] = useState(open)

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {}
      for (const f of fields) {
        init[f.name] = editing ? String((editing as Record<string, unknown>)[f.name] ?? "") : ""
      }
      setValues(init)
      setError(null)
      setInternalOpen(true)
    } else {
      setInternalOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource, editing])

  if (!internalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = { ...values }
    if (resource === "objects") {
      payload.isOfficial = false
      payload.isOptionalForQualification = false
      payload.enabled = true
    } else if (resource === "specialties") {
      payload.isOfficial = false
      payload.enabled = true
    } else if (resource === "parameters") {
      payload.rawName = values.name || values.canonicalName
      payload.aliases = []
      payload.sourceType = "custom"
    } else if (resource === "standards") {
      payload.status = "active"
    }
    try {
      const res = editing
        ? await apiClient.put(`${PATHS[resource]}/${editing.id}`, payload)
        : await apiClient.post(PATHS[resource], payload)
      if (!res.data || typeof res.data !== "object") {
        setError("服务端返回异常")
      } else if ("message" in (res.data as { message?: string })) {
        setError((res.data as { message: string }).message)
      } else {
        onSaved()
        onClose()
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-3"
      >
        <h3 className="text-lg font-semibold">{editing ? EDIT_TITLES[resource] : TITLES[resource]}</h3>
        {error && (
          <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        {fields.map((f) => (
          <label key={f.name} className="block text-sm">
            <span className="text-xs font-medium text-gray-600">
              {f.label}
              {f.required ? " *" : ""}
            </span>
            <input
              aria-label={f.label}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              placeholder={f.placeholder}
              className="mt-1 w-full border rounded px-2 py-1.5"
              required={f.required}
              disabled={!!editing && f.name === "code"}
            />
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default InspectionCapabilityFormModal
