import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Leemos el consentimiento almacenado ANTES de inicializar Sentry.
// Sentry solo se activa si el usuario ya aceptó cookies analíticas en una sesión previa.
// Si el usuario da consentimiento en esta sesión, Sentry se activará en la siguiente carga.
const storedConsent = (() => {
  try {
    return JSON.parse(localStorage.getItem("firmaclara_cookie_consent") || "{}");
  } catch {
    return {};
  }
})();

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD && storedConsent.analytics === true,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Activa Sentry en la misma sesión si el usuario consiente por primera vez
// (el init previo lo dejó desactivado para usuarios sin consentimiento previo).
window.addEventListener('cookieConsentUpdated', (e: Event) => {
  const consent = (e as CustomEvent).detail;
  if (consent?.analytics === true && import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      enabled: true,
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
});

createRoot(document.getElementById("root")!).render(
    <App />
);
