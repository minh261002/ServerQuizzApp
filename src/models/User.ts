import mongoose, { Document, Schema, Model } from "mongoose"
import bcrypt from "bcryptjs"
import { BCRYPT, COLLECTIONS } from "~/constants"

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User unique identifier
 *           example: "507f1f77bcf86cd799439011"
 *         username:
 *           type: string
 *           description: Unique username
 *           example: "johndoe"
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *           example: "john@example.com"
 *         firstName:
 *           type: string
 *           description: User first name
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: User last name
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: [admin, teacher, student]
 *           description: User role
 *           example: "student"
 *         isActive:
 *           type: boolean
 *           description: User active status
 *           example: true
 *         avatar:
 *           type: string
 *           description: URL to user avatar image
 *           example: "/uploads/images/avatar-123456789.jpg"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User date of birth
 *           example: "1990-01-01"
 *         phoneNumber:
 *           type: string
 *           description: User phone number
 *           example: "+1234567890"
 *         bio:
 *           type: string
 *           description: User biography
 *           example: "Software developer passionate about education"
 *         emailVerified:
 *           type: boolean
 *           description: Email verification status
 *           example: true
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *           example: "2024-01-01T12:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *           example: "2024-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: User last update timestamp
 *           example: "2024-01-01T12:00:00Z"
 *         stats:
 *           type: object
 *           properties:
 *             totalQuizzesTaken:
 *               type: integer
 *               example: 15
 *             totalQuizzesCreated:
 *               type: integer
 *               example: 5
 *             averageScore:
 *               type: number
 *               example: 85.5
 *             totalTimeSpent:
 *               type: integer
 *               description: Total time spent in minutes
 *               example: 240
 *       required:
 *         - username
 *         - email
 *         - firstName
 *         - lastName
 *         - role
 *
 *     UserInput:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: "^[a-zA-Z0-9]+$"
 *           example: "johndoe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"
 *           description: Must contain at least one uppercase letter, one lowercase letter, and one number
 *           example: "Password123"
 *         firstName:
 *           type: string
 *           maxLength: 50
 *           example: "John"
 *         lastName:
 *           type: string
 *           maxLength: 50
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: [admin, teacher, student]
 *           default: student
 *           example: "student"
 *       required:
 *         - username
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 */

/**
 * User interface
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: "admin" | "teacher" | "student"
  isActive: boolean
  avatar?: string
  dateOfBirth?: Date
  phoneNumber?: string
  bio?: string

  // Password reset fields
  resetPasswordToken?: string
  resetPasswordExpires?: Date

  // Email verification
  emailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date

  // OTP fields
  otpCode?: string
  otpExpires?: Date
  otpAttempts: number

  // Login tracking
  lastLogin?: Date
  loginAttempts: number
  lockUntil?: Date

  // Preferences
  preferences: {
    language: string
    timezone: string
    emailNotifications: boolean
    pushNotifications: boolean
    theme: "light" | "dark" | "auto"
  }

  // Statistics
  stats: {
    totalQuizzesTaken: number
    totalQuizzesCreated: number
    averageScore: number
    totalTimeSpent: number // in minutes
  }

  createdAt: Date
  updatedAt: Date

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>
  getFullName(): string
  generatePasswordResetToken(): string
  generateEmailVerificationToken(): string
  generateOTP(): string
  isLocked(): boolean
  incLoginAttempts(): Promise<void>
  resetLoginAttempts(): Promise<void>
}

/**
 * User schema
 */
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username must be less than 30 characters"],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name must be less than 50 characters"]
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name must be less than 50 characters"]
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "student"],
      default: "student"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    avatar: {
      type: String,
      default: null
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^[+]?[1-9][\d\s\-()]+$/, "Please provide a valid phone number"],
      default: null
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio must be less than 500 characters"],
      default: null
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },

    // OTP fields
    otpCode: {
      type: String,
      select: false
    },
    otpExpires: {
      type: Date,
      select: false
    },
    otpAttempts: {
      type: Number,
      default: 0
    },

    // Login tracking
    lastLogin: {
      type: Date,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      select: false
    },

    // Preferences
    preferences: {
      language: {
        type: String,
        default: "en",
        enum: ["en", "vi", "fr", "es", "de", "ja", "ko", "zh"]
      },
      timezone: {
        type: String,
        default: "UTC"
      },
      emailNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto"
      }
    },

    // Statistics
    stats: {
      totalQuizzesTaken: {
        type: Number,
        default: 0
      },
      totalQuizzesCreated: {
        type: Number,
        default: 0
      },
      averageScore: {
        type: Number,
        default: 0
      },
      totalTimeSpent: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS
  }
)

// Indexes
userSchema.index({ role: 1 })

// Pre-save middleware to hash password
userSchema.pre<IUser>("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next()

  try {
    // Hash the password with cost of BCRYPT_SALT_ROUNDS
    this.password = await bcrypt.hash(this.password, BCRYPT.SALT_ROUNDS)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Instance method to get full name
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`
}

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function (): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto")
  const resetToken = crypto.randomBytes(32).toString("hex")

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  return resetToken
}

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function (): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto")
  const verificationToken = crypto.randomBytes(32).toString("hex")

  this.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex")
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  return verificationToken
}

// Generate OTP
userSchema.methods.generateOTP = function (): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP

  this.otpCode = otp
  this.otpExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  this.otpAttempts = 0

  return otp
}

// Check if account is locked
userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > Date.now())
}

// Increment login attempts
userSchema.methods.incLoginAttempts = async function (): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    })
  }

  const updates: Record<string, unknown> = { $inc: { loginAttempts: 1 } }

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }
  }

  return this.updateOne(updates)
}

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  })
}

// Transform output
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    ;(ret as unknown as Record<string, unknown>).id = ret._id
    delete (ret as unknown as Record<string, unknown>)._id
    delete (ret as unknown as Record<string, unknown>).__v
    delete (ret as unknown as Record<string, unknown>).password
    return ret
  }
})

/**
 * User model
 */
export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema)
