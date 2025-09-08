import mongoose, { Document, Schema, Model } from "mongoose"
import { COLLECTIONS } from "~/constants"

/**
 * @swagger
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       properties:
 *         question:
 *           type: string
 *           maxLength: 500
 *           description: Question text
 *           example: "What is the capital of France?"
 *         image:
 *           type: string
 *           maxLength: 255
 *           description: URL to question image
 *           example: "/uploads/images/question-123456789.jpg"
 *         options:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 2
 *           maxItems: 6
 *           description: Answer options
 *           example: ["Paris", "London", "Berlin", "Madrid"]
 *         correctAnswer:
 *           type: integer
 *           minimum: 0
 *           description: Index of correct answer (0-based)
 *           example: 0
 *         explanation:
 *           type: string
 *           maxLength: 300
 *           description: Explanation for the correct answer
 *           example: "Paris is the capital and largest city of France"
 *         points:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 1
 *           description: Points awarded for correct answer
 *           example: 5
 *       required:
 *         - question
 *         - options
 *         - correctAnswer
 *         - points
 *
 *     Quiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Quiz unique identifier
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Quiz title
 *           example: "Geography Quiz"
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Quiz description
 *           example: "Test your knowledge of world geography"
 *         createdBy:
 *           type: string
 *           description: ID of user who created the quiz
 *           example: "507f1f77bcf86cd799439012"
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Question'
 *           description: Array of quiz questions
 *         timeLimit:
 *           type: integer
 *           minimum: 1
 *           maximum: 300
 *           description: Time limit in minutes
 *           example: 30
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           default: medium
 *           description: Quiz difficulty level
 *           example: "medium"
 *         category:
 *           type: string
 *           maxLength: 50
 *           description: Quiz category
 *           example: "Geography"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           description: Quiz tags
 *           example: ["geography", "world", "capitals"]
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Quiz active status
 *           example: true
 *         isPublished:
 *           type: boolean
 *           default: false
 *           description: Quiz published status
 *           example: true
 *         totalPoints:
 *           type: integer
 *           description: Total points for the quiz
 *           example: 50
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Quiz creation timestamp
 *           example: "2024-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Quiz last update timestamp
 *           example: "2024-01-01T12:00:00Z"
 *       required:
 *         - title
 *         - description
 *         - questions
 *         - timeLimit
 *         - category
 */

/**
 * Question interface
 */
export interface IQuestion {
  question: string
  image?: string // URL or filename of the question image
  options: string[]
  correctAnswer: number
  explanation?: string
  points: number
}

/**
 * Quiz interface
 */
export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description: string
  createdBy: mongoose.Types.ObjectId
  questions: IQuestion[]

  // Time settings
  timeLimit: number // in minutes
  timePerQuestion?: number // in seconds, if set, overrides timeLimit
  showTimer: boolean
  allowPause: boolean
  autoSubmit: boolean // auto submit when time expires

  // Display settings
  questionsPerPage: number
  showProgressBar: boolean
  allowBackNavigation: boolean
  randomizeQuestions: boolean
  randomizeOptions: boolean

  // Attempt settings
  maxAttempts: number
  attemptsUsed: number
  allowRetake: boolean
  retakeDelay: number // in hours
  passingScore: number // percentage

  // Availability settings
  isActive: boolean
  isPublished: boolean
  availableFrom?: Date
  availableTo?: Date
  timezone: string

  // Access control
  accessType: "public" | "private" | "password" | "invitation"
  password?: string
  allowedUsers: mongoose.Types.ObjectId[]
  blockedUsers: mongoose.Types.ObjectId[]

  // Content settings
  difficulty: "easy" | "medium" | "hard"
  category: string
  tags: string[]
  language: string

  // Results and feedback
  showResultsImmediately: boolean
  showCorrectAnswers: boolean
  showExplanations: boolean
  showScoreBreakdown: boolean
  allowReviewAnswers: boolean
  customSuccessMessage?: string
  customFailureMessage?: string

  // Security settings
  preventCheating: boolean
  fullscreenMode: boolean
  disableRightClick: boolean
  disableCopyPaste: boolean
  shuffleAnswers: boolean
  showOneQuestionAtTime: boolean
  lockdownBrowser: boolean
  proctoring: {
    enabled: boolean
    recordVideo: boolean
    recordAudio: boolean
    recordScreen: boolean
    faceDetection: boolean
    multipleFaceDetection: boolean
    noiseDetection: boolean
  }

  // Grading and scoring
  totalPoints: number
  gradingMethod: "automatic" | "manual" | "mixed"
  pointsDistribution: "equal" | "weighted" | "custom"
  negativeMarking: boolean
  negativeMarkingValue: number // points to deduct for wrong answers

  // Analytics and statistics
  stats: {
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    averageTimeSpent: number
    passRate: number
    mostDifficultQuestion: number
    easiestQuestion: number
  }

  // Notifications
  notifications: {
    emailOnCompletion: boolean
    emailOnFailure: boolean
    emailToInstructor: boolean
    reminderEmails: boolean
    reminderDays: number[]
  }

  // Collaboration
  collaborators: Array<{
    userId: mongoose.Types.ObjectId
    role: "editor" | "viewer" | "grader"
    permissions: string[]
  }>

  // Versioning
  version: number
  parentQuizId?: mongoose.Types.ObjectId
  isTemplate: boolean

  createdAt: Date
  updatedAt: Date

  // Instance methods
  calculateTotalPoints(): number
  isAvailableNow(): boolean
  canUserAccess(userId: string): boolean
  canUserRetake(userId: string, attemptCount: number): boolean
  getTimeRemaining(): number
  clone(): Promise<IQuiz>
}

/**
 * Question schema
 */
const questionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
    maxlength: [500, "Question must be less than 500 characters"]
  },
  image: {
    type: String,
    trim: true,
    maxlength: [255, "Image URL must be less than 255 characters"]
  },
  options: {
    type: [String],
    required: [true, "Options are required"],
    validate: {
      validator: function (options: string[]) {
        return options.length >= 2 && options.length <= 6
      },
      message: "A question must have between 2 and 6 options"
    }
  },
  correctAnswer: {
    type: Number,
    required: [true, "Correct answer index is required"],
    validate: {
      validator: function (this: IQuestion, value: number) {
        return value >= 0 && value < this.options.length
      },
      message: "Correct answer index must be within the options range"
    }
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [300, "Explanation must be less than 300 characters"]
  },
  points: {
    type: Number,
    required: [true, "Points are required"],
    min: [1, "Points must be at least 1"],
    max: [100, "Points cannot exceed 100"],
    default: 1
  }
})

/**
 * Quiz schema
 */
const quizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: [100, "Title must be less than 100 characters"]
    },
    description: {
      type: String,
      required: [true, "Quiz description is required"],
      trim: true,
      maxlength: [500, "Description must be less than 500 characters"]
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"]
    },
    questions: {
      type: [questionSchema],
      required: [true, "Questions are required"],
      validate: {
        validator: function (questions: IQuestion[]) {
          return questions.length > 0
        },
        message: "Quiz must have at least one question"
      }
    },
    // Time settings
    timeLimit: {
      type: Number,
      required: [true, "Time limit is required"],
      min: [1, "Time limit must be at least 1 minute"],
      max: [300, "Time limit cannot exceed 300 minutes"]
    },
    timePerQuestion: {
      type: Number,
      min: [10, "Time per question must be at least 10 seconds"],
      max: [3600, "Time per question cannot exceed 1 hour"]
    },
    showTimer: {
      type: Boolean,
      default: true
    },
    allowPause: {
      type: Boolean,
      default: false
    },
    autoSubmit: {
      type: Boolean,
      default: true
    },

    // Display settings
    questionsPerPage: {
      type: Number,
      default: 1,
      min: [1, "Questions per page must be at least 1"],
      max: [50, "Questions per page cannot exceed 50"]
    },
    showProgressBar: {
      type: Boolean,
      default: true
    },
    allowBackNavigation: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    },

    // Attempt settings
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, "Max attempts must be at least 1"],
      max: [10, "Max attempts cannot exceed 10"]
    },
    attemptsUsed: {
      type: Number,
      default: 0
    },
    allowRetake: {
      type: Boolean,
      default: true
    },
    retakeDelay: {
      type: Number,
      default: 0,
      min: [0, "Retake delay cannot be negative"]
    },
    passingScore: {
      type: Number,
      default: 60,
      min: [0, "Passing score cannot be negative"],
      max: [100, "Passing score cannot exceed 100"]
    },

    // Availability settings
    isActive: {
      type: Boolean,
      default: true
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    availableFrom: {
      type: Date
    },
    availableTo: {
      type: Date
    },
    timezone: {
      type: String,
      default: "UTC"
    },

    // Access control
    accessType: {
      type: String,
      enum: ["public", "private", "password", "invitation"],
      default: "public"
    },
    password: {
      type: String,
      select: false
    },
    allowedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [50, "Category must be less than 50 characters"]
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10
        },
        message: "Quiz cannot have more than 10 tags"
      }
    },
    language: {
      type: String,
      default: "en",
      enum: ["en", "vi", "fr", "es", "de", "ja", "ko", "zh"]
    },

    // Results and feedback
    showResultsImmediately: {
      type: Boolean,
      default: true
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    showExplanations: {
      type: Boolean,
      default: true
    },
    showScoreBreakdown: {
      type: Boolean,
      default: true
    },
    allowReviewAnswers: {
      type: Boolean,
      default: true
    },
    customSuccessMessage: {
      type: String,
      maxlength: [500, "Success message must be less than 500 characters"]
    },
    customFailureMessage: {
      type: String,
      maxlength: [500, "Failure message must be less than 500 characters"]
    },

    // Security settings
    preventCheating: {
      type: Boolean,
      default: false
    },
    fullscreenMode: {
      type: Boolean,
      default: false
    },
    disableRightClick: {
      type: Boolean,
      default: false
    },
    disableCopyPaste: {
      type: Boolean,
      default: false
    },
    shuffleAnswers: {
      type: Boolean,
      default: false
    },
    showOneQuestionAtTime: {
      type: Boolean,
      default: false
    },
    lockdownBrowser: {
      type: Boolean,
      default: false
    },
    proctoring: {
      enabled: { type: Boolean, default: false },
      recordVideo: { type: Boolean, default: false },
      recordAudio: { type: Boolean, default: false },
      recordScreen: { type: Boolean, default: false },
      faceDetection: { type: Boolean, default: false },
      multipleFaceDetection: { type: Boolean, default: false },
      noiseDetection: { type: Boolean, default: false }
    },

    // Grading and scoring
    totalPoints: {
      type: Number,
      default: 0
    },
    gradingMethod: {
      type: String,
      enum: ["automatic", "manual", "mixed"],
      default: "automatic"
    },
    pointsDistribution: {
      type: String,
      enum: ["equal", "weighted", "custom"],
      default: "equal"
    },
    negativeMarking: {
      type: Boolean,
      default: false
    },
    negativeMarkingValue: {
      type: Number,
      default: 0,
      min: [0, "Negative marking value cannot be negative"]
    },

    // Analytics and statistics
    stats: {
      totalAttempts: { type: Number, default: 0 },
      completedAttempts: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 },
      mostDifficultQuestion: { type: Number, default: 0 },
      easiestQuestion: { type: Number, default: 0 }
    },

    // Notifications
    notifications: {
      emailOnCompletion: { type: Boolean, default: false },
      emailOnFailure: { type: Boolean, default: false },
      emailToInstructor: { type: Boolean, default: true },
      reminderEmails: { type: Boolean, default: false },
      reminderDays: { type: [Number], default: [] }
    },

    // Collaboration
    collaborators: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["editor", "viewer", "grader"], default: "viewer" },
        permissions: { type: [String], default: [] }
      }
    ],

    // Versioning
    version: {
      type: Number,
      default: 1
    },
    parentQuizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz"
    },
    isTemplate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: COLLECTIONS.QUIZZES
  }
)

// Indexes
quizSchema.index({ createdBy: 1 })
quizSchema.index({ category: 1 })
quizSchema.index({ difficulty: 1 })
quizSchema.index({ isActive: 1 })
quizSchema.index({ tags: 1 })
quizSchema.index({ createdAt: -1 })

// Pre-save middleware to calculate total points
quizSchema.pre<IQuiz>("save", function (next) {
  this.totalPoints = this.calculateTotalPoints()
  next()
})

// Instance method to calculate total points
quizSchema.methods.calculateTotalPoints = function (): number {
  return this.questions.reduce((total: number, question: IQuestion) => total + question.points, 0)
}

// Instance method to check if quiz is available now
quizSchema.methods.isAvailableNow = function (): boolean {
  const now = new Date()

  if (!this.isActive || !this.isPublished) {
    return false
  }

  if (this.availableFrom && now < this.availableFrom) {
    return false
  }

  if (this.availableTo && now > this.availableTo) {
    return false
  }

  return true
}

// Instance method to check if user can access quiz
quizSchema.methods.canUserAccess = function (userId: string): boolean {
  // Check if user is blocked
  if (this.blockedUsers.some((blockedId: mongoose.Types.ObjectId) => blockedId.toString() === userId)) {
    return false
  }

  // Check access type
  if (this.accessType === "private") {
    return this.allowedUsers.some((allowedId: mongoose.Types.ObjectId) => allowedId.toString() === userId)
  }

  if (this.accessType === "invitation") {
    return this.allowedUsers.some((allowedId: mongoose.Types.ObjectId) => allowedId.toString() === userId)
  }

  return true
}

// Instance method to check if user can retake quiz
quizSchema.methods.canUserRetake = function (userId: string, attemptCount: number): boolean {
  if (!this.allowRetake) {
    return attemptCount === 0
  }

  return attemptCount < this.maxAttempts
}

// Instance method to get time remaining for availability
quizSchema.methods.getTimeRemaining = function (): number {
  if (!this.availableTo) {
    return -1 // No time limit
  }

  const now = new Date()
  const timeRemaining = this.availableTo.getTime() - now.getTime()

  return Math.max(0, Math.floor(timeRemaining / 1000)) // Return seconds
}

// Instance method to clone quiz
quizSchema.methods.clone = async function (): Promise<IQuiz> {
  const clonedData = this.toObject()
  delete clonedData._id
  delete clonedData.createdAt
  delete clonedData.updatedAt

  clonedData.title = `${clonedData.title} (Copy)`
  clonedData.isPublished = false
  clonedData.attemptsUsed = 0
  clonedData.parentQuizId = this._id
  clonedData.version = 1
  clonedData.stats = {
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    averageTimeSpent: 0,
    passRate: 0,
    mostDifficultQuestion: 0,
    easiestQuestion: 0
  }

  const clonedQuiz = new (this.constructor as Model<IQuiz>)(clonedData)
  return await clonedQuiz.save()
}

// Transform output
quizSchema.set("toJSON", {
  transform: function (doc, ret) {
    ;(ret as unknown as Record<string, unknown>).id = ret._id
    delete (ret as unknown as Record<string, unknown>)._id
    delete (ret as unknown as Record<string, unknown>).__v
    return ret
  }
})

/**
 * Quiz model
 */
export const Quiz: Model<IQuiz> = mongoose.model<IQuiz>("Quiz", quizSchema)
