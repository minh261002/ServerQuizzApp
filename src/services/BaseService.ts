import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from "mongoose"
import { NotFoundError, DatabaseError } from "~/utils/errors"

/**
 * Base service class with common CRUD operations
 */
export abstract class BaseService<T extends Document> {
  protected model: Model<T>

  constructor(model: Model<T>) {
    this.model = model
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data)
      return await document.save()
    } catch (error) {
      throw new DatabaseError(`Failed to create ${this.model.modelName}: ${(error as Error).message}`)
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string, populateOptions?: string | string[]): Promise<T | null> {
    try {
      let query = this.model.findById(id)

      if (populateOptions) {
        query = query.populate(populateOptions)
      }

      return await query.exec()
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.model.modelName}: ${(error as Error).message}`)
    }
  }

  /**
   * Find document by ID and throw error if not found
   */
  async findByIdOrThrow(id: string, populateOptions?: string | string[]): Promise<T> {
    const document = await this.findById(id, populateOptions)
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} not found`)
    }
    return document
  }

  /**
   * Find one document by filter
   */
  async findOne(filter: FilterQuery<T>, populateOptions?: string | string[]): Promise<T | null> {
    try {
      let query = this.model.findOne(filter)

      if (populateOptions) {
        query = query.populate(populateOptions)
      }

      return await query.exec()
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.model.modelName}: ${(error as Error).message}`)
    }
  }

  /**
   * Find multiple documents
   */
  async find(
    filter: FilterQuery<T> = {},
    options: {
      populate?: string | string[]
      sort?: Record<string, 1 | -1>
      limit?: number
      skip?: number
      select?: string
    } = {}
  ): Promise<T[]> {
    try {
      let query = this.model.find(filter)

      if (options.populate) {
        query = query.populate(options.populate)
      }

      if (options.sort) {
        query = query.sort(options.sort)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.skip) {
        query = query.skip(options.skip)
      }

      if (options.select) {
        query = query.select(options.select)
      }

      return await query.exec()
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.model.modelName}s: ${(error as Error).message}`)
    }
  }

  /**
   * Update document by ID
   */
  async updateById(id: string, update: UpdateQuery<T>, options: QueryOptions = {}): Promise<T | null> {
    try {
      const defaultOptions = { new: true, runValidators: true }
      return await this.model.findByIdAndUpdate(id, update, { ...defaultOptions, ...options })
    } catch (error) {
      throw new DatabaseError(`Failed to update ${this.model.modelName}: ${(error as Error).message}`)
    }
  }

  /**
   * Update document by ID and throw error if not found
   */
  async updateByIdOrThrow(id: string, update: UpdateQuery<T>, options: QueryOptions = {}): Promise<T> {
    const document = await this.updateById(id, update, options)
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} not found`)
    }
    return document
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id)
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.model.modelName}: ${(error as Error).message}`)
    }
  }

  /**
   * Delete document by ID and throw error if not found
   */
  async deleteByIdOrThrow(id: string): Promise<T> {
    const document = await this.deleteById(id)
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} not found`)
    }
    return document
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter)
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.model.modelName}s: ${(error as Error).message}`)
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const document = await this.model.findOne(filter).select("_id")
      return !!document
    } catch (error) {
      throw new DatabaseError(`Failed to check ${this.model.modelName} existence: ${(error as Error).message}`)
    }
  }

  /**
   * Paginate documents
   */
  async paginate(
    filter: FilterQuery<T> = {},
    options: {
      page?: number
      limit?: number
      sort?: Record<string, 1 | -1>
      populate?: string | string[]
      select?: string
    } = {}
  ): Promise<{
    documents: T[]
    totalDocuments: number
    totalPages: number
    currentPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    try {
      const page = Math.max(1, options.page || 1)
      const limit = Math.max(1, Math.min(100, options.limit || 10)) // Max 100 items per page
      const skip = (page - 1) * limit

      const [documents, totalDocuments] = await Promise.all([
        this.find(filter, {
          ...options,
          limit,
          skip
        }),
        this.count(filter)
      ])

      const totalPages = Math.ceil(totalDocuments / limit)

      return {
        documents,
        totalDocuments,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    } catch (error) {
      throw new DatabaseError(`Failed to paginate ${this.model.modelName}s: ${(error as Error).message}`)
    }
  }
}
