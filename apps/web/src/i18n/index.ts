import { LANGUAGES } from '@pq/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLanguage, LANGUAGE_STORAGE_KEY } from '../features/settings/language';
import { readStored, writeStored } from '../shared/storage';
import { resources } from './resources';

const initial = detectLanguage(readStored(LANGUAGE_STORAGE_KEY), navigator.languages ?? []);

i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang;
  writeStored(LANGUAGE_STORAGE_KEY, lang);
});

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  supportedLngs: [...LANGUAGES],
  // React already escapes rendered values.
  interpolation: { escapeValue: false },
});

export default i18n;
