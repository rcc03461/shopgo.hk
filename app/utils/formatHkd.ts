/** 以港幣格式顯示金額（字串來自 NUMERIC） */
export function formatHkd(amountStr: string) {
  const n = Number(amountStr)
  if (Number.isNaN(n)) return amountStr
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}
