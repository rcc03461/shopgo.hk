# HXM OShop

基於 Nuxt 的多租戶電商平台雛形，主站使用 `oshop.com.hk`，租戶店舖使用 `shop_slug.oshop.com.hk`。

## 技術方向

- Nuxt
- Tailwind CSS
- Bun
- PostgreSQL

## 目前狀態

目前專案仍是初始 scaffold，尚未開始實作核心功能。

## 產品文件

- PRD：`docs/PRD.md`
- 主站先行（Landing / Login / Register）計劃與待辦：`docs/plan-main-site-landing-auth.md`

## 規劃中的核心路由

### 平台主站
- `oshop.com.hk/`
- `oshop.com.hk/login`
- `oshop.com.hk/register`

### 租戶子站
- `shop_slug.oshop.com.hk/`
- `shop_slug.oshop.com.hk/register`
- `shop_slug.oshop.com.hk/login`
- `shop_slug.oshop.com.hk/products`
- `shop_slug.oshop.com.hk/products/product_slug`
- `shop_slug.oshop.com.hk/cart`
- `shop_slug.oshop.com.hk/payment`
- `shop_slug.oshop.com.hk/invoices/invoice_uuid`
- `shop_slug.oshop.com.hk/tnc`
- `shop_slug.oshop.com.hk/p/page_slug`
- `shop_slug.oshop.com.hk/profile`
- `shop_slug.oshop.com.hk/profile/invoices`
- `shop_slug.oshop.com.hk/profile/invoices/invoice_uuid`

### 租戶admin page
- `shop_slug.oshop.com.hk/admin/dashboard `
- `shop_slug.oshop.com.hk/admin/pages`
- `shop_slug.oshop.com.hk/admin/categories `
- `shop_slug.oshop.com.hk/admin/products `
- `shop_slug.oshop.com.hk/admin/settings`
- `shop_slug.oshop.com.hk/admin/settings/payment`

## 本地開發

```bash
bun install
bun run dev
```

主站請用 hosts 中的網域名稱啟動（否則 cookie 網域與你預期的 `oshop.com.hk` 不一致），例如：

```bash
bun run dev -- --host oshop.com.hk
```

瀏覽器開啟：`http://oshop.com.hk:3000`（port 依終端機輸出為準）。

### 環境變數

複製 `.env.example` 為 `.env`，並至少設定：

- 資料庫：`DATABASE_URL` **或** `db_host` / `db_user` / `db_password` / `db_name`（可選 `db_port`、`DB_SSLMODE`）
- `JWT_SECRET`：正式環境請用長隨機字串；開發環境可不填（會使用內建預設值，**勿用於正式站**）。部署時亦可使用 `NUXT_JWT_SECRET` 覆寫。

### 資料庫 migration

```bash
bun run db:generate   # 變更 schema 後重新產生 SQL（已有初始檔則通常不需重跑）
bun run db:migrate    # 套用 migrations（自訂腳本 scripts/db-migrate.ts，會印出完整錯誤）
```

說明：`drizzle-kit migrate` 會先執行 `CREATE SCHEMA "drizzle"`，許多雲端資料庫的應用程式帳號**沒有建 schema 權限**會失敗。專案改為使用 `bun run db:migrate`，只在 `public` 建立 `__drizzle_migrations` 並執行 migration SQL。

若 `db:migrate` 出現 **`Client network socket disconnected before secure TLS connection was established`（`ECONNRESET`）**，代表 TLS 握手階段就被對方關閉，常見於：

- 連到 **非 TLS** 的 PostgreSQL，但連線字串使用 `sslmode=require`（預設）
- **埠錯誤**（例如託管商用 `25060` 而仍連 `5432`）
- 防火牆／雲端安全組未放行你的 IP

可依實際環境在 `.env` 調整 `DB_SSLMODE`（例如 `prefer`、`disable`），或向主機商確認是否強制 SSL 與正確埠號。若為開發機自簽憑證導致驗證失敗，可暫設 `DB_SSL_REJECT_UNAUTHORIZED=false`（勿在正式環境關閉）。

## 下一步建議

1. 建立多租戶路由與子網域識別策略。
2. 租戶首頁模組系統與商品流。


### dev host file
127.0.0.1	oshop.com.hk
127.0.0.1	*.oshop.com.hk

