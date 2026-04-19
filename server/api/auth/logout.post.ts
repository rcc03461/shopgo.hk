import { clearAuthSessionCookie } from '../../utils/authCookie'

export default defineEventHandler(async (event) => {
  clearAuthSessionCookie(event)
  return { ok: true as const }
})
