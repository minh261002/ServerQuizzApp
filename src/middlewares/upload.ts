import multer from "multer"
import path from "path"
import fs from "fs"
import { Request } from "express"
import { BadRequestError } from "~/utils/errors"

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads", "images")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir)
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname).toLowerCase()
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`)
  }
})

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file is an image
  if (!file.mimetype.startsWith("image/")) {
    return cb(new BadRequestError("Only image files are allowed"))
  }

  // Check file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
  const fileExtension = path.extname(file.originalname).toLowerCase()

  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new BadRequestError("Invalid file extension. Only JPG, JPEG, PNG, GIF, WebP, and SVG files are allowed"))
  }

  cb(null, true)
}

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Maximum 10 files per request
  }
})

// Export different upload configurations
export const uploadSingle = (fieldName: string) => upload.single(fieldName)
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => upload.array(fieldName, maxCount)
export const uploadFields = (fields: Array<{ name: string; maxCount?: number }>) => upload.fields(fields)

// Utility function to get image URL
export const getImageUrl = (filename: string): string => {
  if (!filename) return ""
  return `/uploads/images/${filename}`
}

// Utility function to delete uploaded file
export const deleteUploadedFile = (filename: string): void => {
  if (!filename) return

  const filePath = path.join(uploadsDir, filename)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (error) {
      console.error(`Failed to delete file ${filename}:`, error)
    }
  }
}

// Utility function to extract filename from URL
export const getFilenameFromUrl = (imageUrl: string): string => {
  if (!imageUrl) return ""
  return path.basename(imageUrl)
}

export default upload
