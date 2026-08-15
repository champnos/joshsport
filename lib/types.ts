export interface Treatment {
  id: string;
  name: string;
  description: string;
  durations: number[];
  pricingModel: "fixed" | "per30min";
  price: number;
  price90?: number;
  price120?: number;
  active: boolean;
}

export interface Booking {
  id: string;
  treatmentId: string;
  treatmentName: string;
  date: string;
  startTime: string;
  durationMins: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

export interface WorkingDay {
  open: boolean;
  start: string;
  end: string;
}

export type WorkingHours = Record<string, WorkingDay>;
