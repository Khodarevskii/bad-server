import { ErrorRequestHandler } from 'express'

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    const statusCode = err.statusCode || 500
    const message =
        statusCode === 500 ? 'На сервере произошла ошибка' : err.message

    if (statusCode >= 500) {
        // Логируем только серверные ошибки и без чувствительной информации.
        // Полный объект ошибки может содержать пользовательские данные.
        console.error(`[error] ${err?.name || 'Error'}: ${err?.message || ''}`)
    }

    res.status(statusCode).send({ message })

    next()
}

export default errorHandler
