import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { QuizAttemptService } from "~/services/QuizAttemptService"
import { AuthorizationError } from "~/utils/errors"
import { asyncHandler } from "~/utils/asyncHandler"

/**
 * Quiz attempt controller
 */
export class QuizAttemptController extends BaseController {
  private quizAttemptService: QuizAttemptService

  constructor() {
    super()
    this.quizAttemptService = new QuizAttemptService()
  }

  /**
   * Start a new quiz attempt
   */
  startAttempt = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { quizId, browserInfo } = req.body
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown"

    const attempt = await this.quizAttemptService.startQuizAttempt({
      userId,
      quizId,
      browserInfo,
      ipAddress
    })

    this.sendCreated(res, "Quiz attempt started successfully", attempt)
  })

  /**
   * Save answer for a question
   */
  saveAnswer = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { questionIndex, answer, timeSpent } = req.body

    const attempt = await this.quizAttemptService.saveAnswer(attemptId, questionIndex, answer, timeSpent)

    this.sendSuccess(res, "Answer saved successfully", {
      currentQuestionIndex: attempt.currentQuestionIndex,
      answeredQuestions: attempt.answeredQuestions,
      progress: attempt.calculateProgress()
    })
  })

  /**
   * Navigate to a specific question
   */
  navigateToQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { questionIndex } = req.body

    const attempt = await this.quizAttemptService.navigateToQuestion(attemptId, questionIndex)

    this.sendSuccess(res, "Navigation successful", {
      currentQuestionIndex: attempt.currentQuestionIndex,
      lastActiveAt: attempt.lastActiveAt
    })
  })

  /**
   * Pause quiz attempt
   */
  pauseAttempt = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params

    const attempt = await this.quizAttemptService.pauseAttempt(attemptId)

    this.sendSuccess(res, "Quiz paused successfully", {
      status: attempt.status,
      pausedAt: attempt.pausedAt
    })
  })

  /**
   * Resume quiz attempt
   */
  resumeAttempt = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params

    const attempt = await this.quizAttemptService.resumeAttempt(attemptId)

    this.sendSuccess(res, "Quiz resumed successfully", {
      status: attempt.status,
      lastActiveAt: attempt.lastActiveAt
    })
  })

  /**
   * Submit quiz attempt
   */
  submitAttempt = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params

    const attempt = await this.quizAttemptService.submitAttempt(attemptId)

    this.sendSuccess(res, "Quiz attempt submitted successfully", {
      status: attempt.status,
      timeSpent: attempt.timeSpent,
      totalQuestions: attempt.totalQuestions,
      answeredQuestions: attempt.answeredQuestions.length
    })
  })

  /**
   * Mark question for review
   */
  markForReview = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { questionIndex } = req.body

    const attempt = await this.quizAttemptService.markForReview(attemptId, questionIndex)

    this.sendSuccess(res, "Question marked for review", {
      flaggedQuestions: attempt.flaggedQuestions
    })
  })

  /**
   * Unmark question for review
   */
  unmarkForReview = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { questionIndex } = req.body

    const attempt = await this.quizAttemptService.unmarkForReview(attemptId, questionIndex)

    this.sendSuccess(res, "Question unmarked for review", {
      flaggedQuestions: attempt.flaggedQuestions
    })
  })

  /**
   * Record suspicious activity
   */
  recordActivity = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { activityType, details } = req.body

    const attempt = await this.quizAttemptService.recordSuspiciousActivity(attemptId, activityType, details)

    this.sendSuccess(res, "Activity recorded", {
      suspiciousActivity: attempt.suspiciousActivity.length,
      tabSwitchCount: attempt.tabSwitchCount
    })
  })

  /**
   * Get active attempt
   */
  getActiveAttempt = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { quizId } = req.params

    const attempt = await this.quizAttemptService.getActiveAttempt(userId, quizId)

    if (!attempt) {
      this.sendSuccess(res, "No active attempt found", null)
      return
    }

    this.sendSuccess(res, "Active attempt retrieved successfully", attempt)
  })

  /**
   * Get user's attempts for a quiz
   */
  getUserAttempts = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { quizId } = req.params

    const attempts = await this.quizAttemptService.getUserAttempts(userId, quizId)

    this.sendSuccess(res, "User attempts retrieved successfully", attempts)
  })

  /**
   * Get attempt details
   */
  getAttemptDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const userId = this.getUserId(req)

    const attempt = await this.quizAttemptService.findByIdOrThrow(attemptId, "quizId userId")

    // Check if user owns this attempt or has permission
    if (attempt.userId.toString() !== userId) {
      const user = this.getUser(req)
      if (!user || (user.role !== "admin" && user.role !== "teacher")) {
        throw new AuthorizationError("You don't have permission to view this attempt")
      }
    }

    this.sendSuccess(res, "Attempt details retrieved successfully", attempt)
  })

  /**
   * Update attempt progress (heartbeat)
   */
  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id: attemptId } = req.params
    const { timeSpent, remainingTime } = req.body

    const attempt = await this.quizAttemptService.findByIdOrThrow(attemptId)

    attempt.timeSpent = timeSpent
    attempt.remainingTime = remainingTime
    attempt.lastActiveAt = new Date()

    await attempt.save()

    this.sendSuccess(res, "Progress updated successfully", {
      timeSpent: attempt.timeSpent,
      remainingTime: attempt.remainingTime,
      lastActiveAt: attempt.lastActiveAt
    })
  })
}
