import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import test from 'node:test'

const modulesPath = fileURLToPath(new URL('../../src/modules/', import.meta.url))

test('camadas HTTP não executam SQL e repositórios não conhecem HTTP', () => {
  for (const moduleName of readdirSync(modulesPath)) {
    const modulePath = join(modulesPath, moduleName)
    if (!statSync(modulePath).isDirectory()) continue
    const files = readdirSync(modulePath)
    for (const layer of ['routes.js', 'controller.js', 'service.js', 'repository.js']) {
      assert.ok(files.includes(layer), `${moduleName} não possui ${layer}`)
    }
    for (const file of files) {
      if (!file.endsWith('.js')) continue
      const source = readFileSync(join(modulePath, file), 'utf8')
      if (file !== 'repository.js') {
        assert.ok(!/\b(?:pool|client|db)\.query\s*\(/.test(source), `${moduleName}/${file} executa SQL`)
      }
      if (file === 'routes.js' || file === 'controller.js') {
        assert.ok(!/from\s+['"][^'"]*repository\.js['"]/.test(source), `${moduleName}/${file} acessa repositório diretamente`)
      }
      if (file === 'repository.js') {
        assert.ok(!/(?:from\s+['"][^'"]*\/http\/|\b(?:req|res)\.)/.test(source), `${moduleName}/${file} depende de HTTP`)
      }
    }
  }
})
