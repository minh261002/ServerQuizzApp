import express, { Application } from "express"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import { Database } from "~/utils/database"
import { ENV } from "~/constants"
import {
  corsOptions,
  helmetConfig,
  compressionConfig,
  rateLimiter,
  requestLogger,
  securityHeaders,
  errorHandler,
  notFoundHandler,
  i18nMiddleware
} from "~/middlewares"
import routes from "~/routes"
import path from "path"
import "~/utils/i18n" // Initialize i18n
import swaggerUi from "swagger-ui-express"
import swaggerSpecs from "~/config/swagger"

/**
 * Express application class
 */
export class App {
  public app: Application
  private database: Database

  constructor() {
    this.app = express()
    this.database = Database.getInstance()
    this.initializeMiddlewares()
    this.initializeRoutes()
    this.initializeErrorHandling()
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmetConfig)
    this.app.use(corsOptions)
    this.app.use(securityHeaders)

    // Compression middleware
    this.app.use(compressionConfig)

    // Rate limiting
    this.app.use(rateLimiter)

    // Body parsing middlewares
    this.app.use(express.json({ limit: "10mb" }))
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }))
    this.app.use(cookieParser())

    // i18n middleware (before logging to get language in logs)
    this.app.use(i18nMiddleware)

    // Logging middlewares
    if (ENV.NODE_ENV === "development") {
      this.app.use(morgan("dev"))
    } else {
      this.app.use(morgan("combined"))
    }
    this.app.use(requestLogger)

    // Trust proxy (for rate limiting and real IP detection)
    this.app.set("trust proxy", 1)

    this.app.use(express.static(path.join(__dirname, "../public")))

    // Serve uploaded images
    this.app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")))
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Swagger documentation
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpecs, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Quiz App API Documentation"
      })
    )

    // API routes
    this.app.use("/api", routes)

    // Root route
    this.app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Quiz App API Server",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
          health: "/api/health",
          auth: "/api/auth",
          users: "/api/users",
          quizzes: "/api/quizzes",
          quizResults: "/api/quiz-results",
          quizAttempts: "/api/quiz-attempts",
          statistics: "/api/statistics"
        },
        documentation: "/api-docs"
      })
    })
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler)

    // Global error handler
    this.app.use(errorHandler)
  }

  /**
   * Connect to database
   */
  public async connectDatabase(): Promise<void> {
    await this.database.connect()
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectDatabase()

      // Start server
      this.app.listen(ENV.PORT, () => {
        console.log(`
🚀 Server started successfully!
📊 Environment: ${ENV.NODE_ENV}
🌐 Server running on: http://${ENV.HOST}:${ENV.PORT}
📝 API Documentation: http://${ENV.HOST}:${ENV.PORT}/api-docs
        `)
      })
    } catch (error) {
      console.error("❌ Failed to start server:", error)
      process.exit(1)
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log("🛑 Shutting down server...")

    try {
      await this.database.disconnect()
      console.log("✅ Server shut down gracefully")
      process.exit(0)
    } catch (error) {
      console.error("❌ Error during shutdown:", error)
      process.exit(1)
    }
  }
}
