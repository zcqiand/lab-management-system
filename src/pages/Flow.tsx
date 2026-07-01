import FlowPanel from '../features/flow/FlowPanel'
import { useAuthStore } from '../features/auth/authStore'

export default function Flow() {
  const user = useAuthStore((s) => s.user)
  return (
    <FlowPanel
      operatorId={user?.id ?? 'anonymous'}
      operatorRole={user?.role.name ?? 'technician'}
    />
  )
}
