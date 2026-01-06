import mongoose from "mongoose";

/**
 * Escape special regex characters to prevent ReDoS and NoSQL injection
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param id - The string to validate
 * @returns boolean indicating if it's a valid ObjectId
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (!id || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id) &&
         new mongoose.Types.ObjectId(id).toString() === id;
}

/**
 * Sanitize string input to prevent injection
 * @param input - The input to sanitize
 * @param maxLength - Maximum allowed length (default 500)
 * @returns Sanitized string
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") return "";

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/\0/g, "");

  return sanitized;
}

/**
 * Validate email format
 * @param email - The email to validate
 * @returns boolean indicating if it's a valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number
 * @param password - The password to validate
 * @returns object with isValid and message
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
  }

  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { isValid: false, message: "Password must be less than 128 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }

  return { isValid: true, message: "Password is valid" };
}

/**
 * Simple in-memory rate limiter for API routes
 * Note: In production, use Redis or similar for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for an IP/identifier
 * @param identifier - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window has reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Get client IP from request headers
 * @param headers - Request headers
 * @returns IP address string
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Validate GSTIN format (India)
 * Format: 2 digits state code + 10 char PAN + 1 entity code + 1 check digit + Z
 * @param gstin - The GSTIN to validate
 * @returns boolean indicating if it's a valid GSTIN format
 */
export function isValidGSTIN(gstin: string): boolean {
  if (!gstin || typeof gstin !== "string") return false;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase());
}

/**
 * Account lockout tracking
 */
interface LockoutEntry {
  failedAttempts: number;
  lockoutUntil: number | null;
  lastAttempt: number;
}

const lockoutStore = new Map<string, LockoutEntry>();

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore) {
    // Remove entries that haven't been used in 24 hours
    if (now - entry.lastAttempt > 24 * 60 * 60 * 1000) {
      lockoutStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Check if an account is locked and record failed attempts
 * @param identifier - Email or unique identifier
 * @param maxAttempts - Maximum failed attempts before lockout (default 5)
 * @param lockoutDurationMs - Duration of lockout in ms (default 15 minutes)
 * @returns object with locked status and remaining attempts
 */
export function checkAccountLockout(
  identifier: string,
  maxAttempts: number = 5,
  lockoutDurationMs: number = 15 * 60 * 1000
): { locked: boolean; remainingAttempts: number; lockoutUntil: number | null } {
  const now = Date.now();
  const key = identifier.toLowerCase();

  const entry = lockoutStore.get(key);

  if (!entry) {
    return { locked: false, remainingAttempts: maxAttempts, lockoutUntil: null };
  }

  // Check if lockout has expired
  if (entry.lockoutUntil && now > entry.lockoutUntil) {
    // Reset after lockout expires
    lockoutStore.delete(key);
    return { locked: false, remainingAttempts: maxAttempts, lockoutUntil: null };
  }

  // Still locked
  if (entry.lockoutUntil && now < entry.lockoutUntil) {
    return { locked: true, remainingAttempts: 0, lockoutUntil: entry.lockoutUntil };
  }

  const remaining = maxAttempts - entry.failedAttempts;
  return { locked: false, remainingAttempts: remaining, lockoutUntil: null };
}

/**
 * Record a failed login attempt
 * @param identifier - Email or unique identifier
 * @param maxAttempts - Maximum failed attempts before lockout
 * @param lockoutDurationMs - Duration of lockout in ms
 */
export function recordFailedAttempt(
  identifier: string,
  maxAttempts: number = 5,
  lockoutDurationMs: number = 15 * 60 * 1000
): void {
  const now = Date.now();
  const key = identifier.toLowerCase();

  const entry = lockoutStore.get(key) || {
    failedAttempts: 0,
    lockoutUntil: null,
    lastAttempt: now,
  };

  entry.failedAttempts++;
  entry.lastAttempt = now;

  // Trigger lockout if max attempts exceeded
  if (entry.failedAttempts >= maxAttempts) {
    entry.lockoutUntil = now + lockoutDurationMs;
  }

  lockoutStore.set(key, entry);
}

/**
 * Clear failed attempts after successful login
 * @param identifier - Email or unique identifier
 */
export function clearFailedAttempts(identifier: string): void {
  lockoutStore.delete(identifier.toLowerCase());
}
