import { Request, Response } from "express"
import { HTTP_STATUS } from "~/constants"
import { translate } from "~/utils/i18n"
import { getCurrentLanguage } from "~/middlewares/i18n"

/**
 * User interface from auth middleware
 */
export interface AuthenticatedUser {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
}

/**
 * Pagination interface
 */
export interface PaginationInfo {
  totalDocuments: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Standard API response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  pagination?: PaginationInfo
  timestamp: string
}

/**
 * Base controller class with common response methods
 */
export abstract class BaseController {
  /**
   * Get translated message
   */
  protected t(req: Request, key: string, interpolation?: Record<string, any>): string {
    const language = getCurrentLanguage(req)
    return translate(key, language, interpolation)
  }
  /**
   * Send success response
   */
  protected sendSuccess<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = HTTP_STATUS.OK,
    pagination?: PaginationInfo
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    }

    if (data !== undefined) {
      response.data = data
    }

    if (pagination) {
      response.pagination = pagination
    }

    return res.status(statusCode).json(response)
  }

  /**
   * Send created response
   */
  protected sendCreated<T>(res: Response, message: string, data?: T): Response {
    return this.sendSuccess(res, message, data, HTTP_STATUS.CREATED)
  }

  /**
   * Send no content response
   */
  protected sendNoContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }

  /**
   * Send paginated response
   */
  protected sendPaginated<T>(res: Response, message: string, documents: T[], pagination: PaginationInfo): Response {
    return this.sendSuccess(res, message, documents, HTTP_STATUS.OK, pagination)
  }

  /**
   * Extract pagination parameters from request
   */
  protected getPaginationParams(req: Request): { page: number; limit: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10))

    return { page, limit }
  }

  /**
   * Extract sort parameters from request
   */
  protected getSortParams(
    req: Request,
    defaultSort: Record<string, 1 | -1> = { createdAt: -1 }
  ): Record<string, 1 | -1> {
    const sortBy = req.query.sortBy as string
    const sortOrder = req.query.sortOrder as string

    if (!sortBy) {
      return defaultSort
    }

    const order: 1 | -1 = sortOrder === "asc" ? 1 : -1
    return { [sortBy]: order }
  }

  /**
   * Extract search parameters from request
   */
  protected getSearchParams(req: Request): string {
    return (req.query.search as string) || ""
  }

  /**
   * Get request user ID (assuming it's set by auth middleware)
   */
  protected getUserId(req: Request): string {
    const user = (req as Request & { user?: AuthenticatedUser }).user
    return user?.id || ""
  }

  /**
   * Get request user (assuming it's set by auth middleware)
   */
  protected getUser(req: Request): AuthenticatedUser | undefined {
    return (req as Request & { user?: AuthenticatedUser }).user
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: Record<string, unknown>, requiredFields: string[]): string[] {
    const missingFields: string[] = []

    for (const field of requiredFields) {
      if (!data[field]) {
        missingFields.push(field)
      }
    }

    return missingFields
  }

  /**
   * Clean object by removing undefined/null values
   */
  protected cleanObject(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {}

    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        cleaned[key] = obj[key]
      }
    }

    return cleaned
  }
}
