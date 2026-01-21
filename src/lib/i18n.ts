import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import ca from '@/locales/ca.json';
import fr from '@/locales/fr.json';
import pt from '@/locales/pt.json';

i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n to react-i18next
    .init({
        resources: {
            es: { translation: es },
            en: { translation: en },
            ca: { translation: ca },
            fr: { translation: fr },
            pt: { translation: pt },
        },
        fallbackLng: 'es', // Default to Spanish
        supportedLngs: ['es', 'en', 'ca', 'fr', 'pt'],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        detection: {
            order: ['navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage'],
        },
    });

export default i18n;
