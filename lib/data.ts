import fs from "fs";
import path from "path";

import { Booking, Treatment, WorkingHours } from "./types";
import { getTreatmentPrice } from "./utils";

const DATA_DIR = path.join(process.cwd(), "data");

export function getTreatments(): Treatment[] {
  const filePath = path.join(DATA_DIR, "treatments.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

export function saveTreatments(treatments: Treatment[]): void {
  const filePath = path.join(DATA_DIR, "treatments.json");
  fs.writeFileSync(filePath, JSON.stringify(treatments, null, 2));
}

export function getBookings(): Booking[] {
  const filePath = path.join(DATA_DIR, "bookings.json");
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

export function saveBookings(bookings: Booking[]): void {
  const filePath = path.join(DATA_DIR, "bookings.json");
  fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));
}

export function getWorkingHours(): WorkingHours {
  const filePath = path.join(DATA_DIR, "working-hours.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

export function getPriceForDuration(treatment: Treatment, duration: number): number {
  return getTreatmentPrice(treatment, duration);
}
