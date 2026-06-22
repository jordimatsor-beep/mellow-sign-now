const SESSION_KEY  = 'fc_sid'    // opaque UUID — server-side session
const REF_CODE_KEY = 'fc_ref'    // ref code kept only for "X te ha invitado" UI display
const REF_TS_KEY   = 'fc_ref_ts'

const CODE_REGEX    = /^FC-[A-Z2-9]{6}$/
const SESSION_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let captureInProgress = false

function readRefFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  const pathMatch = window.location.pathname.match(/^\/r\/(FC-[A-Z2-9]{6})$/)
  const ref = urlParams.get('ref') || pathMatch?.[1]
  return ref && CODE_REGEX.test(ref) ? ref : null
}

// Captures the referral code from the current URL, creates a server-side session,
// and stores only the opaque session_id in localStorage.
// First-touch attribution: no-op if a session was already captured.
// Silent on network errors — never blocks the user experience.
export async function captureReferralCode(): Promise<void> {
  if (getStoredSessionId()) return
  if (captureInProgress) return

  const ref = readRefFromUrl()
  if (!ref) return

  captureInProgress = true
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-anon-referral`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ ref_code: ref }),
      },
    )
    if (!res.ok) return
    const { session_id } = await res.json()
    if (!session_id || !SESSION_REGEX.test(session_id)) return

    localStorage.setItem(SESSION_KEY, session_id)
    localStorage.setItem(REF_CODE_KEY, ref)       // UI only: "X te ha invitado"
    localStorage.setItem(REF_TS_KEY, Date.now().toString())
  } catch {
    // Silent: referral tracking must never degrade the signup flow
  } finally {
    captureInProgress = false
  }
}

// Returns the server-side session UUID, or null if not yet captured.
export function getStoredSessionId(): string | null {
  const sid = localStorage.getItem(SESSION_KEY)
  return sid && SESSION_REGEX.test(sid) ? sid : null
}

// Returns the ref code kept for UI display only ("X te ha invitado").
// Not used for attribution — use getStoredSessionId() for that.
export function getStoredReferralCode(): string | null {
  const ref = localStorage.getItem(REF_CODE_KEY)
  return ref && CODE_REGEX.test(ref) ? ref : null
}

// Clears all referral data after a successful registration.
export function clearReferralCode(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REF_CODE_KEY)
  localStorage.removeItem(REF_TS_KEY)
}
