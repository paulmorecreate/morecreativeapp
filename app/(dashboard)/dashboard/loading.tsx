function StatCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-3 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mb-1" />
      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
    </div>
  )
}

function PanelRow() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
      <div>
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-1" />
        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mt-1.5" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard />
        <StatCard />
        <StatCard />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => <PanelRow key={i} />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => <PanelRow key={i} />)}
        </div>
      </div>
    </div>
  )
}
