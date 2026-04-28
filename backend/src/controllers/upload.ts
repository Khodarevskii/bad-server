import { NextFunction, Request, Response } from 'express'
import { unlinkSync } from 'fs'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'

const MIN_FILE_SIZE = 2 * 1024 // 2kb — отсекаем подозрительно маленькие
                                // изображения и пустые файлы.

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    if (req.file.size < MIN_FILE_SIZE) {
        try {
            unlinkSync(req.file.path)
        } catch {
            // ignore
        }
        return next(new BadRequestError('Файл слишком маленький'))
    }
    try {
        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file?.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file?.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
