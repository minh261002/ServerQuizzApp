import { Request, Response, NextFunction } from "express"
import { UserService } from "~/services/UserService"
import { AuthenticationError, AuthorizationError } from "~/utils/errors"
import { asyncMiddleware } from "~/utils/asyncHandler"
import { translate } from "~/utils/i18n"
import { getCurrentLanguage } from "./i18n"

// Extend Request interface to include user
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string
      username: string
      email: string
      role: string
      isActive: boolean
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const language = getCurrentLanguage(req)

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError(translate("auth.tokenRequired", language))
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  const userService = new UserService()

  try {
    // Verify token
    const decoded = userService.verifyToken(token)

    // Get user from database
    const user = await userService.findById(decoded.id)

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated")
    }

    // Add user to request
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }

    next()
  } catch {
    throw new AuthenticationError("Invalid or expired token")
  }
})

/**
 * Authorization middleware factory
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError("Authentication required")
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new AuthorizationError("Insufficient permissions")
    }

    next()
  }
}

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuth = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next()
  }

  const token = authHeader.substring(7)
  const userService = new UserService()

  try {
    const decoded = userService.verifyToken(token)
    const user = await userService.findById(decoded.id)

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    }
  } catch {
    // Ignore errors for optional auth
  }

  next()
})

/**
 * Admin only middleware
 */
export const adminOnly = authorize("admin")

/**
 * Teacher or Admin middleware
 */
export const teacherOrAdmin = authorize("teacher", "admin")

/**
 * Check if user is the owner of a resource or admin
 */
export const ownerOrAdmin = (getResourceOwnerId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError("Authentication required")
    }

    const resourceOwnerId = getResourceOwnerId(req)
    const isOwner = req.user.id === resourceOwnerId
    const isAdmin = req.user.role === "admin"

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError("You can only access your own resources")
    }

    next()
  }
}
