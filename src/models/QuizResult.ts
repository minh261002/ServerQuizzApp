import mongoose, { Document, Schema, Model } from "mongoose"
import { COLLECTIONS } from "~/constants"

/**
 * Answer interface for quiz result
 */
export interface IQuizAnswer {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
  timeSpent: number // in seconds
  pointsEarned: number
}

/**
 * @swagger
 * components:
 *   schemas:
 *     QuizResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Quiz result unique identifier
 *           example: "507f1f77bcf86cd799439011"
 *         userId:
 *           type: string
 *           description: ID of user who took the quiz
 *           example: "507f1f77bcf86cd799439012"
 *         quizId:
 *           type: string
 *           description: ID of the quiz
 *           example: "507f1f77bcf86cd799439013"
 *         attemptNumber:
 *           type: integer
 *           minimum: 1
 *           description: Attempt number for this user
 *           example: 1
 *         answers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionIndex:
 *                 type: integer
 *                 minimum: 0
 *                 description: Index of the question
 *                 example: 0
 *               selectedAnswer:
 *                 type: integer
 *                 minimum: 0
 *                 description: Index of selected answer
 *                 example: 1
 *               isCorrect:
 *                 type: boolean
 *                 description: Whether the answer is correct
 *                 example: true
 *               timeSpent:
 *                 type: integer
 *                 description: Time spent on this question in seconds
 *                 example: 30
 *               pointsAwarded:
 *                 type: number
 *                 description: Points awarded for this question
 *                 example: 5
 *         score:
 *           type: number
 *           description: Total score achieved
 *           example: 85
 *         totalPoints:
 *           type: number
 *           description: Maximum possible points
 *           example: 100
 *         percentage:
 *           type: number
 *           description: Score as percentage
 *           example: 85.0
 *         passed:
 *           type: boolean
 *           description: Whether the user passed the quiz
 *           example: true
 *         timeSpent:
 *           type: integer
 *           description: Total time spent in seconds
 *           example: 1800
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Quiz start time
 *           example: "2024-01-01T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Quiz completion time
 *           example: "2024-01-01T10:30:00Z"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Result submission timestamp
 *           example: "2024-01-01T10:30:05Z"
 *         user:
 *           $ref: '#/components/schemas/User'
 *         quiz:
 *           $ref: '#/components/schemas/Quiz'
 *       required:
 *         - userId
 *         - quizId
 *         - attemptNumber
 *         - answers
 *         - score
 *         - totalPoints
 *         - percentage
 *         - timeSpent
 *         - startTime
 *         - endTime
 */

/**
 * Quiz result interface
 */
export interface IQuizResult extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  quizId: mongoose.Types.ObjectId

  // Result details
  answers: IQuizAnswer[]
  totalScore: number
  maxScore: number
  percentage: number

  // Time tracking
  startTime: Date
  endTime: Date
  totalTimeSpent: number // in seconds

  // Status
  status: "in_progress" | "completed" | "abandoned" | "time_expired"
  isCompleted: boolean

  // Attempt tracking
  attemptNumber: number

  // Review and feedback
  feedback?: string
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date

  // Analytics
  analytics: {
    averageTimePerQuestion: number
    fastestQuestion: number // time in seconds
    slowestQuestion: number // time in seconds
    correctAnswersCount: number
    incorrectAnswersCount: number
    skippedAnswersCount: number
    difficultyBreakdown: {
      easy: { correct: number; total: number }
      medium: { correct: number; total: number }
      hard: { correct: number; total: number }
    }
  }

  createdAt: Date
  updatedAt: Date

  // Instance methods
  calculateScore(): void
  getGrade(): string
  getPerformanceLevel(): "excellent" | "good" | "average" | "poor"
}

/**
 * Quiz answer schema
 */
const quizAnswerSchema = new Schema<IQuizAnswer>({
  questionId: {
    type: String,
    required: true
  },
  selectedAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    required: true,
    min: 0
  }
})

/**
 * Quiz result schema
 */
const quizResultSchema = new Schema<IQuizResult>(
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

    // Result details
    answers: {
      type: [quizAnswerSchema],
      required: true
    },
    totalScore: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    // Time tracking
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    totalTimeSpent: {
      type: Number,
      required: true,
      min: 0
    },

    // Status
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned", "time_expired"],
      default: "in_progress"
    },
    isCompleted: {
      type: Boolean,
      default: false
    },

    // Attempt tracking
    attemptNumber: {
      type: Number,
      required: true,
      min: 1
    },

    // Review and feedback
    feedback: {
      type: String,
      maxlength: [1000, "Feedback must be less than 1000 characters"]
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },

    // Analytics
    analytics: {
      averageTimePerQuestion: {
        type: Number,
        default: 0
      },
      fastestQuestion: {
        type: Number,
        default: 0
      },
      slowestQuestion: {
        type: Number,
        default: 0
      },
      correctAnswersCount: {
        type: Number,
        default: 0
      },
      incorrectAnswersCount: {
        type: Number,
        default: 0
      },
      skippedAnswersCount: {
        type: Number,
        default: 0
      },
      difficultyBreakdown: {
        easy: {
          correct: { type: Number, default: 0 },
          total: { type: Number, default: 0 }
        },
        medium: {
          correct: { type: Number, default: 0 },
          total: { type: Number, default: 0 }
        },
        hard: {
          correct: { type: Number, default: 0 },
          total: { type: Number, default: 0 }
        }
      }
    }
  },
  {
    timestamps: true,
    collection: COLLECTIONS.RESULTS
  }
)

// Indexes
quizResultSchema.index({ userId: 1, quizId: 1 })
quizResultSchema.index({ userId: 1, createdAt: -1 })
quizResultSchema.index({ quizId: 1, createdAt: -1 })
quizResultSchema.index({ status: 1 })
quizResultSchema.index({ isCompleted: 1 })

// Instance method to calculate score
quizResultSchema.methods.calculateScore = function (): void {
  this.totalScore = this.answers.reduce((total: number, answer: IQuizAnswer) => total + answer.pointsEarned, 0)
  this.percentage = this.maxScore > 0 ? Math.round((this.totalScore / this.maxScore) * 100) : 0

  // Update analytics
  this.analytics.correctAnswersCount = this.answers.filter((answer: IQuizAnswer) => answer.isCorrect).length
  this.analytics.incorrectAnswersCount = this.answers.filter((answer: IQuizAnswer) => !answer.isCorrect).length
  this.analytics.averageTimePerQuestion = this.answers.length > 0 ? this.totalTimeSpent / this.answers.length : 0

  if (this.answers.length > 0) {
    const times = this.answers.map((answer: IQuizAnswer) => answer.timeSpent)
    this.analytics.fastestQuestion = Math.min(...times)
    this.analytics.slowestQuestion = Math.max(...times)
  }
}

// Instance method to get grade
quizResultSchema.methods.getGrade = function (): string {
  if (this.percentage >= 90) return "A"
  if (this.percentage >= 80) return "B"
  if (this.percentage >= 70) return "C"
  if (this.percentage >= 60) return "D"
  return "F"
}

// Instance method to get performance level
quizResultSchema.methods.getPerformanceLevel = function (): "excellent" | "good" | "average" | "poor" {
  if (this.percentage >= 90) return "excellent"
  if (this.percentage >= 75) return "good"
  if (this.percentage >= 60) return "average"
  return "poor"
}

// Pre-save middleware
quizResultSchema.pre<IQuizResult>("save", function (next) {
  if (this.isModified("answers") || this.isNew) {
    this.calculateScore()
  }
  next()
})

// Transform output
quizResultSchema.set("toJSON", {
  transform: function (doc, ret) {
    ;(ret as unknown as Record<string, unknown>).id = ret._id
    delete (ret as unknown as Record<string, unknown>)._id
    delete (ret as unknown as Record<string, unknown>).__v
    return ret
  }
})

/**
 * Quiz result model
 */
export const QuizResult: Model<IQuizResult> = mongoose.model<IQuizResult>("QuizResult", quizResultSchema)
