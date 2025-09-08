import { HTTP_STATUS } from "~/constants"

/**
 * Validation error interface
 */
export interface ValidationErrorDetail {
  field: string
  message: string
  type?: string
}

/**
 * Base custom error class
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly timestamp: string

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date().toISOString()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    this.name = this.constructor.name
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[]

  constructor(message: string = "Validation failed", errors: ValidationErrorDetail[] = []) {
    super(message, HTTP_STATUS.BAD_REQUEST)
    this.errors = errors
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, HTTP_STATUS.UNAUTHORIZED)
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, HTTP_STATUS.FORBIDDEN)
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, HTTP_STATUS.NOT_FOUND)
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, HTTP_STATUS.CONFLICT)
  }
}

/**
 * Too many requests error class
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS)
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(message: string = "External service unavailable") {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE)
  }
}

/**
 * BadRequestError class
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, HTTP_STATUS.BAD_REQUEST)
  }
}
