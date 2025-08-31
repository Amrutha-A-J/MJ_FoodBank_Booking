import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import uk from './locales/uk.json';
import so from './locales/so.json';
import tl from './locales/tl.json';
import zh from './locales/zh.json';
import pa from './locales/pa.json';
import hi from './locales/hi.json';
import fa from './locales/fa.json';
import ps from './locales/ps.json';
import ti from './locales/ti.json';
import am from './locales/am.json';
import sw from './locales/sw.json';
import ml from './locales/ml.json';
import ta from './locales/ta.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  uk: { translation: uk },
  so: { translation: so },
  tl: { translation: tl },
  zh: { translation: zh },
  pa: { translation: pa },
  hi: { translation: hi },
  fa: { translation: fa },
  ps: { translation: ps },
  ti: { translation: ti },
  am: { translation: am },
  sw: { translation: sw },
  ml: { translation: ml },
  ta: { translation: ta },
};

const browserLang =
  typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: Object.keys(resources).includes(browserLang) ? browserLang : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
