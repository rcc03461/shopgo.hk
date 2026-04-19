import { createError, isError } from 'h3'

/** 走訪 error.cause 鏈（含 DrizzleQueryError → PostgresError） */
export function walkErrorCauseChain(err: unknown): unknown[] {
  const out: unknown[] = []
  const seen = new Set<unknown>()
  let cur: unknown = err
  let i = 0
  while (cur != null && i++ < 12) {
    if (seen.has(cur)) break
    seen.add(cur)
    out.push(cur)
    if (typeof cur !== 'object') break
    cur = (cur as { cause?: unknown }).cause
  }
  return out
}

function getPgSqlState(err: unknown): string | undefined {
  for (const x of walkErrorCauseChain(err)) {
    if (typeof x !== 'object' || x === null) continue
    const code = (x as { code?: unknown }).code
    if (typeof code === 'string' && /^\d{5}$/.test(code)) return code
  }
  return undefined
}

function getPgConstraintName(err: unknown): string | undefined {
  for (const x of walkErrorCauseChain(err)) {
    if (typeof x !== 'object' || x === null) continue
    const n = (x as { constraint_name?: unknown }).constraint_name
    if (typeof n === 'string' && n.length > 0) return n
  }
  return undefined
}

function getSocketErrorCode(err: unknown): string | undefined {
  for (const x of walkErrorCauseChain(err)) {
    if (typeof x !== 'object' || x === null) continue
    const code = (x as { code?: unknown }).code
    if (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND'
    ) {
      return String(code)
    }
  }
  return undefined
}

/** 供伺服器 log，勿回傳給前端 */
export function summarizeDbErrorForLog(err: unknown): string {
  const sqlState = getPgSqlState(err)
  const constraint = getPgConstraintName(err)
  const socket = getSocketErrorCode(err)
  const inner = walkErrorCauseChain(err).find(
    (x) => x instanceof Error,
  ) as Error | undefined
  const parts = [
    sqlState && `sqlstate=${sqlState}`,
    constraint && `constraint=${constraint}`,
    socket && `net=${socket}`,
    inner?.message && `msg=${inner.message.slice(0, 200)}`,
  ].filter(Boolean)
  return parts.join(' ') || String(err)
}

type RegisterUniqueCtx = {
  shopSlug: string
  /** 用於 constraint 不明時，再查一次 DB 區分 slug / email */
  isSlugTaken: () => Promise<boolean>
}

/**
 * 將註冊時的 DB 錯誤轉成使用者可讀訊息並 throw createError。
 * 已為 H3Error 則直接原樣拋出。
 */
export async function throwIfHandledRegisterDbError(
  err: unknown,
  ctx: RegisterUniqueCtx,
): Promise<never> {
  if (isError(err)) {
    throw err
  }

  const sqlState = getPgSqlState(err)

  if (sqlState === '23505') {
    const c = getPgConstraintName(err)?.toLowerCase() ?? ''
    if (c.includes('shop_slug')) {
      throw createError({ statusCode: 409, message: '此商店代號已被使用' })
    }
    if (c.includes('email')) {
      throw createError({ statusCode: 409, message: '此電子郵件已被註冊' })
    }
    if (await ctx.isSlugTaken()) {
      throw createError({ statusCode: 409, message: '此商店代號已被使用' })
    }
    throw createError({ statusCode: 409, message: '此電子郵件已被註冊' })
  }

  if (sqlState === '42P01') {
    throw createError({
      statusCode: 503,
      message: '資料庫尚未就緒（缺少資料表）。請先在本機執行：bun run db:migrate',
    })
  }

  if (sqlState === '42501' || sqlState === '42503') {
    throw createError({
      statusCode: 503,
      message: '目前無法寫入資料庫（權限不足）。請聯絡管理員或檢查資料庫帳號權限',
    })
  }

  const net = getSocketErrorCode(err)
  if (net) {
    throw createError({
      statusCode: 503,
      message: '無法連線到資料庫，請稍後再試',
    })
  }

  if (sqlState === '23514' || sqlState === '22P02') {
    throw createError({
      statusCode: 400,
      message: '送出的資料格式不正確，請檢查欄位後再試',
    })
  }

  throw createError({
    statusCode: 500,
    message: '註冊失敗，請稍後再試。若問題持續，請聯絡客服',
  })
}
