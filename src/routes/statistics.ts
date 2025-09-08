import { Router } from "express"
import { StatisticsController } from "~/controllers/StatisticsController"
import { authenticate, adminOnly, teacherOrAdmin } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"
import Joi from "joi"

const router = Router()
const statisticsController = new StatisticsController()

// Apply authentication and input sanitization
router.use(authenticate)
router.use(sanitizeInput)

/**
 * @route GET /api/statistics/dashboard
 * @desc Get dashboard statistics
 * @access Admin only
 */
router.get("/dashboard", adminOnly, statisticsController.getDashboardStats)

/**
 * @route GET /api/statistics/my-performance
 * @desc Get current user's performance
 * @access Private
 */
router.get("/my-performance", statisticsController.getMyPerformance)

/**
 * @route GET /api/statistics/user/:id
 * @desc Get user performance statistics
 * @access Admin/Teacher
 */
router.get(
  "/user/:id",
  teacherOrAdmin,
  validate({ params: validationSchemas.params.id }),
  statisticsController.getUserPerformance
)

/**
 * @route GET /api/statistics/quiz/:id
 * @desc Get quiz analytics
 * @access Creator/Admin
 */
router.get("/quiz/:id", validate({ params: validationSchemas.params.id }), statisticsController.getQuizAnalytics)

/**
 * @route GET /api/statistics/system
 * @desc Get system-wide statistics
 * @access Admin only
 */
router.get("/system", adminOnly, statisticsController.getSystemStats)

/**
 * @route GET /api/statistics/popular
 * @desc Get popular content statistics
 * @access Public
 */
router.get(
  "/popular",
  validate({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
      timeframe: Joi.string().valid("week", "month", "year").default("week")
    })
  }),
  statisticsController.getPopularContent
)

/**
 * @route GET /api/statistics/export/:entity
 * @desc Export statistics
 * @access Admin only
 */
router.get(
  "/export/:entity",
  adminOnly,
  validate({
    params: Joi.object({
      entity: Joi.string().valid("users", "quizzes", "results").required()
    }),
    query: Joi.object({
      type: Joi.string().valid("json", "csv").default("json")
    })
  }),
  statisticsController.exportStats
)

export default router
