import { Router } from "express"
import { QuizController } from "~/controllers/QuizController"
import { authenticate, teacherOrAdmin, optionalAuth, uploadMultiple } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"
import Joi from "joi"

const router = Router()
const quizController = new QuizController()

// Apply input sanitization
router.use(sanitizeInput)

/**
 * @route GET /api/quizzes/popular-categories
 * @desc Get popular quiz categories
 * @access Public
 */
router.get(
  "/popular-categories",
  validate({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  quizController.getPopularCategories
)

/**
 * @route GET /api/quizzes/recommendations
 * @desc Get quiz recommendations
 * @access Public
 */
router.get(
  "/recommendations",
  validate({
    query: Joi.object({
      difficulty: Joi.string().valid("easy", "medium", "hard"),
      categories: Joi.string(), // Comma-separated list
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  quizController.getRecommendations
)

/**
 * @route GET /api/quizzes
 * @desc Get all quizzes with filtering and pagination
 * @access Public (with optional auth for personalization)
 */
router.get("/", optionalAuth, validate({ query: validationSchemas.quiz.query }), quizController.getQuizzes)

/**
 * @route POST /api/quizzes
 * @desc Create a new quiz
 * @access Teacher or Admin
 */
router.post(
  "/",
  authenticate,
  teacherOrAdmin,
  validate({ body: validationSchemas.quiz.create }),
  quizController.createQuiz
)

/**
 * @route GET /api/quizzes/my
 * @desc Get current user's quizzes
 * @access Teacher or Admin
 */
router.get(
  "/my",
  authenticate,
  teacherOrAdmin,
  validate({ query: validationSchemas.pagination }),
  quizController.getMyQuizzes
)

/**
 * @route GET /api/quizzes/:id
 * @desc Get quiz by ID (for taking - without answers)
 * @access Public
 */
router.get("/:id", validate({ params: validationSchemas.params.id }), quizController.getQuiz)

/**
 * @route GET /api/quizzes/:id/answers
 * @desc Get quiz by ID with answers (for creators/admins)
 * @access Private (creator or admin only)
 */
router.get(
  "/:id/answers",
  authenticate,
  validate({ params: validationSchemas.params.id }),
  quizController.getQuizWithAnswers
)

/**
 * @route PUT /api/quizzes/:id
 * @desc Update quiz
 * @access Private (creator or admin only)
 */
router.put(
  "/:id",
  authenticate,
  validate({
    params: validationSchemas.params.id,
    body: validationSchemas.quiz.update
  }),
  quizController.updateQuiz
)

/**
 * @route DELETE /api/quizzes/:id
 * @desc Delete quiz
 * @access Private (creator or admin only)
 */
router.delete("/:id", authenticate, validate({ params: validationSchemas.params.id }), quizController.deleteQuiz)

/**
 * @route PATCH /api/quizzes/:id/status
 * @desc Toggle quiz status (activate/deactivate)
 * @access Private (creator or admin only)
 */
router.patch(
  "/:id/status",
  authenticate,
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      isActive: Joi.boolean().required()
    })
  }),
  quizController.toggleQuizStatus
)

/**
 * @route GET /api/quizzes/:id/stats
 * @desc Get quiz statistics
 * @access Private (creator or admin only)
 */
router.get("/:id/stats", authenticate, validate({ params: validationSchemas.params.id }), quizController.getQuizStats)

/**
 * @route POST /api/quizzes/upload-images
 * @desc Upload question images
 * @access Teacher or Admin
 */
router.post(
  "/upload-images",
  authenticate,
  teacherOrAdmin,
  uploadMultiple("images", 10),
  quizController.uploadQuestionImages
)

/**
 * @route DELETE /api/quizzes/images/:filename
 * @desc Delete uploaded image
 * @access Teacher or Admin
 */
router.delete(
  "/images/:filename",
  authenticate,
  teacherOrAdmin,
  validate({
    params: Joi.object({
      filename: Joi.string().required()
    })
  }),
  quizController.deleteQuestionImage
)

export default router
