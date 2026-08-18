export interface NewScheduledShipment {
  name: string;
  telephone_number?: string;
  city: string;
  country: string;
  tax_number?: string;
  export_reason?: "commercial_goods" | "documents" | "gift";
  statements?: string;
  shipping_preference: "cheap" | "fast" | "reliable";
  insured: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  webhook_url: string;
}

export interface ScheduledShipmentResponse {
  id: string;
  time_left: number;
}
