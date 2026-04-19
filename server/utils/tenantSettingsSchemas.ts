import { z } from 'zod'

/** 可選網址：空字串視為略過；有值則需為 http(s) */
const optionalHttpUrl = (max = 2048) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      if (s === undefined) return undefined
      const t = s.trim()
      return t === '' ? undefined : t
    })
    .superRefine((val, ctx) => {
      if (!val) return
      try {
        const u = new URL(val)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          ctx.addIssue({
            code: 'custom',
            message: '網址需為 http 或 https',
          })
        }
      } catch {
        ctx.addIssue({ code: 'custom', message: '請輸入有效網址' })
      }
    })

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      if (s === undefined) return undefined
      const t = s.trim()
      return t === '' ? undefined : t
    })

const attachmentIdNullable = z.union([z.string().uuid(), z.null()]).optional()

/**
 * 寫入 `tenants.settings` 的 JSON 形狀（欄位皆可選，整份物件由 PATCH 整體取代）
 */
export const tenantStoredSettingsSchema = z
  .object({
    displayName: optionalTrimmed(255),
    tagline: optionalTrimmed(500),
    description: optionalTrimmed(5000),
    about: optionalTrimmed(20000),
    address: optionalTrimmed(2000),
    phone: optionalTrimmed(64),
    contactEmail: optionalTrimmed(255).superRefine((val, ctx) => {
      if (!val) return
      if (!z.string().email().safeParse(val).success) {
        ctx.addIssue({ code: 'custom', message: '請輸入有效電郵' })
      }
    }),
    businessHours: optionalTrimmed(2000),
    mapUrl: optionalHttpUrl(),
    footerCopyright: optionalTrimmed(500),
    logoAttachmentId: attachmentIdNullable,
    faviconAttachmentId: attachmentIdNullable,
    socialInstagram: optionalHttpUrl(),
    socialFacebook: optionalHttpUrl(),
    socialYoutube: optionalHttpUrl(),
    socialTiktok: optionalHttpUrl(),
    socialX: optionalHttpUrl(),
    socialLine: optionalHttpUrl(),
    socialWhatsapp: optionalHttpUrl(),
    socialThreads: optionalHttpUrl(),
    socialWebsite: optionalHttpUrl(),
  })
  .strict()

export type TenantStoredSettings = z.infer<typeof tenantStoredSettingsSchema>

export const adminTenantSettingsPatchBodySchema = z.object({
  settings: z.unknown(),
})
