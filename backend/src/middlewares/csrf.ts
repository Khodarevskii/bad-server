import crypto from 'crypto'
import { CookieOptions, NextFunction, Request, Response } from 'express'
import ForbiddenError from '../errors/forbidden-error'

const CSRF_COOKIE_NAME = '_csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

const cookieOptions: CookieOptions = {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
}

const generateToken = (): string =>
    crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')

// Безопасное сравнение строк фиксированной длины.
const safeCompare = (a: string, b: string): boolean => {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    if (a.length !== b.length) return false
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
    } catch {
        return false
    }
}

// Помещает CSRF токен в cookie на любом запросе, если его еще нет.
// Cookie не httpOnly — фронтенд читает его и отправляет в заголовке
// X-CSRF-Token при изменяющих состояние запросах (double-submit pattern).
export const csrfTokenIssuer = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const existing = req.cookies?.[CSRF_COOKIE_NAME]
    let token =
        typeof existing === 'string' &&
        existing.length === CSRF_TOKEN_LENGTH * 2
            ? existing
            : null
    if (!token) {
        token = generateToken()
        res.cookie(CSRF_COOKIE_NAME, token, cookieOptions)
    }
    res.setHeader('X-CSRF-Token', token)
    res.locals.csrfToken = token
    next()
}

// Эндпоинт для явного получения CSRF токена клиентом.
export const csrfTokenHandler = (_req: Request, res: Response) => {
    res.json({ csrfToken: res.locals.csrfToken })
}

// Список путей, которые освобождаются от CSRF проверки —
// у них либо собственная защита (учетные данные/refresh-токен в cookie),
// либо они не изменяют состояние, либо это первый запрос пользователя,
// у которого еще не было возможности получить токен.
const exemptPaths = new Set<string>([
    '/auth/login',
    '/auth/register',
    '/auth/token',
    '/auth/logout',
    '/auth/csrf',
    '/auth/csrf-token',
])

// Проверяет CSRF токен по double-submit паттерну: значение в cookie должно
// совпадать со значением в заголовке X-CSRF-Token.
export const csrfProtection = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    if (safeMethods.includes(req.method)) return next()
    if (exemptPaths.has(req.path)) return next()

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
    const headerToken = req.header(CSRF_HEADER_NAME)

    if (
        typeof cookieToken !== 'string' ||
        typeof headerToken !== 'string' ||
        !cookieToken ||
        !headerToken ||
        !safeCompare(cookieToken, headerToken)
    ) {
        return next(new ForbiddenError('Не валидный CSRF токен'))
    }

    return next()
}

export const CSRF_HEADER = CSRF_HEADER_NAME
export const CSRF_COOKIE = CSRF_COOKIE_NAME
