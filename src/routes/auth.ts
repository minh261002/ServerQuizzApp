import { Router } from "express"
import Joi from "joi"
import { AuthController } from "~/controllers/AuthController"
import { UserController } from "~/controllers/UserController"
import { authenticate, authRateLimiter, uploadSingle } from "~/middlewares"
import { validate, validationSchemas, sanitizeInput } from "~/middlewares/validation"

const router = Router()
const authController = new AuthController()
const userController = new UserController()

// Apply rate limiting to auth routes
router.use(authRateLimiter)

// Apply input sanitization
router.use(sanitizeInput)

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email verification
 *     tags: [Authentication]
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT access token
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/register", validate({ body: validationSchemas.user.register }), authController.register)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email address
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "Password123"
 *             required:
 *               - identifier
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT access token
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       423:
 *         description: Account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", validate({ body: validationSchemas.user.login }), authController.login)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout the authenticated user and invalidate tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/logout", authenticate, authController.logout)

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (requires refresh token in cookie)
 */
router.post("/refresh", authController.refreshToken)

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LanguageHeader'
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/profile", authenticate, authController.getProfile)

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     tags: [Authentication]
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
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Doe"
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: "/uploads/images/avatar-123456789.jpg"
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 */
router.put(
  "/profile",
  authenticate,
  validate({ body: validationSchemas.user.updateProfile }),
  authController.updateProfile
)

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     description: Change the authenticated user's password
 *     tags: [Authentication]
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
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"
 *                 description: New password (must contain uppercase, lowercase, and number)
 *                 example: "NewPassword123"
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  "/change-password",
  authenticate,
  validate({ body: validationSchemas.user.changePassword }),
  authController.changePassword
)

/**
 * @route POST /api/auth/request-reset
 * @desc Request password reset (send OTP)
 * @access Public
 */
router.post(
  "/request-reset",
  validate({
    body: Joi.object({
      email: Joi.string().email().required()
    })
  }),
  authController.requestPasswordReset
)

/**
 * @route POST /api/auth/verify-reset-otp
 * @desc Verify OTP and get reset token
 * @access Public
 */
router.post(
  "/verify-reset-otp",
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).required()
    })
  }),
  authController.verifyResetOTP
)

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post(
  "/reset-password",
  validate({
    body: Joi.object({
      resetToken: Joi.string().required(),
      newPassword: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)")).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      })
    })
  }),
  authController.resetPassword
)

/**
 * @route POST /api/auth/send-verification
 * @desc Send email verification OTP
 * @access Public
 */
router.post(
  "/send-verification",
  validate({
    body: Joi.object({
      email: Joi.string().email().required()
    })
  }),
  authController.sendEmailVerification
)

/**
 * @route POST /api/auth/verify-email
 * @desc Verify email with OTP
 * @access Public
 */
router.post(
  "/verify-email",
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).required()
    })
  }),
  authController.verifyEmail
)

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend verification email
 * @access Private
 */
router.post("/resend-verification", authenticate, authController.resendVerification)

/**
 * @route PUT /api/auth/preferences
 * @desc Update user preferences
 * @access Private
 */
router.put(
  "/preferences",
  authenticate,
  validate({
    body: Joi.object({
      language: Joi.string().valid("en", "vi", "fr", "es", "de", "ja", "ko", "zh"),
      timezone: Joi.string(),
      emailNotifications: Joi.boolean(),
      pushNotifications: Joi.boolean(),
      theme: Joi.string().valid("light", "dark", "auto")
    }).min(1)
  }),
  authController.updatePreferences
)

/**
 * @route GET /api/auth/dashboard
 * @desc Get user dashboard
 * @access Private
 */
router.get("/dashboard", authenticate, authController.getDashboard)

/**
 * @swagger
 * /api/auth/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload an avatar image for the authenticated user
 *     tags: [Authentication, Upload]
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
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPG, PNG, GIF, WebP, SVG - max 5MB)
 *             required:
 *               - avatar
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
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
 *                         avatar:
 *                           type: string
 *                           example: "/uploads/images/avatar-123456789.jpg"
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: No avatar uploaded or invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/upload-avatar", authenticate, uploadSingle("avatar"), userController.uploadAvatar)

/**
 * @route DELETE /api/auth/avatar
 * @desc Delete user avatar
 * @access Private
 */
router.delete("/avatar", authenticate, userController.deleteAvatar)

export default router
