import { Request, Response } from "express"
import { BaseController } from "./BaseController"
import { UserService } from "~/services/UserService"
import { asyncHandler } from "~/utils/asyncHandler"
import { getImageUrl, deleteUploadedFile, getFilenameFromUrl } from "~/middlewares/upload"
import { BadRequestError } from "~/utils/errors"

/**
 * User management controller
 */
export class UserController extends BaseController {
  private userService: UserService

  constructor() {
    super()
    this.userService = new UserService()
  }

  /**
   * Get all users (admin only)
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.getPaginationParams(req)
    const sort = this.getSortParams(req)
    const search = this.getSearchParams(req)
    const role = req.query.role as string

    const result = await this.userService.getUsers({
      page,
      limit,
      sort,
      search,
      role
    })

    this.sendPaginated(res, this.t(req, "user.retrieved"), result.documents, {
      totalDocuments: result.totalDocuments,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    })
  })

  /**
   * Get user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const user = await this.userService.findByIdOrThrow(id)

    this.sendSuccess(res, this.t(req, "user.retrieved"), user)
  })

  /**
   * Update user (admin only)
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const updateData = this.cleanObject(req.body)

    const user = await this.userService.updateByIdOrThrow(id, updateData)

    this.sendSuccess(res, "User updated successfully", user)
  })

  /**
   * Delete user (admin only)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    await this.userService.deleteByIdOrThrow(id)

    this.sendSuccess(res, "User deleted successfully")
  })

  /**
   * Toggle user status (admin only)
   */
  toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { isActive } = req.body

    const user = await this.userService.toggleUserStatus(id, isActive)

    this.sendSuccess(res, `User ${isActive ? "activated" : "deactivated"} successfully`, user)
  })

  /**
   * Get user statistics (admin only)
   */
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const totalUsers = await this.userService.count()
    const activeUsers = await this.userService.count({ isActive: true })
    const inactiveUsers = await this.userService.count({ isActive: false })

    const usersByRole = await Promise.all([
      this.userService.count({ role: "admin" }),
      this.userService.count({ role: "teacher" }),
      this.userService.count({ role: "student" })
    ])

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: {
        admin: usersByRole[0],
        teacher: usersByRole[1],
        student: usersByRole[2]
      }
    }

    this.sendSuccess(res, "User statistics retrieved successfully", stats)
  })

  /**
   * Upload user avatar
   */
  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)

    if (!req.file) {
      throw new BadRequestError(this.t(req, "upload.noAvatar"))
    }

    const avatarUrl = getImageUrl(req.file.filename)

    // Get current user to delete old avatar if exists
    const currentUser = await this.userService.findByIdOrThrow(userId)

    // Delete old avatar if exists
    if (currentUser.avatar) {
      const oldFilename = getFilenameFromUrl(currentUser.avatar)
      deleteUploadedFile(oldFilename)
    }

    // Update user with new avatar
    const updatedUser = await this.userService.updateByIdOrThrow(userId, { avatar: avatarUrl })

    this.sendSuccess(res, this.t(req, "auth.avatarUploaded"), {
      avatar: avatarUrl,
      user: updatedUser
    })
  })

  /**
   * Delete user avatar
   */
  deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req)

    // Get current user
    const currentUser = await this.userService.findByIdOrThrow(userId)

    if (!currentUser.avatar) {
      throw new BadRequestError(this.t(req, "auth.noAvatarToDelete"))
    }

    // Delete avatar file
    const filename = getFilenameFromUrl(currentUser.avatar)
    deleteUploadedFile(filename)

    // Update user to remove avatar
    const updatedUser = await this.userService.updateByIdOrThrow(userId, { avatar: undefined })

    this.sendSuccess(res, this.t(req, "auth.avatarDeleted"), { user: updatedUser })
  })
}
