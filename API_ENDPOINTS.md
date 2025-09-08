# Quiz App API Endpoints

Comprehensive documentation for all available API endpoints in the Quiz App backend.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Routes (`/api/auth`)

### Public Endpoints

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/register` | Register new user | `username`, `email`, `password`, `firstName`, `lastName`, `role?` |
| `POST` | `/login` | User login | `identifier` (email/username), `password` |
| `POST` | `/refresh` | Refresh access token | Cookie: `refreshToken` |
| `POST` | `/request-reset` | Request password reset OTP | `email` |
| `POST` | `/verify-reset-otp` | Verify reset OTP | `email`, `otp` |
| `POST` | `/reset-password` | Reset password | `resetToken`, `newPassword` |
| `POST` | `/send-verification` | Send email verification OTP | `email` |
| `POST` | `/verify-email` | Verify email with OTP | `email`, `otp` |

### Protected Endpoints

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/logout` | User logout | - |
| `GET` | `/profile` | Get user profile | - |
| `PUT` | `/profile` | Update profile | `firstName?`, `lastName?`, `avatar?` |
| `PUT` | `/change-password` | Change password | `currentPassword`, `newPassword` |
| `POST` | `/resend-verification` | Resend verification | - |
| `PUT` | `/preferences` | Update preferences | `language?`, `timezone?`, `emailNotifications?`, `pushNotifications?`, `theme?` |
| `GET` | `/dashboard` | Get user dashboard | - |
| `POST` | `/upload-avatar` | Upload user avatar | Form data with `avatar` field (single file) |
| `DELETE` | `/avatar` | Delete user avatar | - |

---

## 👥 User Management Routes (`/api/users`)

*All endpoints require authentication. Most require admin role.*

| Method | Endpoint | Description | Access | Parameters |
|--------|----------|-------------|---------|------------|
| `GET` | `/` | Get all users | Admin | `page?`, `limit?`, `search?`, `role?` |
| `GET` | `/stats` | Get user statistics | Admin | - |
| `GET` | `/:id` | Get user by ID | Admin | - |
| `PUT` | `/:id` | Update user | Admin | `username?`, `email?`, `firstName?`, `lastName?`, `role?`, `isActive?` |
| `DELETE` | `/:id` | Delete user | Admin | - |
| `PATCH` | `/:id/status` | Toggle user status | Admin | `isActive` |
| `POST` | `/upload-avatar` | Upload user avatar | Private | Form data with `avatar` field (single file) |
| `DELETE` | `/avatar` | Delete user avatar | Private | - |

---

## 📝 Quiz Routes (`/api/quizzes`)

### Public Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/` | Get all quizzes | `page?`, `limit?`, `category?`, `difficulty?`, `search?`, `isActive?` |
| `GET` | `/:id` | Get quiz (for taking) | - |
| `GET` | `/popular-categories` | Get popular categories | `limit?` |
| `GET` | `/recommendations` | Get recommendations | `difficulty?`, `categories?`, `limit?` |

### Protected Endpoints

| Method | Endpoint | Description | Access | Parameters |
|--------|----------|-------------|---------|------------|
| `POST` | `/` | Create quiz | Teacher/Admin | `title`, `description`, `questions`, `timeLimit`, `difficulty?`, `category`, `tags?`, + settings |
| `GET` | `/my` | Get user's quizzes | Teacher/Admin | `page?`, `limit?`, `search?` |
| `GET` | `/:id/answers` | Get quiz with answers | Creator/Admin | - |
| `PUT` | `/:id` | Update quiz | Creator/Admin | Any quiz fields |
| `DELETE` | `/:id` | Delete quiz | Creator/Admin | - |
| `PATCH` | `/:id/status` | Toggle quiz status | Creator/Admin | `isActive` |
| `GET` | `/:id/stats` | Get quiz statistics | Creator/Admin | - |
| `POST` | `/upload-images` | Upload question images | Teacher/Admin | Form data with `images` field (max 10 files) |
| `DELETE` | `/images/:filename` | Delete uploaded image | Teacher/Admin | - |

---

## 📊 Quiz Results Routes (`/api/quiz-results`)

*All endpoints require authentication.*

| Method | Endpoint | Description | Access | Parameters |
|--------|----------|-------------|---------|------------|
| `POST` | `/submit` | Submit quiz answers | Private | `quizId`, `answers`, `startTime`, `endTime`, `attemptNumber` |
| `GET` | `/my` | Get user's results | Private | `page?`, `limit?`, `quizId?`, `status?` |
| `GET` | `/quiz/:id` | Get quiz results | Teacher/Admin | `page?`, `limit?`, `userId?`, `minScore?`, `maxScore?` |
| `GET` | `/:id/detailed` | Get detailed result | Private | - |
| `POST` | `/:id/feedback` | Add feedback | Teacher/Admin | `feedback` |
| `GET` | `/best/:quizId` | Get best attempt | Private | - |
| `GET` | `/leaderboard/:id` | Get quiz leaderboard | Public | `limit?` |
| `GET` | `/stats/:id` | Get results stats | Teacher/Admin | - |

---

## ⏱️ Quiz Attempts Routes (`/api/quiz-attempts`)

*All endpoints require authentication.*

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/start` | Start quiz attempt | `quizId`, `browserInfo` |
| `POST` | `/:id/answer` | Save question answer | `questionIndex`, `answer`, `timeSpent` |
| `POST` | `/:id/navigate` | Navigate to question | `questionIndex` |
| `POST` | `/:id/pause` | Pause attempt | - |
| `POST` | `/:id/resume` | Resume attempt | - |
| `POST` | `/:id/submit` | Submit attempt | - |
| `POST` | `/:id/mark-review` | Mark for review | `questionIndex` |
| `POST` | `/:id/unmark-review` | Unmark review | `questionIndex` |
| `POST` | `/:id/activity` | Record activity | `activityType`, `details?` |
| `GET` | `/active/:quizId` | Get active attempt | - |
| `GET` | `/user/:quizId` | Get user attempts | - |
| `GET` | `/:id` | Get attempt details | - |
| `PUT` | `/:id/progress` | Update progress | `timeSpent`, `remainingTime` |

---

## 📈 Statistics Routes (`/api/statistics`)

*All endpoints require authentication.*

| Method | Endpoint | Description | Access | Parameters |
|--------|----------|-------------|---------|------------|
| `GET` | `/dashboard` | Dashboard stats | Admin | - |
| `GET` | `/my-performance` | User's performance | Private | - |
| `GET` | `/user/:id` | User performance | Teacher/Admin | - |
| `GET` | `/quiz/:id` | Quiz analytics | Creator/Admin | - |
| `GET` | `/system` | System stats | Admin | - |
| `GET` | `/popular` | Popular content | Public | `limit?`, `timeframe?` |
| `GET` | `/export/:entity` | Export stats | Admin | `type?` (json/csv) |

---

## 🔒 Security Features

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes

### Input Validation
- All inputs are validated using Joi schemas
- XSS protection through input sanitization
- SQL injection protection through Mongoose ODM

### Authentication Security
- JWT tokens with configurable expiry
- Refresh tokens stored as httpOnly cookies
- Account lockout after 5 failed login attempts
- Password hashing with bcrypt (12 salt rounds)

### Quiz Security
- Suspicious activity tracking
- Tab switch detection
- Copy/paste prevention
- Right-click disabling
- Fullscreen mode enforcement
- Proctoring capabilities

---

## 📧 Email Notifications

### Automatic Emails
- Welcome email on registration
- Email verification OTP
- Password reset OTP
- Quiz completion notifications
- Quiz invitations
- Quiz reminders

### Email Templates
All emails use responsive HTML templates with:
- Branded styling
- Clear call-to-action buttons
- Plain text fallbacks
- Security warnings

---

## 🎯 Quiz Features

### Quiz Creation
- Multiple question types
- Rich text support
- Image/media attachments (planned)
- Question pools and randomization
- Time limits and constraints
- Access control and permissions

### Quiz Taking
- Real-time progress tracking
- Auto-save functionality
- Pause and resume capability
- Question flagging for review
- Timer display and warnings
- Anti-cheating measures

### Results and Analytics
- Immediate result display
- Detailed explanations
- Performance analytics
- Leaderboards
- Progress tracking
- Achievement system (planned)

---

## 📱 Real-time Features (Planned)

### Live Quiz Sessions
- Multiplayer quiz rooms
- Real-time leaderboards
- Live chat during quizzes
- Synchronized question delivery
- Instant result sharing

### WebSocket Events
- `quiz:start` - Quiz session started
- `quiz:question` - New question delivered
- `quiz:answer` - Answer submitted
- `quiz:leaderboard` - Leaderboard updated
- `quiz:end` - Quiz session ended

---

## 🔧 Configuration

### Environment Variables
```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Quiz App <noreply@quizapp.com>

# Client URL for email links
CLIENT_URL=http://localhost:3000
```

### Quiz Settings
- Maximum 100 questions per quiz
- 2-6 options per question
- 1-300 minutes time limit
- Customizable passing scores
- Multiple attempt policies

---

## 🚀 Usage Examples

### User Registration
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student'
  })
});
```

### Taking a Quiz
```javascript
// 1. Start attempt
const attempt = await fetch('/api/quiz-attempts/start', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quizId: 'quiz_id_here',
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  })
});

// 2. Save answers
await fetch(`/api/quiz-attempts/${attemptId}/answer`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questionIndex: 0,
    answer: 2,
    timeSpent: 30
  })
});

// 3. Submit attempt
await fetch(`/api/quiz-attempts/${attemptId}/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Password Reset Flow
```javascript
// 1. Request reset OTP
await fetch('/api/auth/request-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// 2. Verify OTP
const response = await fetch('/api/auth/verify-reset-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com',
    otp: '123456'
  })
});
const { resetToken } = response.data;

// 3. Reset password
await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    resetToken,
    newPassword: 'NewSecurePass123'
  })
});
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "totalDocuments": 100,
    "totalPages": 10,
    "currentPage": 1,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2023-12-07T10:30:00.000Z",
  "path": "/api/endpoint",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "type": "validation"
    }
  ]
}
```

---

## 🎮 Quiz Features Summary

### ✅ Implemented Features

1. **User Management**
   - Registration with email verification
   - Login with account lockout protection
   - Password reset via OTP
   - User profiles and preferences
   - Role-based access control (Admin, Teacher, Student)

2. **Quiz Creation & Management**
   - Rich quiz builder with multiple settings
   - Question types with explanations and image support
   - Image upload for questions (JPG, PNG, GIF, WebP, SVG)
   - Time limits and display options
   - Access control (public/private/password/invitation)
   - Quiz versioning and cloning
   - Collaboration features

3. **Quiz Taking Experience**
   - Real-time attempt tracking
   - Auto-save functionality
   - Pause and resume capability
   - Question navigation and flagging
   - Anti-cheating measures
   - Progress indicators

4. **Results & Analytics**
   - Detailed result analysis
   - Performance statistics
   - Leaderboards and rankings
   - Progress tracking over time
   - Category and difficulty breakdowns
   - Export capabilities

5. **Security & Monitoring**
   - Suspicious activity detection
   - Browser fingerprinting
   - IP tracking and geolocation
   - Comprehensive audit logs
   - Rate limiting and DDoS protection

6. **Communication**
   - Email notifications system
   - OTP verification
   - Welcome and completion emails
   - Reminder notifications

### 🔮 Planned Features

1. **Real-time Multiplayer**
   - Live quiz sessions with WebSocket
   - Real-time leaderboards
   - Chat during quizzes
   - Synchronized question delivery

2. **Advanced Content**
   - Media questions (images, videos, audio)
   - Drawing/diagram questions
   - File upload questions
   - Mathematical formula support

3. **Gamification**
   - Achievement system
   - Badges and rewards
   - Learning streaks
   - Point systems

4. **Advanced Analytics**
   - Learning path recommendations
   - Predictive analytics
   - Performance predictions
   - Adaptive difficulty

5. **Integration Features**
   - LMS integration
   - Calendar sync
   - Social media sharing
   - Third-party authentication

---

## 🛠️ Development Notes

### Database Schema
- **Users**: Complete user profiles with preferences and statistics
- **Quizzes**: Rich quiz configuration with security settings
- **QuizResults**: Detailed result storage with analytics
- **QuizAttempts**: Real-time attempt tracking
- **QuizSessions**: Multiplayer session management

### TypeScript Implementation
- Strict typing throughout the application
- No `any` types used
- Comprehensive interfaces for all data structures
- Type-safe database operations

### Error Handling
- Custom error classes for different scenarios
- Comprehensive validation with detailed error messages
- Graceful error recovery
- Detailed logging for debugging

### Performance Optimizations
- Database indexing for common queries
- Pagination for large datasets
- Efficient aggregation pipelines
- Caching strategies (planned)

---

## 🖼️ Image Upload API Details

### Upload Question Images

**Endpoint:** `POST /api/quizzes/upload-images`

**Description:** Upload images for quiz questions. Supports multiple file upload.

**Authentication:** Required (Teacher/Admin only)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `images`: File array (max 10 files)

**Supported Formats:**
- JPG/JPEG
- PNG  
- GIF
- WebP
- SVG

**File Restrictions:**
- Maximum file size: 5MB per file
- Maximum files per request: 10

**Response:**
```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "images": [
      {
        "fieldname": "images",
        "filename": "images-1699123456789-123456789.jpg",
        "originalname": "question1.jpg",
        "mimetype": "image/jpeg",
        "size": 1024567,
        "url": "/uploads/images/images-1699123456789-123456789.jpg"
      }
    ]
  }
}
```

### Delete Uploaded Image

**Endpoint:** `DELETE /api/quizzes/images/:filename`

**Description:** Delete an uploaded image file.

**Authentication:** Required (Teacher/Admin only)

**Parameters:**
- `filename`: The filename or URL of the image to delete

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Using Images in Questions

When creating or updating a quiz, include the image URL in the question object:

```json
{
  "questions": [
    {
      "question": "What is shown in this image?",
      "image": "/uploads/images/images-1699123456789-123456789.jpg",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "This shows...",
      "points": 5
    }
  ]
}
```

### Image Storage

- Images are stored in `/public/uploads/images/` directory
- Files are accessible via `/uploads/images/filename` URL
- Unique filenames are generated to prevent conflicts
- Images are served as static files by the Express server

---

## 👤 Avatar Upload API Details

### Upload User Avatar

**Endpoint:** `POST /api/auth/upload-avatar` or `POST /api/users/upload-avatar`

**Description:** Upload avatar image for user profile. Single file upload only.

**Authentication:** Required (Users can upload their own avatar)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `avatar`: Single image file

**Supported Formats:**
- JPG/JPEG
- PNG  
- GIF
- WebP
- SVG

**File Restrictions:**
- Maximum file size: 5MB per file
- Only 1 file per request

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": "/uploads/images/avatar-1699123456789-123456789.jpg",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "fullname": "User Name",
      "avatar": "/uploads/images/avatar-1699123456789-123456789.jpg",
      // ... other user fields
    }
  }
}
```

### Delete User Avatar

**Endpoint:** `DELETE /api/auth/avatar` or `DELETE /api/users/avatar`

**Description:** Delete current user's avatar image.

**Authentication:** Required (Users can delete their own avatar)

**Response:**
```json
{
  "success": true,
  "message": "Avatar deleted successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com", 
      "fullname": "User Name",
      "avatar": null,
      // ... other user fields
    }
  }
}
```

### Avatar Storage

- Avatars are stored in `/public/uploads/images/` directory
- Files are accessible via `/uploads/images/filename` URL
- When uploading a new avatar, the old avatar file is automatically deleted
- Avatar URLs are stored in the user's profile and returned in authentication responses

This API provides a solid foundation for a modern, feature-rich quiz application with room for future enhancements and scalability.
