import { HttpError } from './errors.js'

// Limita tentativas por IP numa janela de tempo (memória do processo).
// countSuccess=false devolve a tentativa quando a resposta é de sucesso: o login
// só gasta o limite com erros, para não bloquear uma rede (sala de aula, NAT)
// onde várias pessoas entram legitimamente.
export function authRateLimit({ attempts = 10, windowMs = 15 * 60 * 1000, now = Date.now, countSuccess = true } = {}) {
  const buckets = new Map()
  let nextSweep = 0

  // Remove os IPs com janela vencida, no máximo uma vez por janela, para o Map não crescer sem fim.
  function sweep(time) {
    if (time < nextSweep) return
    nextSweep = time + windowMs
    for (const [key, bucket] of buckets) if (bucket.until <= time) buckets.delete(key)
  }

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const time = now()
    sweep(time)
    let bucket = buckets.get(key)
    if (!bucket || bucket.until <= time) bucket = { count: 0, until: time + windowMs }
    if (bucket.count >= attempts) {
      res.set('Retry-After', String(Math.ceil((bucket.until - time) / 1000)))
      return next(new HttpError(429, 'LIMITE_REQUISICOES', 'Aguarde antes de tentar novamente.'))
    }
    bucket.count += 1
    buckets.set(key, bucket)
    if (!countSuccess) {
      res.on('finish', () => {
        if (res.statusCode < 400 && bucket.count > 0) bucket.count -= 1
      })
    }
    next()
  }
}
