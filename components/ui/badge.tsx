import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  prospect: 'bg-amber-50 text-amber-700 border-amber-200',
  available: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
  A: 'bg-purple-50 text-purple-700 border-purple-200',
  B: 'bg-blue-50 text-blue-700 border-blue-200',
  C: 'bg-gray-100 text-gray-600 border-gray-200',
  showroom: 'bg-teal-50 text-teal-700 border-teal-200',
  dressing: 'bg-teal-50 text-teal-700 border-teal-200',
  main: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-gray-100 text-gray-500 border-gray-200',
}

interface BadgeProps {
  value: string | null | undefined
  className?: string
}

export function Badge({ value, className }: BadgeProps) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  const color = statusColors[value] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize', color, className)}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
