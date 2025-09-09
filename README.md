# Quiz App Backend (Express + TypeScript)

Backend for a quiz application built with Express.js, TypeScript, and MongoDB. It provides authentication, user management, quiz creation/taking, analytics, multi-language support, and modern security measures.

## 🚀 Key Features

- **Auth & RBAC**: JWT authentication with role-based access (Admin, Teacher, Student)
- **User Management**: Profile, avatar, active status, roles
- **Quiz Management**: Create/update/delete quizzes, question bank, time limit, difficulty, category, tags
- **Taking & Scoring**: Progress tracking, autosave, pause/resume, anti-cheat, leaderboard
- **Results & Analytics**: Detailed results, dashboards, statistics
- **Uploads**: Question images and user avatars
- **Security**: Rate limiting, CORS, Helmet, input validation/sanitization, password hashing
- **Clean Architecture**: Clear Controller/Service/Model/Middleware layers, strict TypeScript

## 📚 API Docs (Swagger)

- Swagger UI: `http://<HOST>:<PORT>/api-docs`

## 🏗️ Project Structure

```
src/
├── constants/          # Constants and config
├── controllers/        # Request handlers (AuthController, QuizController, ...)
├── middlewares/        # auth, validation, error handler, security, i18n
├── models/             # Mongoose models (User, Quiz, QuizAttempt, ...)
├── routes/             # API routes
├── services/           # Business logic (UserService, QuizService, ...)
├── utils/              # Utilities (errors, asyncHandler, database, i18n)
├── app.ts              # Express app initialization, middlewares
├── index.ts            # Entry point
└── type.d.ts           # Global types
```

## 📋 Requirements

- Node.js >= 18
- MongoDB >= 5
- npm or yarn

## 🛠️ Setup & Run

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd server_quizz
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env`
   ```env
   # Server
   NODE_ENV=development
   PORT=5000
   HOST=localhost

   # Database
   MONGODB_URI=mongodb://localhost:27017/quiz_app
   DB_NAME=quiz_app

   # JWT
   JWT_SECRET=change-me
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=change-me-too
   JWT_REFRESH_EXPIRES_IN=30d

   # CORS
   CORS_ORIGIN=http://localhost:3000

   # Rate limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Bcrypt
   BCRYPT_SALT_ROUNDS=12
   ```

4. Start MongoDB and run the app
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## 🔧 Scripts

- `npm run dev`: Start dev server (hot reload)
- `npm run build`: Build TypeScript
- `npm start`: Start production server
- `npm run lint`: Run lint
- `npm run lint:fix`: Fix lint
- `npm run prettier`: Check formatting
- `npm run prettier:fix`: Fix formatting

## 🔐 Authentication & Roles

- JWT: Access token (7 days), Refresh token (30 days, httpOnly cookie)
- Roles: **Admin** (full access), **Teacher** (manage own quizzes), **Student** (take quizzes, view results)

## 🛡️ Security

- Rate limiting, CORS, Helmet, input sanitization (XSS), Joi validation
- Password hashing with bcrypt; account lockout policy for repeated failed logins

## 🗄️ Data Models (summary)

- `User`: profile, role, avatar, active status
- `Quiz`: title, description, questions, time limit, difficulty, category, points, status
- `QuizAttempt`, `QuizResult`: attempt progress, scoring, analytics

## 🚀 Deployment

Sample Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

Production checklist: set `NODE_ENV=production`, strong secrets, proper CORS, HTTPS, logging/monitoring, MongoDB with auth.

## 🤝 Contributing

1) Fork 2) Create feature branch 3) Commit 4) Push 5) Open PR

## 📝 License

ISC License.

## ❓ Support

- Open an issue in the repo
- See Swagger docs at `/api-docs`
- Check logs and error messages for diagnosis
