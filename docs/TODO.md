# OShop 開發待辦清單

可於 issue / 專案管理複製；完成後將 `[ ]` 改為 `[x]`。

---

## 已完成（摘要）

- [x] 主站：`/`、`/login`、`/register`、JWT Session、`tenants` / `users`、Drizzle migration 流程
- [x] 跨子網域 Cookie（`Domain=.{tenantRootDomain}`）、`authCookie` 集中寫入／清除
- [x] 主站登入／註冊成功 → 導向 `{slug}.{tenantRootDomain}/admin/dashboard`
- [x] `tenantSlug` middleware（含客戶端 `window.location.host` fallback）
- [x] `/admin/*` 守門（租戶 host、登入、JWT `shopSlug` 與 host 一致）
- [x] Admin 殼層頁：dashboard、pages、categories、products、settings、settings/payment（占位）
- [x] 租戶子網域首頁簡版（與主站 Landing 分流）

---

## Admin 後台（Phase C — 資料與互動）

- [ ] **設定**：擴充 `tenants`（或獨立表）欄位；`/admin/settings` 讀寫店名、聯絡方式等 API + 表單
- [x] **分類**：Drizzle schema、`/admin/categories` 列表／新增／編輯 API + UI
- [x] **商品**：Drizzle schema、`/admin/products` 列表／`new`／`[id]` + `PUT .../catalog`（規格 Drawer）；價格 NUMERIC、後台 id／前台 slug 見 `docs/plan-admin-products-variants.md`
- [ ] **CMS 頁**：資料表 + Admin `/admin/pages` CRUD；公開路由 ` /p/[page_slug]` 渲染
- [ ] **收款**：`/admin/settings/payment` 真實欄位、敏感資料加密儲存、僅 server 解密

---

## 租戶前台（README「租戶子站」路由）

- [ ] `/register`、`/login`（子網域會員；與平台帳號策略釐清後實作）
- [ ] `/products`（左欄篩選 + 右欄列表）
- [ ] `/products/[product_slug]` 商品詳情
- [ ] `/cart` 購物車
- [ ] `/payment` 付款流程
- [ ] `/invoices/[invoice_uuid]` 發票／訂單明細
- [ ] `/tnc` 條款（可租戶自訂內容）
- [ ] `/profile`、`/profile/invoices`、`/profile/invoices/[invoice_uuid]` 會員中心

---

## 租戶首頁與模組（PRD）

- [ ] 首頁 **模組化**（nav / banner / category / products / footer）與 `module_configs` 或等效設定
- [ ] 子網域 **非 admin** 版面與主站視覺一致、極簡風 tokens 收斂

---

## 工程與品質（Phase D 等）

- [ ] 所有 **admin / 租戶 API** 強制 `tenant_id` / `shop_slug` 與 DB 雙重比對（不可只信 JWT）
- [ ] 正式環境 **HTTPS** + Cookie `Secure`、**`JWT_SECRET`** 強制檢查
- [ ] 手動測試清單文件化：主站登入 → 子網域 dashboard → 重新整理仍登入 → 登出
- [ ] （選用）E2E：Playwright 等，涵蓋主站與子網域 hosts 情境
- [ ] （選用）租戶 **角色權限**（`tenant_members` / `role`）再開放多人進後台

---

## 文件與維運

- [ ] README「下一步建議」與本 `TODO.md` 定期同步、刪除已過時敘述
- [ ] 部署說明：`NUXT_PUBLIC_*`、`NUXT_JWT_SECRET`、資料庫 SSL、`db:migrate` 檢查清單
- [ ] PRD `docs/PRD.md` 與實作差異追蹤（若有範圍變更）

---

## 參考文件

- `docs/PRD.md`
- `docs/plan-main-site-landing-auth.md`
- `docs/plan-tenant-admin-and-platform-login-redirect.md`
- `README.md`
