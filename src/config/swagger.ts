import swaggerJsdoc from "swagger-jsdoc"
import { ENV } from "~/constants"

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Quiz App API",
      version: "1.0.0",
      description: `
        A comprehensive Quiz Application API with multi-language support, 
        authentication, quiz management, and analytics.
        
        ## Features
        - 🔐 JWT Authentication with role-based access
        - 🌍 Multi-language support (English, Vietnamese)
        - 📝 Complete Quiz Management System
        - 🖼️ Image upload for questions and avatars
        - 📊 Analytics and Statistics
        - 👥 User Management
        - 🔒 Security features (rate limiting, validation, etc.)
      `,
      contact: {
        name: "API Support",
        email: "support@quizapp.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: `http://localhost:${ENV.PORT || 3000}`,
        description: "Development server"
      },
      {
        url: "https://api.quizapp.com",
        description: "Production server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token"
        }
      },
      parameters: {
        LanguageHeader: {
          name: "X-Language",
          in: "header",
          description: "Language preference for response messages",
          required: false,
          schema: {
            type: "string",
            enum: ["en", "vi"],
            default: "en"
          }
        },
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10
          }
        },
        SearchParam: {
          name: "search",
          in: "query",
          description: "Search query string",
          required: false,
          schema: {
            type: "string"
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        ForbiddenError: {
          description: "Access forbidden - insufficient permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationErrorResponse"
              }
            }
          }
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      },
      schemas: {
        // Base Response Schemas
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Operation completed successfully"
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00.000Z"
            },
            data: {
              type: "object",
              description: "Response data (varies by endpoint)"
            }
          },
          required: ["success", "message", "timestamp"]
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false
            },
            message: {
              type: "string",
              example: "An error occurred"
            },
            statusCode: {
              type: "integer",
              example: 400
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00.000Z"
            },
            path: {
              type: "string",
              example: "/api/endpoint"
            }
          },
          required: ["success", "message", "statusCode", "timestamp", "path"]
        },
        ValidationErrorResponse: {
          allOf: [
            { $ref: "#/components/schemas/ErrorResponse" },
            {
              type: "object",
              properties: {
                errors: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/ValidationErrorDetail"
                  }
                }
              }
            }
          ]
        },
        ValidationErrorDetail: {
          type: "object",
          properties: {
            field: {
              type: "string",
              example: "email"
            },
            message: {
              type: "string",
              example: "Please provide a valid email address"
            },
            type: {
              type: "string",
              enum: ["body", "query", "params"],
              example: "body"
            }
          },
          required: ["field", "message", "type"]
        },
        PaginationInfo: {
          type: "object",
          properties: {
            totalDocuments: {
              type: "integer",
              example: 100
            },
            totalPages: {
              type: "integer",
              example: 10
            },
            currentPage: {
              type: "integer",
              example: 1
            },
            hasNextPage: {
              type: "boolean",
              example: true
            },
            hasPrevPage: {
              type: "boolean",
              example: false
            }
          },
          required: ["totalDocuments", "totalPages", "currentPage", "hasNextPage", "hasPrevPage"]
        }
      }
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization endpoints"
      },
      {
        name: "Users",
        description: "User management operations"
      },
      {
        name: "Quizzes",
        description: "Quiz creation and management"
      },
      {
        name: "Quiz Results",
        description: "Quiz results and analytics"
      },
      {
        name: "Quiz Attempts",
        description: "Quiz attempt management"
      },
      {
        name: "Statistics",
        description: "System statistics and analytics"
      },
      {
        name: "Upload",
        description: "File upload operations"
      }
    ]
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/models/*.ts"]
}

export const specs = swaggerJsdoc(options)
export default specs
