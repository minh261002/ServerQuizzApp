import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { QuizService } from "~/services/QuizService"
import { asyncHandler } from "~/utils/asyncHandler"
import { getImageUrl, deleteUploadedFile, getFilenameFromUrl } from "~/middlewares/upload"
import { BadRequestError } from "~/utils/errors"

/**
 * Quiz controller
 */
export class QuizController extends BaseController {
  private quizService: QuizService

  constructor() {
    super()
    this.quizService = new QuizService()
  }

  /**
   * Create a new quiz
   */
  createQuiz = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const quizData = {
      ...req.body,
      createdBy: userId
    }

    const quiz = await this.quizService.createQuiz(quizData)

    this.sendCreated(res, "Quiz created successfully", quiz)
  })

  /**
   * Get all quizzes with filtering and pagination
   */
  getQuizzes = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.getPaginationParams(req)
    const sort = this.getSortParams(req)
    const search = this.getSearchParams(req)

    const category = req.query.category as string
    const difficulty = req.query.difficulty as string
    const isActive = req.query.isActive ? req.query.isActive === "true" : undefined

    const result = await this.quizService.getQuizzes({
      page,
      limit,
      sort,
      search,
      category,
      difficulty,
      isActive
    })

    this.sendPaginated(res, "Quizzes retrieved successfully", result.documents, {
      totalDocuments: result.totalDocuments,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    })
  })

  /**
   * Get user's own quizzes
   */
  getMyQuizzes = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)
    const { page, limit } = this.getPaginationParams(req)
    const sort = this.getSortParams(req)
    const search = this.getSearchParams(req)

    const result = await this.quizService.getQuizzes({
      page,
      limit,
      sort,
      search,
      createdBy: userId
    })

    this.sendPaginated(res, "Your quizzes retrieved successfully", result.documents, {
      totalDocuments: result.totalDocuments,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    })
  })

  /**
   * Get quiz by ID (for taking)
   */
  getQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const quiz = await this.quizService.getQuizForTaking(id)

    this.sendSuccess(res, "Quiz retrieved successfully", quiz)
  })

  /**
   * Get quiz by ID with answers (for creators/admins)
   */
  getQuizWithAnswers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = this.getUserId(req)
    const user = this.getUser(req)
    const userRole = user?.role || ""

    const quiz = await this.quizService.getQuizWithAnswers(id, userId, userRole)

    this.sendSuccess(res, "Quiz retrieved successfully", quiz)
  })

  /**
   * Update quiz
   */
  updateQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = this.getUserId(req)
    const user = this.getUser(req)
    const userRole = user?.role || ""
    const updateData = this.cleanObject(req.body)

    const quiz = await this.quizService.updateQuiz(id, updateData, userId, userRole)

    this.sendSuccess(res, "Quiz updated successfully", quiz)
  })

  /**
   * Delete quiz
   */
  deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = this.getUserId(req)
    const user = this.getUser(req)
    const userRole = user?.role || ""

    await this.quizService.deleteQuiz(id, userId, userRole)

    this.sendSuccess(res, "Quiz deleted successfully")
  })

  /**
   * Toggle quiz status
   */
  toggleQuizStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { isActive } = req.body
    const userId = this.getUserId(req)
    const user = this.getUser(req)
    const userRole = user?.role || ""

    const quiz = await this.quizService.toggleQuizStatus(id, isActive, userId, userRole)

    this.sendSuccess(res, `Quiz ${isActive ? "activated" : "deactivated"} successfully`, quiz)
  })

  /**
   * Get quiz statistics
   */
  getQuizStats = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = this.getUserId(req)
    const user = this.getUser(req)
    const userRole = user?.role || ""

    const stats = await this.quizService.getQuizStats(id, userId, userRole)

    this.sendSuccess(res, "Quiz statistics retrieved successfully", stats)
  })

  /**
   * Get popular categories
   */
  getPopularCategories = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10
    const categories = await this.quizService.getPopularCategories(limit)

    this.sendSuccess(res, "Popular categories retrieved successfully", categories)
  })

  /**
   * Get quiz recommendations
   */
  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const difficulty = req.query.difficulty as string
    const categories = req.query.categories ? (req.query.categories as string).split(",") : undefined
    const limit = parseInt(req.query.limit as string) || 10

    const recommendations = await this.quizService.getRecommendations({
      difficulty,
      categories,
      limit
    })

    this.sendSuccess(res, "Quiz recommendations retrieved successfully", recommendations)
  })

  /**
   * Upload question images
   */
  uploadQuestionImages = asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new BadRequestError("No images uploaded")
    }

    const uploadedImages = req.files.map((file: Express.Multer.File) => ({
      fieldname: file.fieldname,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: getImageUrl(file.filename)
    }))

    this.sendSuccess(res, "Images uploaded successfully", { images: uploadedImages })
  })

  /**
   * Delete uploaded image
   */
  deleteQuestionImage = asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params

    if (!filename) {
      throw new BadRequestError("Filename is required")
    }

    // Extract filename from URL if full URL is provided
    const actualFilename = getFilenameFromUrl(filename)

    // Delete the file
    deleteUploadedFile(actualFilename)

    this.sendSuccess(res, "Image deleted successfully")
  })
}
