import dotenv from "dotenv"

// Load environment variables
dotenv.config()

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  HOST: process.env.HOST || "localhost"
} as const

export const DATABASE = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/quiz_app",
  DB_NAME: process.env.DB_NAME || "quiz_app"
} as const

export const JWT = {
  SECRET: process.env.JWT_SECRET || "fallback-jwt-secret-change-in-production",
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-change-in-production",
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d"
} as const

export const CORS_CONFIG = {
  ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000"
} as const

export const RATE_LIMIT = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10)
} as const

export const BCRYPT = {
  SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10)
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

export const MESSAGES = {
  SERVER_STARTED: "Server started successfully",
  DATABASE_CONNECTED: "Database connected successfully",
  DATABASE_ERROR: "Database connection error",
  VALIDATION_ERROR: "Validation error",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  INTERNAL_ERROR: "Internal server error",
  TOO_MANY_REQUESTS: "Too many requests"
} as const

export const COLLECTIONS = {
  USERS: "users",
  QUIZZES: "quizzes",
  QUESTIONS: "questions",
  RESULTS: "quiz_results",
  ATTEMPTS: "quiz_attempts",
  SESSIONS: "quiz_sessions",
  CATEGORIES: "categories",
  ACHIEVEMENTS: "achievements",
  NOTIFICATIONS: "notifications"
} as const

export const OTP = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
  LENGTH: 6
} as const

export const PASSWORD_RESET = {
  TOKEN_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3
} as const

export const EMAIL_VERIFICATION = {
  TOKEN_EXPIRY_HOURS: 24
} as const

export const QUIZ_SETTINGS = {
  MAX_QUESTIONS_PER_QUIZ: 100,
  MAX_OPTIONS_PER_QUESTION: 6,
  MIN_OPTIONS_PER_QUESTION: 2,
  MAX_TIME_LIMIT_MINUTES: 300,
  MIN_TIME_LIMIT_MINUTES: 1,
  DEFAULT_PASSING_SCORE: 60
} as const

export const SESSION_SETTINGS = {
  MAX_PARTICIPANTS: 500,
  DEFAULT_QUESTION_TIME: 30,
  MAX_QUESTION_TIME: 300,
  MIN_QUESTION_TIME: 5,
  SESSION_CODE_LENGTH: 6
} as const
