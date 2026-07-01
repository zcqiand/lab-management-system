export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">禁止访问</h2>
        <p className="text-gray-600">您没有权限访问该页面</p>
      </div>
    </div>
  )
}
