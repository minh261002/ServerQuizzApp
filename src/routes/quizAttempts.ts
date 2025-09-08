import { Router } from "express"
import { QuizAttemptController } from "~/controllers/QuizAttemptController"
import { authenticate } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"
import Joi from "joi"

const router = Router()
const quizAttemptController = new QuizAttemptController()

// Apply authentication and input sanitization
router.use(authenticate)
router.use(sanitizeInput)

/**
 * @swagger
 * /api/quiz-attempts/start:
 *   post:
 *     summary: Start a new quiz attempt
 *     description: Begin a new quiz attempt and create session tracking
 *     tags: [Quiz Attempts]
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
 *                 description: Quiz ID to attempt
 *                 example: "507f1f77bcf86cd799439011"
 *               browserInfo:
 *                 type: object
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                     example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
 *                   platform:
 *                     type: string
 *                     example: "Win32"
 *                   language:
 *                     type: string
 *                     example: "en-US"
 *                   screenResolution:
 *                     type: string
 *                     example: "1920x1080"
 *                   timezone:
 *                     type: string
 *                     example: "Asia/Ho_Chi_Minh"
 *                 required:
 *                   - userAgent
 *                   - platform
 *                   - language
 *                   - screenResolution
 *                   - timezone
 *             required:
 *               - quizId
 *               - browserInfo
 *     responses:
 *       201:
 *         description: Quiz attempt started successfully
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
 *                         attemptId:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439014"
 *                         sessionId:
 *                           type: string
 *                           example: "sess_123456789"
 *                         quiz:
 *                           $ref: '#/components/schemas/Quiz'
 *                         timeRemaining:
 *                           type: integer
 *                           description: Time remaining in seconds
 *                           example: 1800
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Cannot start attempt (quiz not available, max attempts reached, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  "/start",
  validate({
    body: Joi.object({
      quizId: validationSchemas.objectId,
      browserInfo: Joi.object({
        userAgent: Joi.string().required(),
        platform: Joi.string().required(),
        language: Joi.string().required(),
        screenResolution: Joi.string().required(),
        timezone: Joi.string().required()
      }).required()
    })
  }),
  quizAttemptController.startAttempt
)

/**
 * @route POST /api/quiz-attempts/:id/answer
 * @desc Save answer for a question
 * @access Private
 */
router.post(
  "/:id/answer",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      questionIndex: Joi.number().integer().min(0).required(),
      answer: Joi.number().integer().min(0).required(),
      timeSpent: Joi.number().min(0).required()
    })
  }),
  quizAttemptController.saveAnswer
)

/**
 * @route POST /api/quiz-attempts/:id/navigate
 * @desc Navigate to a specific question
 * @access Private
 */
router.post(
  "/:id/navigate",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      questionIndex: Joi.number().integer().min(0).required()
    })
  }),
  quizAttemptController.navigateToQuestion
)

/**
 * @route POST /api/quiz-attempts/:id/pause
 * @desc Pause quiz attempt
 * @access Private
 */
router.post("/:id/pause", validate({ params: validationSchemas.params.id }), quizAttemptController.pauseAttempt)

/**
 * @route POST /api/quiz-attempts/:id/resume
 * @desc Resume quiz attempt
 * @access Private
 */
router.post("/:id/resume", validate({ params: validationSchemas.params.id }), quizAttemptController.resumeAttempt)

/**
 * @route POST /api/quiz-attempts/:id/submit
 * @desc Submit quiz attempt
 * @access Private
 */
router.post("/:id/submit", validate({ params: validationSchemas.params.id }), quizAttemptController.submitAttempt)

/**
 * @route POST /api/quiz-attempts/:id/mark-review
 * @desc Mark question for review
 * @access Private
 */
router.post(
  "/:id/mark-review",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      questionIndex: Joi.number().integer().min(0).required()
    })
  }),
  quizAttemptController.markForReview
)

/**
 * @route POST /api/quiz-attempts/:id/unmark-review
 * @desc Unmark question for review
 * @access Private
 */
router.post(
  "/:id/unmark-review",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      questionIndex: Joi.number().integer().min(0).required()
    })
  }),
  quizAttemptController.unmarkForReview
)

/**
 * @route POST /api/quiz-attempts/:id/activity
 * @desc Record suspicious activity
 * @access Private
 */
router.post(
  "/:id/activity",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      activityType: Joi.string()
        .valid("tab_switch", "copy_paste", "right_click", "dev_tools", "window_blur", "fullscreen_exit")
        .required(),
      details: Joi.string().optional()
    })
  }),
  quizAttemptController.recordActivity
)

/**
 * @route GET /api/quiz-attempts/active/:quizId
 * @desc Get active attempt for a quiz
 * @access Private
 */
router.get(
  "/active/:quizId",
  validate({ params: Joi.object({ quizId: validationSchemas.objectId }) }),
  quizAttemptController.getActiveAttempt
)

/**
 * @route GET /api/quiz-attempts/user/:quizId
 * @desc Get user's attempts for a quiz
 * @access Private
 */
router.get(
  "/user/:quizId",
  validate({ params: Joi.object({ quizId: validationSchemas.objectId }) }),
  quizAttemptController.getUserAttempts
)

/**
 * @route GET /api/quiz-attempts/:id
 * @desc Get attempt details
 * @access Private
 */
router.get("/:id", validate({ params: validationSchemas.params.id }), quizAttemptController.getAttemptDetails)

/**
 * @route PUT /api/quiz-attempts/:id/progress
 * @desc Update attempt progress (heartbeat)
 * @access Private
 */
router.put(
  "/:id/progress",
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      timeSpent: Joi.number().min(0).required(),
      remainingTime: Joi.number().min(0).required()
    })
  }),
  quizAttemptController.updateProgress
)

export default router
