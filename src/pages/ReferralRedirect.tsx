import { useEffect } from 'react'
import { captureReferralCode } from '@/lib/referral'

export default function ReferralRedirect() {
  useEffect(() => {
    // captureReferralCode() reads window.location.pathname still at /r/:code at this point.
    // 2-second safety timeout: redirect regardless if the network call hangs.
    const fallback = setTimeout(() => window.location.replace('/register'), 2000)
    captureReferralCode().finally(() => {
      clearTimeout(fallback)
      window.location.replace('/register')
    })
  }, [])

  return null
}
