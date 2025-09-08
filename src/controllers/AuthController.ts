import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { UserService } from "~/services/UserService"
import { OTPService } from "~/services/OTPService"
import { EmailService } from "~/services/EmailService"
import { ValidationError } from "~/utils/errors"
import { asyncHandler } from "~/utils/asyncHandler"

/**
 * Authentication controller
 */
export class AuthController extends BaseController {
  private userService: UserService
  private otpService: OTPService
  private emailService: EmailService

  constructor() {
    super()
    this.userService = new UserService()
    this.otpService = OTPService.getInstance()
    this.emailService = EmailService.getInstance()
  }

  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName, role } = req.body

    const user = await this.userService.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      role
    })

    // Generate tokens
    const token = this.userService.generateToken(user._id.toString())
    const refreshToken = this.userService.generateRefreshToken(user._id.toString())

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    this.sendCreated(res, "User registered successfully", {
      user,
      token
    })
  })

  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, password } = req.body

    const user = await this.userService.authenticateUser(identifier, password)

    // Generate tokens
    const token = this.userService.generateToken(user._id.toString())
    const refreshToken = this.userService.generateRefreshToken(user._id.toString())

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    this.sendSuccess(res, "Login successful", {
      user,
      token
    })
  })

  /**
   * Logout user
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Clear refresh token cookie
    res.clearCookie("refreshToken")

    this.sendSuccess(res, "Logout successful")
  })

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found",
        timestamp: new Date().toISOString()
      })
      return
    }

    try {
      // Verify refresh token
      const decoded = this.userService.verifyRefreshToken(refreshToken)

      // Get user
      const user = await this.userService.findById(decoded.id)

      if (!user || !user.isActive) {
        res.clearCookie("refreshToken")
        res.status(401).json({
          success: false,
          message: "Invalid refresh token",
          timestamp: new Date().toISOString()
        })
        return
      }

      // Generate new tokens
      const newToken = this.userService.generateToken(user._id.toString())
      const newRefreshToken = this.userService.generateRefreshToken(user._id.toString())

      // Set new refresh token cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      })

      this.sendSuccess(res, "Token refreshed successfully", {
        token: newToken
      })
    } catch {
      res.clearCookie("refreshToken")
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        timestamp: new Date().toISOString()
      })
    }
  })

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const user = await this.userService.findByIdOrThrow(userId)

    this.sendSuccess(res, "Profile retrieved successfully", user)
  })

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { firstName, lastName, avatar } = req.body

    const user = await this.userService.updateProfile(userId, {
      firstName,
      lastName,
      avatar
    })

    this.sendSuccess(res, "Profile updated successfully", user)
  })

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { currentPassword, newPassword } = req.body

    await this.userService.changePassword(userId, currentPassword, newPassword)

    this.sendSuccess(res, "Password changed successfully")
  })

  /**
   * Request password reset (send OTP)
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body

    await this.otpService.generatePasswordResetOTP(email)

    this.sendSuccess(res, "OTP sent to your email for password reset")
  })

  /**
   * Verify OTP and get reset token
   */
  verifyResetOTP = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body

    const resetToken = await this.otpService.verifyPasswordResetOTP(email, otp)

    this.sendSuccess(res, "OTP verified successfully", { resetToken })
  })

  /**
   * Reset password with token
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { resetToken, newPassword } = req.body

    await this.userService.resetPasswordWithToken(resetToken, newPassword)

    this.sendSuccess(res, "Password reset successfully")
  })

  /**
   * Send email verification OTP
   */
  sendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body

    await this.otpService.generateEmailVerificationOTP(email)

    this.sendSuccess(res, "Verification OTP sent to your email")
  })

  /**
   * Verify email with OTP
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body

    await this.otpService.verifyEmailWithOTP(email, otp)

    this.sendSuccess(res, "Email verified successfully")
  })

  /**
   * Resend verification email
   */
  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const user = await this.userService.findByIdOrThrow(userId)

    if (user.emailVerified) {
      throw new ValidationError("Email is already verified")
    }

    await this.otpService.generateEmailVerificationOTP(user.email)

    this.sendSuccess(res, "Verification OTP resent successfully")
  })

  /**
   * Update user preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const preferences = req.body

    const user = await this.userService.updatePreferences(userId, preferences)

    this.sendSuccess(res, "Preferences updated successfully", user.preferences)
  })

  /**
   * Get user dashboard
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)

    const dashboard = await this.userService.getUserDashboard(userId)

    this.sendSuccess(res, "Dashboard data retrieved successfully", dashboard)
  })
}
