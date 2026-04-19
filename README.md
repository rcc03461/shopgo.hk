# HXM OShop

基於 Nuxt 的多租戶電商平台雛形，主站使用 `oshop.com.hk`，租戶店舖使用 `shop_slug.oshop.com.hk`。

## 技術方向

- Nuxt
- Tailwind CSS
- Bun
- PostgreSQL

## 目前狀態

- 主站 Landing、註冊／登入、Session（JWT Cookie，**`Domain=.{tenantRootDomain}`** 時可跨子網域）。
- 主站登入成功後導向 **`{shop_slug}.{tenantRootDomain}/admin/dashboard`**。
- 租戶子網域 **`/admin/*`** 後台殼層（總覽、頁面、分類、商品、設定、收款占位）。

## 產品文件

- PRD：`docs/PRD.md`
- 主站先行（Landing / Login / Register）計劃與待辦：`docs/plan-main-site-landing-auth.md`
- 主站登入轉租戶後台 + Admin 路由實作計劃：`docs/plan-tenant-admin-and-platform-login-redirect.md`
- **開發待辦清單（可勾選）：`docs/TODO.md`**

## 規劃中的核心路由

### 平台主站
- `oshop.com.hk/`
- `oshop.com.hk/login` => login to shop_slug.oshop.com.hk/admin/dashboard
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

### 租戶 admin
- `shop_slug.oshop.com.hk/admin/dashboard`
- `shop_slug.oshop.com.hk/admin/pages`
- `shop_slug.oshop.com.hk/admin/categories`
- `shop_slug.oshop.com.hk/admin/products`
- `shop_slug.oshop.com.hk/admin/settings`
- `shop_slug.oshop.com.hk/admin/settings/payment`

## 本地開發

```bash
bun install
bun run dev
```

`dev` 指令已帶 `--host 0.0.0.0`，終端應同時出現 **Local** 與 **Network** 網址；若仍只顯示 `use --host to expose`，請確認已存檔並重啟 dev。

瀏覽器開啟：`http://oshop.com.hk:3000`（port 依終端機輸出為準；hosts 需已指向 `127.0.0.1`）。

### 為何 `localhost` 可以、`oshop.com.hk` 卻 `ERR_CONNECTION_REFUSED`？

在 Windows 上很常見：開發伺服器預設只綁在 **`localhost`（常為 IPv6 的 `::1`）**，而 hosts 裡的 `oshop.com.hk` 通常解析成 **`127.0.0.1`（IPv4）**，兩者不是同一個 listening socket，就會出現連線被拒。

專案透過 **`package.json` 的 `dev` 指令**（`nuxt dev --host 0.0.0.0`）綁在 **`0.0.0.0`**，IPv4（`127.0.0.1`／`oshop.com.hk`）與本機其他網卡都能連。`nuxt.config` 內 **`devServer.host`** 為輔助說明用；修改後請**重啟** `bun run dev`。

若仍被 Vite 擋 Host，已一併設定 `vite.server.allowedHosts` 包含 `oshop.com.hk` 與 `.oshop.com.hk`。

（選用）仍可用 CLI 指定對外顯示的主機名：`bun run dev -- --host oshop.com.hk`。

### 環境變數

複製 `.env.example` 為 `.env`，並至少設定：

- `NUXT_PUBLIC_TENANT_ROOT_DOMAIN`：預設 `oshop.com.hk`；本機請搭配 hosts 使用該網域（**localhost 無法使用跨子網域 Cookie**）。

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

以 **`docs/TODO.md`** 為準逐步勾選；概要方向：Admin 資料與表單 → 租戶前台購物 → 首頁模組化。


### dev host file
127.0.0.1	oshop.com.hk
127.0.0.1	demo.oshop.com.hk

