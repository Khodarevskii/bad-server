import rateLimit from 'express-rate-limit'
import { Router } from 'express'
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import { csrfTokenHandler } from '../middlewares/csrf'
import {
    validateAuthentication,
    validateUpdateUser,
    validateUserBody,
} from '../middlewares/validations'

const authRouter = Router()

// Дополнительный жесткий rate limit на эндпоинты входа/регистрации
// для защиты от брутфорса.
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Слишком много попыток, попробуйте позже',
    },
})
authRouter.get('/csrf-token', csrfTokenHandler)
authRouter.get('/csrf', csrfTokenHandler)
authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, validateUpdateUser, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', authLimiter, validateAuthentication, login)
authRouter.get('/token', refreshAccessToken)
authRouter.get('/logout', logout)
authRouter.post('/register', authLimiter, validateUserBody, register)

export default authRouter
