import { Request, Response, NextFunction } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import cors from "cors"
import compression from "compression"
import { RATE_LIMIT, CORS_CONFIG } from "~/constants"

/**
 * Security middleware configuration
 */

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Stricter rate limiting for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
})

// CORS configuration
export const corsOptions = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    const allowedOrigins = CORS_CONFIG.ORIGIN.split(",").map((o) => o.trim())

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
})

// Helmet security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
})

// Compression middleware
export const compressionConfig = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6,
  threshold: 1024
})

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    const { method, url, ip } = req
    const { statusCode } = res

    console.log(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`)
  })

  next()
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By")

  // Add custom security headers
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("X-XSS-Protection", "1; mode=block")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

  next()
}
