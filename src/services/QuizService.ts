import mongoose from "mongoose"
import { Quiz, IQuiz, IQuestion } from "~/models/Quiz"
import { BaseService } from "./BaseService"
import { AuthorizationError } from "~/utils/errors"

/**
 * Quiz service class
 */
export class QuizService extends BaseService<IQuiz> {
  constructor() {
    super(Quiz)
  }

  /**
   * Create a new quiz
   */
  async createQuiz(quizData: {
    title: string
    description: string
    createdBy: string
    questions: IQuestion[]
    timeLimit: number
    difficulty?: "easy" | "medium" | "hard"
    category: string
    tags?: string[]
  }): Promise<IQuiz> {
    const quiz = new this.model({
      ...quizData,
      createdBy: new mongoose.Types.ObjectId(quizData.createdBy)
    })
    return await quiz.save()
  }

  /**
   * Get quizzes with pagination and filtering
   */
  async getQuizzes(
    options: {
      page?: number
      limit?: number
      category?: string
      difficulty?: string
      search?: string
      createdBy?: string
      isActive?: boolean
      sort?: Record<string, 1 | -1>
    } = {}
  ) {
    const filter: Record<string, unknown> = {}

    // Filter by category
    if (options.category) {
      filter.category = { $regex: options.category, $options: "i" }
    }

    // Filter by difficulty
    if (options.difficulty) {
      filter.difficulty = options.difficulty
    }

    // Filter by creator
    if (options.createdBy) {
      filter.createdBy = options.createdBy
    }

    // Filter by active status
    if (options.isActive !== undefined) {
      filter.isActive = options.isActive
    }

    // Search by title, description, or tags
    if (options.search) {
      filter.$or = [
        { title: { $regex: options.search, $options: "i" } },
        { description: { $regex: options.search, $options: "i" } },
        { tags: { $in: [new RegExp(options.search, "i")] } }
      ]
    }

    return await this.paginate(filter, {
      page: options.page,
      limit: options.limit,
      sort: options.sort || { createdAt: -1 },
      populate: "createdBy",
      select: "-questions.correctAnswer -questions.explanation" // Hide answers for public view
    })
  }

  /**
   * Get quiz by ID with full details (for quiz taking)
   */
  async getQuizForTaking(quizId: string): Promise<IQuiz> {
    const quiz = await this.findByIdOrThrow(quizId, "createdBy")

    if (!quiz.isActive) {
      throw new AuthorizationError("Quiz is not available")
    }

    // Remove correct answers and explanations for quiz taking
    const quizObject = quiz.toJSON() as IQuiz
    const sanitizedQuestions = quizObject.questions.map((question) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { correctAnswer, explanation, ...rest } = question as IQuestion & {
        correctAnswer?: number
        explanation?: string
      }
      return rest as IQuestion
    })

    return {
      ...quizObject,
      questions: sanitizedQuestions
    } as IQuiz
  }

  /**
   * Get quiz by ID with full details (for creators/admins)
   */
  async getQuizWithAnswers(quizId: string, userId: string, userRole: string): Promise<IQuiz> {
    const quiz = await this.findByIdOrThrow(quizId, "createdBy")

    // Check if user has permission to see answers
    const canViewAnswers = userRole === "admin" || quiz.createdBy._id.toString() === userId

    if (!canViewAnswers) {
      throw new AuthorizationError("You do not have permission to view quiz answers")
    }

    return quiz
  }

  /**
   * Update quiz
   */
  async updateQuiz(quizId: string, updateData: Partial<IQuiz>, userId: string, userRole: string): Promise<IQuiz> {
    const quiz = await this.findByIdOrThrow(quizId)

    // Check if user has permission to update
    const canUpdate = userRole === "admin" || quiz.createdBy.toString() === userId

    if (!canUpdate) {
      throw new AuthorizationError("You do not have permission to update this quiz")
    }

    return await this.updateByIdOrThrow(quizId, updateData)
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(quizId: string, userId: string, userRole: string): Promise<void> {
    const quiz = await this.findByIdOrThrow(quizId)

    // Check if user has permission to delete
    const canDelete = userRole === "admin" || quiz.createdBy.toString() === userId

    if (!canDelete) {
      throw new AuthorizationError("You do not have permission to delete this quiz")
    }

    await this.deleteByIdOrThrow(quizId)
  }

  /**
   * Toggle quiz active status
   */
  async toggleQuizStatus(quizId: string, isActive: boolean, userId: string, userRole: string): Promise<IQuiz> {
    return await this.updateQuiz(quizId, { isActive }, userId, userRole)
  }

  /**
   * Get quiz statistics
   */
  async getQuizStats(quizId: string, userId: string, userRole: string) {
    const quiz = await this.findByIdOrThrow(quizId)

    // Check if user has permission to view stats
    const canViewStats = userRole === "admin" || quiz.createdBy.toString() === userId

    if (!canViewStats) {
      throw new AuthorizationError("You do not have permission to view quiz statistics")
    }

    // TODO: Implement quiz statistics (attempts, scores, etc.)
    // This would require a QuizResult model
    return {
      totalQuestions: quiz.questions.length,
      totalPoints: quiz.totalPoints,
      averageDifficulty: quiz.difficulty
      // Add more stats as needed
    }
  }

  /**
   * Get popular categories
   */
  async getPopularCategories(limit: number = 10): Promise<Array<{ category: string; count: number }>> {
    const categories = await Quiz.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { category: "$_id", count: 1, _id: 0 } }
    ])

    return categories
  }

  /**
   * Get quiz recommendations based on user preferences
   */
  async getRecommendations(
    options: {
      difficulty?: string
      categories?: string[]
      limit?: number
    } = {}
  ): Promise<IQuiz[]> {
    const filter: Record<string, unknown> = { isActive: true }

    if (options.difficulty) {
      filter.difficulty = options.difficulty
    }

    if (options.categories && options.categories.length > 0) {
      filter.category = { $in: options.categories }
    }

    return await this.find(filter, {
      limit: options.limit || 10,
      sort: { createdAt: -1 },
      populate: "createdBy",
      select: "-questions.correctAnswer -questions.explanation"
    })
  }
}
