import { z } from 'zod'
import { HttpError } from '../../http/errors.js'
import { imagePath } from '../../storage/local.js'
import * as service from './service.js'

export function createImageController(pool, directory) {
  return {
    async requireStore(req, _res, next) {
      try {
        req.store = await service.requireStore(pool, req.session.usuario.id)
        next()
      } catch (error) { next(error) }
    },
    async uploadImage(req, res) {
      if (!req.file) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Envie uma imagem.')
      res.status(201).json({ data: await service.saveImage(pool, directory, req.store.id, req.file) })
    },
    async getImage(req, res, next) {
      if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.')
      const image = await service.getImage(pool, req.params.id)
      res.set('X-Content-Type-Options', 'nosniff')
      res.type(image.mime)
      res.sendFile(imagePath(directory, image.chave_arquivo), (error) => {
        if (error) next(error.code === 'ENOENT'
          ? new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.') : error)
      })
    },
  }
}
