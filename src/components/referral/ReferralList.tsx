import type { ReferralEntry } from '@/hooks/useReferral'
import { ReferralRow } from './ReferralRow'
import { ReferralEmptyState } from './ReferralEmptyState'

interface ReferralListProps {
  referrals: ReferralEntry[]
  onCopy: () => void
}

export function ReferralList({ referrals, onCopy }: ReferralListProps) {
  if (referrals.length === 0) {
    return <ReferralEmptyState onCopy={onCopy} />
  }
  return (
    <div className="space-y-2">
      {referrals.map((entry, i) => (
        <ReferralRow key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  )
}
