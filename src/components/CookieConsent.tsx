import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'firmaclara_cookie_consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

/**
 * GDPR-compliant Cookie Consent Banner
 * Stores user preferences in localStorage
 */
export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid layout shift on page load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (preferences: Partial<CookiePreferences>) => {
    const consent: CookiePreferences = {
      necessary: true, // Always required
      analytics: preferences.analytics ?? false,
      marketing: preferences.marketing ?? false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setIsVisible(false);

    // Dispatch event for analytics initialization
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
  };

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
  };

  const acceptNecessary = () => {
    saveConsent({ analytics: false, marketing: false });
  };

  const handleCustomize = () => {
    setShowDetails(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Uso de cookies
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Utilizamos cookies para mejorar tu experiencia en FirmaClara.
              Las cookies necesarias son esenciales para el funcionamiento del sitio.
              Puedes aceptar todas las cookies o personalizar tus preferencias.{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Más información
              </Link>
            </p>

            {showDetails && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Cookies necesarias</p>
                    <p className="text-xs text-gray-500">Esenciales para el funcionamiento</p>
                  </div>
                  <span className="text-xs text-gray-400">Siempre activas</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Cookies analíticas</p>
                    <p className="text-xs text-gray-500">Nos ayudan a mejorar el servicio</p>
                  </div>
                  <input
                    type="checkbox"
                    id="analytics-cookies"
                    className="h-4 w-4 rounded border-gray-300"
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Cookies de marketing</p>
                    <p className="text-xs text-gray-500">Para mostrarte contenido relevante</p>
                  </div>
                  <input
                    type="checkbox"
                    id="marketing-cookies"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={acceptAll} size="sm">
                Aceptar todas
              </Button>
              <Button onClick={acceptNecessary} variant="outline" size="sm">
                Solo necesarias
              </Button>
              {!showDetails && (
                <Button onClick={handleCustomize} variant="ghost" size="sm">
                  Personalizar
                </Button>
              )}
              {showDetails && (
                <Button
                  onClick={() => {
                    const analytics = (document.getElementById('analytics-cookies') as HTMLInputElement)?.checked ?? false;
                    const marketing = (document.getElementById('marketing-cookies') as HTMLInputElement)?.checked ?? false;
                    saveConsent({ analytics, marketing });
                  }}
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
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check cookie consent status
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      setConsent(JSON.parse(stored));
    }

    const handleUpdate = (e: CustomEvent<CookiePreferences>) => {
      setConsent(e.detail);
    };

    window.addEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    return () => window.removeEventListener('cookieConsentUpdated', handleUpdate as EventListener);
  }, []);

  return consent;
}

export default CookieConsent;
