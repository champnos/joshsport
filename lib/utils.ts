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

export function getTreatmentPrice(treatment: Treatment, duration: number) {
  if (treatment.pricingModel === "per30min") {
    return (duration / 30) * treatment.price;
  }

  if (duration === 90 && treatment.price90) return treatment.price90;
  if (duration === 120 && treatment.price120) return treatment.price120;
  return treatment.price;
}
