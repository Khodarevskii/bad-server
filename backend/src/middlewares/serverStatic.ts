import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
    const safeBase = path.resolve(baseDir)
    return (req: Request, res: Response, next: NextFunction) => {
        let decodedPath: string
        try {
            decodedPath = decodeURIComponent(req.path)
        } catch (err) {
            return next()
        }

        if (decodedPath.indexOf('\0') !== -1) {
            return next()
        }

        const filePath = path.resolve(path.join(safeBase, decodedPath))

        if (
            filePath !== safeBase &&
            !filePath.startsWith(safeBase + path.sep)
        ) {
            return next()
        }

        return fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return next()
            }
            return fs.stat(filePath, (statErr, stats) => {
                if (statErr || !stats.isFile()) {
                    return next()
                }
                return res.sendFile(filePath, (sendErr) => {
                    if (sendErr) {
                        next(sendErr)
                    }
                })
            })
        })
    }
}
