import crypto from "crypto"
import { User } from "~/models/User"
import { UserService } from "./UserService"
import { EmailService } from "./EmailService"
import { AuthenticationError, ValidationError } from "~/utils/errors"

/**
 * OTP service class for handling one-time passwords
 */
export class OTPService {
  private userService: UserService
  private emailService: EmailService
  private static instance: OTPService

  private constructor() {
    this.userService = new UserService()
    this.emailService = EmailService.getInstance()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService()
    }
    return OTPService.instance
  }

  /**
   * Generate and send OTP for password reset
   */
  async generatePasswordResetOTP(email: string): Promise<void> {
    // Find user by email
    const user = await this.userService.findOne({ email })

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated")
    }

    // Check if too many OTP attempts
    if (user.otpAttempts >= 5) {
      throw new ValidationError("Too many OTP attempts. Please try again later.")
    }

    // Generate OTP
    const otp = user.generateOTP()
    await user.save()

    // Send OTP via email
    await this.emailService.sendOTP(user.email, otp, user.getFullName())
  }

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOTP(email: string, otp: string): Promise<string> {
    // Find user by email
    const user = await User.findOne({ email }).select("+otpCode +otpExpires +otpAttempts")

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    // Check if OTP exists and not expired
    if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      throw new ValidationError("OTP has expired. Please request a new one.")
    }

    // Check OTP attempts
    if (user.otpAttempts >= 5) {
      throw new ValidationError("Too many OTP attempts. Please request a new OTP.")
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      user.otpAttempts += 1
      await user.save()
      throw new ValidationError("Invalid OTP")
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken()

    // Clear OTP fields
    user.otpCode = undefined
    user.otpExpires = undefined
    user.otpAttempts = 0

    await user.save()

    return resetToken
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select("+resetPasswordToken +resetPasswordExpires")

    if (!user) {
      throw new ValidationError("Invalid or expired reset token")
    }

    // Update password
    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    // Reset login attempts
    await user.resetLoginAttempts()

    await user.save()
  }

  /**
   * Generate and send email verification OTP
   */
  async generateEmailVerificationOTP(email: string): Promise<void> {
    // Find user by email
    const user = await this.userService.findOne({ email })

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (user.emailVerified) {
      throw new ValidationError("Email is already verified")
    }

    // Generate OTP
    const otp = user.generateOTP()
    await user.save()

    // Send OTP via email
    await this.emailService.sendOTP(user.email, otp, user.getFullName())
  }

  /**
   * Verify email with OTP
   */
  async verifyEmailWithOTP(email: string, otp: string): Promise<void> {
    // Find user by email
    const user = await User.findOne({ email }).select("+otpCode +otpExpires +otpAttempts")

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new ValidationError("Email is already verified")
    }

    // Check if OTP exists and not expired
    if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      throw new ValidationError("OTP has expired. Please request a new one.")
    }

    // Check OTP attempts
    if (user.otpAttempts >= 5) {
      throw new ValidationError("Too many OTP attempts. Please request a new OTP.")
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      user.otpAttempts += 1
      await user.save()
      throw new ValidationError("Invalid OTP")
    }

    // Mark email as verified
    user.emailVerified = true
    user.otpCode = undefined
    user.otpExpires = undefined
    user.otpAttempts = 0

    await user.save()
  }

  /**
   * Generate and send login OTP (for 2FA)
   */
  async generateLoginOTP(email: string): Promise<void> {
    // Find user by email
    const user = await this.userService.findOne({ email })

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated")
    }

    if (user.isLocked()) {
      throw new AuthenticationError("Account is temporarily locked")
    }

    // Generate OTP
    const otp = user.generateOTP()
    await user.save()

    // Send OTP via email
    await this.emailService.sendOTP(user.email, otp, user.getFullName())
  }

  /**
   * Verify login OTP
   */
  async verifyLoginOTP(email: string, otp: string): Promise<{ valid: boolean; user?: unknown }> {
    // Find user by email
    const user = await User.findOne({ email }).select("+otpCode +otpExpires +otpAttempts")

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    // Check if OTP exists and not expired
    if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      throw new ValidationError("OTP has expired. Please request a new one.")
    }

    // Check OTP attempts
    if (user.otpAttempts >= 5) {
      throw new ValidationError("Too many OTP attempts. Please request a new OTP.")
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      user.otpAttempts += 1
      await user.save()
      throw new ValidationError("Invalid OTP")
    }

    // Clear OTP fields and reset login attempts
    user.otpCode = undefined
    user.otpExpires = undefined
    user.otpAttempts = 0
    user.lastLogin = new Date()

    await user.resetLoginAttempts()
    await user.save()

    // Remove sensitive fields
    user.password = undefined as unknown as string

    return { valid: true, user: user as unknown }
  }

  /**
   * Clean expired OTPs (should be run periodically)
   */
  async cleanExpiredOTPs(): Promise<void> {
    await User.updateMany(
      {
        otpExpires: { $lt: new Date() }
      },
      {
        $unset: {
          otpCode: 1,
          otpExpires: 1
        },
        $set: {
          otpAttempts: 0
        }
      }
    )
  }
}
