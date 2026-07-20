function Row() {
  return (
    <div className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-4">
      <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-4 bg-gray-100 rounded animate-pulse" />
    </div>
  )
}

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-100 rounded animate-pulse mt-1.5" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="h-9 w-60 bg-gray-100 rounded-lg animate-pulse mb-5" />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex gap-4 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => <Row key={i} />)}
      </div>
    </div>
  )
}
