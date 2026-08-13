import { formatDate } from '@/lib/utils'

interface Props {
  createdBy: string | null
  createdAt: string
  updatedBy?: string | null
  updatedAt?: string | null
}

export function AuditStamp({ createdBy, createdAt, updatedBy, updatedAt }: Props) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-100 space-y-0.5">
      <p className="text-[11px] text-gray-400">
        Added by <span className="text-gray-500">{createdBy ?? 'unknown'}</span>
        {' · '}{formatDate(createdAt)}
      </p>
      {updatedBy && (
        <p className="text-[11px] text-gray-400">
          Last edited by <span className="text-gray-500">{updatedBy}</span>
          {updatedAt ? <>{' · '}{formatDate(updatedAt)}</> : null}
        </p>
      )}
    </div>
  )
}
