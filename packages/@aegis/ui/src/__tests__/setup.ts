import './storage-polyfill';
import '@testing-library/jest-dom/vitest';
import { initI18n } from '../i18n';

initI18n({
  lng: 'en',
  onMissingKey: (key) => {
    throw new Error(`Missing translation key: ${key}`);
  },
});
