export class HttpError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
  }
  if (error?.name === 'MulterError') {
    const large = error.code === 'LIMIT_FILE_SIZE'
    return res.status(large ? 413 : 400).json({ error: {
      code: large ? 'ARQUIVO_MUITO_GRANDE' : 'ENTRADA_INVALIDA',
      message: large ? 'A imagem pode ter no máximo 5 MB.' : 'Envie apenas uma imagem.', details: {},
    } })
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'ENTRADA_INVALIDA', message: 'Requisição muito grande.', details: {} } })
  }
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ error: { code: 'ENTRADA_INVALIDA', message: 'JSON inválido.', details: {} } })
  }
  console.error(error)
  return res.status(500).json({ error: { code: 'ERRO_INTERNO', message: 'Erro interno. Tente novamente.', details: {} } })
}
