import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Treatment } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTreatmentPrice(treatment: Treatment, durationMins: number): number {
  const match = treatment.durations.find((d) => d.mins === durationMins);
  return match?.price ?? 0;
}
