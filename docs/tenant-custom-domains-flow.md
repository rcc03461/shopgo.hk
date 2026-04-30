# 租戶 Custom Domains 全流程圖

本文對齊目前程式實作，整理租戶在後台 `自訂網域` 的完整流程，含：

- 新增網域（DB + Cloudflare Custom Hostname）
- DNS 三層設定（流量 CNAME / HTTPS DCV / 商店 TXT）
- 驗證啟用（`verify`）
- Cloudflare 回源修補（`repair-cf-origin`）
- 移除網域（`delete`）

---

## 1) 端到端主流程（Tenant Admin）

```mermaid
flowchart TD
  A[租戶管理員進入 /admin/settings/domains] --> B[GET /api/admin/custom-domains 載入列表]
  B --> C{新增網域?}

  C -- 是 --> D[POST /api/admin/custom-domains]
  D --> D1[normalize hostname + policy 檢查]
  D1 --> D2[DB 新增 tenant_custom_domains<br/>verified_at=null + verification_token]
  D2 --> D3{有設定 CLOUDFLARE_API_TOKEN<br/>與 CLOUDFLARE_ZONE_ID?}
  D3 -- 是 --> D4[呼叫 CF 建立 custom hostname]
  D4 --> D5{建立成功?}
  D5 -- 成功 --> D6[回寫 cf_custom_hostname_id]
  D5 -- 失敗 --> D7[回傳 cloudflareSyncError<br/>但 DB 網域仍保留]
  D3 -- 否 --> D8[略過 CF 同步]
  D6 --> E[前端顯示 DNS 指示與 TXT 驗證碼]
  D7 --> E
  D8 --> E

  C -- 否 --> F{已存在未驗證網域?}
  F -- 是 --> E
  F -- 否 --> G[等待使用者操作]

  E --> H[商家到 DNS 供應商新增 3 筆紀錄]
  H --> H1[CNAME 流量導向 -> saasCnameTarget]
  H --> H2[CNAME HTTPS DCV -> _acme-challenge.*]
  H --> H3[TXT 商店歸屬驗證 -> _oshop-verify.*]
  H1 --> I[DNS 傳播]
  H2 --> I
  H3 --> I

  I --> J[點擊 檢查驗證]
  J --> K[POST /api/admin/custom-domains/:id/verify]
  K --> L{TXT 包含 verification_token?}
  L -- 否 --> M[回 400: 請確認 DNS 生效]
  L -- 是 --> N[DB 更新 verified_at=now]
  N --> O[網域狀態 -> 已驗證/已生效]
  M --> E

  O --> P{訪問仍有 525/握手問題?}
  P -- 是 --> Q[點擊 套用 CF 回源]
  Q --> R[POST /api/admin/custom-domains/:id/repair-cf-origin]
  R --> S[PATCH CF custom hostname<br/>custom_origin_server=saasCnameTarget]
  S --> T[等待 CF 生效後重試訪問]
  T --> O
  P -- 否 --> U[正常營運]

  U --> V{需要下線網域?}
  V -- 是 --> W[DELETE /api/admin/custom-domains/:id]
  W --> X{該筆有 cf_custom_hostname_id 且 CF 設定完整?}
  X -- 是 --> Y[先刪 Cloudflare custom hostname]
  X -- 否 --> Z[直接刪 DB]
  Y --> Z
  Z --> AA[完成移除]
  V -- 否 --> U
```

---

## 2) 後端 API 流程圖（Admin Custom Domains）

```mermaid
flowchart LR
  subgraph List["GET /api/admin/custom-domains"]
    L1[requireTenantSession] --> L2[依 tenant_id 查詢]
    L2 --> L3[回傳 items<br/>id/hostname/cfLinked/verifiedAt/createdAt]
  end

  subgraph Create["POST /api/admin/custom-domains"]
    C1[requireTenantSession] --> C2[hostname normalize + policy 檢查]
    C2 --> C3[insert tenant_custom_domains]
    C3 --> C4{CF 環境變數齊全?}
    C4 -- 是 --> C5[cloudflareCreateCustomHostname]
    C5 --> C6{成功?}
    C6 -- 成功 --> C7[update cf_custom_hostname_id]
    C6 -- 失敗 --> C8[記錄 cloudflareSyncError]
    C4 -- 否 --> C9[跳過 CF]
  end

  subgraph Verify["POST /api/admin/custom-domains/:id/verify"]
    V1[requireTenantSession + id 檢查] --> V2[讀取 hostname + verification_token]
    V2 --> V3{already verified?}
    V3 -- 是 --> V4[回 alreadyVerified=true]
    V3 -- 否 --> V5[txtRecordsIncludeToken]
    V5 --> V6{TXT 驗證成功?}
    V6 -- 否 --> V7[回 400]
    V6 -- 是 --> V8[update verified_at]
  end

  subgraph Repair["POST /api/admin/custom-domains/:id/repair-cf-origin"]
    R1[requireTenantSession + id 檢查] --> R2[檢查 saasCnameTarget + CF 設定]
    R2 --> R3[確認有 cf_custom_hostname_id]
    R3 --> R4[cloudflarePatchCustomHostname]
  end

  subgraph Delete["DELETE /api/admin/custom-domains/:id"]
    D1[requireTenantSession + id 檢查] --> D2[查 cf_custom_hostname_id]
    D2 --> D3{有 CF id 且 CF 設定?}
    D3 -- 是 --> D4[cloudflareDeleteCustomHostname]
    D3 -- 否 --> D5[略過 CF]
    D4 --> D6[delete tenant_custom_domains]
    D5 --> D6
  end
```

---

## 3) 狀態機（單一網域）

```mermaid
stateDiagram-v2
  [*] --> Draft: 新增成功（DB）
  Draft --> CfLinked: Cloudflare 建立成功
  Draft --> DnsPending: Cloudflare 跳過/失敗
  CfLinked --> DnsPending: 等待 DNS 三層完成
  DnsPending --> Verified: verify 成功（TXT 命中 token）
  DnsPending --> DnsPending: verify 失敗（TXT 未生效）
  Verified --> Verified: 例行運作
  Verified --> CfOriginPatched: 執行 repair-cf-origin
  CfOriginPatched --> Verified: 生效後回穩
  Draft --> Removed: delete
  DnsPending --> Removed: delete
  Verified --> Removed: delete
  CfLinked --> Removed: delete
  CfOriginPatched --> Removed: delete
```

---

## 4) 實務備註

- `verification_token` 僅在新增當下回傳給前端，若遺失需移除後重建。
- `verify` 只檢查商店歸屬 TXT（`_oshop-verify.<hostname>`），不等於 HTTPS 一定已完成。
- Cloudflare 建立失敗不會回滾 DB（網域仍保留，可後續修復）。
- `repair-cf-origin` 主要處理來源 TLS SNI 不符造成的 `525 SSL handshake failed`。
