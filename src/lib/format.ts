const priceFormatter = new Intl.NumberFormat("sk-SK", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("sk-SK", {
  day: "numeric",
  month: "numeric",
});

export function formatPrice(value: number | string | { toNumber(): number }): string {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : value.toNumber();
  return priceFormatter.format(num);
}

export function formatShortDate(date: Date): string {
  return dateFormatter.format(date);
}

/** "Platí do st 22. 7." style validity label */
export function formatValidity(validTo: Date): string {
  return `do ${dateFormatter.format(validTo)}`;
}

export function daysLeft(validTo: Date): number {
  return Math.max(0, Math.ceil((validTo.getTime() - Date.now()) / 86_400_000));
}
