import { Request, Response, NextFunction } from "express"
import { AppError, ValidationError, ValidationErrorDetail } from "~/utils/errors"
import { HTTP_STATUS, MESSAGES, ENV } from "~/constants"
import { translate } from "~/utils/i18n"
import { getCurrentLanguage } from "./i18n"

/**
 * Interface for error response
 */
interface ErrorResponse {
  success: false
  message: string
  statusCode: number
  timestamp: string
  path: string
  stack?: string
  errors?: ValidationErrorDetail[]
}

/**
 * Mongoose validation error interface
 */
interface MongooseValidationError {
  errors: Record<string, { path: string; message: string }>
}

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error: MongooseValidationError): AppError => {
  // Convert validation errors to our format
  Object.values(error.errors).map((err) => ({
    field: err.path,
    message: err.message,
    type: "validation"
  }))
  return new AppError("Validation failed", HTTP_STATUS.BAD_REQUEST)
}

/**
 * Mongoose duplicate key error interface
 */
interface MongooseDuplicateKeyError {
  keyValue: Record<string, unknown>
  code: number
}

/**
 * Mongoose cast error interface
 */
interface MongooseCastError {
  path: string
  value: unknown
  name: string
}

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error: MongooseDuplicateKeyError): AppError => {
  const field = Object.keys(error.keyValue)[0]
  const value = error.keyValue[field]
  return new AppError(`${field} '${value}' already exists`, HTTP_STATUS.CONFLICT)
}

/**
 * Handle Mongoose cast errors
 */
const handleCastError = (error: MongooseCastError): AppError => {
  return new AppError(`Invalid ${error.path}: ${error.value}`, HTTP_STATUS.BAD_REQUEST)
}

/**
 * Handle JWT errors
 */
const handleJWTError = (): AppError => {
  return new AppError("Invalid token. Please log in again.", HTTP_STATUS.UNAUTHORIZED)
}

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError("Your token has expired. Please log in again.", HTTP_STATUS.UNAUTHORIZED)
}

/**
 * Send error response in development
 */
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  const language = getCurrentLanguage(req)

  const errorResponse: ErrorResponse = {
    success: false,
    message: err.message,
    statusCode: err.statusCode,
    timestamp: err.timestamp || new Date().toISOString(),
    path: req.originalUrl,
    stack: err.stack
  }

  if (err instanceof ValidationError) {
    errorResponse.errors = err.errors
  }

  res.status(err.statusCode).json(errorResponse)
}

/**
 * Send error response in production
 */
const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  const language = getCurrentLanguage(req)

  const errorResponse: ErrorResponse = {
    success: false,
    message: err.isOperational ? err.message : translate("messages.internalError", language),
    statusCode: err.statusCode,
    timestamp: err.timestamp || new Date().toISOString(),
    path: req.originalUrl
  }

  // Only send error details for operational errors
  if (err.isOperational && err instanceof ValidationError) {
    errorResponse.errors = err.errors
  }

  res.status(err.statusCode).json(errorResponse)
}

/**
 * Error with name and code properties
 */
interface ErrorWithNameAndCode extends Error {
  name: string
  code?: number
  statusCode?: number
}

/**
 * Global error handling middleware
 */
export const errorHandler = (error: ErrorWithNameAndCode, req: Request, res: Response, next: NextFunction): void => {
  let err: AppError = error instanceof AppError ? error : new AppError(error.message)
  const language = getCurrentLanguage(req)

  // Log error
  console.error("Error:", error)

  // Our custom ValidationError
  if (error instanceof ValidationError) {
    err = error
  }
  // Mongoose validation error
  else if (error.name === "ValidationError") {
    err = handleValidationError(error as unknown as MongooseValidationError)
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    err = handleDuplicateKeyError(error as unknown as MongooseDuplicateKeyError)
  }

  // Mongoose cast error
  if (error.name === "CastError") {
    err = handleCastError(error as unknown as MongooseCastError)
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    err = new AppError(translate("auth.tokenInvalid", language), HTTP_STATUS.UNAUTHORIZED)
  }

  if (error.name === "TokenExpiredError") {
    err = new AppError(translate("auth.tokenExpired", language), HTTP_STATUS.UNAUTHORIZED)
  }

  // Create AppError if it's not already one
  if (!(err instanceof AppError)) {
    err = new AppError(
      error.message || MESSAGES.INTERNAL_ERROR,
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      false
    )
  }

  // Send error response
  if (ENV.NODE_ENV === "development") {
    sendErrorDev(err, req, res)
  } else {
    sendErrorProd(err, req, res)
  }
}

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND)
  next(error)
}
