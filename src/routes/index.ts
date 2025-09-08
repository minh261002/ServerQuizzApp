import { Router } from "express"
import { Request, Response } from "express"
import authRoutes from "./auth"
import userRoutes from "./users"
import quizRoutes from "./quizzes"
import quizResultRoutes from "./quizResults"
import quizAttemptRoutes from "./quizAttempts"
import statisticsRoutes from "./statistics"

const router = Router()

// Health check route
router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  })
})

// API routes
router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/quizzes", quizRoutes)
router.use("/quiz-results", quizResultRoutes)
router.use("/quiz-attempts", quizAttemptRoutes)
router.use("/statistics", statisticsRoutes)

export default router
