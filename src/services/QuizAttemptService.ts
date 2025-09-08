import mongoose from "mongoose"
import { QuizAttempt, IQuizAttempt } from "~/models/QuizAttempt"
import { Quiz } from "~/models/Quiz"
import { BaseService } from "./BaseService"
import { NotFoundError, ValidationError, AuthorizationError } from "~/utils/errors"

/**
 * Quiz attempt service class
 */
export class QuizAttemptService extends BaseService<IQuizAttempt> {
  constructor() {
    super(QuizAttempt)
  }

  /**
   * Start a new quiz attempt
   */
  async startQuizAttempt(data: {
    userId: string
    quizId: string
    browserInfo: {
      userAgent: string
      platform: string
      language: string
      screenResolution: string
      timezone: string
    }
    ipAddress: string
  }): Promise<IQuizAttempt> {
    // Get quiz
    const quiz = await Quiz.findById(data.quizId)
    if (!quiz) {
      throw new NotFoundError("Quiz not found")
    }

    // Check if quiz is available
    if (!quiz.isAvailableNow()) {
      throw new ValidationError("Quiz is not available")
    }

    // Check if user can access quiz
    if (!quiz.canUserAccess(data.userId)) {
      throw new AuthorizationError("You don't have access to this quiz")
    }

    // Check existing attempts
    const existingAttempts = await this.count({ userId: data.userId, quizId: data.quizId })

    // Check if user can retake
    if (!quiz.canUserRetake(data.userId, existingAttempts)) {
      throw new ValidationError("Maximum attempts reached for this quiz")
    }

    // Check for any incomplete attempts
    const incompleteAttempt = await this.findOne({
      userId: data.userId,
      quizId: data.quizId,
      status: { $in: ["started", "in_progress", "paused"] }
    })

    if (incompleteAttempt) {
      // Resume existing attempt
      incompleteAttempt.status = "in_progress"
      incompleteAttempt.lastActiveAt = new Date()
      return await incompleteAttempt.save()
    }

    // Calculate remaining time
    const timeLimit = quiz.timePerQuestion ? quiz.timePerQuestion * quiz.questions.length : quiz.timeLimit * 60 // Convert minutes to seconds

    // Create new attempt
    const attempt = await this.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      quizId: new mongoose.Types.ObjectId(data.quizId),
      attemptNumber: existingAttempts + 1,
      status: "started",
      startedAt: new Date(),
      lastActiveAt: new Date(),
      timeSpent: 0,
      remainingTime: timeLimit,
      currentQuestionIndex: 0,
      totalQuestions: quiz.questions.length,
      answeredQuestions: [],
      flaggedQuestions: [],
      skippedQuestions: [],
      currentAnswers: {},
      browserInfo: data.browserInfo,
      tabSwitchCount: 0,
      suspiciousActivity: [],
      ipAddress: data.ipAddress
    })

    return attempt
  }

  /**
   * Save answer for a question
   */
  async saveAnswer(attemptId: string, questionIndex: number, answer: number, timeSpent: number): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    if (attempt.status !== "in_progress" && attempt.status !== "started") {
      throw new ValidationError("Cannot save answer for inactive attempt")
    }

    // Update attempt status to in_progress if it was just started
    if (attempt.status === "started") {
      attempt.status = "in_progress"
    }

    // Save the answer
    attempt.saveAnswer(questionIndex, answer)

    // Update time spent for this question
    const questionId = questionIndex.toString()
    if (attempt.currentAnswers[questionId]) {
      attempt.currentAnswers[questionId].timeSpent = timeSpent
    }

    return await attempt.save()
  }

  /**
   * Navigate to next/previous question
   */
  async navigateToQuestion(attemptId: string, questionIndex: number): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    if (attempt.status !== "in_progress") {
      throw new ValidationError("Cannot navigate in inactive attempt")
    }

    if (questionIndex < 0 || questionIndex >= attempt.totalQuestions) {
      throw new ValidationError("Invalid question index")
    }

    attempt.currentQuestionIndex = questionIndex
    attempt.lastActiveAt = new Date()

    return await attempt.save()
  }

  /**
   * Pause quiz attempt
   */
  async pauseAttempt(attemptId: string): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    // Check if quiz allows pausing
    const quiz = await Quiz.findById(attempt.quizId)
    if (!quiz?.allowPause) {
      throw new ValidationError("Pausing is not allowed for this quiz")
    }

    attempt.pause()
    return await attempt.save()
  }

  /**
   * Resume quiz attempt
   */
  async resumeAttempt(attemptId: string): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    attempt.resume()
    return await attempt.save()
  }

  /**
   * Submit quiz attempt
   */
  async submitAttempt(attemptId: string): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    if (attempt.status === "completed" || attempt.status === "submitted") {
      throw new ValidationError("Attempt already submitted")
    }

    attempt.status = "completed"
    attempt.lastActiveAt = new Date()

    // Calculate total time spent
    const totalTime = Date.now() - attempt.startedAt.getTime()
    attempt.timeSpent = Math.floor(totalTime / 1000)

    return await attempt.save()
  }

  /**
   * Mark question for review
   */
  async markForReview(attemptId: string, questionIndex: number): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    attempt.markQuestionForReview(questionIndex)
    return await attempt.save()
  }

  /**
   * Unmark question for review
   */
  async unmarkForReview(attemptId: string, questionIndex: number): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    attempt.unmarkQuestionForReview(questionIndex)
    return await attempt.save()
  }

  /**
   * Record suspicious activity
   */
  async recordSuspiciousActivity(
    attemptId: string,
    activityType: "tab_switch" | "copy_paste" | "right_click" | "dev_tools" | "window_blur" | "fullscreen_exit",
    details?: string
  ): Promise<IQuizAttempt> {
    const attempt = await this.findByIdOrThrow(attemptId)

    attempt.addSuspiciousActivity(activityType, details)
    return await attempt.save()
  }

  /**
   * Get active attempt for user and quiz
   */
  async getActiveAttempt(userId: string, quizId: string): Promise<IQuizAttempt | null> {
    return await this.findOne(
      {
        userId,
        quizId,
        status: { $in: ["started", "in_progress", "paused"] }
      },
      "quizId"
    )
  }

  /**
   * Get user's attempts for a quiz
   */
  async getUserAttempts(userId: string, quizId: string): Promise<IQuizAttempt[]> {
    return await this.find(
      { userId, quizId },
      {
        sort: { attemptNumber: -1 },
        populate: "quizId"
      }
    )
  }

  /**
   * Auto-expire attempts that have exceeded time limit
   */
  async expireOverdueAttempts(): Promise<void> {
    const overdueAttempts = await QuizAttempt.aggregate([
      {
        $match: {
          status: { $in: ["started", "in_progress"] }
        }
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizId",
          foreignField: "_id",
          as: "quiz"
        }
      },
      { $unwind: "$quiz" },
      {
        $addFields: {
          timeLimit: {
            $cond: {
              if: { $gt: ["$quiz.timePerQuestion", 0] },
              then: { $multiply: ["$quiz.timePerQuestion", "$quiz.questions.length"] },
              else: { $multiply: ["$quiz.timeLimit", 60] }
            }
          }
        }
      },
      {
        $match: {
          $expr: {
            $gt: [{ $subtract: [new Date(), "$startedAt"] }, { $multiply: ["$timeLimit", 1000] }]
          }
        }
      }
    ])

    // Update overdue attempts to expired
    const overdueIds = overdueAttempts.map((attempt) => attempt._id)
    if (overdueIds.length > 0) {
      await QuizAttempt.updateMany(
        { _id: { $in: overdueIds } },
        {
          status: "time_expired",
          lastActiveAt: new Date()
        }
      )
    }
  }

  /**
   * Clean old abandoned attempts (older than 24 hours)
   */
  async cleanAbandonedAttempts(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await QuizAttempt.deleteMany({
      status: { $in: ["started", "abandoned"] },
      startedAt: { $lt: oneDayAgo }
    })
  }
}
