import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "GHS") {
  return `${currency} ${(amount || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date, format: string = "short") {
  const d = new Date(date);
  if (format === "short") return d.toLocaleDateString();
  if (format === "long") return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return d.toISOString().split("T")[0];
}
