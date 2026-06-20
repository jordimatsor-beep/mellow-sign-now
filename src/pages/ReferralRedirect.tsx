import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>()

  useEffect(() => {
    if (code && CODE_REGEX.test(code) && !localStorage.getItem('fc_ref')) {
      localStorage.setItem('fc_ref', code)
      localStorage.setItem('fc_ref_ts', Date.now().toString())
    }
    // Siempre redirigir, sin revelar si el código es válido o no
    window.location.replace('/register')
  }, [code])

  return null
}
