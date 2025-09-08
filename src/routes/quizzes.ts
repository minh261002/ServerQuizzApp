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
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get all quizzes
 *     description: Retrieve all published quizzes with filtering and pagination
 *     tags: [Quizzes]
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: category
 *         in: query
 *         description: Filter by category
 *         required: false
 *         schema:
 *           type: string
 *           example: "Geography"
 *       - name: difficulty
 *         in: query
 *         description: Filter by difficulty
 *         required: false
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - name: isActive
 *         in: query
 *         description: Filter by active status
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
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
 *                         $ref: '#/components/schemas/Quiz'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/", optionalAuth, validate({ query: validationSchemas.quiz.query }), quizController.getQuizzes)

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     description: Create a new quiz (Teacher or Admin only)
 *     tags: [Quizzes]
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
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Geography Quiz"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Test your knowledge of world geography"
 *               questions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Question'
 *                 minItems: 1
 *               timeLimit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 300
 *                 description: Time limit in minutes
 *                 example: 30
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 default: medium
 *                 example: "medium"
 *               category:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Geography"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["geography", "world"]
 *             required:
 *               - title
 *               - description
 *               - questions
 *               - timeLimit
 *               - category
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Quiz'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
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
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get quiz by ID
 *     description: Retrieve quiz details for taking (without answers)
 *     tags: [Quizzes]
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: Quiz ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Quiz'
 *                         - type: object
 *                           properties:
 *                             questions:
 *                               type: array
 *                               items:
 *                                 allOf:
 *                                   - $ref: '#/components/schemas/Question'
 *                                   - type: object
 *                                     properties:
 *                                       correctAnswer:
 *                                         description: "Hidden for quiz taking"
 *                                       explanation:
 *                                         description: "Hidden for quiz taking"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       403:
 *         description: Quiz not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/quizzes/upload-images:
 *   post:
 *     summary: Upload question images
 *     description: Upload images for quiz questions (Teacher or Admin only)
 *     tags: [Quizzes, Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Image files (JPG, PNG, GIF, WebP, SVG - max 5MB each)
 *             required:
 *               - images
 *     responses:
 *       200:
 *         description: Images uploaded successfully
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
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               filename:
 *                                 type: string
 *                                 example: "images-1699123456789-123456789.jpg"
 *                               originalname:
 *                                 type: string
 *                                 example: "question1.jpg"
 *                               url:
 *                                 type: string
 *                                 example: "/uploads/images/images-1699123456789-123456789.jpg"
 *                               mimetype:
 *                                 type: string
 *                                 example: "image/jpeg"
 *                               size:
 *                                 type: integer
 *                                 example: 1024567
 *       400:
 *         description: No images uploaded or invalid files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
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
