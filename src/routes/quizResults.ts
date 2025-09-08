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
 * @swagger
 * /api/quiz-results/submit:
 *   post:
 *     summary: Submit quiz answers
 *     description: Submit completed quiz answers for grading
 *     tags: [Quiz Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: Quiz ID
 *                 example: "507f1f77bcf86cd799439011"
 *               answers:
 *                 type: object
 *                 description: Question answers (questionIndex -> selectedOptionIndex)
 *                 example: {"0": 1, "1": 0, "2": 3}
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Quiz start time
 *                 example: "2024-01-01T10:00:00Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: Quiz end time
 *                 example: "2024-01-01T10:30:00Z"
 *               attemptNumber:
 *                 type: integer
 *                 minimum: 1
 *                 description: Attempt number
 *                 example: 1
 *             required:
 *               - quizId
 *               - answers
 *               - startTime
 *               - endTime
 *               - attemptNumber
 *     responses:
 *       201:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         result:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             score:
 *                               type: number
 *                             totalPoints:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                             timeSpent:
 *                               type: integer
 *                             passed:
 *                               type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/quiz-results/my:
 *   get:
 *     summary: Get my quiz results
 *     description: Retrieve quiz results for the authenticated user
 *     tags: [Quiz Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: quizId
 *         in: query
 *         description: Filter by specific quiz
 *         required: false
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Quiz results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizResult'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
