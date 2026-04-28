import { existsSync, mkdirSync, rename } from 'fs'
import { basename, join, resolve, sep } from 'path'

function ensureWithin(base: string, target: string) {
    const resolvedBase = resolve(base)
    const resolvedTarget = resolve(target)
    if (
        resolvedTarget !== resolvedBase &&
        !resolvedTarget.startsWith(resolvedBase + sep)
    ) {
        throw new Error('Недопустимый путь файла')
    }
    return resolvedTarget
}

function movingFile(imagePath: string, from: string, to: string) {
    const fileName = basename(imagePath)
    const imagePathTemp = ensureWithin(from, join(from, fileName))
    const imagePathPermanent = ensureWithin(to, join(to, fileName))

    mkdirSync(to, { recursive: true })
    if (!existsSync(imagePathTemp)) {
        throw new Error('Ошибка при сохранении файла')
    }

    rename(imagePathTemp, imagePathPermanent, (err) => {
        if (err) {
            throw new Error('Ошибка при сохранении файла')
        }
    })
}

export default movingFile
