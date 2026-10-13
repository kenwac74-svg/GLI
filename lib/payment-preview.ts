export const PAYMENT_PREVIEW_METHODS = ["네이버페이", "카카오페이", "토스페이", "신용카드"] as const;
export type PaymentPreviewMethod = typeof PAYMENT_PREVIEW_METHODS[number];
