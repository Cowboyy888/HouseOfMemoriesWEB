const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : null;
}
