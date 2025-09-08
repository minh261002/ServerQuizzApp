import mongoose, { Document, Schema, Model } from "mongoose"

/**
 * Quiz attempt interface
 */
export interface IQuizAttempt extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  quizId: mongoose.Types.ObjectId

  // Attempt details
  attemptNumber: number
  status: "started" | "in_progress" | "paused" | "completed" | "submitted" | "abandoned" | "expired"

  // Time tracking
  startedAt: Date
  lastActiveAt: Date
  pausedAt?: Date
  completedAt?: Date
  submittedAt?: Date
  timeSpent: number // in seconds
  remainingTime: number // in seconds

  // Progress tracking
  currentQuestionIndex: number
  totalQuestions: number
  answeredQuestions: number[]
  flaggedQuestions: number[]
  skippedQuestions: number[]

  // Answers (temporary storage during attempt)
  currentAnswers: Record<
    string,
    {
      selectedAnswer?: number
      timeSpent: number
      isMarkedForReview: boolean
      lastModified: Date
    }
  >

  // Browser and device info
  browserInfo: {
    userAgent: string
    platform: string
    language: string
    screenResolution: string
    timezone: string
  }

  // Security and monitoring
  tabSwitchCount: number
  suspiciousActivity: Array<{
    type: "tab_switch" | "copy_paste" | "right_click" | "dev_tools" | "window_blur" | "fullscreen_exit"
    timestamp: Date
    details?: string
  }>

  // IP tracking for security
  ipAddress: string
  location?: {
    country: string
    city: string
    latitude: number
    longitude: number
  }

  createdAt: Date
  updatedAt: Date

  // Instance methods
  pause(): void
  resume(): void
  markQuestionForReview(questionIndex: number): void
  unmarkQuestionForReview(questionIndex: number): void
  saveAnswer(questionIndex: number, answer: number): void
  calculateProgress(): number
  addSuspiciousActivity(type: string, details?: string): void
}

/**
 * Quiz attempt schema
 */
const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true
    },

    // Attempt details
    attemptNumber: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["started", "in_progress", "paused", "completed", "submitted", "abandoned", "expired"],
      default: "started"
    },

    // Time tracking
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    pausedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    submittedAt: {
      type: Date
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingTime: {
      type: Number,
      required: true,
      min: 0
    },

    // Progress tracking
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1
    },
    answeredQuestions: {
      type: [Number],
      default: []
    },
    flaggedQuestions: {
      type: [Number],
      default: []
    },
    skippedQuestions: {
      type: [Number],
      default: []
    },

    // Answers (temporary storage during attempt)
    currentAnswers: {
      type: Schema.Types.Mixed,
      default: {}
    },

    // Browser and device info
    browserInfo: {
      userAgent: { type: String, required: true },
      platform: { type: String, required: true },
      language: { type: String, required: true },
      screenResolution: { type: String, required: true },
      timezone: { type: String, required: true }
    },

    // Security and monitoring
    tabSwitchCount: {
      type: Number,
      default: 0
    },
    suspiciousActivity: [
      {
        type: {
          type: String,
          enum: ["tab_switch", "copy_paste", "right_click", "dev_tools", "window_blur", "fullscreen_exit"],
          required: true
        },
        timestamp: {
          type: Date,
          required: true,
          default: Date.now
        },
        details: String
      }
    ],

    // IP tracking for security
    ipAddress: {
      type: String,
      required: true
    },
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number
    }
  },
  {
    timestamps: true,
    collection: "quiz_attempts"
  }
)

// Indexes
quizAttemptSchema.index({ userId: 1, quizId: 1 })
quizAttemptSchema.index({ userId: 1, status: 1 })
quizAttemptSchema.index({ quizId: 1, status: 1 })
quizAttemptSchema.index({ status: 1, updatedAt: -1 })
quizAttemptSchema.index({ startedAt: -1 })

// Instance method to pause attempt
quizAttemptSchema.methods.pause = function (): void {
  if (this.status === "in_progress") {
    this.status = "paused"
    this.pausedAt = new Date()
  }
}

// Instance method to resume attempt
quizAttemptSchema.methods.resume = function (): void {
  if (this.status === "paused") {
    this.status = "in_progress"
    this.lastActiveAt = new Date()
    this.pausedAt = undefined
  }
}

// Instance method to mark question for review
quizAttemptSchema.methods.markQuestionForReview = function (questionIndex: number): void {
  if (!this.flaggedQuestions.includes(questionIndex)) {
    this.flaggedQuestions.push(questionIndex)
  }
}

// Instance method to unmark question for review
quizAttemptSchema.methods.unmarkQuestionForReview = function (questionIndex: number): void {
  this.flaggedQuestions = this.flaggedQuestions.filter((index: number) => index !== questionIndex)
}

// Instance method to save answer
quizAttemptSchema.methods.saveAnswer = function (questionIndex: number, answer: number): void {
  const questionId = questionIndex.toString()

  if (!this.currentAnswers[questionId]) {
    this.currentAnswers[questionId] = {
      timeSpent: 0,
      isMarkedForReview: false,
      lastModified: new Date()
    }
  }

  this.currentAnswers[questionId].selectedAnswer = answer
  this.currentAnswers[questionId].lastModified = new Date()

  // Add to answered questions if not already there
  if (!this.answeredQuestions.includes(questionIndex)) {
    this.answeredQuestions.push(questionIndex)
  }

  // Remove from skipped questions if it was there
  this.skippedQuestions = this.skippedQuestions.filter((index: number) => index !== questionIndex)

  this.lastActiveAt = new Date()
}

// Instance method to calculate progress
quizAttemptSchema.methods.calculateProgress = function (): number {
  return Math.round((this.answeredQuestions.length / this.totalQuestions) * 100)
}

// Instance method to add suspicious activity
quizAttemptSchema.methods.addSuspiciousActivity = function (type: string, details?: string): void {
  this.suspiciousActivity.push({
    type,
    timestamp: new Date(),
    details
  })

  if (type === "tab_switch") {
    this.tabSwitchCount += 1
  }
}

// Pre-save middleware to update lastActiveAt
quizAttemptSchema.pre<IQuizAttempt>("save", function (next) {
  if (this.isModified("currentAnswers") || this.isModified("currentQuestionIndex")) {
    this.lastActiveAt = new Date()
  }
  next()
})

// Transform output
quizAttemptSchema.set("toJSON", {
  transform: function (doc, ret) {
    ;(ret as unknown as Record<string, unknown>).id = ret._id
    delete (ret as unknown as Record<string, unknown>)._id
    delete (ret as unknown as Record<string, unknown>).__v
    return ret
  }
})

/**
 * Quiz attempt model
 */
export const QuizAttempt: Model<IQuizAttempt> = mongoose.model<IQuizAttempt>("QuizAttempt", quizAttemptSchema)
