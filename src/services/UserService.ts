import jwt from "jsonwebtoken"
import { User, IUser } from "~/models/User"
import { Quiz } from "~/models/Quiz"
import { QuizResult } from "~/models/QuizResult"
import { BaseService } from "./BaseService"
import { JWT } from "~/constants"
import { AuthenticationError, ConflictError, ValidationError } from "~/utils/errors"

/**
 * User service class
 */
export class UserService extends BaseService<IUser> {
  constructor() {
    super(User)
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    role?: "admin" | "teacher" | "student"
  }): Promise<IUser> {
    // Check if user already exists
    const existingUser = await this.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    })

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new ConflictError("Email already exists")
      }
      if (existingUser.username === userData.username) {
        throw new ConflictError("username already exists")
      }
    }

    return await this.create(userData)
  }

  /**
   * Authenticate user with email/fullname and password
   */
  async authenticateUser(identifier: string, password: string): Promise<IUser> {
    // Find user by email or fullname
    const user = await this.model
      .findOne({
        $or: [{ email: identifier }, { fullname: identifier }]
      })
      .select("+password +loginAttempts +lockUntil")

    if (!user) {
      throw new AuthenticationError("Invalid credentials")
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated")
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError("Account is temporarily locked due to too many failed attempts")
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      await user.incLoginAttempts()
      throw new AuthenticationError("Invalid credentials")
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Remove password from response
    user.password = undefined as unknown as string
    return user
  }

  /**
   * Generate JWT token for user
   */
  generateToken(userId: string): string {
    return jwt.sign({ id: userId }, JWT.SECRET, {
      expiresIn: JWT.EXPIRES_IN
    } as jwt.SignOptions)
  }

  /**
   * Generate refresh token for user
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign({ id: userId }, JWT.REFRESH_SECRET, {
      expiresIn: JWT.REFRESH_EXPIRES_IN
    } as jwt.SignOptions)
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { id: string } {
    try {
      return jwt.verify(token, JWT.SECRET) as { id: string }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new AuthenticationError("Invalid token")
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { id: string } {
    try {
      return jwt.verify(token, JWT.REFRESH_SECRET) as { id: string }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new AuthenticationError("Invalid refresh token")
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: {
      firstName?: string
      lastName?: string
      avatar?: string
    }
  ): Promise<IUser> {
    return await this.updateByIdOrThrow(userId, updateData)
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.model.findOne({ _id: userId }).select("+password")
    if (!user) {
      throw new AuthenticationError("User not found")
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError("Current password is incorrect")
    }

    // Update password
    user.password = newPassword
    await user.save()
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsers(
    options: {
      page?: number
      limit?: number
      role?: string
      search?: string
      sort?: Record<string, 1 | -1>
    } = {}
  ) {
    const filter: Record<string, unknown> = {}

    // Filter by role
    if (options.role) {
      filter.role = options.role
    }

    // Search by name, fullname, or email
    if (options.search) {
      filter.$or = [
        { firstName: { $regex: options.search, $options: "i" } },
        { lastName: { $regex: options.search, $options: "i" } },
        { fullname: { $regex: options.search, $options: "i" } },
        { email: { $regex: options.search, $options: "i" } }
      ]
    }

    return await this.paginate(filter, {
      page: options.page,
      limit: options.limit,
      sort: options.sort || { createdAt: -1 }
    })
  }

  /**
   * Activate/Deactivate user
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<IUser> {
    return await this.updateByIdOrThrow(userId, { isActive })
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.findOne({ email })

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated")
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken()
    await user.save()

    return resetToken
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(resetToken: string, newPassword: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto")
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    const user = await this.model
      .findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      })
      .select("+resetPasswordToken +resetPasswordExpires")

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
   * Verify email with token
   */
  async verifyEmail(verificationToken: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto")
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex")

    const user = await this.model
      .findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
      })
      .select("+emailVerificationToken +emailVerificationExpires")

    if (!user) {
      throw new ValidationError("Invalid or expired verification token")
    }

    // Mark email as verified
    user.emailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined

    await user.save()
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<IUser["preferences"]>): Promise<IUser> {
    const user = await this.findByIdOrThrow(userId)

    user.preferences = {
      ...user.preferences,
      ...preferences
    }

    return await user.save()
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: string,
    stats: {
      quizCompleted?: boolean
      quizCreated?: boolean
      score?: number
      timeSpent?: number
    }
  ): Promise<void> {
    const user = await this.findByIdOrThrow(userId)

    if (stats.quizCompleted) {
      user.stats.totalQuizzesTaken += 1

      if (stats.score !== undefined) {
        // Recalculate average score
        const totalScore = user.stats.averageScore * (user.stats.totalQuizzesTaken - 1) + stats.score
        user.stats.averageScore = totalScore / user.stats.totalQuizzesTaken
      }
    }

    if (stats.quizCreated) {
      user.stats.totalQuizzesCreated += 1
    }

    if (stats.timeSpent !== undefined) {
      user.stats.totalTimeSpent += stats.timeSpent
    }

    await user.save()
  }

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId: string): Promise<{
    user: IUser
    recentQuizzes: unknown[]
    upcomingQuizzes: unknown[]
    achievements: unknown[]
    stats: IUser["stats"]
  }> {
    const user = await this.findByIdOrThrow(userId)

    // Get recent quiz results
    const recentResults = await QuizResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("quizId", "title category difficulty")

    // Get upcoming quizzes (if user is a student)
    const upcomingQuizzes = await Quiz.find({
      isActive: true,
      isPublished: true,
      availableFrom: { $lte: new Date() },
      $or: [{ availableTo: { $gte: new Date() } }, { availableTo: { $exists: false } }]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title category difficulty timeLimit totalPoints")

    return {
      user,
      recentQuizzes: recentResults,
      upcomingQuizzes,
      achievements: [], // Would come from achievements system
      stats: user.stats
    }
  }
}
