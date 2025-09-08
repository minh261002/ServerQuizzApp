import mongoose from "mongoose"
import { DATABASE, MESSAGES } from "~/constants"

/**
 * Database connection class
 */
export class Database {
  private static instance: Database
  private isConnected: boolean = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("Database already connected")
      return
    }

    try {
      // Set mongoose options
      mongoose.set("strictQuery", false)

      // Connect to MongoDB
      await mongoose.connect(DATABASE.MONGODB_URI, {
        dbName: DATABASE.DB_NAME
      })

      this.isConnected = true
      console.log(`✅ ${MESSAGES.DATABASE_CONNECTED}`)

      // Handle connection events
      this.setupEventListeners()
    } catch (error) {
      console.error(`❌ ${MESSAGES.DATABASE_ERROR}:`, error)

      // In development, don't exit if MongoDB is not available
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️  Running in development mode without database connection")
        console.log("📝 Please start MongoDB to use database features")
        return
      }

      process.exit(1)
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.disconnect()
      this.isConnected = false
      console.log("Database disconnected")
    } catch (error) {
      console.error("Error disconnecting from database:", error)
    }
  }

  /**
   * Check if database is connected
   */
  public isDbConnected(): boolean {
    return this.isConnected
  }

  /**
   * Setup event listeners for database connection
   */
  private setupEventListeners(): void {
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to MongoDB")
    })

    mongoose.connection.on("error", (error) => {
      console.error("Mongoose connection error:", error)
      this.isConnected = false
    })

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected")
      this.isConnected = false
    })

    // Handle process termination
    process.on("SIGINT", async () => {
      await this.disconnect()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      await this.disconnect()
      process.exit(0)
    })
  }
}
