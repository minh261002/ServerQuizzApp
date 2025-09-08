import { App } from "./app"

/**
 * Main entry point
 */
async function main() {
  const app = new App()

  // Handle process signals for graceful shutdown
  process.on("SIGTERM", () => app.shutdown())
  process.on("SIGINT", () => app.shutdown())

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason)
    app.shutdown()
  })

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error)
    app.shutdown()
  })

  // Start the server
  await app.start()
}

// Start the application
main().catch((error) => {
  console.error("❌ Failed to start application:", error)
  process.exit(1)
})
