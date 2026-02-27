export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function calculateItemTotals(quantityPerCarton: number, cartonsCount: number, totalPurchasePrice: number, sellingPricePerPiece: number) {
  const totalQuantity = quantityPerCarton * cartonsCount;
  const totalPurchase = totalPurchasePrice;
  const totalSelling = sellingPricePerPiece * totalQuantity;
  const profit = totalSelling - totalPurchase;
  return { totalQuantity, totalPurchase, totalSelling, profit };
}
