import dns from 'node:dns/promises'

export async function txtRecordsIncludeToken(
  hostname: string,
  token: string,
): Promise<boolean> {
  const name = `_oshop-verify.${hostname}`
  try {
    const records = await dns.resolveTxt(name)
    const flat = records.map((chunk) => chunk.join('')).map((s) => s.trim())
    return flat.some((s) => s === token)
  } catch {
    return false
  }
}
