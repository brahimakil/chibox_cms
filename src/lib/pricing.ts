/**
 * Compute the final app price (USD) from a CNY origin price.
 * Formula: originPriceCNY * exchangeRate * (1 + markupPercent / 100)
 */
export function computeAppPrice(
  originPriceCNY: number | null | undefined,
  exchangeRate: number,
  markupPercent: number
): number | null {
  if (originPriceCNY === null || originPriceCNY === undefined) return null;
  const price = Number(originPriceCNY);
  if (isNaN(price) || price === 0) return null;
  const converted = price * exchangeRate;
  const withMarkup = converted * (1 + markupPercent / 100);
  return Math.round(withMarkup * 100) / 100;
}

/**
 * Format a price for display with currency symbol
 */
export function formatPrice(
  price: number | null | undefined,
  currency: string = "$"
): string {
  if (price === null || price === undefined) return "—";
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Format a CNY price
 */
export function formatCNY(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  return `¥${Number(price).toFixed(2)}`;
}

/**
 * Resolve the best display name for a product (avoid Chinese-only names)
 */
export function resolveProductName(product: {
  display_name?: string | null;
  product_name?: string | null;
  original_name?: string | null;
  product_code?: string;
}): string {
  const isChinese = (str: string) => /[\u4e00-\u9fff]/.test(str) && !/[a-zA-Z]/.test(str);

  if (product.display_name && !isChinese(product.display_name)) {
    return product.display_name;
  }
  if (product.product_name && !isChinese(product.product_name)) {
    return product.product_name;
  }
  // Fallback to product code
  return product.product_code || "Unnamed Product";
}
