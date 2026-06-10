import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ar } from '@/i18n/resources/ar';
import { en } from '@/i18n/resources/en';
import type { Language, TranslationDictionary, TranslationValues } from '@/i18n/types';

const STORAGE_KEY = 'step.interface.language';
const FALLBACK_LANGUAGE: Language = 'en';

const resources: Record<Language, TranslationDictionary> = { en, ar };

type I18nContextValue = {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string, values?: TranslationValues) => string;
  tm: <T>(key: string, fallback: T) => T;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === 'ar' || value === 'en';
}

function getAtPath(resource: TranslationDictionary, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, resource);
}

function formatTemplate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return Object.entries(values).reduce((result, [name, value]) => {
    return result.split(`{${name}}`).join(String(value));
  }, template);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
    return 'ar';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    document.body.dataset.language = language;
  }, [language]);

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  const t = useCallback(
    (key: string, fallback?: string, values?: TranslationValues) => {
      const selected = getAtPath(resources[language], key);
      const fallbackValue = getAtPath(resources[FALLBACK_LANGUAGE], key);
      const resolved =
        (typeof selected === 'string' && selected) ||
        (typeof fallbackValue === 'string' && fallbackValue) ||
        fallback ||
        key;
      return formatTemplate(resolved, values);
    },
    [language],
  );

  const tm = useCallback(
    <T,>(key: string, fallback: T): T => {
      const selected = getAtPath(resources[language], key);
      if (selected !== undefined && selected !== null) return selected as T;
      const fallbackValue = getAtPath(resources[FALLBACK_LANGUAGE], key);
      if (fallbackValue !== undefined && fallbackValue !== null) return fallbackValue as T;
      return fallback;
    },
    [language],
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'ar' ? 'en' : 'ar'));
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      direction,
      setLanguage,
      toggleLanguage,
      t,
      tm,
      isRtl: direction === 'rtl',
    }),
    [direction, language, setLanguage, t, tm, toggleLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
