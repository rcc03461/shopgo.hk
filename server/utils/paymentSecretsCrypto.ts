import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { createError } from 'h3'
import type { H3Event } from 'h3'

const ALGO = 'aes-256-gcm' as const
const IV_LEN = 16
const TAG_LEN = 16
const PREFIX = 'v1:'

function scryptKeyFromJwt(jwtSecret: string): Buffer {
  return scryptSync(`oshop-payment:${jwtSecret}`, 'oshop-payment-salt-v1', 32)
}

/**
 * 32 bytes base64：正式環境強烈建議設定 `PAYMENT_SECRETS_KEY`。
 * 未設定時：開發環境由 JWT 密鑰衍生；正式環境回傳 `null`（僅能操作不含密文之設定）。
 */
export function getPaymentSecretsKey32(event: H3Event): Buffer | null {
  const cfg = useRuntimeConfig(event)
  const raw = String(cfg.paymentSecretsKey || '').trim()
  if (raw) {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32) {
      throw createError({
        statusCode: 500,
        message: 'PAYMENT_SECRETS_KEY 須為 32 bytes 的 base64（長度 44 字元左右）',
      })
    }
    return buf
  }
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  const jwtSecret = String(cfg.jwtSecret || '').trim()
  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      message: '無法衍生金流加密金鑰：請設定 PAYMENT_SECRETS_KEY 或 JWT_SECRET',
    })
  }
  return scryptKeyFromJwt(jwtSecret)
}

/** 讀寫 `secrets_encrypted` 前呼叫；正式環境未設定主金鑰時拋錯 */
export function requirePaymentSecretsKey(event: H3Event): Buffer {
  const k = getPaymentSecretsKey32(event)
  if (!k) {
    throw createError({
      statusCode: 503,
      message:
        '此操作需加密金流密鑰：請在伺服器環境變數設定 PAYMENT_SECRETS_KEY（openssl rand -base64 32 產生）',
    })
  }
  return k
}

export function encryptSecretsJson(obj: Record<string, string>, key: Buffer): string {
  const plain = JSON.stringify(obj)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, enc, tag]).toString('base64')
}

export function decryptSecretsJson(blob: string, key: Buffer): Record<string, string> {
  if (!blob.startsWith(PREFIX)) {
    throw createError({ statusCode: 500, message: '金流密鑰格式不支援，請重新儲存設定' })
  }
  const raw = Buffer.from(blob.slice(PREFIX.length), 'base64')
  if (raw.length < IV_LEN + TAG_LEN + 1) {
    throw createError({ statusCode: 500, message: '金流密鑰資料毀損' })
  }
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(raw.length - TAG_LEN)
  const data = raw.subarray(IV_LEN, raw.length - TAG_LEN)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(plain) as unknown
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === 'string' && v.length) out[k] = v
  }
  return out
}
