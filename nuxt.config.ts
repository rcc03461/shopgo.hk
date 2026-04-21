// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // experimental: {
  //   serverAppConfig: false
  // },
  // hooks: {
  //   'nitro:config'(nitroConfig) {
  //     if (nitroConfig.imports?.imports) {
  //       nitroConfig.imports.imports = nitroConfig.imports.imports.filter(
  //         (i) => i?.name !== 'useAppConfig'
  //       );
  //     }
  //   },
  // },
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  // Windows 上 hosts 將 oshop.com.hk 指到 127.0.0.1（IPv4），若 dev 只綁 ::1 會 ERR_CONNECTION_REFUSED
  devServer: {
    host: '0.0.0.0',
  },
  vite: {
    server: {
      // 自訂網域開發時避免 Vite 擋 Host（監聽位址請用 package.json 的 dev --host）
      allowedHosts: ['oshop.com.hk', '.oshop.com.hk', 'localhost','127.0.0.1'],
    },
  },
  runtimeConfig: {
    public: {
      /** 租戶子網域根（Cookie Domain 與導向網址用） */
      tenantRootDomain:
        process.env.NUXT_PUBLIC_TENANT_ROOT_DOMAIN || 'oshop.com.hk',
      /** 登入／註冊後預設後台路徑 */
      adminDefaultPath:
        process.env.NUXT_PUBLIC_ADMIN_DEFAULT_PATH || '/admin/dashboard',
    },
    databaseUrl: process.env.DATABASE_URL || '',
    dbHost: process.env.db_host || process.env.DB_HOST || '',
    dbUser: process.env.db_user || process.env.DB_USER || '',
    dbPassword: process.env.db_password || process.env.DB_PASSWORD || '',
    dbName: process.env.db_name || process.env.DB_NAME || '',
    dbPort: process.env.db_port || process.env.DB_PORT || '5432',
    dbSslmode: process.env.DB_SSLMODE || 'prefer',
    // 正式環境務必設定 JWT_SECRET；開發時未設定則使用固定預設值（勿用於正式站）
    jwtSecret:
      (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : 'dev-only-oshop-jwt-secret'),
    /** 32 bytes base64；加密儲存 Stripe / PayPal 密鑰用（正式環境建議設定） */
    paymentSecretsKey: (process.env.PAYMENT_SECRETS_KEY || '').trim(),
  },
})
