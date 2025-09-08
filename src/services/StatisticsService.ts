import mongoose from "mongoose"
import { User } from "~/models/User"
import { Quiz } from "~/models/Quiz"
import { QuizResult } from "~/models/QuizResult"
import { QuizAttempt } from "~/models/QuizAttempt"

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  overview: {
    totalUsers: number
    totalQuizzes: number
    totalAttempts: number
    totalCompletions: number
  }
  userStats: {
    activeUsers: number
    newUsersThisWeek: number
    usersByRole: Record<string, number>
    topPerformers: Array<{
      userId: string
      fullname: string
      averageScore: number
      totalQuizzes: number
    }>
  }
  quizStats: {
    publishedQuizzes: number
    popularQuizzes: Array<{
      quizId: string
      title: string
      attempts: number
      averageScore: number
    }>
    categoriesDistribution: Array<{
      category: string
      count: number
      averageScore: number
    }>
  }
  performanceStats: {
    overallAverageScore: number
    completionRate: number
    averageTimeSpent: number
    difficultyBreakdown: Record<
      string,
      {
        attempts: number
        averageScore: number
        completionRate: number
      }
    >
  }
  recentActivity: Array<{
    type: "quiz_created" | "quiz_completed" | "user_registered"
    userId?: string
    fullname?: string
    quizTitle?: string
    timestamp: Date
    details: string
  }>
}

/**
 * User performance interface
 */
export interface UserPerformance {
  overview: {
    totalQuizzesTaken: number
    totalQuizzesCreated: number
    averageScore: number
    totalTimeSpent: number
    rank: number
    percentile: number
  }
  recentActivity: Array<{
    quizId: string
    quizTitle: string
    score: number
    maxScore: number
    percentage: number
    completedAt: Date
    timeSpent: number
  }>
  categoryPerformance: Array<{
    category: string
    quizzesTaken: number
    averageScore: number
    bestScore: number
    totalTimeSpent: number
  }>
  difficultyPerformance: Record<
    string,
    {
      attempted: number
      completed: number
      averageScore: number
      bestScore: number
    }
  >
  progressOverTime: Array<{
    date: Date
    averageScore: number
    quizzesTaken: number
  }>
  achievements: Array<{
    id: string
    name: string
    description: string
    unlockedAt: Date
    icon: string
  }>
}

/**
 * Quiz analytics interface
 */
export interface QuizAnalytics {
  overview: {
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    passRate: number
    averageTimeSpent: number
  }
  questionAnalytics: Array<{
    questionIndex: number
    question: string
    correctAnswers: number
    incorrectAnswers: number
    skippedAnswers: number
    averageTime: number
    difficultyRating: number
  }>
  participantAnalytics: Array<{
    userId: string
    fullname: string
    attempts: number
    bestScore: number
    lastAttempt: Date
    averageTime: number
  }>
  timeAnalytics: {
    peakHours: Array<{ hour: number; attempts: number }>
    dailyAttempts: Array<{ date: Date; attempts: number }>
    weeklyTrends: Array<{ week: string; attempts: number; averageScore: number }>
  }
  performanceDistribution: {
    scoreRanges: Array<{ range: string; count: number; percentage: number }>
    completionTimes: Array<{ range: string; count: number; percentage: number }>
  }
}

/**
 * Statistics service class
 */
export class StatisticsService {
  private static instance: StatisticsService

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService()
    }
    return StatisticsService.instance
  }

  /**
   * Get dashboard statistics for admin
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      totalQuizzes,
      totalAttempts,
      totalCompletions,
      activeUsers,
      newUsersThisWeek,
      publishedQuizzes,
      overallAverageScore
    ] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments(),
      QuizAttempt.countDocuments(),
      QuizResult.countDocuments({ isCompleted: true }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Quiz.countDocuments({ isPublished: true }),
      this.getOverallAverageScore()
    ])

    const [usersByRole, topPerformers, popularQuizzes, categoriesDistribution] = await Promise.all([
      this.getUsersByRole(),
      this.getTopPerformers(5),
      this.getPopularQuizzes(5),
      this.getCategoriesDistribution()
    ])

    const completionRate = totalAttempts > 0 ? (totalCompletions / totalAttempts) * 100 : 0
    const averageTimeSpent = await this.getAverageTimeSpent()
    const difficultyBreakdown = await this.getDifficultyBreakdown()
    const recentActivity = await this.getRecentActivity(10)

    return {
      overview: {
        totalUsers,
        totalQuizzes,
        totalAttempts,
        totalCompletions
      },
      userStats: {
        activeUsers,
        newUsersThisWeek,
        usersByRole,
        topPerformers
      },
      quizStats: {
        publishedQuizzes,
        popularQuizzes,
        categoriesDistribution
      },
      performanceStats: {
        overallAverageScore,
        completionRate,
        averageTimeSpent,
        difficultyBreakdown
      },
      recentActivity
    }
  }

  /**
   * Get user performance statistics
   */
  async getUserPerformance(userId: string): Promise<UserPerformance> {
    const user = await User.findById(userId)
    if (!user) {
      throw new Error("User not found")
    }

    const [recentActivity, categoryPerformance, difficultyPerformance, progressOverTime, rank] = await Promise.all([
      this.getUserRecentActivity(userId, 10),
      this.getUserCategoryPerformance(userId),
      this.getUserDifficultyPerformance(userId),
      this.getUserProgressOverTime(userId, 30), // Last 30 days
      this.getUserRank(userId)
    ])

    const achievements = await this.getUserAchievements(userId)

    return {
      overview: {
        totalQuizzesTaken: user.stats.totalQuizzesTaken,
        totalQuizzesCreated: user.stats.totalQuizzesCreated,
        averageScore: user.stats.averageScore,
        totalTimeSpent: user.stats.totalTimeSpent,
        rank: rank.rank,
        percentile: rank.percentile
      },
      recentActivity,
      categoryPerformance,
      difficultyPerformance,
      progressOverTime,
      achievements
    }
  }

  /**
   * Get quiz analytics
   */
  async getQuizAnalytics(quizId: string): Promise<QuizAnalytics> {
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      throw new Error("Quiz not found")
    }

    const [overview, questionAnalytics, participantAnalytics, timeAnalytics, performanceDistribution] =
      await Promise.all([
        this.getQuizOverview(quizId),
        this.getQuestionAnalytics(quizId),
        this.getParticipantAnalytics(quizId),
        this.getQuizTimeAnalytics(quizId),
        this.getQuizPerformanceDistribution(quizId)
      ])

    return {
      overview,
      questionAnalytics,
      participantAnalytics,
      timeAnalytics,
      performanceDistribution
    }
  }

  /**
   * Private helper methods
   */
  private async getOverallAverageScore(): Promise<number> {
    const result = await QuizResult.aggregate([
      { $match: { isCompleted: true } },
      { $group: { _id: null, averageScore: { $avg: "$percentage" } } }
    ])
    return result[0]?.averageScore || 0
  }

  private async getUsersByRole(): Promise<Record<string, number>> {
    const result = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])

    const roleStats: Record<string, number> = {}
    result.forEach((item) => {
      roleStats[item._id] = item.count
    })

    return roleStats
  }

  private async getTopPerformers(limit: number): Promise<
    Array<{
      userId: string
      fullname: string
      averageScore: number
      totalQuizzes: number
    }>
  > {
    const result = await User.aggregate([
      { $match: { "stats.totalQuizzesTaken": { $gt: 0 } } },
      { $sort: { "stats.averageScore": -1 } },
      { $limit: limit },
      {
        $project: {
          userId: { $toString: "$_id" },
          fullname: 1,
          averageScore: "$stats.averageScore",
          totalQuizzes: "$stats.totalQuizzesTaken"
        }
      }
    ])

    return result
  }

  private async getPopularQuizzes(limit: number): Promise<
    Array<{
      quizId: string
      title: string
      attempts: number
      averageScore: number
    }>
  > {
    const result = await Quiz.aggregate([
      { $match: { isPublished: true } },
      { $sort: { "stats.totalAttempts": -1 } },
      { $limit: limit },
      {
        $project: {
          quizId: { $toString: "$_id" },
          title: 1,
          attempts: "$stats.totalAttempts",
          averageScore: "$stats.averageScore"
        }
      }
    ])

    return result
  }

  private async getCategoriesDistribution(): Promise<
    Array<{
      category: string
      count: number
      averageScore: number
    }>
  > {
    const result = await Quiz.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          averageScore: { $avg: "$stats.averageScore" }
        }
      },
      { $sort: { count: -1 } }
    ])

    return result.map((item) => ({
      category: item._id,
      count: item.count,
      averageScore: item.averageScore || 0
    }))
  }

  private async getAverageTimeSpent(): Promise<number> {
    const result = await QuizResult.aggregate([
      { $match: { isCompleted: true } },
      { $group: { _id: null, averageTime: { $avg: "$totalTimeSpent" } } }
    ])
    return Math.round((result[0]?.averageTime || 0) / 60) // Convert to minutes
  }

  private async getDifficultyBreakdown(): Promise<
    Record<
      string,
      {
        attempts: number
        averageScore: number
        completionRate: number
      }
    >
  > {
    const difficulties = ["easy", "medium", "hard"]
    const breakdown: Record<string, { attempts: number; averageScore: number; completionRate: number }> = {}

    for (const difficulty of difficulties) {
      const stats = await QuizResult.aggregate([
        {
          $lookup: {
            from: "quizzes",
            localField: "quizId",
            foreignField: "_id",
            as: "quiz"
          }
        },
        { $unwind: "$quiz" },
        { $match: { "quiz.difficulty": difficulty } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            completedAttempts: { $sum: { $cond: ["$isCompleted", 1, 0] } },
            averageScore: { $avg: "$percentage" }
          }
        }
      ])

      const stat = stats[0] || { totalAttempts: 0, completedAttempts: 0, averageScore: 0 }
      breakdown[difficulty] = {
        attempts: stat.totalAttempts,
        averageScore: stat.averageScore,
        completionRate: stat.totalAttempts > 0 ? (stat.completedAttempts / stat.totalAttempts) * 100 : 0
      }
    }

    return breakdown
  }

  private async getRecentActivity(limit: number): Promise<
    Array<{
      type: "quiz_created" | "quiz_completed" | "user_registered"
      userId?: string
      fullname?: string
      quizTitle?: string
      timestamp: Date
      details: string
    }>
  > {
    // This would typically come from an activity log collection
    // For now, we'll use recent data from existing collections
    const recentQuizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .limit(limit / 3)
      .populate("createdBy", "fullname")

    const recentResults = await QuizResult.find({ isCompleted: true })
      .sort({ createdAt: -1 })
      .limit(limit / 3)
      .populate("userId", "fullname")
      .populate("quizId", "title")

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit / 3)

    const activities: Array<{
      type: "quiz_created" | "quiz_completed" | "user_registered"
      userId?: string
      fullname?: string
      quizTitle?: string
      timestamp: Date
      details: string
    }> = []

    // Add quiz creation activities
    recentQuizzes.forEach((quiz) => {
      activities.push({
        type: "quiz_created",
        userId: (quiz.createdBy as { _id: { toString(): string } })._id.toString(),
        fullname: (quiz.createdBy as unknown as { fullname: string }).fullname,
        quizTitle: quiz.title,
        timestamp: quiz.createdAt,
        details: `Created quiz "${quiz.title}"`
      })
    })

    // Add quiz completion activities
    recentResults.forEach((result) => {
      activities.push({
        type: "quiz_completed",
        userId: (result.userId as { _id: { toString(): string } })._id.toString(),
        fullname: (result.userId as unknown as { fullname: string }).fullname,
        quizTitle: (result.quizId as unknown as { title: string }).title,
        timestamp: result.createdAt,
        details: `Completed "${(result.quizId as unknown as { title: string }).title}" with ${result.percentage}%`
      })
    })

    // Add user registration activities
    recentUsers.forEach((user) => {
      activities.push({
        type: "user_registered",
        userId: user._id.toString(),
        fullname: user.firstName + " " + user.lastName,
        timestamp: user.createdAt,
        details: `New ${user.role} registered`
      })
    })

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
  }

  private async getUserRecentActivity(
    userId: string,
    limit: number
  ): Promise<
    Array<{
      quizId: string
      quizTitle: string
      score: number
      maxScore: number
      percentage: number
      completedAt: Date
      timeSpent: number
    }>
  > {
    const results = await QuizResult.find({
      userId,
      isCompleted: true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("quizId", "title")

    return results.map((result) => ({
      quizId: (result.quizId as { _id: { toString(): string } })._id.toString(),
      quizTitle: (result.quizId as unknown as { title: string }).title,
      score: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      completedAt: result.endTime,
      timeSpent: Math.round(result.totalTimeSpent / 60) // Convert to minutes
    }))
  }

  private async getUserCategoryPerformance(userId: string): Promise<
    Array<{
      category: string
      quizzesTaken: number
      averageScore: number
      bestScore: number
      totalTimeSpent: number
    }>
  > {
    const result = await QuizResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isCompleted: true } },
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
        $group: {
          _id: "$quiz.category",
          quizzesTaken: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
          totalTimeSpent: { $sum: "$totalTimeSpent" }
        }
      },
      { $sort: { averageScore: -1 } }
    ])

    return result.map((item) => ({
      category: item._id,
      quizzesTaken: item.quizzesTaken,
      averageScore: Math.round(item.averageScore),
      bestScore: Math.round(item.bestScore),
      totalTimeSpent: Math.round(item.totalTimeSpent / 60) // Convert to minutes
    }))
  }

  private async getUserDifficultyPerformance(userId: string): Promise<
    Record<
      string,
      {
        attempted: number
        completed: number
        averageScore: number
        bestScore: number
      }
    >
  > {
    const difficulties = ["easy", "medium", "hard"]
    const performance: Record<
      string,
      { attempted: number; completed: number; averageScore: number; bestScore: number }
    > = {}

    for (const difficulty of difficulties) {
      const stats = await QuizResult.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "quizzes",
            localField: "quizId",
            foreignField: "_id",
            as: "quiz"
          }
        },
        { $unwind: "$quiz" },
        { $match: { "quiz.difficulty": difficulty } },
        {
          $group: {
            _id: null,
            attempted: { $sum: 1 },
            completed: { $sum: { $cond: ["$isCompleted", 1, 0] } },
            averageScore: { $avg: "$percentage" },
            bestScore: { $max: "$percentage" }
          }
        }
      ])

      const stat = stats[0] || { attempted: 0, completed: 0, averageScore: 0, bestScore: 0 }
      performance[difficulty] = {
        attempted: stat.attempted,
        completed: stat.completed,
        averageScore: Math.round(stat.averageScore),
        bestScore: Math.round(stat.bestScore)
      }
    }

    return performance
  }

  private async getUserProgressOverTime(
    userId: string,
    days: number
  ): Promise<
    Array<{
      date: Date
      averageScore: number
      quizzesTaken: number
    }>
  > {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const result = await QuizResult.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isCompleted: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          averageScore: { $avg: "$percentage" },
          quizzesTaken: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    return result.map((item) => ({
      date: new Date(item._id),
      averageScore: Math.round(item.averageScore),
      quizzesTaken: item.quizzesTaken
    }))
  }

  private async getUserRank(userId: string): Promise<{ rank: number; percentile: number }> {
    const user = await User.findById(userId)
    if (!user) {
      return { rank: 0, percentile: 0 }
    }

    const betterUsers = await User.countDocuments({
      "stats.averageScore": { $gt: user.stats.averageScore },
      "stats.totalQuizzesTaken": { $gt: 0 }
    })

    const totalUsers = await User.countDocuments({
      "stats.totalQuizzesTaken": { $gt: 0 }
    })

    const rank = betterUsers + 1
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - betterUsers) / totalUsers) * 100) : 0

    return { rank, percentile }
  }

  private async getUserAchievements(userId: string): Promise<
    Array<{
      id: string
      name: string
      description: string
      unlockedAt: Date
      icon: string
    }>
  > {
    // This would typically come from an achievements collection
    // For now, we'll calculate basic achievements
    const user = await User.findById(userId)
    if (!user) return []

    const achievements: Array<{
      id: string
      name: string
      description: string
      unlockedAt: Date
      icon: string
    }> = []

    // First quiz achievement
    if (user.stats.totalQuizzesTaken >= 1) {
      achievements.push({
        id: "first_quiz",
        name: "First Steps",
        description: "Completed your first quiz",
        unlockedAt: user.createdAt,
        icon: "🎯"
      })
    }

    // Perfect score achievement
    const perfectScores = await QuizResult.countDocuments({
      userId,
      percentage: 100,
      isCompleted: true
    })

    if (perfectScores >= 1) {
      achievements.push({
        id: "perfect_score",
        name: "Perfectionist",
        description: "Achieved a perfect score",
        unlockedAt: user.createdAt,
        icon: "⭐"
      })
    }

    return achievements
  }

  private async getQuizOverview(quizId: string): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    passRate: number
    averageTimeSpent: number
  }> {
    const [attempts, completions, avgScore, avgTime] = await Promise.all([
      QuizAttempt.countDocuments({ quizId }),
      QuizResult.countDocuments({ quizId, isCompleted: true }),
      this.getQuizAverageScore(quizId),
      this.getQuizAverageTime(quizId)
    ])

    const quiz = await Quiz.findById(quizId)
    const passingScore = quiz?.passingScore || 60
    const passedResults = await QuizResult.countDocuments({
      quizId,
      isCompleted: true,
      percentage: { $gte: passingScore }
    })

    return {
      totalAttempts: attempts,
      completedAttempts: completions,
      averageScore: avgScore,
      passRate: completions > 0 ? (passedResults / completions) * 100 : 0,
      averageTimeSpent: Math.round(avgTime / 60) // Convert to minutes
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getQuestionAnalytics(_quizId: string): Promise<
    Array<{
      questionIndex: number
      question: string
      correctAnswers: number
      incorrectAnswers: number
      skippedAnswers: number
      averageTime: number
      difficultyRating: number
    }>
  > {
    // This would require analyzing individual question responses
    // Implementation would depend on how answers are stored
    return []
  }

  private async getParticipantAnalytics(quizId: string): Promise<
    Array<{
      userId: string
      fullname: string
      attempts: number
      bestScore: number
      lastAttempt: Date
      averageTime: number
    }>
  > {
    const result = await QuizResult.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
      {
        $group: {
          _id: "$userId",
          attempts: { $sum: 1 },
          bestScore: { $max: "$percentage" },
          lastAttempt: { $max: "$createdAt" },
          averageTime: { $avg: "$totalTimeSpent" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $sort: { bestScore: -1 } }
    ])

    return result.map((item) => ({
      userId: item._id.toString(),
      fullname: item.user.fullname,
      attempts: item.attempts,
      bestScore: Math.round(item.bestScore),
      lastAttempt: item.lastAttempt,
      averageTime: Math.round(item.averageTime / 60) // Convert to minutes
    }))
  }

  private async getQuizTimeAnalytics(quizId: string): Promise<{
    peakHours: Array<{ hour: number; attempts: number }>
    dailyAttempts: Array<{ date: Date; attempts: number }>
    weeklyTrends: Array<{ week: string; attempts: number; averageScore: number }>
  }> {
    // Peak hours
    const peakHours = await QuizAttempt.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
      {
        $group: {
          _id: { $hour: "$startedAt" },
          attempts: { $sum: 1 }
        }
      },
      { $sort: { attempts: -1 } }
    ])

    // Daily attempts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dailyAttempts = await QuizAttempt.aggregate([
      {
        $match: {
          quizId: new mongoose.Types.ObjectId(quizId),
          startedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startedAt"
            }
          },
          attempts: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    return {
      peakHours: peakHours.map((item) => ({
        hour: item._id,
        attempts: item.attempts
      })),
      dailyAttempts: dailyAttempts.map((item) => ({
        date: new Date(item._id),
        attempts: item.attempts
      })),
      weeklyTrends: [] // Would need more complex aggregation
    }
  }

  private async getQuizPerformanceDistribution(quizId: string): Promise<{
    scoreRanges: Array<{ range: string; count: number; percentage: number }>
    completionTimes: Array<{ range: string; count: number; percentage: number }>
  }> {
    const totalResults = await QuizResult.countDocuments({ quizId, isCompleted: true })

    if (totalResults === 0) {
      return {
        scoreRanges: [],
        completionTimes: []
      }
    }

    // Score ranges
    const scoreRanges = [
      { range: "90-100%", min: 90, max: 100 },
      { range: "80-89%", min: 80, max: 89 },
      { range: "70-79%", min: 70, max: 79 },
      { range: "60-69%", min: 60, max: 69 },
      { range: "0-59%", min: 0, max: 59 }
    ]

    const scoreDistribution = await Promise.all(
      scoreRanges.map(async (range) => {
        const count = await QuizResult.countDocuments({
          quizId,
          isCompleted: true,
          percentage: { $gte: range.min, $lte: range.max }
        })

        return {
          range: range.range,
          count,
          percentage: Math.round((count / totalResults) * 100)
        }
      })
    )

    return {
      scoreRanges: scoreDistribution,
      completionTimes: [] // Would need time-based analysis
    }
  }

  private async getQuizAverageScore(quizId: string): Promise<number> {
    const result = await QuizResult.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId), isCompleted: true } },
      { $group: { _id: null, averageScore: { $avg: "$percentage" } } }
    ])
    return Math.round(result[0]?.averageScore || 0)
  }

  private async getQuizAverageTime(quizId: string): Promise<number> {
    const result = await QuizResult.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId), isCompleted: true } },
      { $group: { _id: null, averageTime: { $avg: "$totalTimeSpent" } } }
    ])
    return result[0]?.averageTime || 0
  }
}
