# 計畫：商品資料庫（多規格／SKU）與 Admin 商品後台

## 已定案約束

- **價格型別**：PostgreSQL `NUMERIC`（Drizzle `numeric`），精度建議 `precision: 14, scale: 4`；API JSON 以**字串**傳遞小數，避免浮點誤差。
- **Admin 路由**：列表／編輯以 **`/admin/products`、 `/admin/products/new`、 `/admin/products/[id]`** 使用 **UUID `id`**，不採 slug。
- **租戶前台（未來）**：公開商品詳情使用 **`/products/[product_slug]`**（slug），與後台 id 分離。
- **多租戶**：`products.tenant_id` 必填；所有 Admin API 以 JWT 的 `tenantId` 篩選，並比對 Host 解析之 `shopSlug` 與 JWT 一致。

## 資料表（Drizzle / PostgreSQL）

| 表名 | 說明 |
|------|------|
| `products` | 主商品：slug、title、description、`base_price`、`image_urls`（jsonb） |
| `product_options` | 規格類型（如顏色、尺寸），`sort_order` |
| `option_values` | 各類型下的可選值，`sort_order` |
| `product_variants` | SKU：`sku_code`、`price`、`stock_quantity`、可選 `image_url` |
| `variant_option_values` | Variant 與 option value 的 M:N；**每個 variant 對每個 option 類型至多一個值**（由寫入邏輯與索引約束） |

唯一鍵：

- `products (tenant_id, slug)`
- `product_variants (product_id, sku_code)`

刪除策略：`product_options`、`option_values`、`product_variants` 對上層 `onDelete: 'cascade'`；整批重寫 catalog 時以交易刪除子列後重建。

## 後端 API

- `GET /api/admin/products`：分頁、關鍵字（title/slug）。
- `POST /api/admin/products`：建立主檔（不含 variants，variants 於編輯頁 Drawer 儲存）。
- `GET /api/admin/products/:id`：主檔 + `options`/`values` + `variants` + 各 variant 的 **選項索引**（供 UI 還原）。
- `PATCH /api/admin/products/:id`：更新主檔欄位。
- `PUT /api/admin/products/:id/catalog`：**單一交易**整批寫入規格與 SKU（Drawer「儲存」），請求體採 **索引式** 避免新 value 尚無 UUID 的對應問題：
  - `options[]`: `{ name, sortOrder, values: { value, sortOrder }[] }`
  - `variants[]`: `{ skuCode, price, stockQuantity, imageUrl?, valueIndexes: number[] }`  
    `valueIndexes[i]` 表示第 `i` 個 option 下選第幾個 value（由後端驗證範圍與長度與 `options.length` 一致）。

認證：`Cookie` session → `verifySessionToken`；Host slug 與 JWT `shopSlug` 不一致則 403。

## Admin 前端

- **`/admin/products`**：表格、搜尋、新增、編輯連結（`/admin/products/{id}`）。
- **`/admin/products/new`**：建立主檔後導向 **`/admin/products/[id]`**。
- **`/admin/products/[id]`**：主表單（名稱、slug、描述、base_price、圖片 URL 列表 JSON）；**「規格與 SKU」** 開啟 **Drawer**（`<dialog>` + Tailwind），內編輯 options/values 與 variants，呼叫 `PUT .../catalog`。

## 遷移與本機指令

```bash
bun run db:generate   # 產生 migration
bun run db:migrate    # 套用
```

## 驗收清單

- [ ] 不同租戶無法讀寫他戶商品 id。
- [ ] 同租戶 `slug` 重複建立／更新回傳 409。
- [ ] `catalog`：`valueIndexes` 越界或長度不符回傳 400。
- [ ] 同商品 `sku_code` 重複回傳 409。
- [ ] Drawer 儲存後重新載入資料一致。

## 後續（非本計畫範圍）

- 分類關聯、圖片上傳、variant 特價／條碼、多語系 `option_values.locale`。
- 前台 `/products/[slug]` 與購物車以 `variant_id` 下單。
