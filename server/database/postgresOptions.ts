/**
 * postgres.js 的第二參數選項，用來覆寫連線字串中的 ssl 行為。
 *
 * - **TLS 交握即斷線（ECONNRESET）**：若主機未正確支援 TLS，可設 `DB_SSLMODE=disable`
 *   強制明文（仍會走帳密驗證）。若 `DATABASE_URL` 已寫死 `sslmode=prefer`，此處仍會覆寫。
 * - **憑證自簽**：開發環境可設 `DB_SSL_REJECT_UNAUTHORIZED=false`。
 */
export function getPostgresJsSslOptions():
  | { ssl: false }
  | { ssl: { rejectUnauthorized: boolean } }
  | Record<PropertyKey, never> {
  const mode = (process.env.DB_SSLMODE ?? '').trim().toLowerCase()
  if (mode === 'disable' || mode === 'off' || mode === 'false') {
    return { ssl: false }
  }

  const v = (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase()
  if (v === 'false' || v === '0') {
    return { ssl: { rejectUnauthorized: false } }
  }
  return {}
}
