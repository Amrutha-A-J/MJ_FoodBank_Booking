import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const supportedLngs = [
  'en',
  'es',
  'fr',
  'ar',
  'uk',
  'so',
  'tl',
  'zh',
  'pa',
  'hi',
  'fa',
  'ps',
  'ti',
  'am',
  'sw',
  'ml',
  'ta',
];

const browserLang =
  typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

if (process.env.NODE_ENV === 'test') {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: {} } },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initImmediate: false,
  });
} else {
  i18n.use(HttpBackend).use(initReactI18next).init({
    lng: supportedLngs.includes(browserLang) ? browserLang : 'en',
    fallbackLng: 'en',
    supportedLngs,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
