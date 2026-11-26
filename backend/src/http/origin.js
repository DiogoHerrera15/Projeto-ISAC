import { HttpError } from './errors.js'

// Escritas (POST/PUT/PATCH/DELETE) só passam com a origem E o tipo de cliente combinando:
//   site (cookie)  -> Origin do site + X-ISAC-Client: web
//   aplicativo     -> Origin do app (capacitor://localhost) + X-ISAC-Client: app
// O app usa token no cabeçalho Authorization (não cookie), então não há risco de CSRF por ele.
export function requireSameOrigin(allowed, { log = console.warn, nativeOrigins = [] } = {}) {
  const origins = [].concat(allowed)
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    const origin = req.get('Origin')
    const client = req.get('X-ISAC-Client')
    const ok = (client === 'web' && origins.includes(origin)) || (client === 'app' && nativeOrigins.includes(origin))
    if (!ok) {
      // Ajuda a achar a diferença entre o endereço do site e o APP_ORIGIN configurado.
      log(`Origem recusada: Origin=${origin} X-ISAC-Client=${client} permitidas=${[...origins, ...nativeOrigins].join(',')}`)
      return next(new HttpError(403, 'ORIGEM_INVALIDA', 'Origem da requisição não permitida.'))
    }
    next()
  }
}
