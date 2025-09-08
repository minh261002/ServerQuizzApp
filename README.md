# Quiz App Backend Server

A comprehensive backend server for a quiz application built with Express.js, TypeScript, and MongoDB. This server provides a robust API for user authentication, quiz management, and quiz-taking functionality with role-based access control.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Teacher, Student)
- **User Management**: Complete user CRUD operations with profile management
- **Quiz Management**: Create, read, update, delete quizzes with questions and answers
- **Security**: Comprehensive security measures including rate limiting, CORS, helmet, and input validation
- **Error Handling**: Centralized error handling with custom error classes
- **Validation**: Input validation using Joi schema validation
- **Database**: MongoDB with Mongoose ODM
- **Architecture**: Clean architecture with OOP principles, services, and controllers
- **Middleware**: Custom middleware for authentication, validation, error handling, and security
- **TypeScript**: Full TypeScript support with strict type checking

## 🏗️ Architecture

The application follows a clean architecture pattern with the following structure:

```
src/
├── constants/          # Application constants and configuration
├── controllers/        # Request handlers (BaseController, AuthController, etc.)
├── middlewares/        # Custom middleware (auth, validation, error handling, security)
├── models/            # Database models (User, Quiz)
├── routes/            # API routes definition
├── services/          # Business logic layer (BaseService, UserService, QuizService)
├── utils/             # Utility functions (errors, async handlers, database)
├── app.ts             # Express application setup
├── index.ts           # Application entry point
└── type.d.ts          # Global type definitions
```

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server_quizz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   HOST=localhost

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/quiz_app
   DB_NAME=quiz_app

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-in-production
   JWT_REFRESH_EXPIRES_IN=30d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Bcrypt Configuration
   BCRYPT_SALT_ROUNDS=12
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run prettier` - Check code formatting
- `npm run prettier:fix` - Fix code formatting

## 📚 API Documentation

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | User login | Public |
| POST | `/logout` | User logout | Private |
| POST | `/refresh` | Refresh access token | Public |
| GET | `/profile` | Get user profile | Private |
| PUT | `/profile` | Update user profile | Private |
| PUT | `/change-password` | Change password | Private |

### User Management Routes (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/` | Get all users | Admin |
| GET | `/stats` | Get user statistics | Admin |
| GET | `/:id` | Get user by ID | Admin |
| PUT | `/:id` | Update user | Admin |
| DELETE | `/:id` | Delete user | Admin |
| PATCH | `/:id/status` | Toggle user status | Admin |

### Quiz Routes (`/api/quizzes`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/` | Get all quizzes | Public |
| POST | `/` | Create new quiz | Teacher/Admin |
| GET | `/my` | Get user's quizzes | Teacher/Admin |
| GET | `/popular-categories` | Get popular categories | Public |
| GET | `/recommendations` | Get quiz recommendations | Public |
| GET | `/:id` | Get quiz for taking | Public |
| GET | `/:id/answers` | Get quiz with answers | Creator/Admin |
| PUT | `/:id` | Update quiz | Creator/Admin |
| DELETE | `/:id` | Delete quiz | Creator/Admin |
| PATCH | `/:id/status` | Toggle quiz status | Creator/Admin |
| GET | `/:id/stats` | Get quiz statistics | Creator/Admin |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Access Token**: Short-lived token (7 days) sent in Authorization header
2. **Refresh Token**: Long-lived token (30 days) stored in httpOnly cookie

### Usage Example

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'user@example.com', password: 'password' })
});

// Use token in subsequent requests
const token = response.data.token;
fetch('/api/quizzes', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 👥 User Roles

- **Admin**: Full access to all resources and user management
- **Teacher**: Can create, manage own quizzes, and view quiz statistics
- **Student**: Can take quizzes and view results

## 🛡️ Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Joi schema validation
- **Input Sanitization**: XSS protection
- **Password Hashing**: Bcrypt with configurable salt rounds
- **JWT Security**: Secure token handling with refresh mechanism

## 📊 Database Schema

### User Model
```typescript
{
  username: string;
  email: string;
  password: string; // hashed
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Quiz Model
```typescript
{
  title: string;
  description: string;
  createdBy: ObjectId; // User reference
  questions: Question[];
  timeLimit: number; // minutes
  isActive: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Question Schema
```typescript
{
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
  points: number;
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/quiz_app` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |

## 🧪 Testing

The application includes comprehensive error handling and validation. To test the API:

1. Use tools like Postman, Insomnia, or curl
2. Start with user registration and login
3. Use the returned JWT token for authenticated requests
4. Test different user roles and permissions

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up MongoDB with authentication
5. Use HTTPS in production
6. Configure proper logging
7. Set up monitoring and health checks

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error messages and logs

## 📈 Future Enhancements

- Quiz result tracking and analytics
- Real-time quiz sessions with WebSocket
- File upload for quiz images
- Quiz templates and categories management
- Email notifications
- API documentation with Swagger
- Unit and integration tests
- Caching with Redis
- Microservices architecture
