import { Response, CookieOptions } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db';
import config from '../config';

// Use HTTPS cookies in production; allow HTTP cookies in development.
const isProduction = process.env.NODE_ENV === 'production';

// Options applied to auth cookies across the app. Cookies are scoped to the
// root path and optionally to a specific domain via the COOKIE_DOMAIN env var.
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  path: '/',
  ...(isProduction && config.cookieDomain ? { domain: config.cookieDomain } : {}),
};

const IOS_SAFARI_REGEX = /iP(?:hone|ad|od);.*OS 12[_\d]*/i;
const IOS_WEBVIEW_REGEX = /iP(?:hone|ad|od).+AppleWebKit(?!.*Safari)/i;

function isAndroidWebView(userAgent: string): boolean {
  if (!/Android/i.test(userAgent)) return false;
  return /Version\//.test(userAgent) && !/Chrome\//.test(userAgent);
}

function isMacEmbeddedBrowser(userAgent: string): boolean {
  return /Macintosh;.*Mac OS X/.test(userAgent) && !/Safari\//.test(userAgent);
}

function isLegacyMacSafari(userAgent: string): boolean {
  if (!/Macintosh;.*Mac OS X/.test(userAgent)) return false;
  if (!/Safari\//.test(userAgent) || /Chrome\//.test(userAgent) || /Edg\//.test(userAgent)) {
    return false;
  }
  const versionMatch = userAgent.match(/Version\/(\d+)/);
  if (!versionMatch) return false;
  const majorVersion = Number.parseInt(versionMatch[1], 10);
  return Number.isFinite(majorVersion) && majorVersion < 13;
}

/**
 * Returns true when the provided user agent is compatible with
 * SameSite=None; Secure cookies. Older WebKit based browsers (notably iOS 12
 * Safari, embedded web views, and legacy macOS Safari builds) ignore the
 * `None` attribute and drop the cookie entirely. When we detect these user
 * agents we fall back to SameSite=Lax to keep logins working.
 */
export function isSameSiteNoneCompatible(userAgent?: string | null): boolean {
  if (!isProduction) {
    return true;
  }
  if (!userAgent) {
    return true;
  }

  if (IOS_SAFARI_REGEX.test(userAgent)) {
    return false;
  }

  if (IOS_WEBVIEW_REGEX.test(userAgent)) {
    return false;
  }

  if (isAndroidWebView(userAgent)) {
    return false;
  }

  if (isMacEmbeddedBrowser(userAgent)) {
    return false;
  }

  if (isLegacyMacSafari(userAgent)) {
    return false;
  }

  return true;
}

export function getCookieOptions(userAgent?: string | null): CookieOptions {
  const sameSite: CookieOptions['sameSite'] = isProduction
    ? isSameSiteNoneCompatible(userAgent)
      ? 'none'
      : 'lax'
    : 'lax';

  return {
    ...baseCookieOptions,
    sameSite,
  };
}

export const cookieOptions = getCookieOptions();

export function getRefreshExpiryMs(): number {
  return config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
}

export type AuthPayload = {
  id: number;
  role: string;
  /**
   * The category of user these tokens are for. Volunteers use the same
   * refresh-token flow as staff and clients so include them here.
   */
  type: 'user' | 'staff' | 'volunteer';
  access?: string[];
  /** Optional fields used for volunteer/user hybrids */
  userId?: number;
  userRole?: string;
};

/**
 * Generates auth and refresh tokens, persists the refresh token, and sets the
 * appropriate cookies on the response object.
 */
export async function issueAuthTokens(
  res: Response,
  payload: AuthPayload,
  subject: string,
  userAgent?: string | null,
) {
  const jti = randomUUID();
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
  const refreshExpiryMs = getRefreshExpiryMs();
  const refreshToken = jwt.sign({ ...payload, jti }, config.jwtRefreshSecret, {
    expiresIn: Math.floor(refreshExpiryMs / 1000),
    algorithm: 'HS256',
  });

  const refreshExpiresAt = new Date(Date.now() + refreshExpiryMs);

  await pool.query(
    `INSERT INTO refresh_tokens (token_id, subject, expires_at) VALUES ($1,$2,$3)`,
    [jti, subject, refreshExpiresAt],
  );

  const resolvedCookieOptions = getCookieOptions(userAgent);

  res.cookie('token', token, {
    ...resolvedCookieOptions,
    maxAge: 60 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...resolvedCookieOptions,
    maxAge: refreshExpiryMs,
    expires: refreshExpiresAt,
  });

  return { token, refreshToken };
}

export default issueAuthTokens;
