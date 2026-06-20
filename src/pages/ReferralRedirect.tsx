import { useEffect } from 'react'
import { captureReferralCode } from '@/lib/referral'

export default function ReferralRedirect() {
  useEffect(() => {
    // M1-FIX: delegar a lib/referral (single source of truth para keys/TTL/regex)
    // captureReferralCode() lee window.location.pathname que aún es /r/:code en este punto
    captureReferralCode()
    window.location.replace('/register')
  }, [])

  return null
}
