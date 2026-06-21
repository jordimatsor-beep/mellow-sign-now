import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'firmaclara_cookie_consent';
const CLARITY_TAG = 'wpi7oaugw5';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

// Carga Microsoft Clarity dinámicamente (sólo tras consentimiento analítico).
function loadClarity() {
  if (document.querySelector('[data-clarity-id]')) return;
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.setAttribute('data-clarity-id', CLARITY_TAG);
  s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_TAG}");`;
  document.head.appendChild(s);
}

// Si el usuario ya consintió en una sesión anterior, cargamos Clarity inmediatamente.
function applyStoredConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || '{}') as Partial<CookiePreferences>;
    if (stored.analytics === true) loadClarity();
  } catch {}
}
applyStoredConsent();

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (preferences: Partial<CookiePreferences>) => {
    const consent: CookiePreferences = {
      necessary: true,
      analytics: preferences.analytics ?? false,
      marketing: preferences.marketing ?? false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setIsVisible(false);

    if (consent.analytics) loadClarity();

    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
  };

  const acceptAll = () => saveConsent({ analytics: true, marketing: true });
  const acceptNecessary = () => saveConsent({ analytics: false, marketing: false });

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Uso de cookies
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Usamos cookies propias necesarias para el funcionamiento del servicio.
              Con tu permiso, también usamos <strong>Microsoft Clarity</strong> (análisis
              de uso, grabaciones de sesión, mapas de calor — Microsoft Corp., EE. UU.) y{' '}
              <strong>Sentry</strong> (monitorización de errores — Functional Software, EE. UU.).
              Ambos servicios pueden transferir datos fuera del Espacio Económico Europeo
              al amparo de Cláusulas Contractuales Tipo.{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Política de privacidad
              </Link>
            </p>

            {showDetails && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Cookies necesarias</p>
                    <p className="text-xs text-gray-500">Sesión, autenticación, preferencias de idioma. Sin estas cookies el servicio no funciona.</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">Siempre activas</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Cookies analíticas</p>
                    <p className="text-xs text-gray-500">
                      <strong>Microsoft Clarity</strong> (Microsoft Corp., EE. UU.): grabaciones de sesión, mapas de calor, análisis de comportamiento.
                      <br />
                      <strong>Sentry</strong> (Functional Software, EE. UU.): registro de errores técnicos.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="analytics-cookies"
                    className="h-4 w-4 rounded border-gray-300 mt-0.5 shrink-0"
                    checked={analyticsChecked}
                    onChange={e => setAnalyticsChecked(e.target.checked)}
                  />
                </div>
                <hr className="border-gray-200" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Cookies de marketing</p>
                    <p className="text-xs text-gray-500">
                      Actualmente no usamos cookies de publicidad o retargeting de terceros.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="marketing-cookies"
                    className="h-4 w-4 rounded border-gray-300 mt-0.5 shrink-0"
                    checked={marketingChecked}
                    onChange={e => setMarketingChecked(e.target.checked)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={acceptAll} size="sm">
                Aceptar todas
              </Button>
              <Button onClick={acceptNecessary} variant="outline" size="sm">
                Solo necesarias
              </Button>
              <Button
                onClick={() => setShowDetails(v => !v)}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showDetails ? 'Ocultar' : 'Personalizar'}
              </Button>
              {showDetails && (
                <Button
                  onClick={() => saveConsent({ analytics: analyticsChecked, marketing: marketingChecked })}
                  variant="secondary"
                  size="sm"
                >
                  Guardar preferencias
                </Button>
              )}
            </div>
          </div>

          <button
            onClick={acceptNecessary}
            className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            aria-label="Cerrar y aceptar solo necesarias"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<CookiePreferences>) => setConsent(e.detail);
    window.addEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    return () => window.removeEventListener('cookieConsentUpdated', handleUpdate as EventListener);
  }, []);

  return consent;
}

export default CookieConsent;
