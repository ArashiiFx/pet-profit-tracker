import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function formatNumber(value: string, decimals: boolean) {
  if (!value) return "";
  const normalized = decimals ? normalizeDecimal(value) : value.replace(/\D/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const fraction = fractionParts.join("").slice(0, decimals ? 2 : 0);
  const formattedWhole = (whole.replace(/^0+(?=\d)/, "") || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return decimals && (normalized.includes(".") || fraction) ? `${formattedWhole},${fraction}` : formattedWhole;
}

function toNumericValue(value: string, decimals: boolean) {
  if (!decimals) return value.replace(/\D/g, "");
  const normalized = normalizeDecimal(value);
  const [whole = "", fraction = ""] = normalized.split(".");
  return `${whole || "0"}.${fraction.slice(0, 2)}`.replace(/\.$/, "");
}

export function NumberInput({
  value,
  onValueChange,
  decimals = false,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
  decimals?: boolean;
}) {
  const [display, setDisplay] = useState(() => formatNumber(value, decimals));

  useEffect(() => {
    setDisplay(formatNumber(value, decimals));
  }, [value, decimals]);

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      value={display}
      onChange={(event) => {
        const nextDisplay = formatNumber(event.target.value, decimals);
        setDisplay(nextDisplay);
        onValueChange(toNumericValue(nextDisplay, decimals));
      }}
    />
  );
}

function normalizeDecimal(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (cleaned.includes(",")) {
    return cleaned.replace(/\./g, "").replace(",", ".");
  }
  const lastDot = cleaned.lastIndexOf(".");
  const fractionLength = cleaned.length - lastDot - 1;
  return lastDot >= 0 && fractionLength <= 2
    ? cleaned
    : cleaned.replace(/\./g, "");
}