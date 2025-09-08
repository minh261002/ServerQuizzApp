import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { QuizResultService } from "~/services/QuizResultService"
import { asyncHandler } from "~/utils/asyncHandler"

/**
 * Quiz result controller
 */
export class QuizResultController extends BaseController {
  private quizResultService: QuizResultService

  constructor() {
    super()
    this.quizResultService = new QuizResultService()
  }

  /**
   * Submit quiz and create result
   */
  submitQuiz = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { quizId, answers, startTime, endTime, attemptNumber } = req.body

    const result = await this.quizResultService.submitQuiz({
      userId,
      quizId,
      answers,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attemptNumber
    })

    this.sendCreated(res, "Quiz submitted successfully", result)
  })

  /**
   * Get user's quiz results
   */
  getUserResults = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { page, limit } = this.getPaginationParams(req)
    const sort = this.getSortParams(req)
    const quizId = req.query.quizId as string
    const status = req.query.status as string

    const result = await this.quizResultService.getUserQuizResults(userId, {
      page,
      limit,
      quizId,
      status,
      sort
    })

    this.sendPaginated(res, "Quiz results retrieved successfully", result.documents, {
      totalDocuments: result.totalDocuments,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    })
  })

  /**
   * Get quiz results for a specific quiz (teacher/admin)
   */
  getQuizResults = asyncHandler(async (req: Request, res: Response) => {
    const { id: quizId } = req.params
    const { page, limit } = this.getPaginationParams(req)
    const sort = this.getSortParams(req, { percentage: -1, createdAt: -1 })
    const userId = req.query.userId as string
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : undefined
    const maxScore = req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined

    const result = await this.quizResultService.getQuizResults(quizId, {
      page,
      limit,
      userId,
      minScore,
      maxScore,
      sort
    })

    this.sendPaginated(res, "Quiz results retrieved successfully", result.documents, {
      totalDocuments: result.totalDocuments,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    })
  })

  /**
   * Get detailed result with explanations
   */
  getDetailedResult = asyncHandler(async (req: Request, res: Response) => {
    const { id: resultId } = req.params
    const userId = this.getUserId(req)

    const result = await this.quizResultService.getDetailedResult(resultId, userId)

    this.sendSuccess(res, "Detailed result retrieved successfully", result)
  })

  /**
   * Add feedback to quiz result (teacher/admin)
   */
  addFeedback = asyncHandler(async (req: Request, res: Response) => {
    const { id: resultId } = req.params
    const { feedback } = req.body
    const reviewerId = this.getUserId(req)

    const result = await this.quizResultService.addFeedback(resultId, feedback, reviewerId)

    this.sendSuccess(res, "Feedback added successfully", result)
  })

  /**
   * Get user's best attempt for a quiz
   */
  getBestAttempt = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { quizId } = req.params

    const result = await this.quizResultService.getUserBestAttempt(userId, quizId)

    if (!result) {
      this.sendSuccess(res, "No attempts found", null)
      return
    }

    this.sendSuccess(res, "Best attempt retrieved successfully", result)
  })

  /**
   * Get quiz leaderboard
   */
  getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const { id: quizId } = req.params
    const limit = parseInt(req.query.limit as string) || 10

    const leaderboard = await this.quizResultService.getQuizLeaderboard(quizId, limit)

    this.sendSuccess(res, "Leaderboard retrieved successfully", leaderboard)
  })

  /**
   * Get quiz statistics for results
   */
  getResultsStats = asyncHandler(async (req: Request, res: Response) => {
    const { id: quizId } = req.params

    // Basic statistics
    const [totalResults, completedResults, averageScore, passRate] = await Promise.all([
      this.quizResultService.count({ quizId }),
      this.quizResultService.count({ quizId, isCompleted: true }),
      this.getAverageScore(quizId),
      this.getPassRate(quizId)
    ])

    const stats = {
      totalResults,
      completedResults,
      averageScore,
      passRate,
      completionRate: totalResults > 0 ? (completedResults / totalResults) * 100 : 0
    }

    this.sendSuccess(res, "Results statistics retrieved successfully", stats)
  })

  /**
   * Private helper methods
   */
  private async getAverageScore(quizId: string): Promise<number> {
    const results = await this.quizResultService.find({ quizId, isCompleted: true }, { select: "percentage" })

    if (results.length === 0) return 0

    const total = results.reduce((sum, result) => sum + result.percentage, 0)
    return Math.round(total / results.length)
  }

  private async getPassRate(quizId: string): Promise<number> {
    const [totalResults, passedResults] = await Promise.all([
      this.quizResultService.count({ quizId, isCompleted: true }),
      this.quizResultService.count({ quizId, isCompleted: true, percentage: { $gte: 60 } })
    ])

    return totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0
  }
}
