import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { z } from 'zod'
import { HttpError } from '../../http/errors.js'
import { requireSession } from '../auth/sessions.js'
import { ownStore } from '../lojas/routes.js'
import { imagePath, inspectImage, removeImage } from '../../storage/local.js'

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function registerImageRoutes(app, pool, config) {
  const directory = config.uploadDir || './uploads'
  mkdirSync(directory, { recursive: true })
  const upload = multer({
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
  app.post('/api/v1/minha-loja/imagens', requireSession(pool), async (req, _res, next) => {
    try {
      req.store = await ownStore(pool, req.session.usuario.id)
      if (!req.store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
      next()
    } catch (error) { next(error) }
  }, upload.single('arquivo'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Envie uma imagem.')
    try {
      const detected = await inspectImage(req.file.path)
      if (detected !== req.file.mimetype) {
        throw new HttpError(415, 'FORMATO_NAO_SUPORTADO', 'O arquivo não é uma imagem válida.')
      }
      const result = await pool.query(
        'insert into imagens(loja_id, chave_arquivo, mime, tamanho) values ($1, $2, $3, $4) returning id',
        [req.store.id, req.file.filename, detected, req.file.size],
      )
      const id = result.rows[0].id
      res.status(201).json({ data: { id, foto_url: `/api/v1/imagens/${id}` } })
    } catch (error) {
      await removeImage(directory, req.file.filename)
      throw error
    }
  })
  app.get('/api/v1/imagens/:id', async (req, res, next) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.')
    const result = await pool.query('select chave_arquivo, mime from imagens where id = $1', [req.params.id])
    if (!result.rows.length) throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.')
    const image = result.rows[0]
    res.set('X-Content-Type-Options', 'nosniff')
    res.type(image.mime)
    res.sendFile(imagePath(directory, image.chave_arquivo), (error) => {
      if (error) next(error.code === 'ENOENT'
        ? new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.') : error)
    })
  })
}
