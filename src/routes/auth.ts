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
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", validate({ body: validationSchemas.user.register }), authController.register)

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post("/login", validate({ body: validationSchemas.user.login }), authController.login)

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post("/logout", authenticate, authController.logout)

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (requires refresh token in cookie)
 */
router.post("/refresh", authController.refreshToken)

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get("/profile", authenticate, authController.getProfile)

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  "/profile",
  authenticate,
  validate({ body: validationSchemas.user.updateProfile }),
  authController.updateProfile
)

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
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
 * @route POST /api/auth/upload-avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post("/upload-avatar", authenticate, uploadSingle("avatar"), userController.uploadAvatar)

/**
 * @route DELETE /api/auth/avatar
 * @desc Delete user avatar
 * @access Private
 */
router.delete("/avatar", authenticate, userController.deleteAvatar)

export default router
