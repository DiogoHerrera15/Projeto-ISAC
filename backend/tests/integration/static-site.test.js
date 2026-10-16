import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { criarCenario } from '../helpers/cenario.js'
import { createApp } from '../../src/app.js'

test('Node serve rotas React sem capturar API ou health', async (t) => {
  const c = await criarCenario(t)
  const dir = await mkdtemp(join(tmpdir(), 'isac-site-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'index.html'), '<h1>ISAC Market</h1>')
  const app = createApp({ pool: c.pool, config: { ...c.config, frontendDist: dir } })
  const page = await request(app).get('/produtos').expect(200)
  assert.match(page.text, /ISAC Market/)
  const health = await request(app).get('/api/v1/health').expect(200)
  assert.equal(health.body.data.status, 'ok')
  const missing = await request(app).get('/api/v1/nao-existe').expect(404)
  assert.equal(missing.body.error.code, 'NAO_ENCONTRADO')
  const root = await request(app).get('/api').expect(404)
  assert.equal(root.body.error.code, 'NAO_ENCONTRADO')
})
