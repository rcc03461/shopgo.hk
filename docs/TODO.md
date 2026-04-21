# OShop 開發待辦清單

可於 issue / 專案管理複製；完成後將 `[ ]` 改為 `[x]`。

---

## 已完成（摘要）

- [x] 主站：`/`、`/admin/login`、`/admin/register`、JWT Session、`tenants` / `users`、Drizzle migration 流程
- [x] 跨子網域 Cookie（`Domain=.{tenantRootDomain}`）、`authCookie` 集中寫入／清除
- [x] 主站登入／註冊成功 → 導向 `{slug}.{tenantRootDomain}/admin/dashboard`
- [x] `tenantSlug` middleware（含客戶端 `window.location.host` fallback）
- [x] `/admin/*` 守門（租戶 host、登入、JWT `shopSlug` 與 host 一致）
- [x] Admin 殼層頁：dashboard、pages、categories、products、orders、customers、settings、settings/payment
- [x] 租戶子網域首頁簡版（與主站 Landing 分流）
- [x] 前台購物流程：`/products`、`/products/[product_slug]`、`/cart`、`/payment`、`/payment/complete`

---

## Admin 後台（Phase C — 資料與互動）

- [x] **設定**：`tenant_shop_settings`、`/admin/settings` 讀寫 API + 表單
- [x] **分類**：Drizzle schema、`/admin/categories` 列表／新增／編輯 API + UI
- [x] **商品**：Drizzle schema、`/admin/products` 列表／`new`／`[id]` + `PUT .../catalog`（規格 Drawer）；價格 NUMERIC、後台 id／前台 slug 見 `docs/plan-admin-products-variants.md`
- [x] **訂單（後台）**：`/admin/orders` 列表與 `/admin/orders/[id]` 詳情 API + UI
- [x] **顧客（後台）**：`/admin/customers` 列表、`/admin/customers/[id]` 詳情、狀態更新（active/disabled）
- [ ] **CMS 頁（總項）**：資料表 + Admin `/admin/pages` CRUD；公開路由 ` /p/[page_slug]` 渲染
  - [ ] `pages` schema + migration（tenant 唯一 slug、status、published_at）
  - [ ] Admin API：`GET/POST /api/admin/pages`、`GET/PATCH/DELETE /api/admin/pages/[id]`
  - [ ] Admin UI：`/admin/pages` 列表（搜尋/分頁/狀態）
  - [ ] Admin UI：`/admin/pages/new`、`/admin/pages/[id]` 表單
  - [ ] 內容編輯器：導入 Milkdown（先基礎工具列）
  - [ ] 公開 API：`GET /api/store/pages/[slug]`（僅 published）
  - [ ] 公開頁：`/p/[page_slug]` SSR 渲染 + 404
  - [ ] 安全：Markdown->HTML sanitize（XSS 防護）
  - [ ] 手測：draft/published/archived 可見性與租戶隔離
- [x] **收款**：`/admin/settings/payment` 真實欄位、敏感資料加密儲存、僅 server 解密

---

## 租戶前台（README「租戶子站」路由）

- [x] `/register`、`/login`（子網域會員）
- [x] `/products`（左欄篩選 + 右欄列表）
- [x] `/products/[product_slug]` 商品詳情
- [x] `/cart` 購物車
- [x] `/payment` 付款流程
- [ ] `/orders/[order_uuid]` 訂單明細頁（目前已提供 `/payment/complete` 完成頁）
- [ ] `/tnc` 條款（可租戶自訂內容）
- [x] `/profile`、`/profile/orders`、`/profile/orders/[order_uuid]` 會員中心

### 會員子系統計畫（2026-04）

參考：`docs/plan-tenant-customer-auth-profile-orders-carts.md`

- [x] M1 會員基礎：`customers` migration + `POST /api/store/auth/register|login|logout`、`GET /api/store/auth/me`
- [x] M2 Cart 整合：`shop_carts` / `shop_cart_lines` + `GET/POST/PATCH/DELETE /api/store/cart*` + 登入後 cart merge
- [x] M3 Profile：`GET/PATCH /api/store/profile` + `/profile` UI
- [x] M4 Orders：`GET /api/store/orders`、`GET /api/store/orders/[order_uuid]` + `/profile/orders*` UI
- [x] M5 安全與驗收：tenant/customer 雙重校驗、route guard、手測清單（`docs/manual-test-tenant-customer-flow.md`）

---

## 租戶首頁與模組（PRD）

- [ ] 首頁 **模組化**（nav / banner / category / products / footer）與 `module_configs` 或等效設定
- [ ] 子網域 **非 admin** 版面與主站視覺一致、極簡風 tokens 收斂

---

## 工程與品質（Phase D 等）

- [ ] 所有 **admin / 租戶 API** 強制 `tenant_id` / `shop_slug` 與 DB 雙重比對（不可只信 JWT；目前已部分落地）
- [ ] 正式環境 **HTTPS** + Cookie `Secure`、**`JWT_SECRET`** 強制檢查
- [ ] 手動測試清單文件化：主站登入 → 子網域 dashboard → 重新整理仍登入 → 登出
- [ ] （選用）E2E：Playwright 等，涵蓋主站與子網域 hosts 情境
- [ ] （選用）租戶 **角色權限**（`tenant_members` / `role`）再開放多人進後台

---

## 文件與維運

- [ ] README「下一步建議」與本 `TODO.md` 定期同步、刪除已過時敘述
- [ ] 部署說明：`NUXT_PUBLIC_*`、`NUXT_JWT_SECRET`、資料庫 SSL、`db:migrate` 檢查清單
- [x] PRD `docs/PRD.md` 與實作差異追蹤（已於本輪更新）

---

## 參考文件

- `docs/PRD.md`
- `docs/plan-main-site-landing-auth.md`
- `docs/plan-tenant-admin-and-platform-login-redirect.md`
- `docs/plan-tenant-customer-auth-profile-orders-carts.md`
- `README.md`
