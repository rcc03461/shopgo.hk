// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  runtimeConfig: {
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
  },
})
