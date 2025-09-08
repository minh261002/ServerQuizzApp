import { Request, Response, NextFunction } from "express"
import Joi from "joi"
import { ValidationError, ValidationErrorDetail } from "~/utils/errors"
import { translate } from "~/utils/i18n"
import { getCurrentLanguage } from "./i18n"

/**
 * Validation schema interface
 */
interface ValidationSchema {
  body?: Joi.ObjectSchema
  query?: Joi.ObjectSchema
  params?: Joi.ObjectSchema
}

/**
 * Translate validation error message
 */
const translateValidationMessage = (message: string, language: string, field?: string): string => {
  // Simple pattern matching for common Joi messages
  if (message.includes("is required")) {
    return translate("validation.required", language, { field })
  }
  if (message.includes("must be a valid email") || message.includes("Please provide a valid email")) {
    return translate("validation.email", language)
  }
  if (message.includes("must contain at least one uppercase letter")) {
    return translate("validation.passwordPattern", language)
  }
  if (message.includes("can only contain letters and numbers")) {
    return translate("validation.usernameAlphanum", language)
  }
  if (message.includes("must be a number")) {
    return translate("validation.number", language, { field })
  }
  if (message.includes("must be at least") && message.includes("characters long")) {
    // Extract the number from message
    const match = message.match(/(\d+)/)
    const min = match ? match[1] : ""
    return translate("validation.minLength", language, { field, min })
  }
  if (message.includes("must be less than") && message.includes("characters")) {
    // Extract the number from message
    const match = message.match(/(\d+)/)
    const max = match ? match[1] : ""
    return translate("validation.maxLength", language, { field, max })
  }

  // Return original message if no translation found
  return message
}

/**
 * Validation middleware factory
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationErrorDetail[] = []
    const language = getCurrentLanguage(req)

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false })
      if (error) {
        errors.push(
          ...error.details.map((detail) => {
            const field = detail.path.join(".")
            return {
              field,
              message: translateValidationMessage(detail.message, language, field),
              type: "body"
            }
          })
        )
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false })
      if (error) {
        errors.push(
          ...error.details.map((detail) => {
            const field = detail.path.join(".")
            return {
              field,
              message: translateValidationMessage(detail.message, language, field),
              type: "query"
            }
          })
        )
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false })
      if (error) {
        errors.push(
          ...error.details.map((detail) => {
            const field = detail.path.join(".")
            return {
              field,
              message: translateValidationMessage(detail.message, language, field),
              type: "params"
            }
          })
        )
      }
    }

    if (errors.length > 0) {
      const validationFailedMessage = translate("messages.validationFailed", language)
      throw new ValidationError(validationFailedMessage, errors)
    }

    next()
  }
}

/**
 * MongoDB ObjectId validation
 */
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    "string.pattern.base": "Invalid ID format"
  })

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // MongoDB ObjectId validation
  objectId: objectIdSchema,

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    search: Joi.string().trim()
  }),

  // User validation schemas
  user: {
    register: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required().messages({
        "string.alphanum": "Username can only contain letters and numbers",
        "string.min": "Username must be at least 3 characters long",
        "string.max": "Username must be less than 30 characters"
      }),
      email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address"
      }),
      password: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)")).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      }),
      firstName: Joi.string().trim().max(50).required().messages({
        "string.max": "First name must be less than 50 characters"
      }),
      lastName: Joi.string().trim().max(50).required().messages({
        "string.max": "Last name must be less than 50 characters"
      }),
      role: Joi.string().valid("admin", "teacher", "student").default("student")
    }),

    login: Joi.object({
      identifier: Joi.string().required().messages({
        "any.required": "Email or username is required"
      }),
      password: Joi.string().required().messages({
        "any.required": "Password is required"
      })
    }),

    updateProfile: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      avatar: Joi.string().uri().allow("", null)
    }).min(1),

    changePassword: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)")).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      })
    })
  },

  // Quiz validation schemas
  quiz: {
    create: Joi.object({
      title: Joi.string().trim().max(100).required().messages({
        "string.max": "Title must be less than 100 characters"
      }),
      description: Joi.string().trim().max(500).required().messages({
        "string.max": "Description must be less than 500 characters"
      }),
      questions: Joi.array()
        .items(
          Joi.object({
            question: Joi.string().trim().max(500).required().messages({
              "string.max": "Question must be less than 500 characters"
            }),
            image: Joi.string().trim().max(255).messages({
              "string.max": "Image URL must be less than 255 characters"
            }),
            options: Joi.array().items(Joi.string().trim().required()).min(2).max(6).required().messages({
              "array.min": "A question must have at least 2 options",
              "array.max": "A question can have at most 6 options"
            }),
            correctAnswer: Joi.number().integer().min(0).required().messages({
              "number.min": "Correct answer index must be 0 or greater"
            }),
            explanation: Joi.string().trim().max(300).messages({
              "string.max": "Explanation must be less than 300 characters"
            }),
            points: Joi.number().integer().min(1).max(100).default(1).messages({
              "number.min": "Points must be at least 1",
              "number.max": "Points cannot exceed 100"
            })
          })
        )
        .min(1)
        .required()
        .messages({
          "array.min": "Quiz must have at least one question"
        }),
      timeLimit: Joi.number().integer().min(1).max(300).required().messages({
        "number.min": "Time limit must be at least 1 minute",
        "number.max": "Time limit cannot exceed 300 minutes"
      }),
      difficulty: Joi.string().valid("easy", "medium", "hard").default("medium"),
      category: Joi.string().trim().max(50).required().messages({
        "string.max": "Category must be less than 50 characters"
      }),
      tags: Joi.array().items(Joi.string().trim()).max(10).default([]).messages({
        "array.max": "Quiz cannot have more than 10 tags"
      })
    }),

    update: Joi.object({
      title: Joi.string().trim().max(100),
      description: Joi.string().trim().max(500),
      questions: Joi.array()
        .items(
          Joi.object({
            question: Joi.string().trim().max(500).required(),
            image: Joi.string().trim().max(255),
            options: Joi.array().items(Joi.string().trim().required()).min(2).max(6).required(),
            correctAnswer: Joi.number().integer().min(0).required(),
            explanation: Joi.string().trim().max(300),
            points: Joi.number().integer().min(1).max(100).default(1)
          })
        )
        .min(1),
      timeLimit: Joi.number().integer().min(1).max(300),
      difficulty: Joi.string().valid("easy", "medium", "hard"),
      category: Joi.string().trim().max(50),
      tags: Joi.array().items(Joi.string().trim()).max(10),
      isActive: Joi.boolean()
    }).min(1),

    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      category: Joi.string().trim(),
      difficulty: Joi.string().valid("easy", "medium", "hard"),
      search: Joi.string().trim(),
      sortBy: Joi.string(),
      sortOrder: Joi.string().valid("asc", "desc").default("desc"),
      isActive: Joi.boolean()
    })
  },

  // Parameter validation
  params: {
    id: Joi.object({
      id: objectIdSchema
    })
  }
}

/**
 * Sanitize input by removing potentially dangerous characters
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === "string") {
      // Remove HTML tags and script tags
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]*>/g, "")
        .trim()
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }

    if (obj && typeof obj === "object") {
      const sanitized: Record<string, unknown> = {}
      for (const key in obj as Record<string, unknown>) {
        sanitized[key] = sanitize((obj as Record<string, unknown>)[key])
      }
      return sanitized
    }

    return obj
  }

  if (req.body) {
    req.body = sanitize(req.body)
  }

  // Skip query sanitization as it can cause issues with Express.js readonly properties
  // Query parameters are typically validated by Joi schemas anyway

  next()
}
