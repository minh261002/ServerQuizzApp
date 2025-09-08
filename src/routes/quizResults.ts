import { Router } from "express"
import { QuizResultController } from "~/controllers/QuizResultController"
import { authenticate, teacherOrAdmin } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"
import Joi from "joi"

const router = Router()
const quizResultController = new QuizResultController()

// Apply authentication and input sanitization
router.use(authenticate)
router.use(sanitizeInput)

/**
 * @route POST /api/quiz-results/submit
 * @desc Submit quiz answers
 * @access Private
 */
router.post(
  "/submit",
  validate({
    body: Joi.object({
      quizId: validationSchemas.objectId,
      answers: Joi.object().pattern(Joi.string(), Joi.number().integer().min(0)).required(),
      startTime: Joi.date().required(),
      endTime: Joi.date().required(),
      attemptNumber: Joi.number().integer().min(1).required()
    })
  }),
  quizResultController.submitQuiz
)

/**
 * @route GET /api/quiz-results/my
 * @desc Get current user's quiz results
 * @access Private
 */
router.get("/my", validate({ query: validationSchemas.pagination }), quizResultController.getUserResults)

/**
 * @route GET /api/quiz-results/quiz/:id
 * @desc Get results for a specific quiz
 * @access Teacher/Admin
 */
router.get(
  "/quiz/:id",
  teacherOrAdmin,
  validate({
    params: validationSchemas.params.id,
    query: validationSchemas.pagination.keys({
      userId: validationSchemas.objectId.optional(),
      minScore: Joi.number().min(0).max(100),
      maxScore: Joi.number().min(0).max(100)
    })
  }),
  quizResultController.getQuizResults
)

/**
 * @route GET /api/quiz-results/:id/detailed
 * @desc Get detailed result with explanations
 * @access Private
 */
router.get("/:id/detailed", validate({ params: validationSchemas.params.id }), quizResultController.getDetailedResult)

/**
 * @route POST /api/quiz-results/:id/feedback
 * @desc Add feedback to quiz result
 * @access Teacher/Admin
 */
router.post(
  "/:id/feedback",
  teacherOrAdmin,
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      feedback: Joi.string().max(1000).required()
    })
  }),
  quizResultController.addFeedback
)

/**
 * @route GET /api/quiz-results/best/:quizId
 * @desc Get user's best attempt for a quiz
 * @access Private
 */
router.get(
  "/best/:quizId",
  validate({ params: Joi.object({ quizId: validationSchemas.objectId }) }),
  quizResultController.getBestAttempt
)

/**
 * @route GET /api/quiz-results/leaderboard/:id
 * @desc Get quiz leaderboard
 * @access Public
 */
router.get(
  "/leaderboard/:id",
  validate({
    params: validationSchemas.params.id,
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10)
    })
  }),
  quizResultController.getLeaderboard
)

/**
 * @route GET /api/quiz-results/stats/:id
 * @desc Get quiz results statistics
 * @access Teacher/Admin
 */
router.get(
  "/stats/:id",
  teacherOrAdmin,
  validate({ params: validationSchemas.params.id }),
  quizResultController.getResultsStats
)

export default router
