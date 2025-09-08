import i18next from "i18next"
import Backend from "i18next-fs-backend"
import path from "path"

// Initialize i18next
i18next.use(Backend).init({
  lng: "en", // default language
  fallbackLng: "en",
  debug: process.env.NODE_ENV === "development",

  preload: ["en", "vi"], // Preload both languages

  backend: {
    loadPath: path.join(__dirname, "../locales/{{lng}}/{{ns}}.json")
  },

  ns: ["common"], // namespaces
  defaultNS: "common",

  interpolation: {
    escapeValue: false // not needed for server side
  },

  supportedLngs: ["en", "vi"]
})

export default i18next

// Helper function to get translation with language
export const t = (key: string, options: { lng?: string; [key: string]: unknown } = {}): string => {
  const result = i18next.t(key, options)
  return typeof result === "string" ? result : key
}

// Helper function to get translation with interpolation
export const translate = (
  key: string,
  language: string = "en",
  interpolation: Record<string, unknown> = {}
): string => {
  // Force the language change for this translation
  const result = i18next.t(key, { lng: language, ...interpolation })
  return typeof result === "string" ? result : key
}

// Get supported languages
export const getSupportedLanguages = (): string[] => {
  return ["en", "vi"]
}

// Check if language is supported
export const isLanguageSupported = (lang: string): boolean => {
  return getSupportedLanguages().includes(lang)
}

// Get default language
export const getDefaultLanguage = (): string => {
  return "en"
}
