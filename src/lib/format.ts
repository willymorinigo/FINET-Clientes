export function formatARS(amount: number, includeDecimals = false): string {
  // Safe default formatting for Argentine Pesos
  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatNumberARS(amount: number, includeDecimals = false): string {
  // Format only the number part using es-AR rules (dots for thousands, comma for decimals)
  const formatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}
