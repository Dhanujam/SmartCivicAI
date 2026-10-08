import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'smartcivic_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ta') {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'en';
  });

  const setLanguage = (newLang) => {
    if (newLang === 'en' || newLang === 'ta') {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch (e) {
        console.warn('Could not persist language to localStorage:', e);
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, fallback = '') => {
    const langDict = translations[language];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English if key missing in current language
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isTamil: language === 'ta',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
