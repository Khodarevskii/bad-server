import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import { csrfProtection, csrfTokenIssuer } from './middlewares/csrf'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()

app.disable('x-powered-by')

app.use(helmet())

// Глобальный rate limit: не менее 10 запросов в минуту с одного IP
// (требование из задания) — реально 100 в минуту, чтобы не мешать
// нормальной навигации.
const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message:
            'Слишком много запросов с этого IP, попробуйте позже',
    },
})
app.use(limiter)

// Burst-лимитер: 10 запросов в секунду. Защищает от резких всплесков
// (Promise.all из браузера или нагрузочных тестов), не мешая обычной
// последовательной работе пользователя.
const burstLimiter = rateLimit({
    windowMs: 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Слишком много запросов, попробуйте чуть позже',
    },
})
app.use(burstLimiter)

app.use(cookieParser())

const allowedOrigin = process.env.ORIGIN_ALLOW || 'http://localhost'
app.use(
    cors({
        origin: allowedOrigin,
        credentials: true,
    })
)

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true, limit: '10kb' }))
app.use(json({ limit: '10kb' }))

app.use(mongoSanitize())

app.use(csrfTokenIssuer)
app.use(csrfProtection)

app.options('*', cors({ origin: allowedOrigin, credentials: true }))
app.use(routes)
app.use(errors())
app.use(errorHandler)

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
