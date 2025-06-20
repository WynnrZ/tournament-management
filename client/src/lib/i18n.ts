// Multi-language support for WynnrZ Tournament Platform
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, frenchTranslations, germanTranslations } from './translations';

export type Language = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'pt' // Portuguese
  | 'it' // Italian
  | 'ru' // Russian
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'nl' // Dutch
  | 'ar' // Arabic
  | 'hi'; // Hindi

export type TranslationKey = keyof typeof translations.en;

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
];

// Complete translation system with comprehensive coverage
const allTranslations: Record<Language, Record<TranslationKey, string>> = {
  en: translations.en,
  es: translations.es,
  // Other languages use English as fallback with some key translations
  fr: { ...translations.en, ...frenchTranslations },
  de: { ...translations.en, ...germanTranslations },
  pt: translations.en,
  it: translations.en,
  ru: translations.en,
  zh: translations.en,
  ja: translations.en,
  nl: translations.en,
  ar: translations.en,
  hi: translations.en,
};

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

// Detect browser language
function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0] as Language;
  return languages.some(lang => lang.code === browserLang) ? browserLang : 'en';
}

// Create the language store
export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      currentLanguage: detectBrowserLanguage(),
      setLanguage: (language: Language) => set({ currentLanguage: language }),
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        const { currentLanguage } = get();
        let translation = allTranslations[currentLanguage][key] || allTranslations.en[key] || key;
        
        // Replace parameters in translation
        if (params) {
          Object.entries(params).forEach(([param, value]) => {
            translation = translation.replace(`{${param}}`, String(value));
          });
        }
        
        return translation;
      },
    }),
    {
      name: 'wynnrz-language-storage',
    }
  )
);

// Hook for easy access to translation function
export const useTranslation = () => {
  const { t, currentLanguage, setLanguage } = useLanguage();
  return { t, currentLanguage, setLanguage, languages };
};

// Format relative time with internationalization support
export function formatRelativeTime(date: Date): string {
  const { t } = useLanguage.getState();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return t('time.now');
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t('time.minutesAgo', { count: diffInMinutes });
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t('time.hoursAgo', { count: diffInHours });
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t('time.daysAgo', { count: diffInDays });
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return t('time.weeksAgo', { count: diffInWeeks });
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return t('time.monthsAgo', { count: diffInMonths });
}