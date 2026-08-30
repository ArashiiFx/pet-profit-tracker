export const idr = (value: number | null | undefined) =>
  value == null
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);

export const usd = (value: number | null | undefined) =>
  value == null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);

export const num = (value: number | null | undefined) =>
  value == null ? "-" : new Intl.NumberFormat("en-US").format(value);

export const shortDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const today = () => new Date().toISOString().slice(0, 10);

export const ref = (prefix: string, seq: number | null | undefined) =>
  seq == null ? "-" : `${prefix}-${String(seq).padStart(4, "0")}`;

export const money = (value: number, currency: string) =>
  currency === "USD" ? usd(value) : idr(value);
