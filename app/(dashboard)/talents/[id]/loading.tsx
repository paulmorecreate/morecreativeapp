export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-44 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mt-1.5" />
          </div>
          <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
