export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mt-1.5" />
          </div>
          <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mb-1" />
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3 border-b border-gray-50 flex items-center gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
