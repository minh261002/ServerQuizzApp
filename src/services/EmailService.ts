import nodemailer, { Transporter } from "nodemailer"
import { ENV } from "~/constants"

/**
 * Email template interface
 */
interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Email service class
 */
export class EmailService {
  private transporter: Transporter
  private static instance: EmailService

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Send email
   */
  private async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (ENV.NODE_ENV === "development") {
      console.log(`📧 Email would be sent to: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Content: ${text || html}`)
      return
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || "Quiz App <noreply@quizapp.com>",
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, "") // Strip HTML for text version
      })
    } catch (error) {
      console.error("Failed to send email:", error)
      throw new Error("Failed to send email")
    }
  }

  /**
   * Send OTP email
   */
  async sendOTP(email: string, otp: string, name: string): Promise<void> {
    const template = this.getOTPTemplate(otp, name)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string, name: string): Promise<void> {
    const template = this.getPasswordResetTemplate(resetToken, name)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(email: string, verificationToken: string, name: string): Promise<void> {
    const template = this.getEmailVerificationTemplate(verificationToken, name)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const template = this.getWelcomeTemplate(name)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send quiz completion notification
   */
  async sendQuizCompletionNotification(
    email: string,
    name: string,
    quizTitle: string,
    score: number,
    maxScore: number,
    percentage: number
  ): Promise<void> {
    const template = this.getQuizCompletionTemplate(name, quizTitle, score, maxScore, percentage)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send quiz invitation
   */
  async sendQuizInvitation(email: string, name: string, quizTitle: string, inviteLink: string): Promise<void> {
    const template = this.getQuizInvitationTemplate(name, quizTitle, inviteLink)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Send quiz reminder
   */
  async sendQuizReminder(email: string, name: string, quizTitle: string, dueDate: Date): Promise<void> {
    const template = this.getQuizReminderTemplate(name, quizTitle, dueDate)
    await this.sendEmail(email, template.subject, template.html, template.text)
  }

  /**
   * Get OTP email template
   */
  private getOTPTemplate(otp: string, name: string): EmailTemplate {
    return {
      subject: "Your Quiz App Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verification Code</h2>
          <p>Hello ${name},</p>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, Your verification code is: ${otp}. This code will expire in 5 minutes.`
    }
  }

  /**
   * Get password reset email template
   */
  private getPasswordResetTemplate(resetToken: string, name: string): EmailTemplate {
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`

    return {
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello ${name},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, You requested to reset your password. Visit this link: ${resetUrl} (expires in 10 minutes)`
    }
  }

  /**
   * Get email verification template
   */
  private getEmailVerificationTemplate(verificationToken: string, name: string): EmailTemplate {
    const verificationUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/verify-email/${verificationToken}`

    return {
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #28a745;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, Please verify your email address by visiting: ${verificationUrl} (expires in 24 hours)`
    }
  }

  /**
   * Get welcome email template
   */
  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: "Welcome to Quiz App!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Quiz App! 🎉</h2>
          <p>Hello ${name},</p>
          <p>Welcome to our quiz platform! We're excited to have you on board.</p>
          <h3>Getting Started:</h3>
          <ul>
            <li>📝 Browse available quizzes</li>
            <li>🎯 Take quizzes and track your progress</li>
            <li>📊 View your performance analytics</li>
            <li>👨‍🏫 Create your own quizzes (if you're a teacher)</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Learning</a>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Welcome to Quiz App, ${name}! Start your learning journey at ${process.env.CLIENT_URL || "http://localhost:3000"}`
    }
  }

  /**
   * Get quiz completion email template
   */
  private getQuizCompletionTemplate(
    name: string,
    quizTitle: string,
    score: number,
    maxScore: number,
    percentage: number
  ): EmailTemplate {
    const passed = percentage >= 60
    const emoji = passed ? "🎉" : "📚"
    const message = passed ? "Congratulations!" : "Keep practicing!"

    return {
      subject: `Quiz Completed: ${quizTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${message} ${emoji}</h2>
          <p>Hello ${name},</p>
          <p>You have completed the quiz: <strong>${quizTitle}</strong></p>
          <div style="background: ${passed ? "#d4edda" : "#f8d7da"}; border: 1px solid ${passed ? "#c3e6cb" : "#f5c6cb"}; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0; color: ${passed ? "#155724" : "#721c24"};">Your Results:</h3>
            <p style="font-size: 18px; margin: 10px 0;"><strong>Score: ${score}/${maxScore} (${percentage}%)</strong></p>
            <p style="margin: 0;">Grade: ${this.getGradeFromPercentage(percentage)}</p>
          </div>
          ${
            passed
              ? "<p>🎯 Great job! You passed the quiz. Keep up the excellent work!</p>"
              : "<p>💪 Don't give up! Review the material and try again.</p>"
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
          </div>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, You completed "${quizTitle}". Score: ${score}/${maxScore} (${percentage}%). ${message}`
    }
  }

  /**
   * Get quiz invitation email template
   */
  private getQuizInvitationTemplate(name: string, quizTitle: string, inviteLink: string): EmailTemplate {
    return {
      subject: `Quiz Invitation: ${quizTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You're Invited! 📝</h2>
          <p>Hello ${name},</p>
          <p>You have been invited to take the quiz: <strong>${quizTitle}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Take Quiz</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #28a745;">${inviteLink}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, You're invited to take the quiz "${quizTitle}". Link: ${inviteLink}`
    }
  }

  /**
   * Get quiz reminder email template
   */
  private getQuizReminderTemplate(name: string, quizTitle: string, dueDate: Date): EmailTemplate {
    return {
      subject: `Reminder: ${quizTitle} - Due Soon`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Quiz Reminder ⏰</h2>
          <p>Hello ${name},</p>
          <p>This is a friendly reminder that you have a quiz due soon:</p>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0; color: #856404;">📝 ${quizTitle}</h3>
            <p style="margin: 10px 0;"><strong>Due: ${dueDate.toLocaleDateString()}</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard" style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Quiz</a>
          </div>
          <hr>
          <p style="color: #666; font-size: 12px;">Quiz App Team</p>
        </div>
      `,
      text: `Hello ${name}, Reminder: "${quizTitle}" is due on ${dueDate.toLocaleDateString()}.`
    }
  }

  /**
   * Get grade from percentage
   */
  private getGradeFromPercentage(percentage: number): string {
    if (percentage >= 90) return "A"
    if (percentage >= 80) return "B"
    if (percentage >= 70) return "C"
    if (percentage >= 60) return "D"
    return "F"
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      console.log("✅ Email service is ready")
      return true
    } catch (error) {
      console.error("❌ Email service configuration error:", error)
      return false
    }
  }
}
