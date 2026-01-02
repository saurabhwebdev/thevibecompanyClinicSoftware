/**
 * Application Configuration
 * All configuration values are read from environment variables
 */

export const config = {
  // App
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Clinic Management System",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    env: process.env.NEXT_PUBLIC_APP_ENV || "development",
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
  },

  // Database
  db: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/clinic_management",
  },

  // Authentication
  auth: {
    nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
    nextAuthSecret: process.env.NEXTAUTH_SECRET || "",
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // API
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    rateLimit: parseInt(process.env.API_RATE_LIMIT || "100", 10),
    rateLimitWindow: parseInt(process.env.API_RATE_LIMIT_WINDOW || "60000", 10),
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB default
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/gif,application/pdf").split(","),
  },

  // Email (Optional)
  email: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@clinic.com",
  },

  // Third-party Services
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "debug",
    sentryDsn: process.env.SENTRY_DSN || "",
  },

  // Feature Flags
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== "false",
  },
} as const;

export default config;
