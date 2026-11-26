// Envio de e-mail. Com SMTP_URL usa SMTP de verdade (nodemailer, carregado só
// quando necessário). Sem SMTP: em desenvolvimento o e-mail é escrito no
// terminal (assim dá para testar o fluxo sem servidor de e-mail); em produção
// nada é escrito, porque o link contém um token secreto e não pode ir para o log.
export function createMailer(config, { log = console } = {}) {
  if (config.smtpUrl) {
    let transport
    return {
      async send({ to, subject, text }) {
        transport ??= (await import('nodemailer')).default.createTransport(config.smtpUrl)
        await transport.sendMail({ from: config.mailFrom, to, subject, text })
      },
    }
  }
  return {
    async send({ to, subject, text }) {
      if (config.production) {
        log.warn('SMTP_URL não configurada: e-mail não enviado.')
        return
      }
      log.log(`\n[e-mail de desenvolvimento]\nPara: ${to}\nAssunto: ${subject}\n\n${text}\n`)
    },
  }
}
