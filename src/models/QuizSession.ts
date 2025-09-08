import mongoose, { Document, Schema, Model } from "mongoose"

/**
 * Quiz session participant interface
 */
export interface IQuizSessionParticipant {
  userId: mongoose.Types.ObjectId
  joinedAt: Date
  status: "waiting" | "active" | "completed" | "disconnected" | "kicked"
  currentQuestion: number
  answers: Record<string, number>
  score: number
  timeSpent: number
  isReady: boolean
}

/**
 * Quiz session interface for real-time multiplayer quizzes
 */
export interface IQuizSession extends Document {
  _id: mongoose.Types.ObjectId

  // Session details
  sessionCode: string // 6-digit code for joining
  quizId: mongoose.Types.ObjectId
  hostId: mongoose.Types.ObjectId
  title: string
  description?: string

  // Session settings
  maxParticipants: number
  isPrivate: boolean
  requiresApproval: boolean
  allowLateJoin: boolean
  showLeaderboard: boolean
  showAnswersAfterEachQuestion: boolean

  // Timing
  questionTimeLimit: number // seconds per question
  breakTimeBetweenQuestions: number // seconds
  sessionStartTime?: Date
  sessionEndTime?: Date
  currentQuestionStartTime?: Date

  // State
  status: "waiting" | "starting" | "in_progress" | "paused" | "completed" | "cancelled"
  currentQuestionIndex: number
  totalQuestions: number

  // Participants
  participants: IQuizSessionParticipant[]
  waitingList: mongoose.Types.ObjectId[]
  kickedUsers: mongoose.Types.ObjectId[]

  // Real-time data
  leaderboard: Array<{
    userId: mongoose.Types.ObjectId
    username: string
    score: number
    correctAnswers: number
    averageTime: number
    position: number
  }>

  // Question results (after each question)
  questionResults: Array<{
    questionIndex: number
    correctAnswer: number
    participantAnswers: Record<
      string,
      {
        answer: number
        timeSpent: number
        isCorrect: boolean
      }
    >
    statistics: {
      totalResponses: number
      correctResponses: number
      averageTime: number
      answerDistribution: Record<string, number>
    }
  }>

  // Chat and interaction
  chatEnabled: boolean
  chatMessages: Array<{
    userId: mongoose.Types.ObjectId
    username: string
    message: string
    timestamp: Date
    type: "message" | "system" | "reaction"
  }>

  // Session settings
  settings: {
    autoAdvanceQuestions: boolean
    showParticipantCount: boolean
    allowParticipantChat: boolean
    showCorrectAnswerImmediately: boolean
    playSound: boolean
    backgroundMusic: boolean
    customBackground?: string
    theme: "default" | "dark" | "colorful" | "minimal"
  }

  createdAt: Date
  updatedAt: Date

  // Instance methods
  generateSessionCode(): string
  addParticipant(userId: string): boolean
  removeParticipant(userId: string): void
  startSession(): void
  nextQuestion(): void
  pauseSession(): void
  resumeSession(): void
  endSession(): void
  updateLeaderboard(): void
  broadcastToParticipants(event: string, data: unknown): void
  getSessionStats(): Record<string, unknown>
}

/**
 * Quiz session schema
 */
const quizSessionSchema = new Schema<IQuizSession>(
  {
    // Session details
    sessionCode: {
      type: String,
      required: true,
      unique: true,
      length: 6,
      uppercase: true
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Title must be less than 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description must be less than 300 characters"]
    },

    // Session settings
    maxParticipants: {
      type: Number,
      default: 50,
      min: [1, "Max participants must be at least 1"],
      max: [500, "Max participants cannot exceed 500"]
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    allowLateJoin: {
      type: Boolean,
      default: true
    },
    showLeaderboard: {
      type: Boolean,
      default: true
    },
    showAnswersAfterEachQuestion: {
      type: Boolean,
      default: true
    },

    // Timing
    questionTimeLimit: {
      type: Number,
      default: 30,
      min: [5, "Question time limit must be at least 5 seconds"],
      max: [300, "Question time limit cannot exceed 300 seconds"]
    },
    breakTimeBetweenQuestions: {
      type: Number,
      default: 5,
      min: [0, "Break time cannot be negative"],
      max: [60, "Break time cannot exceed 60 seconds"]
    },
    sessionStartTime: {
      type: Date
    },
    sessionEndTime: {
      type: Date
    },
    currentQuestionStartTime: {
      type: Date
    },

    // State
    status: {
      type: String,
      enum: ["waiting", "starting", "in_progress", "paused", "completed", "cancelled"],
      default: "waiting"
    },
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      required: true
    },

    // Participants
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["waiting", "active", "completed", "disconnected", "kicked"],
          default: "waiting"
        },
        currentQuestion: { type: Number, default: 0 },
        answers: { type: Schema.Types.Mixed, default: {} },
        score: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 },
        isReady: { type: Boolean, default: false }
      }
    ],
    waitingList: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    kickedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // Real-time data
    leaderboard: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        username: { type: String, required: true },
        score: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
        position: { type: Number, default: 0 }
      }
    ],

    // Question results
    questionResults: [
      {
        questionIndex: { type: Number, required: true },
        correctAnswer: { type: Number, required: true },
        participantAnswers: { type: Schema.Types.Mixed, default: {} },
        statistics: {
          totalResponses: { type: Number, default: 0 },
          correctResponses: { type: Number, default: 0 },
          averageTime: { type: Number, default: 0 },
          answerDistribution: { type: Schema.Types.Mixed, default: {} }
        }
      }
    ],

    // Chat and interaction
    chatEnabled: {
      type: Boolean,
      default: true
    },
    chatMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        username: { type: String, required: true },
        message: { type: String, required: true, maxlength: 500 },
        timestamp: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ["message", "system", "reaction"],
          default: "message"
        }
      }
    ],

    // Session settings
    settings: {
      autoAdvanceQuestions: { type: Boolean, default: true },
      showParticipantCount: { type: Boolean, default: true },
      allowParticipantChat: { type: Boolean, default: true },
      showCorrectAnswerImmediately: { type: Boolean, default: true },
      playSound: { type: Boolean, default: true },
      backgroundMusic: { type: Boolean, default: false },
      customBackground: { type: String },
      theme: {
        type: String,
        enum: ["default", "dark", "colorful", "minimal"],
        default: "default"
      }
    }
  },
  {
    timestamps: true,
    collection: "quiz_sessions"
  }
)

// Indexes
quizSessionSchema.index({ sessionCode: 1 })
quizSessionSchema.index({ hostId: 1 })
quizSessionSchema.index({ quizId: 1 })
quizSessionSchema.index({ status: 1 })
quizSessionSchema.index({ createdAt: -1 })

// Instance method to generate session code
quizSessionSchema.methods.generateSessionCode = function (): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  this.sessionCode = result
  return result
}

// Instance method to add participant
quizSessionSchema.methods.addParticipant = function (userId: string): boolean {
  // Check if session is full
  if (this.participants.length >= this.maxParticipants) {
    if (!this.waitingList.includes(userId)) {
      this.waitingList.push(userId)
    }
    return false
  }

  // Check if user is already a participant
  const existingParticipant = this.participants.find((p: IQuizSessionParticipant) => p.userId.toString() === userId)

  if (existingParticipant) {
    existingParticipant.status = "active"
    return true
  }

  // Add new participant
  this.participants.push({
    userId: new mongoose.Types.ObjectId(userId),
    joinedAt: new Date(),
    status: "waiting",
    currentQuestion: 0,
    answers: {},
    score: 0,
    timeSpent: 0,
    isReady: false
  })

  return true
}

// Instance method to remove participant
quizSessionSchema.methods.removeParticipant = function (userId: string): void {
  this.participants = this.participants.filter((p: IQuizSessionParticipant) => p.userId.toString() !== userId)

  // Move someone from waiting list if there's space
  if (this.waitingList.length > 0 && this.participants.length < this.maxParticipants) {
    const nextUserId = this.waitingList.shift()
    if (nextUserId) {
      this.addParticipant(nextUserId.toString())
    }
  }
}

// Instance method to start session
quizSessionSchema.methods.startSession = function (): void {
  this.status = "in_progress"
  this.sessionStartTime = new Date()
  this.currentQuestionStartTime = new Date()

  // Mark all participants as active
  this.participants.forEach((p: IQuizSessionParticipant) => {
    if (p.status === "waiting") {
      p.status = "active"
    }
  })
}

// Instance method to move to next question
quizSessionSchema.methods.nextQuestion = function (): void {
  if (this.currentQuestionIndex < this.totalQuestions - 1) {
    this.currentQuestionIndex += 1
    this.currentQuestionStartTime = new Date()
  } else {
    this.endSession()
  }
}

// Instance method to pause session
quizSessionSchema.methods.pauseSession = function (): void {
  if (this.status === "in_progress") {
    this.status = "paused"
  }
}

// Instance method to resume session
quizSessionSchema.methods.resumeSession = function (): void {
  if (this.status === "paused") {
    this.status = "in_progress"
    this.currentQuestionStartTime = new Date()
  }
}

// Instance method to end session
quizSessionSchema.methods.endSession = function (): void {
  this.status = "completed"
  this.sessionEndTime = new Date()

  // Mark all active participants as completed
  this.participants.forEach((p: IQuizSessionParticipant) => {
    if (p.status === "active") {
      p.status = "completed"
    }
  })

  this.updateLeaderboard()
}

// Instance method to update leaderboard
quizSessionSchema.methods.updateLeaderboard = function (): void {
  const sortedParticipants = this.participants
    .filter((p: IQuizSessionParticipant) => p.status === "active" || p.status === "completed")
    .sort((a: IQuizSessionParticipant, b: IQuizSessionParticipant) => {
      if (b.score !== a.score) return b.score - a.score
      return a.timeSpent - b.timeSpent // Faster time wins on tie
    })

  this.leaderboard = sortedParticipants.map((p: IQuizSessionParticipant, index: number) => ({
    userId: p.userId,
    username: "", // Will be populated by populate
    score: p.score,
    correctAnswers: Object.keys(p.answers).length,
    averageTime: p.timeSpent / Math.max(1, Object.keys(p.answers).length),
    position: index + 1
  }))
}

// Instance method to broadcast to participants (placeholder for WebSocket)
quizSessionSchema.methods.broadcastToParticipants = function (event: string, data: unknown): void {
  // This will be implemented with WebSocket
  console.log(`Broadcasting ${event} to ${this.participants.length} participants:`, data)
}

// Instance method to get session statistics
quizSessionSchema.methods.getSessionStats = function (): Record<string, unknown> {
  const activeParticipants = this.participants.filter(
    (p: IQuizSessionParticipant) => p.status === "active" || p.status === "completed"
  )

  return {
    totalParticipants: this.participants.length,
    activeParticipants: activeParticipants.length,
    completedParticipants: this.participants.filter((p: IQuizSessionParticipant) => p.status === "completed").length,
    averageScore:
      activeParticipants.length > 0
        ? activeParticipants.reduce((sum: number, p: IQuizSessionParticipant) => sum + p.score, 0) /
          activeParticipants.length
        : 0,
    progress: Math.round((this.currentQuestionIndex / this.totalQuestions) * 100),
    duration: this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000) : 0
  }
}

// Pre-save middleware to generate session code
quizSessionSchema.pre<IQuizSession>("save", function (next) {
  if (this.isNew && !this.sessionCode) {
    this.generateSessionCode()
  }
  next()
})

// Transform output
quizSessionSchema.set("toJSON", {
  transform: function (doc, ret) {
    ;(ret as unknown as Record<string, unknown>).id = ret._id
    delete (ret as unknown as Record<string, unknown>)._id
    delete (ret as unknown as Record<string, unknown>).__v
    return ret
  }
})

/**
 * Quiz session model
 */
export const QuizSession: Model<IQuizSession> = mongoose.model<IQuizSession>("QuizSession", quizSessionSchema)
