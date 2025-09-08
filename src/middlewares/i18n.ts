import { Request, Response, NextFunction } from "express"
import { isLanguageSupported, getDefaultLanguage } from "~/utils/i18n"

// Extend Request interface to include language
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      language: string
    }
  }
}

/**
 * i18n middleware to handle language detection from X-Language header
 */
export const i18nMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get language from X-Language header
  const headerLanguage = req.get("X-Language") || req.get("x-language")

  // Set default language
  let language = getDefaultLanguage()

  // Check if provided language is supported
  if (headerLanguage && isLanguageSupported(headerLanguage.toLowerCase())) {
    language = headerLanguage.toLowerCase()
  }

  // Attach language to request object
  req.language = language

  // Set response header to indicate the language being used
  res.set("Content-Language", language)

  next()
}

/**
 * Helper function to get current request language
 */
export const getCurrentLanguage = (req: Request): string => {
  return req.language || getDefaultLanguage()
}
