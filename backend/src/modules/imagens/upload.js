import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { HttpError } from '../../http/errors.js'

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function createImageUpload(directory) {
  mkdirSync(directory, { recursive: true })
  return multer({
    storage: multer.diskStorage({
      destination: directory,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!allowed.has(file.mimetype)) return cb(new HttpError(415, 'FORMATO_NAO_SUPORTADO', 'Use JPG, PNG ou WebP.'))
      cb(null, true)
    },
  })
}
