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
 * @route GET /api/users
 * @desc Get all users with pagination and filtering
 * @access Admin only
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
 * @route GET /api/users/stats
 * @desc Get user statistics
 * @access Admin only
 */
router.get("/stats", adminOnly, userController.getUserStats)

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Admin only
 */
router.get("/:id", adminOnly, validate({ params: validationSchemas.params.id }), userController.getUserById)

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Admin only
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
