import { open, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

export function detectImageType(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg'
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  return null
}

export function imagePath(directory, key) {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Chave de arquivo inválida')
  return resolve(directory, key)
}

export async function inspectImage(path) {
  const file = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(16)
    await file.read(buffer, 0, buffer.length, 0)
    return detectImageType(buffer)
  } finally {
    await file.close()
  }
}

export async function removeImage(directory, key) {
  try { await unlink(imagePath(directory, key)) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
