import { create } from "zustand";
import { ReactNode } from "react";
import { getStorageItem, setStorageItem } from "@/utils/storage";

export type Language = "en" | "es" | "fr" | "de" | "tr";

type Translations = {
  [key: string]: {
    [key in Language]?: string;
  };
};

type TranslationParams = {
  [key: string]: string | ReactNode;
};

//import localizationData from "../../public/localization.json";

const translations: Translations = {};

const availableLanguages: Language[] = ["en", "es", "fr", "de", "tr"];

// Default server-safe value
const DEFAULT_LANGUAGE: Language = "en";

interface LanguageState {
  language: Language;
  isInitialized: boolean;
  availableLanguages: Language[];
}

interface LanguageActions {
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: TranslationParams) => string | ReactNode;
  initialize: () => void;
}

export type LanguageStore = LanguageState & LanguageActions;

export const useLanguageStore = create<LanguageStore>((set, get) => {
  // This is only called in the browser after hydration via the StoreProvider
  const translate = (
    key: string,
    params?: TranslationParams,
  ): string | ReactNode => {
    const { language } = get();
    let text = translations[key]?.[language] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        const paramValue = params[paramKey];
        const regex = new RegExp(`{{${paramKey}}}`, "g");

        if (typeof paramValue === "string") {
          text = text.replace(regex, paramValue);
        } else if (typeof text === "string") {
          const parts = text.split(regex);
          if (parts.length > 1) {
            const result: (string | ReactNode)[] = [];
            parts.forEach((part, index) => {
              if (index > 0) {
                result.push(paramValue);
              }
              if (part) {
                result.push(part);
              }
            });
            return result;
          }
        }
      });
    }

    return text;
  };

  return {
    // Always start with default values for SSR
    language: DEFAULT_LANGUAGE,
    isInitialized: false,
    availableLanguages,

    // Safe initialization function called only on the client after hydration
    initialize: () => {
      // This only runs on the client after hydration
      const getBrowserLanguage = (): Language => {
        try {
          const browserLang = navigator.language.split("-")[0];
          if (
            browserLang === "en" ||
            browserLang === "es" ||
            browserLang === "fr" ||
            browserLang === "de"
          ) {
            return browserLang as Language;
          }
        } catch (error) {
          console.error("Error getting browser language:", error);
        }
        return DEFAULT_LANGUAGE;
      };

      // Get stored language from localStorage (safely)
      const savedLanguage = getStorageItem<Language | null>("language", null);
      
      // Use saved language or detect from browser
      const detectedLanguage = savedLanguage || getBrowserLanguage();
      
      set({
        language: detectedLanguage,
        isInitialized: true,
      });
    },

    setLanguage: (lang: Language) => {
      set({ language: lang });
      // Safely set language in localStorage
      setStorageItem("language", lang);
    },

    t: translate,
  };
}); 