# 計劃：主站登入 → 租戶後台 + Admin 路由（README 43–49）

目標行為：**`oshop.com.hk/login` 登入成功後，導向 `https://{shop_slug}.oshop.com.hk/admin/dashboard`**（本機開發則為 `http://{shop_slug}.oshop.com.hk:3000/admin/dashboard`），並逐步完成 README 所列租戶 Admin 頁面。

---

## 0. 現況摘要

- 已有：`users` 綁 `tenantId`、`tenants.shop_slug`、JWT Cookie、`POST /api/auth/login` 回傳 `tenant.shopSlug`。
- 尚未有：`admin/*` 頁面、依 **Host** 區分主站／租戶、**跨子網域** 的登入狀態、登入後導向邏輯。
- **關鍵產品決策**：預設 Cookie 為 **host-only**（僅 `oshop.com.hk`），**不會**自動送到 `demo.oshop.com.hk`，因此若不做調整，導向子網域後台會變成「未登入」。

---

## 1. 產品與路由對照（README 43–49）

| 路由 | 第一版建議 |
|------|------------|
| `/{shop_slug}.../admin/dashboard` | 後台首頁：摘要卡片（訂單數、商品數占位）、快捷連結到各區 |
| `.../admin/pages` | CMS／靜態頁列表占位（之後接 `p/page_slug`） |
| `.../admin/categories` | 分類列表／表單占位 |
| `.../admin/products` | 商品列表占位 |
| `.../admin/settings` | 商店基本設定占位（店名、聯絡等） |
| `.../admin/settings/payment` | 收款方式占位（之後接金流） |

第一版以 **極簡 UI + 占位資料 + 權限守門** 為主，避免一次做滿 CRUD。

---

## 2. 跨子網域登入（必做，否則主站登入無法帶入後台）

### 2.1 建議方案（擇一實作，推薦 A）

**A. Cookie `Domain=.oshop.com.hk`（推薦，實作相對單純）**

- 設定 Cookie 時帶 `domain: '.oshop.com.hk'`（僅在 host 為 `*.oshop.com.hk` 或主站時依規則設定；**localhost 不適用**，本機需用 hosts + 自訂網域測試）。
- `SameSite=Lax`：同站頂層導向仍可帶 Cookie；若未來有跨站 POST 登入再評估 `None` + `Secure`。
- **本機**：`NUXT_PUBLIC_BASE_DOMAIN=oshop.com.hk`（或 runtime `public.tenantRootDomain`），Cookie domain 與導向 URL 都讀此值；port 用 `window.location.port` 或 `NUXT_PUBLIC_DEV_PORT`。

**B. 一次性換票（ticket）**

- 主站登入成功後 `302` 到  
  `https://{slug}.oshop.com.hk/admin/auth/callback?ticket=...`  
  子網域 API 驗票後寫入 **僅子網域** 的 Cookie。  
- 優點：主站 Cookie 可不跨域；缺點：多一支 API、ticket 單次使用與過期需嚴謹設計。

**建議採 A**，除非資安／合規要求主站與店舖 Cookie 完全分離。

### 2.2 設定與程式要點

- `nuxt.config`：`runtimeConfig` 增加  
  - `public.tenantRootDomain`（例：`oshop.com.hk`）  
  - 可選：`public.adminDefaultPath`（預設 `/admin/dashboard`）
- `server/utils/authCookie.ts`（新建）：集中 `setSessionCookie` / `deleteSessionCookie`，內含 **domain / secure / sameSite** 規則。
- 修改 `login.post.ts`、`register.post.ts`、`logout.post.ts` 使用上述工具，避免三處邏輯分叉。
- **Production**：`secure: true`（HTTPS）；**Dev**：維持 `secure: false`，且 Cookie domain 僅在「非 localhost」時設 `.oshop.com.hk`。

---

## 3. Host 偵測與路由結構（Nuxt）

### 3.1 解析 `shop_slug`

- **Middleware**（`app/middleware/00-tenant-slug.global.ts`）：讀 `useRequestHeaders().host`，解析（實作見 `app/utils/tenantHost.ts`）：
  - `oshop.com.hk` → `tenantSlug = null`（主站）
  - `demo.oshop.com.hk` → `tenantSlug = 'demo'`
  - `localhost` / `127.0.0.1` → 可選：`tenantSlug = null` 或 query `?tenant=` 僅供本機除錯
- 將 `tenantSlug` 存入 `event.context.tenantSlug` 或 `useState`（注意 SSR／CSR 一致）。

### 3.2 頁面目錄建議

在 **`app/pages`** 用 **同一套路由檔**，依 `tenantSlug` 顯示不同 layout／內容，避免複製兩份 `admin/dashboard.vue`：

- 選項 1：**單一樹** `app/pages/admin/...`，在 layout 中若 `tenantSlug === null` 則 `abortNavigation` 或導回主站說明頁（admin 僅允許子網域）。
- 選項 2：**route groups**（若 Nuxt 版本支援）拆 `admin` layout。

**Admin 僅在子網域可存取**：`middleware` 檢查 `tenantSlug`，若為 null 則不進 admin（`404` 或導向 `https://oshop.com.hk`）。

### 3.3 主站 `/login` 登入後導向

- `login.vue`：`POST /api/auth/login` 成功後，用回傳的 `tenant.shopSlug` 組 URL：
  - `const origin = buildTenantOrigin(shopSlug)`（讀 `public.tenantRootDomain` + dev port）
  - `navigateTo(`${origin}/admin/dashboard`, { external: true })`
- 若 Cookie 已設為 `.oshop.com.hk`，子網域請求會帶上 Cookie，`/api/auth/me` 在子網域即可通過。

---

## 4. 權限模型（最小可行）

- 現有 `users` 可視為 **該租戶 Owner**（註冊時建立的第一個 user）。
- **Admin 區**：先要求「已登入」且 JWT 內 `shopSlug === 當前 host 的 tenantSlug」；不符則 `403` 或登出導向子網域 `/login`。
- 之後再加：`role` 欄位或 `tenant_members` 表，支援多員工、僅部分進 admin。

---

## 5. API 與資料（分階段）

| 階段 | 內容 |
|------|------|
| P0 | 不改表：僅 host 解析 + Cookie domain + 導向 + admin 空殼頁 |
| P1 | `settings`：讀寫租戶顯示名、聯絡 email（可擴充 `tenants` 欄位） |
| P2 | `categories` / `products`：Drizzle schema、列表 API、簡易表單 |
| P3 | `pages`：CMS 表 + slug 與公開 `p/[slug]` 對齊 |
| P4 | `settings/payment`：金流設定 schema + 加密儲存敏感欄位 |

---

## 6. 與 README／本機開發的對齊

- **hosts**：已支援 `oshop.com.hk`、`demo.oshop.com.hk`；每新增一個測試店需一行（Windows 不支援 `*.oshop.com.hk` 單行萬用字元）。
- **README**：主站 `/login` 一行已寫目標導向；完成 P0 後把「目前狀態」改為「已支援主站登入轉租戶後台殼層」。
- **Chrome DevTools**：若仍無法開 `oshop.com.hk:3000`，在 **Network** 看是否 `ERR_CONNECTION_REFUSED`（綁定埠／IPv4）或 **DNS_PROBE**（hosts 未生效）；專案已設 `devServer.host: '0.0.0.0'`，需重啟 dev。Cookie 問題在 **Application → Cookies** 看 `Domain` 是否為 `.oshop.com.hk`。

---

## 7. 實作順序（建議待辦勾選）

### Phase A — 可導向且子網域認得登入

- [x] `runtimeConfig.public.tenantRootDomain`（+ 本機 port 輔助變數）
- [x] `authCookie` 共用寫入／清除，**子網域 Cookie domain**
- [x] 更新 `login` / `register` / `logout` 使用 `authCookie`
- [x] `login` 頁成功後 **`external: true`** 導向 `{slug}.oshop.com.hk/admin/dashboard`
- [x] Global middleware：解析 `tenantSlug`，非法 host 行為定義清楚

### Phase B — Admin 殼層（README 43–49 路由可進）

- [x] Layout：`admin` 側欄 + 頂欄（極簡）
- [x] 頁面：`admin/dashboard`、`admin/pages`、`admin/categories`、`admin/products`、`admin/settings`、`admin/settings/payment`（可先靜態文案）
- [x] Middleware：`tenantSlug` 必填 + `GET /api/auth/me` 已登入 + `shopSlug` 與 host 一致

### Phase C — 資料與互動

- [ ] `settings` 讀寫租戶資料
- [ ] `categories` / `products` schema + API + 列表
- [ ] `pages` 與公開頁銜接
- [ ] `settings/payment` 占位 → 真實欄位與加密

### Phase D — 品質與文件

- [ ] E2E 或手動測試清單：主站登入 → 子網域 dashboard → 重新整理仍登入 → 登出
- [ ] README：Cookie／hosts／環境變數說明更新

---

## 8. 風險與注意

- **Cookie 跨子網域**：所有 `*.oshop.com.hk` 皆可讀取該 Cookie；需嚴格 **HttpOnly**、避免 XSS；子網域若未來開放第三方上傳內容，要評估隔離策略（屆時可改方案 B）。
- **多租戶資料**：所有 admin API 必須帶 **`tenantId` 或 `shop_slug` 與 DB 雙重比對**，禁止只信 JWT 不同步的 slug。
- **HTTPS**：上線後 `Secure` Cookie 必須為 true。

---

完成 **Phase A + B** 即滿足「主站 login → 子網域 admin/dashboard」與 README 路由「可開啟」；**Phase C** 才是完整後台功能。
