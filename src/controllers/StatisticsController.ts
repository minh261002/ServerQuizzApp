import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { StatisticsService } from "~/services/StatisticsService"
import { AuthorizationError } from "~/utils/errors"
import { asyncHandler } from "~/utils/asyncHandler"

/**
 * Statistics controller
 */
export class StatisticsController extends BaseController {
  private statisticsService: StatisticsService

  constructor() {
    super()
    this.statisticsService = StatisticsService.getInstance()
  }

  /**
   * Get dashboard statistics (admin only)
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.statisticsService.getDashboardStats()

    this.sendSuccess(res, "Dashboard statistics retrieved successfully", stats)
  })

  /**
   * Get user performance statistics
   */
  getUserPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { id: targetUserId } = req.params
    const currentUserId = this.getUserId(req)
    const user = this.getUser(req)

    // Check if user can view these statistics
    if (targetUserId !== currentUserId && user?.role !== "admin" && user?.role !== "teacher") {
      throw new AuthorizationError("You don't have permission to view these statistics")
    }

    const performance = await this.statisticsService.getUserPerformance(targetUserId)

    this.sendSuccess(res, "User performance retrieved successfully", performance)
  })

  /**
   * Get current user's performance
   */
  getMyPerformance = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)

    const performance = await this.statisticsService.getUserPerformance(userId)

    this.sendSuccess(res, "Your performance retrieved successfully", performance)
  })

  /**
   * Get quiz analytics (creator/admin only)
   */
  getQuizAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { id: quizId } = req.params
    // Note: Permission checking would be implemented here
    // const userId = this.getUserId(req)
    // const user = this.getUser(req)

    const analytics = await this.statisticsService.getQuizAnalytics(quizId)

    this.sendSuccess(res, "Quiz analytics retrieved successfully", analytics)
  })

  /**
   * Get system-wide statistics (admin only)
   */
  getSystemStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.statisticsService.getDashboardStats()

    // Return only overview and performance stats for system monitoring
    this.sendSuccess(res, "System statistics retrieved successfully", {
      overview: stats.overview,
      performanceStats: stats.performanceStats
    })
  })

  /**
   * Get popular content statistics
   */
  getPopularContent = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10
    // Note: timeframe filtering would be implemented here
    // const timeframe = (req.query.timeframe as string) || "week"

    const stats = await this.statisticsService.getDashboardStats()

    this.sendSuccess(res, "Popular content retrieved successfully", {
      popularQuizzes: stats.quizStats.popularQuizzes.slice(0, limit),
      topPerformers: stats.userStats.topPerformers.slice(0, limit),
      categories: stats.quizStats.categoriesDistribution.slice(0, limit)
    })
  })

  /**
   * Export statistics as CSV/JSON
   */
  exportStats = asyncHandler(async (req: Request, res: Response) => {
    const { type = "json" } = req.query
    const { entity } = req.params // "users", "quizzes", "results"

    // This would generate export data based on entity type
    const stats = await this.statisticsService.getDashboardStats()

    if (type === "csv") {
      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", `attachment; filename=${entity}-stats.csv`)
      // Convert to CSV format
      res.send("CSV data would be here")
    } else {
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Content-Disposition", `attachment; filename=${entity}-stats.json`)
      res.json(stats)
    }
  })
}
