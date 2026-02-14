import { LRUCache } from 'lru-cache';

// Simple in-memory rate limiter
// For production, consider Redis or similar

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const cache = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Rate limit by IP + endpoint
export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // 1 minute
): RateLimitResult {
  const now = Date.now();
  const entry = cache.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + windowMs;
    cache.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: resetTime,
    };
  }

  // Increment current window
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetTime,
  };
}
