# OShop PRD

## 1. 產品概述

### 1.1 產品名稱
OShop

### 1.2 產品定位
OShop 是一個面向多租戶商家的線上開店平台，讓租戶可快速建立自己的獨立品牌商店，並以子網域形式對外營運，例如 `shop_slug.oshop.com.hk`。

### 1.3 目標
- 提供租戶快速註冊與開店能力。
- 提供極簡、模組化的店舖首頁與商品展示體驗。
- 提供基本購物流程：瀏覽商品、加入購物車、付款、查看發票。
- 建立可持續擴充的 SaaS 電商基礎架構。

### 1.4 技術方向
- 前端框架：Nuxt
- UI 樣式：Tailwind CSS
- 執行環境與套件管理：Bun
- 資料庫：PostgreSQL
- 網域策略：主站 `oshop.com.hk`，租戶站點 `shop_slug.oshop.com.hk`

## 2. 產品願景

為個人商家與小型品牌提供一個低門檻、視覺簡潔、可快速上線的多租戶電商平台。租戶不需要自行處理基礎網站建設，即可透過模組化首頁與標準化交易流程開始營運。

## 3. 目標用戶

### 3.1 主要用戶
- 小型商戶
- 個人品牌經營者
- 香港本地中小型零售商
- 想以最低成本建立品牌官網商店的自由職業者或創作者

### 3.2 次要用戶
- 租戶商店的終端消費者

## 4. 核心價值

- 開店快：透過簡單註冊流程快速建立租戶商店。
- 視覺統一：平台提供極簡風格與模組化頁面骨架。
- 架構可擴展：首頁、內容頁、商品頁、帳戶頁皆以模組與標準路由設計。
- 多租戶隔離：每個租戶擁有獨立資料範圍與子網域入口。

## 5. 範圍定義

### 5.1 本期 MVP 範圍
- 平台官網 Landing Page
- 平台登入 / 註冊
- 租戶子網域首頁
- 商品列表頁
- 商品詳情頁
- 購物車
- 付款頁
- 發票頁
- 條款頁
- 會員個人資料頁
- 會員發票列表與明細頁
- 基礎 CMS 預留頁面

### 5.2 暫不納入 MVP
- 多語系
- 多幣別
- 複雜促銷引擎
- 商家後台完整管理介面
- 倉存管理進階功能
- 第三方物流整合
- 客服 / 聊天系統

## 6. 資訊架構與路由

### 6.1 平台主站
- `oshop.com.hk/`
  - Landing page
  - 主訴求：介紹產品價值，CTA 引導註冊
- `oshop.com.hk/login`
  - 平台登入頁
  - 欄位：email、password
- `oshop.com.hk/register`
  - 平台註冊頁
  - 欄位：shop_slug、email、password

> 備註：你原始需求提到 `oshop.com.hk/login register`，本 PRD 先整理為獨立 `register` 路由；若希望同頁 tab 切換登入 / 註冊，也可在 UI 實作層處理。

### 6.2 租戶子站
- `shop_slug.oshop.com.hk/`
  - 模組化首頁
  - 預設模組：nav、banner、category、products、footer
- `shop_slug.oshop.com.hk/register`
  - 租戶站會員註冊
- `shop_slug.oshop.com.hk/login`
  - 租戶站會員登入
- `shop_slug.oshop.com.hk/products`
  - 商品列表
  - 左側篩選、右側商品列表
- `shop_slug.oshop.com.hk/products/product_slug`
  - 商品詳情頁
- `shop_slug.oshop.com.hk/cart`
  - 購物車頁
- `shop_slug.oshop.com.hk/payment`
  - 付款頁
- `shop_slug.oshop.com.hk/invoices/invoice_uuid`
  - 訂單 / 發票明細頁
- `shop_slug.oshop.com.hk/tnc`
  - 條款與細則
- `shop_slug.oshop.com.hk/p/page_slug`
  - CMS 頁面預留
- `shop_slug.oshop.com.hk/profile`
  - 會員資料頁
- `shop_slug.oshop.com.hk/profile/invoices`
  - 會員發票列表
- `shop_slug.oshop.com.hk/profile/invoices/invoice_uuid`
  - 會員發票詳情

## 7. 功能需求

### 7.1 平台 Landing Page
#### 目標
讓訪客快速理解 OShop 是什麼，並引導註冊。

#### 模組
- Hero 區塊
- 產品亮點區塊
- 功能介紹區塊
- 常見問題區塊
- CTA 區塊
- Footer

#### CTA
- `立即開店`
- `預約示範`（可選）

### 7.2 平台註冊
#### 目標
讓商家快速建立租戶。

#### 欄位
- `shop_slug`
- `email`
- `password`

#### 規則
- `shop_slug` 必須唯一。
- `shop_slug` 只允許小寫英文字母、數字與連字號。
- 成功建立後，自動分配子網域：`shop_slug.oshop.com.hk`

#### 成功後流程
- 建立租戶資料
- 建立租戶預設店舖設定
- 建立平台管理者帳號
- 導向租戶初始化頁或租戶首頁

### 7.3 平台登入
#### 欄位
- `email`
- `password`

#### 結果
- 成功後可進入租戶管理入口或直接導向對應店舖

### 7.4 租戶首頁（模組化設計）
#### 目標
以低開發成本支援不同租戶首頁排版組合。

#### 預設模組
- `nav`
- `banner`
- `category`
- `products`
- `footer`

#### 模組需求
- 每個模組需支援獨立開關
- 每個模組需支援排序
- 每個模組需支援基本內容設定
- 未來可擴展更多模組，例如：
  - announcement
  - featured products
  - brand story
  - newsletter

### 7.5 商品列表頁
#### 版面
- 左側：篩選器
- 右側：商品列表

#### 篩選條件
- 分類
- 價格區間
- 是否有庫存
- 排序（最新、價格高低、熱門）

#### 商品卡片資訊
- 商品圖
- 商品名稱
- 價格
- 簡短描述
- 加入購物車按鈕

### 7.6 商品詳情頁
#### 內容
- 商品圖集
- 商品名稱
- 售價
- 商品描述
- 規格 / 選項
- 庫存狀態
- 加入購物車
- 相關商品推薦

### 7.7 購物車
#### 功能
- 查看已選商品
- 調整數量
- 移除商品
- 顯示小計
- 前往付款

### 7.8 付款頁
#### MVP 需求
- 顧客資料輸入
- 收貨 / 聯絡資訊
- 訂單摘要
- 付款方式選擇
- 建立訂單與發票

#### 後續可擴展
- Stripe
- PayMe
- FPS
- 銀行轉帳

### 7.9 發票頁
#### 頁面內容
- 發票編號
- 訂單狀態
- 商品列表
- 金額明細
- 顧客資訊
- 付款資訊

### 7.10 條款頁
#### 用途
- 顯示租戶店舖條款與細則
- 可由租戶自行維護內容

### 7.11 CMS 預留頁
#### 路由
- `shop_slug.oshop.com.hk/p/page_slug`

#### 用途
- 關於我們
- 送貨政策
- 退換政策
- 品牌故事

### 7.12 會員中心
#### `/profile`
- 基本資料
- 會員資料維護

#### `/profile/invoices`
- 顯示會員所有發票 / 訂單列表

#### `/profile/invoices/invoice_uuid`
- 顯示指定發票明細

## 8. 使用者流程

### 8.1 商家註冊流程
1. 訪客進入 `oshop.com.hk/`
2. 點擊 CTA 註冊
3. 填寫 `shop_slug`、`email`、`password`
4. 系統驗證 slug 唯一性
5. 建立租戶與預設店舖
6. 導向子網域首頁或初始化頁

### 8.2 消費者購物流程
1. 進入 `shop_slug.oshop.com.hk/`
2. 瀏覽首頁模組與商品
3. 進入商品列表或商品詳情頁
4. 加入購物車
5. 前往付款
6. 完成訂單
7. 查看發票頁

### 8.3 消費者查閱歷史訂單流程
1. 登入租戶站會員帳號
2. 進入 `/profile/invoices`
3. 點擊某張發票
4. 查看 `/profile/invoices/invoice_uuid`

## 9. 權限與角色

### 9.1 平台層
- Platform Admin
- Tenant Owner

### 9.2 租戶站
- Customer
- Guest

## 10. 資料模型建議

### 10.1 核心實體
- tenants
- tenant_domains
- tenant_users
- customers
- pages
- categories
- products
- product_variants
- carts
- cart_items
- orders
- order_items
- invoices
- payments
- module_configs

### 10.2 關鍵欄位建議
#### tenants
- id
- shop_slug
- shop_name
- status
- created_at

#### products
- id
- tenant_id
- slug
- name
- description
- ori_price
- base_price
- status
- cover_image
- images

#### categories
- id
- tenant_id
- parent_id
- order
- slug
- name
- description
- status

#### invoices
- id
- tenant_id
- order_id
- uuid
- amount_total
- currency
- status
- issued_at

#### module_configs
- id
- tenant_id
- page_type
- module_key
- sort_order
- enabled
- config_json

## 11. 非功能需求

### 11.1 效能
- 首屏頁面需優先優化 LCP
- 商品列表需支援分頁或 lazy loading
- 圖片需支援壓縮與響應式尺寸

### 11.2 SEO
- Landing page 需有完整 meta 資訊
- 商品頁需輸出 SEO title / description
- 商品頁與 CMS 頁需支援 slug

### 11.3 安全
- 租戶資料必須依 `tenant_id` 隔離
- 密碼需加密儲存
- 付款相關資料不可明文存敏感資訊
- 需避免跨租戶資料讀取

### 11.4 可維護性
- 頁面模組採可組裝架構
- API 與資料模型需支援未來後台管理功能

## 12. UI / UX 設計方向

### 12.1 視覺風格
極簡風格，重點放在商品與內容本身，不使用過多裝飾。

### 12.2 設計原則
- 大量留白
- 清晰字級層次
- 中性色為主
- 單一強調色做 CTA
- 卡片與區塊使用簡潔邊界
- 行動版優先

### 12.3 元件風格
- Navigation：細線條、扁平化
- Button：圓角小到中等，狀態清楚
- Card：低陰影或無陰影
- Form：大輸入框、清楚錯誤提示
- Banner：簡潔文案 + 單張主視覺

### 12.4 建議配色
- 主色：黑 / 白 / 灰階
- 輔助色：米白、淺灰
- CTA 強調色：深藍或墨綠

## 13. MVP 驗收標準

- 可從 `oshop.com.hk/` 進入平台並完成租戶註冊
- 註冊後可對應至 `shop_slug.oshop.com.hk`
- 租戶首頁可渲染預設模組
- 商品列表頁可篩選與瀏覽商品
- 商品詳情頁可加入購物車
- 顧客可完成付款流程
- 系統可產生並查看發票頁
- 會員可查看歷史發票

## 14. 後續版本方向

- 商家後台管理
- 模組拖拉排序
- 優惠券 / 折扣碼
- 多付款渠道
- 多語系
- 多店員權限
- 主題樣式切換
- 分析報表

## 15. 建議開發優先順序

1. 多租戶基礎架構與子網域識別
2. 平台註冊 / 登入
3. 租戶首頁模組渲染
4. 商品與分類資料模型
5. 商品列表與詳情頁
6. 購物車與付款流程
7. 發票與會員中心
8. CMS 預留頁與 SEO 補強
