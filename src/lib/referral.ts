const REF_KEY    = 'fc_ref'
const REF_TS_KEY = 'fc_ref_ts'
const CODE_REGEX = /^FC-[A-Z2-9]{6}$/
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

// Captura el código de referido de la URL actual y lo guarda en localStorage.
// First-touch attribution: no sobreescribe si ya hay uno guardado.
// Llamar en App.tsx en el mount inicial (useEffect).
export function captureReferralCode(): void {
  const urlParams = new URLSearchParams(window.location.search)
  const pathMatch = window.location.pathname.match(/^\/r\/(FC-[A-Z2-9]{6})$/)
  const ref = urlParams.get('ref') || pathMatch?.[1]
  if (ref && CODE_REGEX.test(ref) && !localStorage.getItem(REF_KEY)) {
    localStorage.setItem(REF_KEY, ref)
    localStorage.setItem(REF_TS_KEY, Date.now().toString())
  }
}

// Devuelve el código almacenado si existe y no ha caducado (7 días).
export function getStoredReferralCode(): string | null {
  const ref = localStorage.getItem(REF_KEY)
  const ts  = Number(localStorage.getItem(REF_TS_KEY) || 0)
  if (!ref || Date.now() - ts > SEVEN_DAYS) {
    clearReferralCode()
    return null
  }
  return ref
}

// Limpia el código tras un registro exitoso o caducidad.
export function clearReferralCode(): void {
  localStorage.removeItem(REF_KEY)
  localStorage.removeItem(REF_TS_KEY)
}
