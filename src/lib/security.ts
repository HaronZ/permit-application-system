// Security Configuration and Utilities
import { z } from 'zod';

// Security configuration
export const SECURITY_CONFIG = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  
  // Rate limiting
  rateLimit: {
    loginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    apiRequests: 100,
    apiWindow: 15 * 60 * 1000, // 15 minutes
  },
  
  // File upload restrictions
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFiles: 10,
  },
  
  // Session security
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 60 * 60 * 1000, // 1 hour
  },
  
  // CORS settings
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
};

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Phone number validation (Philippines)
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+63|0)9\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

// Password strength validation
export function validatePassword(password: string): {
  isValid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < SECURITY_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.password.minLength} characters long`);
  } else {
    score++;
  }

  if (SECURITY_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score++;
  }

  if (SECURITY_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score++;
  }

  if (SECURITY_CONFIG.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score++;
  }

  if (SECURITY_CONFIG.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score++;
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 5),
    errors,
  };
}

// File validation
export function validateFile(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (file.size > SECURITY_CONFIG.fileUpload.maxSize) {
    errors.push(`File size must be less than ${SECURITY_CONFIG.fileUpload.maxSize / 1024 / 1024}MB`);
  }

  if (!SECURITY_CONFIG.fileUpload.allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx'];
  if (extension && !allowedExtensions.includes(extension)) {
    errors.push('File extension not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// SQL Injection prevention
export function sanitizeSQL(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove SQL block comments
    .replace(/union\s+select/gi, '') // Remove UNION SELECT
    .replace(/drop\s+table/gi, '') // Remove DROP TABLE
    .replace(/delete\s+from/gi, '') // Remove DELETE FROM
    .replace(/insert\s+into/gi, '') // Remove INSERT INTO
    .replace(/update\s+set/gi, ''); // Remove UPDATE SET
}

// XSS prevention
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSRF token generation
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting check
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Validation schemas
export const securitySchemas = {
  email: z.string().email('Invalid email address').max(254, 'Email too long'),
  
  phone: z.string()
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long')
    .refine(isValidPhoneNumber, 'Invalid phone number format'),
  
  password: z.string()
    .min(SECURITY_CONFIG.password.minLength, `Password must be at least ${SECURITY_CONFIG.password.minLength} characters`)
    .refine(
      (password) => validatePassword(password).isValid,
      (password) => ({ message: validatePassword(password).errors.join(', ') })
    ),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .refine(
      (name) => /^[a-zA-Z\s]+$/.test(name),
      'Name can only contain letters and spaces'
    ),
  
  applicationType: z.enum(['business', 'building', 'barangay']),
  
  applicationStatus: z.enum(['submitted', 'under_review', 'approved', 'ready_for_pickup', 'rejected']),
};

// Security headers
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.supabase.co https://www.google-analytics.com; frame-src 'self' https://www.google.com;",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Audit logging
export interface AuditLog {
  action: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: number;
}

export function createAuditLog(
  action: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
): AuditLog {
  return {
    action,
    userId,
    ipAddress,
    userAgent,
    details,
    timestamp: Date.now(),
  };
}

// Security utilities
export const securityUtils = {
  sanitizeInput,
  isValidEmail,
  isValidPhoneNumber,
  validatePassword,
  validateFile,
  sanitizeSQL,
  escapeHtml,
  generateCSRFToken,
  checkRateLimit,
  createAuditLog,
};
