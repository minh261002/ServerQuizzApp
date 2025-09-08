import { Router } from "express"
import { UserController } from "~/controllers/UserController"
import { authenticate, adminOnly, uploadSingle } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"
import Joi from "joi"

const router = Router()
const userController = new UserController()

// Apply authentication to all routes
router.use(authenticate)

// Apply input sanitization
router.use(sanitizeInput)

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users with pagination and filtering (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: role
 *         in: query
 *         description: Filter by user role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [admin, teacher, student]
 *       - name: isActive
 *         in: query
 *         description: Filter by active status
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  "/",
  adminOnly,
  validate({
    query: validationSchemas.pagination.keys({
      role: Joi.string().valid("admin", "teacher", "student")
    })
  }),
  userController.getUsers
)

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieve overall user statistics (Admin only)
 *     tags: [Users, Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                         totalUsers:
 *                           type: integer
 *                           example: 1250
 *                         activeUsers:
 *                           type: integer
 *                           example: 1100
 *                         inactiveUsers:
 *                           type: integer
 *                           example: 150
 *                         usersByRole:
 *                           type: object
 *                           properties:
 *                             admin:
 *                               type: integer
 *                               example: 5
 *                             teacher:
 *                               type: integer
 *                               example: 45
 *                             student:
 *                               type: integer
 *                               example: 1200
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/stats", adminOnly, userController.getUserStats)

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Admin only
 */
router.get("/:id", adminOnly, validate({ params: validationSchemas.params.id }), userController.getUserById)

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update any user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: "^[a-zA-Z0-9]+$"
 *                 example: "johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Doe"
 *               role:
 *                 type: string
 *                 enum: [admin, teacher, student]
 *                 example: "student"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  "/:id",
  adminOnly,
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      username: Joi.string().alphanum().min(3).max(30),
      email: Joi.string().email(),
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      role: Joi.string().valid("admin", "teacher", "student"),
      isActive: Joi.boolean()
    }).min(1)
  }),
  userController.updateUser
)

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Admin only
 */
router.delete("/:id", adminOnly, validate({ params: validationSchemas.params.id }), userController.deleteUser)

/**
 * @route PATCH /api/users/:id/status
 * @desc Toggle user status (activate/deactivate)
 * @access Admin only
 */
router.patch(
  "/:id/status",
  adminOnly,
  validate({
    params: validationSchemas.params.id,
    body: Joi.object({
      isActive: Joi.boolean().required()
    })
  }),
  userController.toggleUserStatus
)

/**
 * @route POST /api/users/upload-avatar
 * @desc Upload user avatar
 * @access Private (authenticated users can upload their own avatar)
 */
router.post("/upload-avatar", uploadSingle("avatar"), userController.uploadAvatar)

/**
 * @route DELETE /api/users/avatar
 * @desc Delete user avatar
 * @access Private (authenticated users can delete their own avatar)
 */
router.delete("/avatar", userController.deleteAvatar)

export default router
