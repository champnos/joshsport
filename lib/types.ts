export interface TreatmentDuration {
  mins: number;
  price: number;
}

export interface Treatment {
  id: string;
  name: string;
  description: string;
  durations: TreatmentDuration[];
  active: boolean;
  created_at?: string;
}

export interface Booking {
  id: string;
  treatment_id: string;
  treatment_name: string;
  duration_mins: number;
  date: string;
  start_time: string;
  client_name: string;
  client_dob: string;
  client_phone: string;
  client_address: string;
  client_postcode: string;
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  medical_conditions: string[];
  medical_notes: string;
  injury_recent: boolean;
  injury_recent_notes: string;
  injury_previous: boolean;
  injury_previous_notes: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at?: string;
}
