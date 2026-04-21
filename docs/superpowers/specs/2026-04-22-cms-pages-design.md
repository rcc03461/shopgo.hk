# CMS Pages 設計規格（Admin Pages + Public `/p/[page_slug]`）

## 1) 目標與範圍

### 目標
- 完成租戶後台 CMS 頁面管理：`/admin/pages`（列表）、`/admin/pages/new`（新增）、`/admin/pages/[id]`（編輯）。
- 完成公開路由渲染：`/p/[page_slug]`。
- 內容編輯器採用 `Milkdown`，資料儲存格式以 Markdown 為主，確保可攜性與可維護性。

### 非目標（本期不做）
- 多人即時協作編輯。
- 版本歷史回溯與差異比對 UI。
- 複雜內容模組系統（block-based page builder）。

## 2) 架構與設計決策

### 編輯器選型
- Admin 端使用 `Milkdown` 作為 Markdown 所見即所得編輯器。
- 僅在 client 端掛載編輯器，避免 SSR 期踩到 DOM 依賴。
- 初期僅啟用基礎功能（標題、段落、粗斜體、清單、連結、圖片、程式碼區塊）。

### 內容儲存策略
- DB 主欄位使用 `content_markdown`（唯一真實來源）。
- 公開頁渲染時由 server 將 markdown 轉為 HTML，並做 sanitize。
- `content_html` 先不做持久化快取，避免雙欄位一致性成本；若後續有效能瓶頸再增量加入快取欄位。

### 租戶隔離與安全
- 所有 Admin API 透過 `requireTenantSession` 拿 `tenantId`，查詢與寫入均強制帶 `tenant_id` 條件。
- 公開 API 僅回傳 `status='published'` 的頁面。
- 公開 HTML 需經 sanitize，防止 XSS。

## 3) 資料模型（Drizzle）

新增資料表：`pages`

- `id` uuid pk default random
- `tenantId` uuid not null fk -> `tenants.id` on delete cascade
- `slug` varchar(255) not null
- `title` varchar(255) not null
- `excerpt` text nullable
- `contentMarkdown` text not null default `''`
- `status` varchar(32) not null default `'draft'`（`draft | published | archived`）
- `publishedAt` timestamptz nullable
- `seoTitle` varchar(255) nullable
- `seoDescription` text nullable
- `createdAt` timestamptz not null default now
- `updatedAt` timestamptz not null default now

索引與約束：
- unique index：`(tenant_id, slug)`
- index：`(tenant_id, status)`
- index：`(tenant_id, updated_at)`

## 4) API 設計（第一期）

### Admin APIs

1. `GET /api/admin/pages`
- query: `page`, `pageSize`, `q`, `status`
- 回傳：`items`, `page`, `pageSize`, `total`
- 搜尋欄位：`title`, `slug`

2. `POST /api/admin/pages`
- body: `title`, `slug`, `excerpt?`, `contentMarkdown`, `status`, `seoTitle?`, `seoDescription?`
- 驗證 slug 格式（小寫英數與 `-`）與租戶內唯一
- 若 status=`published` 且 `publishedAt` 空，寫入當下時間

3. `GET /api/admin/pages/[id]`
- 僅可讀取同 tenant 的 page

4. `PATCH /api/admin/pages/[id]`
- 可更新上述欄位
- status 轉換規則：
  - `draft/archived -> published`：若 `publishedAt` 空則補上 now
  - `published -> draft/archived`：`publishedAt` 保留（利於追溯）

5. `DELETE /api/admin/pages/[id]`
- 第一版採 hard delete（後續可擴 soft delete）

### Store/Public API

6. `GET /api/store/pages/[slug]`
- 僅回傳 `published` 且屬於當前 tenant 的頁面
- 回傳最小必要欄位：`title`, `slug`, `excerpt`, `contentHtml`, `seoTitle`, `seoDescription`, `publishedAt`

## 5) 前端頁面設計

### Admin：`/admin/pages`
- 列表欄位：Title、Slug、Status、UpdatedAt、操作（編輯）
- 功能：搜尋、狀態篩選、分頁、新增按鈕
- 參考現有 `admin/categories` 列表互動模式

### Admin：`/admin/pages/new`、`/admin/pages/[id]`
- 表單欄位：
  - `title`, `slug`, `status`
  - `excerpt`
  - `contentMarkdown`（Milkdown）
  - `seoTitle`, `seoDescription`
- UX 細節：
  - title 初次輸入時可自動帶 slug（可手動改）
  - 儲存時顯示 pending 狀態與錯誤提示
  - 離開頁面前如有未儲存變更顯示提示（可後補）

### Public：`/p/[page_slug]`
- SSR 取得 store page 資料，若不存在回 404
- 使用 sanitize 後 HTML 渲染內容
- 套用 SEO meta（`seoTitle/seoDescription`，無則退回 `title/excerpt`）

## 6) 驗證與測試計畫

### 手動測試（必要）
- 新增 draft page，前台 `/p/[slug]` 不可見。
- draft 轉 published，前台可見。
- published 轉 archived，前台不可見。
- 同租戶重複 slug 建立被 409 擋下。
- A 租戶無法透過 id 或 slug 讀寫 B 租戶內容。

### API 邊界
- slug 非法格式 -> 400
- 缺必要欄位 -> 400
- 非法 status -> 400
- 資料不存在 -> 404

## 7) 分期與落地順序

1. DB schema + migration + zod schemas
2. Admin APIs（list/create/get/update/delete）
3. Admin UI（list/new/edit，先純 textarea）
4. 導入 Milkdown 取代 textarea
5. Public API + `/p/[page_slug]` 頁面
6. 安全收斂（sanitize、錯誤處理、手測清單）

## 8) 風險與對策

- **風險：** Editor 與 SSR 相容性問題  
  **對策：** 僅 client mount + fallback textarea（開發期可保留）

- **風險：** Markdown 轉 HTML 造成 XSS  
  **對策：** server 端固定 sanitize 白名單，不信任前端輸入

- **風險：** 未來更換編輯器成本  
  **對策：** DB 保存 markdown 作為 canonical format

## 9) 驗收標準（DoD）

- `docs/TODO.md` 之 CMS 項目可拆分子項並逐項勾選。
- Admin 可完成 page CRUD，且租戶隔離正確。
- `/p/[page_slug]` 可穩定渲染已發布頁面，未發布頁面不可見。
- 內容渲染經 sanitize，基本 XSS payload 不可執行。
