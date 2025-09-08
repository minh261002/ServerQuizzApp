import mongoose from "mongoose"
import { QuizResult, IQuizResult, IQuizAnswer } from "~/models/QuizResult"
import { Quiz, IQuiz } from "~/models/Quiz"
import { BaseService } from "./BaseService"
import { UserService } from "./UserService"
import { EmailService } from "./EmailService"
import { NotFoundError, ValidationError, AuthorizationError } from "~/utils/errors"

/**
 * Quiz result service class
 */
export class QuizResultService extends BaseService<IQuizResult> {
  private userService: UserService
  private emailService: EmailService

  constructor() {
    super(QuizResult)
    this.userService = new UserService()
    this.emailService = EmailService.getInstance()
  }

  /**
   * Submit quiz answers and create result
   */
  async submitQuiz(data: {
    userId: string
    quizId: string
    answers: Record<string, number>
    startTime: Date
    endTime: Date
    attemptNumber: number
  }): Promise<IQuizResult> {
    // Get quiz with questions
    const quiz = await Quiz.findById(data.quizId)
    if (!quiz) {
      throw new NotFoundError("Quiz not found")
    }

    // Check if quiz is available
    if (!quiz.isAvailableNow()) {
      throw new ValidationError("Quiz is not available")
    }

    // Check if user can take this quiz
    if (!quiz.canUserAccess(data.userId)) {
      throw new AuthorizationError("You don't have access to this quiz")
    }

    // Check attempt limits
    const userAttempts = await this.count({ userId: data.userId, quizId: data.quizId })
    if (!quiz.canUserRetake(data.userId, userAttempts)) {
      throw new ValidationError("Maximum attempts reached for this quiz")
    }

    // Calculate results
    const quizAnswers: IQuizAnswer[] = []
    let totalScore = 0
    const maxScore = quiz.totalPoints

    quiz.questions.forEach((question, index) => {
      const questionId = index.toString()
      const userAnswer = data.answers[questionId]
      const isCorrect = userAnswer === question.correctAnswer
      const pointsEarned = isCorrect ? question.points : quiz.negativeMarking ? -quiz.negativeMarkingValue : 0

      quizAnswers.push({
        questionId,
        selectedAnswer: userAnswer || -1, // -1 for skipped
        isCorrect,
        timeSpent: 0, // Would be calculated from attempt data
        pointsEarned: Math.max(0, pointsEarned) // Ensure no negative points
      })

      totalScore += pointsEarned
    })

    // Ensure minimum score is 0
    totalScore = Math.max(0, totalScore)
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const totalTimeSpent = Math.floor((data.endTime.getTime() - data.startTime.getTime()) / 1000)

    // Create quiz result
    const result = await this.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      quizId: new mongoose.Types.ObjectId(data.quizId),
      answers: quizAnswers,
      totalScore,
      maxScore,
      percentage,
      startTime: data.startTime,
      endTime: data.endTime,
      totalTimeSpent,
      status: "completed",
      isCompleted: true,
      attemptNumber: data.attemptNumber,
      analytics: {
        averageTimePerQuestion: quiz.questions.length > 0 ? totalTimeSpent / quiz.questions.length : 0,
        fastestQuestion: 0, // Would be calculated from detailed timing
        slowestQuestion: 0,
        correctAnswersCount: quizAnswers.filter((a) => a.isCorrect).length,
        incorrectAnswersCount: quizAnswers.filter((a) => !a.isCorrect && a.selectedAnswer !== -1).length,
        skippedAnswersCount: quizAnswers.filter((a) => a.selectedAnswer === -1).length,
        difficultyBreakdown: {
          easy: { correct: 0, total: 0 },
          medium: { correct: 0, total: 0 },
          hard: { correct: 0, total: 0 }
        }
      }
    })

    // Update user statistics
    await this.userService.updateUserStats(data.userId, {
      quizCompleted: true,
      score: percentage,
      timeSpent: Math.round(totalTimeSpent / 60) // Convert to minutes
    })

    // Update quiz statistics
    await this.updateQuizStats(data.quizId, percentage, totalTimeSpent)

    // Send completion notification if enabled
    if (quiz.notifications.emailOnCompletion) {
      const user = await this.userService.findById(data.userId)
      if (user) {
        await this.emailService.sendQuizCompletionNotification(
          user.email,
          user.getFullName(),
          quiz.title,
          totalScore,
          maxScore,
          percentage
        )
      }
    }

    return result
  }

  /**
   * Get quiz results for a user
   */
  async getUserQuizResults(
    userId: string,
    options: {
      page?: number
      limit?: number
      quizId?: string
      status?: string
      sort?: Record<string, 1 | -1>
    } = {}
  ): Promise<{
    documents: IQuizResult[]
    totalDocuments: number
    totalPages: number
    currentPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    const filter: Record<string, unknown> = { userId }

    if (options.quizId) {
      filter.quizId = options.quizId
    }

    if (options.status) {
      filter.status = options.status
    }

    return await this.paginate(filter, {
      page: options.page,
      limit: options.limit,
      sort: options.sort || { createdAt: -1 },
      populate: "quizId userId"
    })
  }

  /**
   * Get quiz results for a specific quiz
   */
  async getQuizResults(
    quizId: string,
    options: {
      page?: number
      limit?: number
      userId?: string
      minScore?: number
      maxScore?: number
      sort?: Record<string, 1 | -1>
    } = {}
  ): Promise<{
    documents: IQuizResult[]
    totalDocuments: number
    totalPages: number
    currentPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    const filter: Record<string, unknown> = { quizId, isCompleted: true }

    if (options.userId) {
      filter.userId = options.userId
    }

    if (options.minScore !== undefined) {
      filter.percentage = { $gte: options.minScore }
    }

    if (options.maxScore !== undefined) {
      filter.percentage = { ...(filter.percentage as object), $lte: options.maxScore }
    }

    return await this.paginate(filter, {
      page: options.page,
      limit: options.limit,
      sort: options.sort || { percentage: -1, createdAt: -1 },
      populate: "userId quizId"
    })
  }

  /**
   * Get detailed result with explanations
   */
  async getDetailedResult(
    resultId: string,
    userId: string
  ): Promise<
    IQuizResult & {
      quiz: IQuiz
      explanations: Array<{
        questionIndex: number
        question: string
        userAnswer: string
        correctAnswer: string
        explanation?: string
        isCorrect: boolean
      }>
    }
  > {
    const result = await this.findByIdOrThrow(resultId, "quizId userId")

    // Check if user owns this result or has permission to view
    if (result.userId.toString() !== userId) {
      const user = await this.userService.findById(userId)
      if (!user || (user.role !== "admin" && user.role !== "teacher")) {
        throw new AuthorizationError("You don't have permission to view this result")
      }
    }

    const quiz = result.quizId as unknown as IQuiz

    // Build explanations
    const explanations = quiz.questions.map((question, index) => {
      const userAnswerData = result.answers.find((a) => a.questionId === index.toString())
      const userAnswerIndex = userAnswerData?.selectedAnswer || -1

      return {
        questionIndex: index,
        question: question.question,
        userAnswer: userAnswerIndex >= 0 ? question.options[userAnswerIndex] : "Not answered",
        correctAnswer: question.options[question.correctAnswer],
        explanation: question.explanation,
        isCorrect: userAnswerData?.isCorrect || false
      }
    })

    return {
      ...result.toObject(),
      quiz,
      explanations
    } as IQuizResult & {
      quiz: IQuiz
      explanations: Array<{
        questionIndex: number
        question: string
        userAnswer: string
        correctAnswer: string
        explanation?: string
        isCorrect: boolean
      }>
    }
  }

  /**
   * Add feedback to quiz result
   */
  async addFeedback(resultId: string, feedback: string, reviewerId: string): Promise<IQuizResult> {
    const result = await this.findByIdOrThrow(resultId)

    result.feedback = feedback
    result.reviewedBy = new mongoose.Types.ObjectId(reviewerId)
    result.reviewedAt = new Date()

    return await result.save()
  }

  /**
   * Get user's best attempt for a quiz
   */
  async getUserBestAttempt(userId: string, quizId: string): Promise<IQuizResult | null> {
    return await this.findOne({ userId, quizId, isCompleted: true }, "quizId userId")
  }

  /**
   * Get leaderboard for a quiz
   */
  async getQuizLeaderboard(
    quizId: string,
    limit: number = 10
  ): Promise<
    Array<{
      rank: number
      userId: string
      username: string
      score: number
      percentage: number
      timeSpent: number
      completedAt: Date
    }>
  > {
    const results = await QuizResult.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId), isCompleted: true } },
      {
        $group: {
          _id: "$userId",
          bestScore: { $max: "$totalScore" },
          bestPercentage: { $max: "$percentage" },
          bestTime: { $min: "$totalTimeSpent" },
          lastCompleted: { $max: "$endTime" }
        }
      },
      { $sort: { bestPercentage: -1, bestTime: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" }
    ])

    return results.map((item, index) => ({
      rank: index + 1,
      userId: item._id.toString(),
      username: item.user.username,
      score: item.bestScore,
      percentage: item.bestPercentage,
      timeSpent: Math.round(item.bestTime / 60), // Convert to minutes
      completedAt: item.lastCompleted
    }))
  }

  /**
   * Update quiz statistics after completion
   */
  private async updateQuizStats(quizId: string, score: number, timeSpent: number): Promise<void> {
    const quiz = await Quiz.findById(quizId)
    if (!quiz) return

    quiz.stats.totalAttempts += 1
    quiz.stats.completedAttempts += 1

    // Recalculate average score
    const totalScore = quiz.stats.averageScore * (quiz.stats.completedAttempts - 1) + score
    quiz.stats.averageScore = totalScore / quiz.stats.completedAttempts

    // Recalculate average time
    const totalTime = quiz.stats.averageTimeSpent * (quiz.stats.completedAttempts - 1) + timeSpent
    quiz.stats.averageTimeSpent = totalTime / quiz.stats.completedAttempts

    // Update pass rate
    const passingScore = quiz.passingScore
    const passedAttempts = await QuizResult.countDocuments({
      quizId,
      isCompleted: true,
      percentage: { $gte: passingScore }
    })
    quiz.stats.passRate = (passedAttempts / quiz.stats.completedAttempts) * 100

    await quiz.save()
  }
}
